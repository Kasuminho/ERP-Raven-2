import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MentorshipHelpStatus, MentorshipStatus } from "@prisma/client";
import { PrismaService } from "@database/prisma.service";
import { AuditService } from "../audit/services/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  AssignMentorshipDto,
  CreateMentorshipHelpRequestDto,
  TriageMentorshipHelpDto,
  UpdateMentorProfileDto,
  UpdateMentorshipDto,
} from "./dto";

const publicPlayer = { id: true, nickname: true, class: true } as const;
@Injectable()
export class MentorshipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async getMine(userId: string) {
    const player = await this.activePlayer(userId);
    const [
      mentorProfile,
      asMentee,
      asMentor,
      ownHelp,
      assignedHelp,
      milestones,
    ] = await Promise.all([
      this.prisma.mentorProfile.findUnique({ where: { playerId: player.id } }),
      this.prisma.mentorshipAssignment.findMany({
        where: { menteeId: player.id },
        include: { mentor: { select: publicPlayer } },
        orderBy: { startedAt: "desc" },
      }),
      this.prisma.mentorshipAssignment.findMany({
        where: { mentorId: player.id, status: MentorshipStatus.ACTIVE },
        include: { mentee: { select: publicPlayer } },
        orderBy: { startedAt: "desc" },
      }),
      this.prisma.mentorshipHelpRequest.findMany({
        where: { requesterId: player.id },
        include: { assignedMentor: { select: publicPlayer } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.mentorshipHelpRequest.findMany({
        where: {
          assignedMentorId: player.id,
          status: {
            in: [MentorshipHelpStatus.ASSIGNED, MentorshipHelpStatus.OPEN],
          },
        },
        include: { requester: { select: publicPlayer } },
        orderBy: { createdAt: "asc" },
      }),
      this.milestones(player.id),
    ]);
    return {
      mentorProfile,
      asMentee,
      asMentor,
      ownHelp,
      assignedHelp,
      milestones,
      milestonePoints: null,
      mentorCanDiscipline: false,
      staffNotesExposed: false,
    };
  }

  async updateMentorProfile(userId: string, dto: UpdateMentorProfileDto) {
    const player = await this.activePlayer(userId);
    const profile = await this.prisma.mentorProfile.upsert({
      where: { playerId: player.id },
      create: {
        playerId: player.id,
        isAvailable: dto.isAvailable,
        topics: dto.topics,
        roles: dto.roles,
        notePt: dto.notePt?.trim() || null,
        noteEn: dto.noteEn?.trim() || null,
        consentedAt: dto.isAvailable ? new Date() : null,
      },
      update: {
        isAvailable: dto.isAvailable,
        topics: dto.topics,
        roles: dto.roles,
        notePt: dto.notePt?.trim() || null,
        noteEn: dto.noteEn?.trim() || null,
        consentedAt: dto.isAvailable ? new Date() : null,
      },
    });
    await this.audit.log({
      actorId: userId,
      action: "MENTOR_VOLUNTEER_PROFILE_UPDATED",
      targetType: "MentorProfile",
      targetId: player.id,
      metadata: {
        isAvailable: dto.isAvailable,
        topics: dto.topics,
        roles: dto.roles,
        voluntary: true,
        disciplinaryPower: false,
      },
    });
    return profile;
  }

  async createHelpRequest(userId: string, dto: CreateMentorshipHelpRequestDto) {
    const player = await this.activePlayer(userId);
    const request = await this.prisma.mentorshipHelpRequest.create({
      data: {
        requesterId: player.id,
        topic: dto.topic,
        requestedRole: dto.requestedRole,
        body: dto.body?.trim() || null,
      },
    });
    await this.audit.log({
      actorId: userId,
      action: "MENTORSHIP_HELP_REQUESTED",
      targetType: "MentorshipHelpRequest",
      targetId: request.id,
      metadata: {
        topic: dto.topic,
        requestedRole: dto.requestedRole,
        dmRequired: false,
      },
    });
    return request;
  }

  async getStaffWorkspace() {
    const [assignments, helpRequests, volunteers, players] = await Promise.all([
      this.prisma.mentorshipAssignment.findMany({
        include: {
          mentee: { select: publicPlayer },
          mentor: { select: publicPlayer },
        },
        orderBy: { startedAt: "desc" },
        take: 200,
      }),
      this.prisma.mentorshipHelpRequest.findMany({
        include: {
          requester: { select: publicPlayer },
          assignedMentor: { select: publicPlayer },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      this.prisma.mentorProfile.findMany({
        where: { isAvailable: true, consentedAt: { not: null } },
        include: { player: { select: publicPlayer } },
        orderBy: { updatedAt: "desc" },
      }),
      this.prisma.player.findMany({
        where: { isActive: true },
        select: publicPlayer,
        orderBy: { nickname: "asc" },
      }),
    ]);
    return {
      assignments,
      helpRequests,
      volunteers,
      players,
      mentorCanDiscipline: false,
      staffNotesExposed: false,
      milestonePoints: null,
    };
  }

  async assign(actorId: string, dto: AssignMentorshipDto) {
    if (!dto.mentorId && !dto.groupName?.trim())
      throw new BadRequestException(
        "Choose a consenting mentor or a welcome group.",
      );
    if (dto.mentorId === dto.menteeId)
      throw new BadRequestException("Player cannot mentor themselves.");
    const mentee = await this.prisma.player.findFirst({
      where: { id: dto.menteeId, isActive: true },
      select: { id: true },
    });
    if (!mentee) throw new NotFoundException("Active mentee not found.");
    if (dto.mentorId) {
      const volunteer = await this.prisma.mentorProfile.findFirst({
        where: {
          playerId: dto.mentorId,
          isAvailable: true,
          consentedAt: { not: null },
          player: { isActive: true },
        },
      });
      if (!volunteer)
        throw new BadRequestException(
          "Mentor must volunteer and remain available before assignment.",
        );
    }
    const existing = await this.prisma.mentorshipAssignment.findFirst({
      where: { menteeId: dto.menteeId, status: MentorshipStatus.ACTIVE },
    });
    if (existing)
      throw new BadRequestException("Player already has an active mentorship.");
    const assignment = await this.prisma.mentorshipAssignment.create({
      data: {
        menteeId: dto.menteeId,
        mentorId: dto.mentorId || null,
        groupName: dto.groupName?.trim() || null,
        assignedById: actorId,
      },
      include: {
        mentee: { select: publicPlayer },
        mentor: { select: publicPlayer },
      },
    });
    await this.safeNotify(
      dto.menteeId,
      "Mentoria iniciada / Mentorship started",
      "PT-BR: Sua mentoria voluntaria foi associada. EN: Your voluntary mentorship was assigned.",
      `mentorship:${assignment.id}`,
    );
    await this.audit.log({
      actorId,
      action: "MENTORSHIP_ASSIGNED",
      targetType: "MentorshipAssignment",
      targetId: assignment.id,
      metadata: {
        menteeId: dto.menteeId,
        mentorId: dto.mentorId,
        groupName: dto.groupName,
        voluntary: true,
        disciplinaryPower: false,
        staffNotesExposed: false,
      },
    });
    return assignment;
  }

  async updateAssignment(
    actorId: string,
    id: string,
    dto: UpdateMentorshipDto,
  ) {
    if (dto.status === MentorshipStatus.ACTIVE)
      throw new BadRequestException(
        "Use a new assignment to start mentorship.",
      );
    const current = await this.prisma.mentorshipAssignment.findUnique({
      where: { id },
    });
    if (!current) throw new NotFoundException("Mentorship not found.");
    const updated = await this.prisma.mentorshipAssignment.update({
      where: { id },
      data: { status: dto.status, endedAt: new Date() },
    });
    await this.audit.log({
      actorId,
      action: "MENTORSHIP_ENDED",
      targetType: "MentorshipAssignment",
      targetId: id,
      metadata: {
        from: current.status,
        to: dto.status,
        disciplinaryDecision: false,
      },
    });
    return updated;
  }

  async triageHelp(actorId: string, id: string, dto: TriageMentorshipHelpDto) {
    const request = await this.prisma.mentorshipHelpRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException("Help request not found.");
    if (dto.status === MentorshipHelpStatus.ASSIGNED && !dto.assignedMentorId)
      throw new BadRequestException("Assigned help requires a mentor.");
    if (dto.assignedMentorId) {
      const volunteer = await this.prisma.mentorProfile.findFirst({
        where: {
          playerId: dto.assignedMentorId,
          isAvailable: true,
          consentedAt: { not: null },
        },
      });
      if (!volunteer)
        throw new BadRequestException(
          "Help can only be routed to an available volunteer.",
        );
    }
    const updated = await this.prisma.mentorshipHelpRequest.update({
      where: { id },
      data: {
        status: dto.status,
        assignedMentorId: dto.assignedMentorId,
        resolvedAt:
          dto.status === MentorshipHelpStatus.RESOLVED ? new Date() : null,
      },
    });
    await this.audit.log({
      actorId,
      action: "MENTORSHIP_HELP_TRIAGED",
      targetType: "MentorshipHelpRequest",
      targetId: id,
      metadata: {
        status: dto.status,
        assignedMentorId: dto.assignedMentorId,
        dmRequired: false,
      },
    });
    return updated;
  }

  private async milestones(playerId: string) {
    const [firstEvent, firstBoss, firstRequest, firstInterest, firstWarRoom] =
      await Promise.all([
        this.prisma.eventAttendance.findFirst({
          where: { playerId, attended: true },
          select: { createdAt: true },
          orderBy: { createdAt: "asc" },
        }),
        this.prisma.eventAttendance.findFirst({
          where: {
            playerId,
            attended: true,
            event: { operationalCategory: "BOSS" },
          },
          select: { createdAt: true },
          orderBy: { createdAt: "asc" },
        }),
        this.prisma.itemRequest.findFirst({
          where: { playerId },
          select: { createdAt: true },
          orderBy: { createdAt: "asc" },
        }),
        this.prisma.itemInterestEntry.findFirst({
          where: { playerId },
          select: { createdAt: true },
          orderBy: { createdAt: "asc" },
        }),
        this.prisma.warRoomRosterSlot.findFirst({
          where: { playerId },
          select: { createdAt: true },
          orderBy: { createdAt: "asc" },
        }),
      ]);
    return [
      ["FIRST_EVENT", firstEvent],
      ["FIRST_BOSS", firstBoss],
      ["FIRST_REQUEST", firstRequest],
      ["FIRST_INTEREST", firstInterest],
      ["FIRST_WAR_ROOM", firstWarRoom],
    ].map(([key, value]) => ({
      key,
      achievedAt: (value as { createdAt: Date } | null)?.createdAt ?? null,
    }));
  }

  private async activePlayer(userId: string) {
    const player = await this.prisma.player.findFirst({
      where: { userId, isActive: true },
      select: { id: true },
      orderBy: { joinedAt: "asc" },
    });
    if (!player) throw new NotFoundException("Active player not found.");
    return player;
  }
  private async safeNotify(
    playerId: string,
    title: string,
    body: string,
    key: string,
  ) {
    try {
      await this.notifications.createForPlayer({
        playerId,
        type: "MENTORSHIP_UPDATE",
        title,
        body,
        href: "/dashboard/mentorship",
        metadata: { disciplinaryPower: false },
        deduplicationKey: key,
      });
    } catch {
      // Audit remains authoritative when a private notification channel fails.
    }
  }
}
