import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  LeadershipArea,
  StaffTaskPriority,
  StaffTaskStatus,
} from "@prisma/client";
import { PrismaService } from "@database/prisma.service";
import { AuditService } from "../audit/services/audit.service";
import { GuildHealthService } from "../guild-health/guild-health.service";
import { MeetingService } from "../operations/services/meeting.service";
import { OperationalBriefingService } from "../operations/services/operational-briefing.service";
import {
  CreateStaffTaskDto,
  CreateStaffTaskHandoffDto,
  UpdateStaffTaskDto,
} from "./dto";

const identity = {
  id: true,
  discordUsername: true,
  discordNickname: true,
} as const;
const CLOSED_STATUSES: StaffTaskStatus[] = [
  StaffTaskStatus.DONE,
  StaffTaskStatus.CANCELLED,
];
const include = {
  owner: { select: identity },
  substitute: { select: identity },
  createdBy: { select: identity },
  handoffs: {
    include: { author: { select: identity } },
    orderBy: { createdAt: "desc" as const },
  },
} as const;

@Injectable()
export class StaffTasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly briefing: OperationalBriefingService,
    private readonly meeting: MeetingService,
    private readonly health: GuildHealthService,
  ) {}

  async getWorkspace() {
    const [tasks, assignees, briefing, meeting, health] = await Promise.all([
      this.prisma.staffTask.findMany({
        include,
        orderBy: [
          { status: "asc" },
          { priority: "desc" },
          { dueAt: "asc" },
          { createdAt: "desc" },
        ],
        take: 500,
      }),
      this.prisma.user.findMany({
        where: {
          players: {
            some: {
              isActive: true,
              roles: { some: { role: { name: { in: ["STAFF", "ADMIN"] } } } },
            },
          },
        },
        select: identity,
        orderBy: { discordUsername: "asc" },
      }),
      this.briefing.getStaffMorningBriefing(),
      this.meeting.getStaffMeetingSummary(),
      this.health.getSignals(),
    ]);
    const existing = new Set(
      tasks.map((task) => task.sourceKey).filter(Boolean),
    );
    const candidates = [
      ...briefing.sections.flatMap((section) =>
        section.tasks.map((task) =>
          this.suggestion(
            "BRIEFING",
            task.id,
            task.type,
            task.title,
            task.description,
            task.href,
            task.priority,
          ),
        ),
      ),
      ...meeting.sections.flatMap((section) =>
        section.items
          .filter((item) => !item.resolved)
          .map((item) =>
            this.suggestion(
              "MEETING",
              item.meetingItemKey,
              item.type,
              item.title,
              item.description,
              item.href,
              item.priority,
            ),
          ),
      ),
      ...health.signals.map((signal) => ({
        sourceType: "GUILD_HEALTH",
        sourceKey: `GUILD_HEALTH:${signal.key}`,
        title: `Conversar: ${signal.subjectLabel}`,
        description: `${signal.explanation} ${signal.recommendedAction}`,
        href: signal.href,
        priority: StaffTaskPriority.MEDIUM,
        area: LeadershipArea.PLAYER_CARE,
      })),
    ].filter((item) => !existing.has(item.sourceKey));
    const suggestions = Array.from(
      new Map(candidates.map((item) => [item.sourceKey, item])).values(),
    );
    return {
      tasks,
      assignees,
      suggestions,
      counts: {
        open: tasks.filter((task) => !CLOSED_STATUSES.includes(task.status))
          .length,
        unowned: tasks.filter(
          (task) => !CLOSED_STATUSES.includes(task.status) && !task.ownerId,
        ).length,
        overdue: tasks.filter(
          (task) =>
            !CLOSED_STATUSES.includes(task.status) &&
            task.dueAt &&
            task.dueAt < new Date(),
        ).length,
      },
      suggestionsRequireConfirmation: true,
      automaticTaskCreation: false,
    };
  }

  async create(actorId: string, dto: CreateStaffTaskDto) {
    if (dto.ownerId) await this.requireStaff(dto.ownerId);
    if (dto.substituteId) await this.requireStaff(dto.substituteId);
    if (dto.ownerId && dto.ownerId === dto.substituteId)
      throw new BadRequestException("Owner and substitute must differ.");
    const task = await this.prisma.staffTask.create({
      data: {
        title: dto.title.trim(),
        description: dto.description.trim(),
        area: dto.area,
        priority: dto.priority,
        ownerId: dto.ownerId || null,
        substituteId: dto.substituteId || null,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        href: dto.href,
        sourceType: dto.sourceType?.trim() || null,
        sourceKey: dto.sourceKey?.trim() || null,
        createdById: actorId,
      },
      include,
    });
    await this.audit.log({
      actorId,
      action: "STAFF_TASK_CREATED",
      targetType: "StaffTask",
      targetId: task.id,
      metadata: {
        sourceType: task.sourceType,
        sourceKey: task.sourceKey,
        createdByConfirmation: true,
        automaticCreation: false,
      },
    });
    return task;
  }

  async update(actorId: string, id: string, dto: UpdateStaffTaskDto) {
    const task = await this.prisma.staffTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException("Staff task not found.");
    const ownerInput = dto.ownerId === "" ? null : dto.ownerId;
    const substituteInput = dto.substituteId === "" ? null : dto.substituteId;
    if (ownerInput) await this.requireStaff(ownerInput);
    if (substituteInput) await this.requireStaff(substituteInput);
    const owner = dto.ownerId !== undefined ? ownerInput : task.ownerId;
    const substitute =
      dto.substituteId !== undefined ? substituteInput : task.substituteId;
    if (owner && owner === substitute)
      throw new BadRequestException("Owner and substitute must differ.");
    const completed = dto.status === StaffTaskStatus.DONE;
    const reopened = dto.status && !CLOSED_STATUSES.includes(dto.status);
    const updated = await this.prisma.staffTask.update({
      where: { id },
      data: {
        status: dto.status,
        priority: dto.priority,
        ownerId: dto.ownerId !== undefined ? ownerInput : undefined,
        substituteId:
          dto.substituteId !== undefined ? substituteInput : undefined,
        dueAt:
          dto.dueAt !== undefined
            ? dto.dueAt
              ? new Date(dto.dueAt)
              : null
            : undefined,
        completedAt: completed ? new Date() : reopened ? null : undefined,
      },
      include,
    });
    await this.audit.log({
      actorId,
      action: "STAFF_TASK_UPDATED",
      targetType: "StaffTask",
      targetId: id,
      metadata: {
        fromStatus: task.status,
        toStatus: dto.status,
        ownerId: ownerInput,
        substituteId: substituteInput,
        dueAt: dto.dueAt,
      },
    });
    return updated;
  }

  async handoff(actorId: string, id: string, dto: CreateStaffTaskHandoffDto) {
    const task = await this.prisma.staffTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException("Staff task not found.");
    if (dto.toOwnerId) await this.requireStaff(dto.toOwnerId);
    const result = await this.prisma.$transaction(async (tx) => {
      const handoff = await tx.staffTaskHandoff.create({
        data: {
          taskId: id,
          authorId: actorId,
          context: dto.context.trim(),
          nextStep: dto.nextStep.trim(),
          toOwnerId: dto.toOwnerId || null,
        },
      });
      if (dto.toOwnerId) {
        await tx.staffTask.update({
          where: { id },
          data: { ownerId: dto.toOwnerId, status: StaffTaskStatus.IN_PROGRESS },
        });
      }
      return handoff;
    });
    await this.audit.log({
      actorId,
      action: "STAFF_TASK_HANDED_OFF",
      targetType: "StaffTask",
      targetId: id,
      metadata: {
        toOwnerId: dto.toOwnerId,
        contextRecorded: true,
        nextStepRecorded: true,
      },
    });
    return result;
  }

  private suggestion(
    sourceType: string,
    id: string,
    type: string,
    title: string,
    description: string,
    href: string,
    priority: string,
  ) {
    return {
      sourceType,
      sourceKey: `${sourceType}:${id}`,
      title,
      description,
      href,
      priority:
        priority === "high"
          ? StaffTaskPriority.HIGH
          : priority === "low"
            ? StaffTaskPriority.LOW
            : StaffTaskPriority.MEDIUM,
      area: this.areaFor(type),
    };
  }

  private areaFor(type: string) {
    const text = type.toUpperCase();
    if (/EVENT|ATTENDANCE|WAR_ROOM/.test(text)) return LeadershipArea.EVENTS;
    if (/AUCTION|BID|DROP|REQUEST|INTEREST|WISHLIST/.test(text))
      return LeadershipArea.LOOT;
    if (/RECRUIT|ONBOARD|TRIAL|MENTOR/.test(text))
      return LeadershipArea.RECRUITMENT;
    if (/DISCORD|WEBHOOK|ANNOUNCEMENT/.test(text))
      return LeadershipArea.DISCORD;
    if (/DEPLOY|HEALTH|BACKUP|INTEGRITY/.test(text))
      return LeadershipArea.DEPLOY;
    if (/DKP|DAOSHI|DIAMOND/.test(text)) return LeadershipArea.TREASURY;
    return LeadershipArea.PLAYER_CARE;
  }

  private async requireStaff(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        players: {
          some: {
            isActive: true,
            roles: { some: { role: { name: { in: ["STAFF", "ADMIN"] } } } },
          },
        },
      },
      select: { id: true },
    });
    if (!user)
      throw new BadRequestException(
        "Owner and substitute must be active Staff.",
      );
  }
}
