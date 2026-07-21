import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PlayerTrialDecisionType, PlayerTrialStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { AuditService } from '../audit/services/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CompletePlayerTrialCheckInDto, CreatePlayerTrialDto, DecidePlayerTrialDto } from './dto';

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_STATUSES: PlayerTrialStatus[] = [PlayerTrialStatus.ACTIVE, PlayerTrialStatus.EXTENDED];
const identitySelect = { id: true, discordUsername: true, discordNickname: true } as const;
const staffInclude = {
  player: { select: { id: true, nickname: true, userId: true, isActive: true } },
  createdBy: { select: identitySelect },
  decidedBy: { select: identitySelect },
  criteria: { orderBy: { displayOrder: 'asc' as const } },
  checkIns: { include: { author: { select: identitySelect } }, orderBy: { day: 'asc' as const } },
} as const;

@Injectable()
export class PlayerTrialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async getMine(userId: string) {
    const player = await this.prisma.player.findFirst({ where: { userId, isActive: true }, select: { id: true }, orderBy: { joinedAt: 'asc' } });
    if (!player) throw new NotFoundException('Authenticated user does not have an active player profile.');
    const trial = await this.prisma.playerTrial.findFirst({
      where: { playerId: player.id },
      include: { criteria: { orderBy: { displayOrder: 'asc' } }, checkIns: { where: { completedAt: { not: null } }, select: { id: true, day: true, scheduledAt: true, completedAt: true, bodyPt: true, bodyEn: true }, orderBy: { day: 'asc' } } },
      orderBy: { plannedStartAt: 'desc' },
    });
    if (!trial) return { trial: null, pause: null, adjustedEndAt: null, automaticDecision: false };
    const workspace = await this.decorate(trial);
    if (workspace.pause?.reasonVisibility === 'STAFF_ONLY') workspace.pause.reason = null;
    return workspace;
  }

  async getStaffWorkspace() {
    const [trials, players] = await Promise.all([
      this.prisma.playerTrial.findMany({ include: staffInclude, orderBy: { plannedStartAt: 'desc' }, take: 200 }),
      this.prisma.player.findMany({ where: { isActive: true }, select: { id: true, nickname: true }, orderBy: { nickname: 'asc' } }),
    ]);
    return { trials: await Promise.all(trials.map((trial) => this.decorate(trial))), players, automaticDecision: false, affectsLoot: false };
  }

  async create(actorId: string, dto: CreatePlayerTrialDto) {
    const start = new Date(dto.plannedStartAt);
    const end = new Date(dto.plannedEndAt);
    if (end <= start) throw new BadRequestException('Trial end must be after its start.');
    const keys = dto.criteria.map((criterion) => criterion.key.trim());
    const orders = dto.criteria.map((criterion) => criterion.displayOrder);
    if (new Set(keys).size !== keys.length) throw new BadRequestException('Trial criterion keys must be unique.');
    if (new Set(orders).size !== orders.length) throw new BadRequestException('Trial criterion display orders must be unique.');
    const player = await this.prisma.player.findFirst({ where: { id: dto.playerId, isActive: true }, select: { id: true } });
    if (!player) throw new NotFoundException('Active player not found.');

    const trial = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.playerTrial.findFirst({ where: { playerId: dto.playerId, status: { in: ACTIVE_STATUSES } }, select: { id: true } });
      if (existing) throw new BadRequestException('Player already has an active or extended trial.');
      return tx.playerTrial.create({
        data: {
          playerId: dto.playerId,
          objectivePt: dto.objectivePt.trim(),
          objectiveEn: dto.objectiveEn.trim(),
          plannedStartAt: start,
          plannedEndAt: end,
          createdById: actorId,
          criteria: { create: dto.criteria.map((criterion) => ({ ...criterion, key: criterion.key.trim(), titlePt: criterion.titlePt.trim(), titleEn: criterion.titleEn.trim(), descriptionPt: criterion.descriptionPt.trim(), descriptionEn: criterion.descriptionEn.trim() })) },
          checkIns: { create: [7, 14, 30].map((day) => ({ day, scheduledAt: new Date(start.getTime() + day * DAY_MS) })) },
        },
        include: staffInclude,
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    await this.notify(dto.playerId, 'PLAYER_TRIAL_PUBLISHED', 'Trial publicado / Trial published', `PT-BR: ${trial.objectivePt} EN: ${trial.objectiveEn}`, `trial-created:${trial.id}`);
    await this.audit.log({ actorId, action: 'PLAYER_TRIAL_CREATED', targetType: 'PlayerTrial', targetId: trial.id, metadata: { playerId: dto.playerId, plannedStartAt: start, plannedEndAt: end, criterionKeys: keys, checkInDays: [7, 14, 30], criteriaPublishedBeforeEvaluation: true, automaticDecision: false, affectsLoot: false } });
    return this.decorate(trial);
  }

  async completeCheckIn(actorId: string, trialId: string, day: number, dto: CompletePlayerTrialCheckInDto) {
    if (![7, 14, 30].includes(day)) throw new BadRequestException('Trial check-in day must be 7, 14, or 30.');
    const trial = await this.requireActiveTrial(trialId);
    const existing = await this.prisma.playerTrialCheckIn.findUnique({ where: { trialId_day: { trialId, day } } });
    if (!existing) throw new NotFoundException('Trial check-in not found.');
    if (existing.completedAt) throw new BadRequestException('Trial check-in was already recorded.');
    const completed = await this.prisma.playerTrialCheckIn.update({ where: { id: existing.id }, data: { completedAt: new Date(), bodyPt: dto.bodyPt.trim(), bodyEn: dto.bodyEn.trim(), internalNote: dto.internalNote?.trim() || null, authorId: actorId } });
    await this.notify(trial.playerId, 'PLAYER_TRIAL_CHECK_IN', `Check-in D${day} / Day ${day} check-in`, `PT-BR: ${completed.bodyPt} EN: ${completed.bodyEn}`, `trial-check-in:${trialId}:${day}`);
    await this.audit.log({ actorId, action: 'PLAYER_TRIAL_CHECK_IN_RECORDED', targetType: 'PlayerTrial', targetId: trialId, metadata: { playerId: trial.playerId, day, hasInternalNote: Boolean(dto.internalNote), factualRecord: true, automaticDecision: false } });
    return this.getTrialStaff(trialId);
  }

  async decide(actorId: string, trialId: string, dto: DecidePlayerTrialDto) {
    const trial = await this.requireActiveTrial(trialId);
    let status: PlayerTrialStatus;
    let plannedEndAt: Date | undefined;
    if (dto.decision === PlayerTrialDecisionType.EXTEND) {
      if (!dto.extendedEndAt) throw new BadRequestException('Extension requires a new end date.');
      plannedEndAt = new Date(dto.extendedEndAt);
      if (plannedEndAt <= trial.plannedEndAt) throw new BadRequestException('Extended end must be after the current planned end.');
      status = PlayerTrialStatus.EXTENDED;
    } else {
      if (dto.extendedEndAt) throw new BadRequestException('Only an extension accepts a new end date.');
      status = dto.decision === PlayerTrialDecisionType.APPROVE ? PlayerTrialStatus.APPROVED : PlayerTrialStatus.CLOSED;
    }
    const updated = await this.prisma.playerTrial.update({
      where: { id: trialId },
      data: { status, ...(plannedEndAt ? { plannedEndAt } : {}), decisionType: dto.decision, decisionReasonPt: dto.reasonPt.trim(), decisionReasonEn: dto.reasonEn.trim(), decidedAt: new Date(), decidedById: actorId },
      include: staffInclude,
    });
    await this.notify(trial.playerId, 'PLAYER_TRIAL_DECISION', 'Atualizacao do trial / Trial update', `PT-BR: ${dto.reasonPt.trim()} EN: ${dto.reasonEn.trim()}`, `trial-decision:${trialId}:${updated.updatedAt.toISOString()}`);
    const auditAction = dto.decision === PlayerTrialDecisionType.APPROVE ? 'PLAYER_TRIAL_APPROVED' : dto.decision === PlayerTrialDecisionType.EXTEND ? 'PLAYER_TRIAL_EXTENDED' : 'PLAYER_TRIAL_CLOSED';
    await this.audit.log({ actorId, action: auditAction, targetType: 'PlayerTrial', targetId: trialId, metadata: { playerId: trial.playerId, from: trial.status, to: status, reasonPt: dto.reasonPt.trim(), reasonEn: dto.reasonEn.trim(), extendedEndAt: plannedEndAt, automaticDecision: false, affectsLoot: false } });
    return this.decorate(updated);
  }

  private async getTrialStaff(trialId: string) {
    const trial = await this.prisma.playerTrial.findUnique({ where: { id: trialId }, include: staffInclude });
    if (!trial) throw new NotFoundException('Player trial not found.');
    return this.decorate(trial);
  }

  private async requireActiveTrial(trialId: string) {
    const trial = await this.prisma.playerTrial.findFirst({ where: { id: trialId, status: { in: ACTIVE_STATUSES } } });
    if (!trial) throw new NotFoundException('Active player trial not found.');
    return trial;
  }

  private async decorate<T extends { id: string; playerId: string; plannedStartAt: Date; plannedEndAt: Date; status: PlayerTrialStatus }>(trial: T) {
    const absences = await this.prisma.playerAbsence.findMany({ where: { playerId: trial.playerId, startsAt: { lt: trial.plannedEndAt }, endsAt: { gt: trial.plannedStartAt } }, select: { id: true, startsAt: true, endsAt: true, reason: true, reasonVisibility: true }, orderBy: { startsAt: 'asc' } });
    const intervals = absences.map((absence) => ({ start: Math.max(absence.startsAt.getTime(), trial.plannedStartAt.getTime()), end: Math.min(absence.endsAt.getTime(), trial.plannedEndAt.getTime()) })).filter((interval) => interval.end > interval.start);
    let pausedMs = 0;
    let cursorStart = 0;
    let cursorEnd = 0;
    for (const interval of intervals) {
      if (!cursorEnd || interval.start > cursorEnd) { pausedMs += cursorEnd ? cursorEnd - cursorStart : 0; cursorStart = interval.start; cursorEnd = interval.end; }
      else cursorEnd = Math.max(cursorEnd, interval.end);
    }
    if (cursorEnd) pausedMs += cursorEnd - cursorStart;
    const now = Date.now();
    const currentAbsence = absences.find((absence) => absence.startsAt.getTime() <= now && absence.endsAt.getTime() >= now);
    const ongoing = ACTIVE_STATUSES.includes(trial.status);
    return { trial, pause: ongoing && currentAbsence ? { absenceId: currentAbsence.id, startsAt: currentAbsence.startsAt, endsAt: currentAbsence.endsAt, reason: currentAbsence.reason, reasonVisibility: currentAbsence.reasonVisibility } : null, pausedDays: Math.ceil(pausedMs / DAY_MS), adjustedEndAt: new Date(trial.plannedEndAt.getTime() + pausedMs), effectiveStatus: ongoing && currentAbsence ? 'PAUSED' : trial.status, automaticDecision: false, affectsLoot: false };
  }

  private async notify(playerId: string, type: string, title: string, body: string, deduplicationKey: string) {
    try { await this.notifications.createForPlayer({ playerId, type, title, body, href: '/dashboard/trial', metadata: { automaticDecision: false, affectsLoot: false }, deduplicationKey }); } catch { /* Audit remains authoritative when a delivery channel fails. */ }
  }
}
