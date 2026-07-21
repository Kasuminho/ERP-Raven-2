import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  GuildPulseModerationStatus,
  GuildPulseParticipationStatus,
  GuildPulseStatus,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "@database/prisma.service";
import { AuditService } from "../audit/services/audit.service";
import {
  CreateGuildPulseDto,
  ModerateGuildPulseDto,
  SetGuildPulseStatusDto,
  SubmitGuildPulseDto,
} from "./dto";
const DAY_MS = 86_400_000;
@Injectable()
export class GuildPulseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}
  async getMine(userId: string) {
    await this.cleanupExpiredOpenText();
    const player = await this.activePlayer(userId);
    const now = new Date();
    const cycle = await this.prisma.guildPulseCycle.findFirst({
      where: {
        status: GuildPulseStatus.OPEN,
        opensAt: { lte: now },
        closesAt: { gt: now },
      },
      select: {
        id: true,
        titlePt: true,
        titleEn: true,
        opensAt: true,
        closesAt: true,
        minGroupSize: true,
        openTextDays: true,
      },
      orderBy: { opensAt: "desc" },
    });
    if (!cycle)
      return {
        cycle: null,
        participation: null,
        optional: true,
        consequencesForSkipping: false,
      };
    const participation = await this.prisma.guildPulseParticipation.findUnique({
      where: { cycleId_playerId: { cycleId: cycle.id, playerId: player.id } },
      select: { status: true, updatedAt: true },
    });
    return {
      cycle,
      participation,
      optional: true,
      anonymousResponse: true,
      identityStoredSeparately: true,
      consequencesForSkipping: false,
    };
  }
  async submit(userId: string, cycleId: string, dto: SubmitGuildPulseDto) {
    const player = await this.activePlayer(userId);
    const cycle = await this.openCycle(cycleId);
    const existing = await this.prisma.guildPulseParticipation.findUnique({
      where: { cycleId_playerId: { cycleId, playerId: player.id } },
    });
    if (existing?.status === GuildPulseParticipationStatus.SUBMITTED)
      throw new BadRequestException("Pulse already submitted.");
    const text = dto.openText?.trim() || null;
    await this.prisma.$transaction(
      async (tx) => {
        await tx.guildPulseResponse.create({
          data: {
            cycleId,
            belonging: dto.belonging,
            clarity: dto.clarity,
            workload: dto.workload,
            fun: dto.fun,
            helpSafety: dto.helpSafety,
            openText: text,
            openTextExpiresAt: text
              ? new Date(Date.now() + cycle.openTextDays * DAY_MS)
              : null,
            moderationStatus: text
              ? GuildPulseModerationStatus.PENDING
              : GuildPulseModerationStatus.NOT_REQUIRED,
          },
        });
        await tx.guildPulseParticipation.upsert({
          where: { cycleId_playerId: { cycleId, playerId: player.id } },
          create: {
            cycleId,
            playerId: player.id,
            status: GuildPulseParticipationStatus.SUBMITTED,
          },
          update: { status: GuildPulseParticipationStatus.SUBMITTED },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return {
      submitted: true,
      anonymousResponse: true,
      identityStoredSeparately: true,
      openTextRetentionDays: cycle.openTextDays,
      consequences: false,
    };
  }
  async skip(userId: string, cycleId: string) {
    const player = await this.activePlayer(userId);
    await this.openCycle(cycleId);
    const existing = await this.prisma.guildPulseParticipation.findUnique({
      where: { cycleId_playerId: { cycleId, playerId: player.id } },
    });
    if (existing?.status === GuildPulseParticipationStatus.SUBMITTED)
      return { skipped: false, alreadySubmitted: true, consequences: false };
    await this.prisma.guildPulseParticipation.upsert({
      where: { cycleId_playerId: { cycleId, playerId: player.id } },
      create: {
        cycleId,
        playerId: player.id,
        status: GuildPulseParticipationStatus.SKIPPED,
      },
      update: { status: GuildPulseParticipationStatus.SKIPPED },
    });
    return { skipped: true, consequences: false };
  }
  async create(actorId: string, dto: CreateGuildPulseDto) {
    const opensAt = new Date(dto.opensAt);
    const closesAt = new Date(dto.closesAt);
    if (closesAt <= opensAt)
      throw new BadRequestException("Pulse close must be after open.");
    const cycle = await this.prisma.guildPulseCycle.create({
      data: {
        titlePt: dto.titlePt.trim(),
        titleEn: dto.titleEn.trim(),
        opensAt,
        closesAt,
        minGroupSize: dto.minGroupSize,
        openTextDays: dto.openTextDays,
        createdById: actorId,
      },
    });
    await this.audit.log({
      actorId,
      action: "GUILD_PULSE_CREATED",
      targetType: "GuildPulseCycle",
      targetId: cycle.id,
      metadata: {
        minGroupSize: cycle.minGroupSize,
        openTextDays: cycle.openTextDays,
        anonymousByDefault: true,
      },
    });
    return cycle;
  }
  async setStatus(
    actorId: string,
    cycleId: string,
    dto: SetGuildPulseStatusDto,
  ) {
    const cycle = await this.prisma.guildPulseCycle.findUnique({
      where: { id: cycleId },
    });
    if (!cycle) throw new NotFoundException("Pulse cycle not found.");
    if (cycle.status === GuildPulseStatus.CLOSED)
      throw new BadRequestException("Closed pulse is immutable.");
    if (
      dto.status === GuildPulseStatus.DRAFT &&
      cycle.status !== GuildPulseStatus.DRAFT
    )
      throw new BadRequestException("Published pulse cannot return to draft.");
    const updated = await this.prisma.guildPulseCycle.update({
      where: { id: cycleId },
      data: { status: dto.status },
    });
    await this.audit.log({
      actorId,
      action: "GUILD_PULSE_STATUS_CHANGED",
      targetType: "GuildPulseCycle",
      targetId: cycleId,
      metadata: { from: cycle.status, to: dto.status },
    });
    return updated;
  }
  async getStaffWorkspace() {
    await this.cleanupExpiredOpenText();
    const cycles = await this.prisma.guildPulseCycle.findMany({
      orderBy: { opensAt: "desc" },
      take: 100,
    });
    return {
      cycles: await Promise.all(
        cycles.map((cycle) => this.aggregateCycle(cycle)),
      ),
      individualScoresExposed: false,
      loyaltyScore: null,
      automaticConsequences: false,
    };
  }
  async moderate(
    actorId: string,
    responseId: string,
    dto: ModerateGuildPulseDto,
  ) {
    if (
      dto.status !== GuildPulseModerationStatus.APPROVED &&
      dto.status !== GuildPulseModerationStatus.HIDDEN
    )
      throw new BadRequestException(
        "Moderation must approve or hide open text.",
      );
    const response = await this.prisma.guildPulseResponse.findUnique({
      where: { id: responseId },
      include: { cycle: true },
    });
    if (!response?.openText)
      throw new NotFoundException("Active open text not found.");
    const count = await this.prisma.guildPulseResponse.count({
      where: { cycleId: response.cycleId },
    });
    if (count < response.cycle.minGroupSize)
      throw new BadRequestException(
        "Minimum anonymous group size was not reached.",
      );
    const updated = await this.prisma.guildPulseResponse.update({
      where: { id: responseId },
      data: {
        moderationStatus: dto.status,
        moderatedById: actorId,
        moderatedAt: new Date(),
      },
    });
    await this.audit.log({
      actorId,
      action: "GUILD_PULSE_TEXT_MODERATED",
      targetType: "GuildPulseResponse",
      targetId: responseId,
      metadata: {
        cycleId: response.cycleId,
        status: dto.status,
        authorIdentityKnown: false,
      },
    });
    return updated;
  }
  async cleanupExpiredOpenText() {
    return this.prisma.guildPulseResponse.updateMany({
      where: {
        openTextExpiresAt: { lte: new Date() },
        openText: { not: null },
      },
      data: {
        openText: null,
        moderationStatus: GuildPulseModerationStatus.HIDDEN,
        moderatedById: null,
        moderatedAt: null,
      },
    });
  }
  private async aggregateCycle(cycle: { id: string; minGroupSize: number }) {
    const count = await this.prisma.guildPulseResponse.count({
      where: { cycleId: cycle.id },
    });
    const eligible = count >= cycle.minGroupSize;
    const participation = await this.prisma.guildPulseParticipation.groupBy({
      by: ["status"],
      where: { cycleId: cycle.id },
      _count: { _all: true },
    });
    if (!eligible)
      return {
        cycle,
        responseCount: count,
        minGroupSize: cycle.minGroupSize,
        aggregationAvailable: false,
        missingForAggregate: cycle.minGroupSize - count,
        participation: participation.map((row) => ({
          status: row.status,
          count: row._count._all,
        })),
        averages: null,
        openTexts: [],
      };
    const aggregate = await this.prisma.guildPulseResponse.aggregate({
      where: { cycleId: cycle.id },
      _avg: {
        belonging: true,
        clarity: true,
        workload: true,
        fun: true,
        helpSafety: true,
      },
    });
    const openTexts = await this.prisma.guildPulseResponse.findMany({
      where: {
        cycleId: cycle.id,
        openText: { not: null },
        openTextExpiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        openText: true,
        moderationStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return {
      cycle,
      responseCount: count,
      minGroupSize: cycle.minGroupSize,
      aggregationAvailable: true,
      missingForAggregate: 0,
      participation: participation.map((row) => ({
        status: row.status,
        count: row._count._all,
      })),
      averages: aggregate._avg,
      openTexts,
    };
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
  private async openCycle(cycleId: string) {
    const now = new Date();
    const cycle = await this.prisma.guildPulseCycle.findFirst({
      where: {
        id: cycleId,
        status: GuildPulseStatus.OPEN,
        opensAt: { lte: now },
        closesAt: { gt: now },
      },
    });
    if (!cycle) throw new NotFoundException("Open pulse not found.");
    return cycle;
  }
}
