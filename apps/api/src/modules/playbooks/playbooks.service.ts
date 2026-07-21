import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  EventRsvpStatus,
  PlaybookLessonDisposition,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "@database/prisma.service";
import { AuditService } from "../audit/services/audit.service";
import { WarRoomService } from "../war-room/services/war-room.service";
import {
  AssignPlaybookDto,
  CreatePlaybookVersionDto,
  DecidePlaybookLessonDto,
} from "./dto";

@Injectable()
export class PlaybooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly warRoom: WarRoomService,
  ) {}
  async getStaffWorkspace() {
    const [playbooks, assignments, lessons, operations, events, staff] =
      await Promise.all([
        this.prisma.guildPlaybook.findMany({
          include: {
            versions: {
              include: { roleInstructions: true },
              orderBy: { version: "desc" },
            },
          },
          orderBy: { title: "asc" },
        }),
        this.prisma.guildPlaybookAssignment.findMany({
          include: {
            version: { include: { playbook: true } },
            event: { select: { id: true, name: true, startsAt: true } },
            operation: { select: { id: true, name: true, startsAt: true } },
            receipts: true,
          },
          orderBy: { assignedAt: "desc" },
        }),
        this.prisma.guildPlaybookLesson.findMany({
          include: {
            owner: {
              select: {
                id: true,
                discordUsername: true,
                discordNickname: true,
              },
            },
            promotedVersion: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.warRoomOperation.findMany({
          select: { id: true, name: true, startsAt: true, status: true },
          orderBy: { startsAt: "desc" },
          take: 100,
        }),
        this.prisma.event.findMany({
          select: { id: true, name: true, startsAt: true, status: true },
          orderBy: { startsAt: "desc" },
          take: 100,
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
          select: { id: true, discordUsername: true, discordNickname: true },
        }),
      ]);
    return {
      playbooks,
      assignments,
      lessons,
      operations,
      events,
      staff,
      immutableVersions: true,
      playerStaffNotesExposed: false,
    };
  }
  async getLessonCandidates(operationId: string) {
    const report = await this.warRoom.getAfterActionReport(operationId);
    return {
      operation: report.operation,
      candidates: report.signals.map((signal: any, index: number) => ({
        sourceKey: signal.key ?? `signal-${index}`,
        title: signal.title ?? signal.label ?? `Licao ${index + 1}`,
        evidence: signal.description ?? signal.detail ?? JSON.stringify(signal),
      })),
      decisionRequired: true,
    };
  }
  async createPlaybook(actorId: string, dto: CreatePlaybookVersionDto) {
    if (!dto.key || !dto.title || !dto.contentType)
      throw new BadRequestException(
        "Key, title, and content type are required for a new playbook.",
      );
    const version = await this.prisma.$transaction(async (tx) => {
      const playbook = await tx.guildPlaybook.create({
        data: {
          key: dto.key!,
          title: dto.title!,
          contentType: dto.contentType!,
        },
      });
      return this.createVersionTx(tx, actorId, playbook.id, 1, dto);
    });
    await this.audit.log({
      actorId,
      action: "PLAYBOOK_CREATED",
      targetType: "GuildPlaybookVersion",
      targetId: version.id,
      metadata: {
        playbookId: version.playbookId,
        version: 1,
        immutable: true,
      },
    });
    return version;
  }
  async createVersion(
    actorId: string,
    playbookId: string,
    dto: CreatePlaybookVersionDto,
  ) {
    const latest = await this.prisma.guildPlaybookVersion.findFirst({
      where: { playbookId },
      orderBy: { version: "desc" },
    });
    if (!latest) throw new NotFoundException("Playbook not found.");
    const version = await this.prisma.$transaction((tx) =>
      this.createVersionTx(tx, actorId, playbookId, latest.version + 1, dto),
    );
    await this.audit.log({
      actorId,
      action: "PLAYBOOK_VERSION_CREATED",
      targetType: "GuildPlaybookVersion",
      targetId: version.id,
      metadata: { playbookId, version: version.version, immutable: true },
    });
    return version;
  }
  async assign(actorId: string, dto: AssignPlaybookDto) {
    if (Boolean(dto.eventId) === Boolean(dto.operationId))
      throw new BadRequestException("Assign exactly one event or operation.");
    const version = await this.prisma.guildPlaybookVersion.findUnique({
      where: { id: dto.versionId },
    });
    if (!version) throw new NotFoundException("Playbook version not found.");
    const result = await this.prisma.guildPlaybookAssignment.upsert({
      where: dto.eventId
        ? { eventId: dto.eventId }
        : { operationId: dto.operationId },
      create: {
        versionId: dto.versionId,
        eventId: dto.eventId,
        operationId: dto.operationId,
        assignedById: actorId,
      },
      update: {
        versionId: dto.versionId,
        assignedById: actorId,
        assignedAt: new Date(),
      },
    });
    await this.audit.log({
      actorId,
      action: "PLAYBOOK_VERSION_ASSIGNED",
      targetType: "GuildPlaybookAssignment",
      targetId: result.id,
      metadata: {
        versionId: dto.versionId,
        version: version.version,
        eventId: dto.eventId,
        operationId: dto.operationId,
      },
    });
    return result;
  }
  async decideLesson(actorId: string, dto: DecidePlaybookLessonDto) {
    const owner = await this.prisma.user.findUnique({
      where: { id: dto.ownerId },
      select: { id: true },
    });
    if (!owner) throw new BadRequestException("Lesson owner not found.");
    const lesson = await this.prisma.guildPlaybookLesson.create({
      data: {
        operationId: dto.operationId,
        sourceKey: dto.sourceKey,
        playbookId: dto.playbookId,
        title: dto.title,
        lessonPt: dto.lessonPt,
        lessonEn: dto.lessonEn,
        disposition: dto.disposition,
        ownerId: dto.ownerId,
        reviewAt: new Date(dto.reviewAt),
        createdById: actorId,
      },
    });
    let promotedVersionId: string | null = null;
    if (
      dto.playbookId &&
      dto.disposition !== PlaybookLessonDisposition.DISCARD
    ) {
      const latest = await this.prisma.guildPlaybookVersion.findFirst({
        where: { playbookId: dto.playbookId },
        include: { roleInstructions: true },
        orderBy: { version: "desc" },
      });
      if (!latest) throw new NotFoundException("Playbook not found.");
      const lessons = Array.isArray(latest.lessons)
        ? [
            ...latest.lessons,
            {
              lessonId: lesson.id,
              disposition: dto.disposition,
              title: dto.title,
              pt: dto.lessonPt,
              en: dto.lessonEn,
            },
          ]
        : [
            {
              lessonId: lesson.id,
              disposition: dto.disposition,
              title: dto.title,
              pt: dto.lessonPt,
              en: dto.lessonEn,
            },
          ];
      const promoted = await this.prisma.guildPlaybookVersion.create({
        data: {
          playbookId: latest.playbookId,
          version: latest.version + 1,
          objectivePt: latest.objectivePt,
          objectiveEn: latest.objectiveEn,
          publicBriefPt: latest.publicBriefPt,
          publicBriefEn: latest.publicBriefEn,
          staffNotes: latest.staffNotes,
          compositionTarget: latest.compositionTarget as Prisma.InputJsonValue,
          positioning: latest.positioning as Prisma.InputJsonValue,
          calls: latest.calls as Prisma.InputJsonValue,
          risks: latest.risks as Prisma.InputJsonValue,
          links: latest.links as Prisma.InputJsonValue,
          checklist: latest.checklist as Prisma.InputJsonValue,
          lessons: lessons as Prisma.InputJsonValue,
          originOperationId: dto.operationId,
          originLessonId: lesson.id,
          createdById: actorId,
          roleInstructions: {
            create: latest.roleInstructions.map((role) => ({
              roleKey: role.roleKey,
              titlePt: role.titlePt,
              titleEn: role.titleEn,
              bodyPt: role.bodyPt,
              bodyEn: role.bodyEn,
            })),
          },
        },
      });
      promotedVersionId = promoted.id;
      await this.prisma.guildPlaybookLesson.update({
        where: { id: lesson.id },
        data: { promotedVersionId },
      });
    }
    await this.audit.log({
      actorId,
      action: "PLAYBOOK_LESSON_DECIDED",
      targetType: "GuildPlaybookLesson",
      targetId: lesson.id,
      metadata: {
        operationId: dto.operationId,
        disposition: dto.disposition,
        ownerId: dto.ownerId,
        reviewAt: dto.reviewAt,
        promotedVersionId,
      },
    });
    return { ...lesson, promotedVersionId };
  }
  async getMine(userId: string) {
    const player = await this.prisma.player.findFirst({
      where: { userId, isActive: true },
      include: { combatProfile: true },
    });
    if (!player) throw new NotFoundException("Active player not found.");
    const assignments = await this.prisma.guildPlaybookAssignment.findMany({
      where: {
        OR: [
          { operation: { rosterSlots: { some: { playerId: player.id } } } },
          {
            event: {
              rsvps: {
                some: {
                  playerId: player.id,
                  status: EventRsvpStatus.CONFIRMED,
                },
              },
            },
          },
        ],
      },
      include: {
        version: { include: { playbook: true, roleInstructions: true } },
        operation: {
          include: {
            rosterSlots: {
              where: { playerId: player.id },
              select: { role: true },
            },
          },
        },
        event: { select: { id: true, name: true, startsAt: true } },
        receipts: { where: { playerId: player.id } },
      },
      orderBy: { assignedAt: "desc" },
    });
    return {
      assignments: assignments.map((assignment) => {
        const roleKey =
          assignment.operation?.rosterSlots[0]?.role ??
          player.combatProfile?.preferredRole ??
          "GENERAL";
        const instruction =
          assignment.version.roleInstructions.find(
            (role) => role.roleKey === roleKey,
          ) ??
          assignment.version.roleInstructions.find(
            (role) => role.roleKey === "GENERAL",
          ) ??
          null;
        return {
          assignmentId: assignment.id,
          playbookTitle: assignment.version.playbook.title,
          version: assignment.version.version,
          event: assignment.event,
          operation: assignment.operation
            ? {
                id: assignment.operation.id,
                name: assignment.operation.name,
                startsAt: assignment.operation.startsAt,
              }
            : null,
          objectivePt: assignment.version.objectivePt,
          objectiveEn: assignment.version.objectiveEn,
          publicBriefPt: assignment.version.publicBriefPt,
          publicBriefEn: assignment.version.publicBriefEn,
          roleKey,
          instruction,
          instructionConfirmedAt: assignment.receipts[0]?.confirmedAt ?? null,
        };
      }),
      staffNotesExposed: false,
    };
  }
  async confirmInstruction(
    userId: string,
    assignmentId: string,
    confirm: boolean,
  ) {
    if (!confirm)
      throw new BadRequestException("Explicit confirmation is required.");
    const mine = await this.getMine(userId);
    const assignment = mine.assignments.find(
      (item) => item.assignmentId === assignmentId,
    );
    if (!assignment)
      throw new NotFoundException("Assigned instruction not found.");
    const player = await this.prisma.player.findFirstOrThrow({
      where: { userId, isActive: true },
    });
    return this.prisma.playbookInstructionReceipt.upsert({
      where: { assignmentId_playerId: { assignmentId, playerId: player.id } },
      create: {
        assignmentId,
        playerId: player.id,
        roleKey: String(assignment.roleKey),
      },
      update: { roleKey: String(assignment.roleKey), confirmedAt: new Date() },
    });
  }
  private createVersionTx(
    tx: Prisma.TransactionClient,
    actorId: string,
    playbookId: string,
    version: number,
    dto: CreatePlaybookVersionDto,
  ) {
    return tx.guildPlaybookVersion.create({
      data: {
        playbookId,
        version,
        objectivePt: dto.objectivePt,
        objectiveEn: dto.objectiveEn,
        publicBriefPt: dto.publicBriefPt,
        publicBriefEn: dto.publicBriefEn,
        staffNotes: dto.staffNotes,
        compositionTarget: dto.compositionTarget,
        positioning: dto.positioning,
        calls: dto.calls,
        risks: dto.risks,
        links: dto.links,
        checklist: dto.checklist,
        createdById: actorId,
        roleInstructions: { create: dto.roleInstructions },
      },
      include: { roleInstructions: true },
    });
  }
}
