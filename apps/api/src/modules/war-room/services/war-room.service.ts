import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PlayerClass, PlayerCombatRole, Prisma, ProgressCategory, WarRoomOperationPriority, WarRoomOperationStatus, WarRoomRosterSlotStatus } from '@prisma/client';
import { AuditService } from '../../audit/services/audit.service';
import {
  CloseWarRoomOperationDto,
  CreateWarRoomOperationDto,
  CreateWarRoomRosterSlotDto,
  CreateWarRoomTimelineEventDto,
  MarkWarRoomAttendanceDto,
  PlayerWarRoomConfirmationDto,
  UpdateWarRoomOperationDto,
  UpdateWarRoomRosterSlotDto,
  WarRoomInternalLinkDto,
} from '../dto';
import { WarRoomRepository } from '../repositories/war-room.repository';

const CONFIRMABLE_OPERATION_STATUSES: WarRoomOperationStatus[] = [WarRoomOperationStatus.SCHEDULED, WarRoomOperationStatus.ACTIVE];
const OPEN_SLOT_STATUSES: WarRoomRosterSlotStatus[] = [
  WarRoomRosterSlotStatus.PENDING,
  WarRoomRosterSlotStatus.CONFIRMED,
  WarRoomRosterSlotStatus.PRESENT,
  WarRoomRosterSlotStatus.ABSENT,
  WarRoomRosterSlotStatus.JUSTIFIED_ABSENCE,
];
const ATTENDANCE_STATUSES: WarRoomRosterSlotStatus[] = [
  WarRoomRosterSlotStatus.PRESENT,
  WarRoomRosterSlotStatus.ABSENT,
  WarRoomRosterSlotStatus.JUSTIFIED_ABSENCE,
];

@Injectable()
export class WarRoomService {
  constructor(
    private readonly repository: WarRoomRepository,
    private readonly auditService: AuditService,
  ) {}

  async listOperations() {
    return this.repository.client.warRoomOperation.findMany({
      include: this.operationInclude(),
      orderBy: [
        { status: 'asc' },
        { startsAt: 'asc' },
      ],
      take: 300,
    });
  }

  async getOperation(operationId: string) {
    const operation = await this.repository.client.warRoomOperation.findUnique({
      where: { id: operationId },
      include: this.operationInclude(),
    });

    if (!operation) {
      throw new NotFoundException('War Room operation not found.');
    }

    return operation;
  }

  async createOperation(actorId: string, data: CreateWarRoomOperationDto) {
    const dateRange = this.normalizeDateRange(data.startsAt, data.endsAt);
    const operation = await this.repository.client.warRoomOperation.create({
      data: {
        name: data.name.trim(),
        type: data.type,
        status: data.status ?? WarRoomOperationStatus.SCHEDULED,
        priority: data.priority ?? WarRoomOperationPriority.MEDIUM,
        startsAt: dateRange.startsAt,
        endsAt: dateRange.endsAt,
        mapRegion: this.optionalText(data.mapRegion),
        objective: this.optionalText(data.objective),
        staffNotes: this.optionalText(data.staffNotes),
        result: this.optionalText(data.result),
        internalLinks: this.normalizeLinks(data.internalLinks),
        event: data.eventId ? { connect: { id: data.eventId } } : undefined,
        createdBy: { connect: { id: actorId } },
      },
      include: this.operationInclude(),
    });

    await this.auditService.log({
      actorId,
      action: 'WAR_ROOM_OPERATION_CREATED',
      targetType: 'WarRoomOperation',
      targetId: operation.id,
      metadata: {
        type: operation.type,
        status: operation.status,
        startsAt: operation.startsAt,
        eventId: operation.eventId,
      },
    });

    return operation;
  }

  async updateOperation(operationId: string, actorId: string, data: UpdateWarRoomOperationDto) {
    const existing = await this.getOperation(operationId);
    const startsAt = data.startsAt ? new Date(data.startsAt) : existing.startsAt;
    const endsAt = data.endsAt ? new Date(data.endsAt) : existing.endsAt;
    this.assertDateRange(startsAt, endsAt);

    const updated = await this.repository.client.warRoomOperation.update({
      where: { id: operationId },
      data: {
        name: data.name?.trim(),
        type: data.type,
        status: data.status,
        priority: data.priority,
        startsAt: data.startsAt ? startsAt : undefined,
        endsAt: data.endsAt ? endsAt : undefined,
        mapRegion: data.mapRegion === undefined ? undefined : this.optionalText(data.mapRegion) ?? null,
        objective: data.objective === undefined ? undefined : this.optionalText(data.objective) ?? null,
        staffNotes: data.staffNotes === undefined ? undefined : this.optionalText(data.staffNotes) ?? null,
        result: data.result === undefined ? undefined : this.optionalText(data.result) ?? null,
        internalLinks: data.internalLinks === undefined ? undefined : this.normalizeLinks(data.internalLinks),
        event: data.eventId === undefined ? undefined : data.eventId ? { connect: { id: data.eventId } } : { disconnect: true },
      },
      include: this.operationInclude(),
    });

    await this.auditService.log({
      actorId,
      action: 'WAR_ROOM_OPERATION_UPDATED',
      targetType: 'WarRoomOperation',
      targetId: operationId,
      metadata: {
        previousStatus: existing.status,
        status: updated.status,
        resultChanged: existing.result !== updated.result,
        eventId: updated.eventId,
      },
    });

    if (existing.result !== updated.result) {
      await this.auditService.log({
        actorId,
        action: 'WAR_ROOM_OPERATION_RESULT_UPDATED',
        targetType: 'WarRoomOperation',
        targetId: operationId,
        metadata: {
          previousResult: existing.result,
          result: updated.result,
        },
      });
    }

    return updated;
  }

  async openOperation(operationId: string, actorId: string) {
    return this.setStatus(operationId, actorId, WarRoomOperationStatus.ACTIVE, 'WAR_ROOM_OPERATION_OPENED');
  }

  async closeOperation(operationId: string, actorId: string, data: CloseWarRoomOperationDto) {
    const operation = await this.repository.client.warRoomOperation.update({
      where: { id: operationId },
      data: {
        status: WarRoomOperationStatus.CLOSED,
        result: data.result === undefined ? undefined : this.optionalText(data.result) ?? null,
        score: data.score === undefined ? undefined : this.optionalText(data.score) ?? null,
        improvementNotes: data.improvementNotes === undefined ? undefined : this.optionalText(data.improvementNotes) ?? null,
      },
      include: this.operationInclude(),
    });

    await this.auditService.log({
      actorId,
      action: 'WAR_ROOM_OPERATION_CLOSED',
      targetType: 'WarRoomOperation',
      targetId: operationId,
      metadata: {
        result: operation.result,
        score: operation.score,
      },
    });

    await this.repository.client.warRoomTimelineEvent.create({
      data: {
        operation: { connect: { id: operationId } },
        type: 'CLOSED',
        title: 'Operacao encerrada',
        note: this.optionalText(data.result),
        metadata: {
          score: operation.score,
          improvementNotes: operation.improvementNotes,
        },
        createdBy: { connect: { id: actorId } },
      },
    });

    return operation;
  }

  async cancelOperation(operationId: string, actorId: string) {
    return this.setStatus(operationId, actorId, WarRoomOperationStatus.CANCELLED, 'WAR_ROOM_OPERATION_CANCELLED');
  }

  async getLiveDossier(operationId: string) {
    const roster = await this.getOperationRoster(operationId);
    const timeline = await this.repository.client.warRoomTimelineEvent.findMany({
      where: { operationId },
      include: {
        createdBy: {
          select: {
            id: true,
            discordUsername: true,
            discordNickname: true,
          },
        },
      },
      orderBy: [
        { occurredAt: 'asc' },
        { createdAt: 'asc' },
      ],
      take: 500,
    });

    return {
      operation: roster.operation,
      roster,
      checklist: this.buildLiveChecklist(roster),
      timeline,
      generatedAt: new Date(),
    };
  }

  async createTimelineEvent(operationId: string, actorId: string, data: CreateWarRoomTimelineEventDto) {
    await this.getOperation(operationId);
    const occurredAt = data.occurredAt ? new Date(data.occurredAt) : new Date();
    if (Number.isNaN(occurredAt.getTime())) {
      throw new BadRequestException('Invalid timeline event time.');
    }

    const event = await this.repository.client.warRoomTimelineEvent.create({
      data: {
        operation: { connect: { id: operationId } },
        type: data.type,
        occurredAt,
        title: data.title.trim(),
        note: this.optionalText(data.note),
        metadata: (data.metadata ?? {}) as Prisma.InputJsonObject,
        createdBy: { connect: { id: actorId } },
      },
      include: {
        createdBy: {
          select: {
            id: true,
            discordUsername: true,
            discordNickname: true,
          },
        },
      },
    });

    await this.auditService.log({
      actorId,
      action: 'WAR_ROOM_TIMELINE_EVENT_CREATED',
      targetType: 'WarRoomTimelineEvent',
      targetId: event.id,
      metadata: {
        operationId,
        type: event.type,
        occurredAt: event.occurredAt,
      },
    });

    return event;
  }

  async getAfterActionReport(operationId: string) {
    const roster = await this.getOperationRoster(operationId);
    const timeline = await this.repository.client.warRoomTimelineEvent.findMany({
      where: { operationId },
      include: {
        createdBy: {
          select: {
            id: true,
            discordUsername: true,
            discordNickname: true,
          },
        },
      },
      orderBy: [
        { occurredAt: 'asc' },
        { createdAt: 'asc' },
      ],
      take: 500,
    });

    const planned = {
      totalSlots: roster.slots.length,
      frontline: roster.slots.filter((slot) => slot.role === PlayerCombatRole.FRONTLINE).length,
      support: roster.slots.filter((slot) => slot.role === PlayerCombatRole.SUPPORT).length,
      callers: roster.slots.filter((slot) => slot.role === PlayerCombatRole.CALLER).length,
      reserves: roster.slots.filter((slot) => slot.role === PlayerCombatRole.RESERVE).length,
    };
    const actual = {
      present: roster.slots.filter((slot) => slot.status === WarRoomRosterSlotStatus.PRESENT).length,
      absent: roster.slots.filter((slot) => slot.status === WarRoomRosterSlotStatus.ABSENT).length,
      justifiedAbsence: roster.slots.filter((slot) => slot.status === WarRoomRosterSlotStatus.JUSTIFIED_ABSENCE).length,
      substitutions: timeline.filter((event) => event.type === 'SUBSTITUTION').length,
      contributions: timeline.filter((event) => event.type === 'CONTRIBUTION').length,
      risks: timeline.filter((event) => event.type === 'RISK').length,
      wipes: timeline.filter((event) => event.type === 'WIPE').length,
      objectives: timeline.filter((event) => event.type === 'OBJECTIVE_CAPTURED').length,
    };
    const signals = this.buildAfterActionSignals(roster.operation, planned, actual);

    return {
      operation: roster.operation,
      roster,
      timeline,
      planned,
      actual,
      signals,
      markdown: this.buildAfterActionMarkdown(roster.operation, planned, actual, signals, timeline),
      generatedAt: new Date(),
    };
  }

  async getOperationRoster(operationId: string) {
    const operation = await this.getOperation(operationId);
    const slots = await this.repository.client.warRoomRosterSlot.findMany({
      where: { operationId },
      include: this.rosterSlotInclude(),
      orderBy: [
        { role: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    const slotsWithConflicts = await this.attachRosterConflicts(operation, slots);
    const assignedPlayerIds = slotsWithConflicts.map((slot) => slot.playerId);
    const candidates = await this.repository.client.player.findMany({
      where: {
        isActive: true,
        id: assignedPlayerIds.length > 0 ? { notIn: assignedPlayerIds } : undefined,
      },
      include: { combatProfile: true },
      orderBy: [
        { dimensionalLayer: 'desc' },
        { attendancePercentage: 'desc' },
        { nickname: 'asc' },
      ],
      take: 200,
    });

    const compositionImpact = this.buildCompositionImpact(slotsWithConflicts);
    return {
      operation,
      slots: slotsWithConflicts,
      summary: this.buildRosterSummary(slotsWithConflicts),
      compositionImpact,
      suggestions: this.buildRosterSuggestions(candidates, compositionImpact),
    };
  }

  async createRosterSlot(operationId: string, actorId: string, data: CreateWarRoomRosterSlotDto) {
    await this.getOperation(operationId);
    await this.assertPlayerExists(data.playerId);

    const slot = await this.repository.client.warRoomRosterSlot.create({
      data: {
        operation: { connect: { id: operationId } },
        player: { connect: { id: data.playerId } },
        role: data.role,
        requiredClass: data.requiredClass,
        requiredLayer: data.requiredLayer,
        publicInstructionsPt: this.optionalText(data.publicInstructionsPt),
        publicInstructionsEn: this.optionalText(data.publicInstructionsEn),
        staffNote: this.optionalText(data.staffNote),
        createdBy: { connect: { id: actorId } },
      },
      include: this.rosterSlotInclude(),
    });

    await this.auditService.log({
      actorId,
      action: 'WAR_ROOM_ROSTER_SLOT_CREATED',
      targetType: 'WarRoomRosterSlot',
      targetId: slot.id,
      metadata: {
        operationId,
        playerId: slot.playerId,
        role: slot.role,
        requiredClass: slot.requiredClass,
        requiredLayer: slot.requiredLayer,
      },
    });

    return slot;
  }

  async updateRosterSlot(operationId: string, slotId: string, actorId: string, data: UpdateWarRoomRosterSlotDto) {
    await this.assertRosterSlotBelongsToOperation(operationId, slotId);

    const updated = await this.repository.client.warRoomRosterSlot.update({
      where: { id: slotId },
      data: {
        role: data.role,
        status: data.status,
        requiredClass: data.requiredClass === undefined ? undefined : data.requiredClass,
        requiredLayer: data.requiredLayer === undefined ? undefined : data.requiredLayer,
        publicInstructionsPt: data.publicInstructionsPt === undefined ? undefined : this.optionalText(data.publicInstructionsPt) ?? null,
        publicInstructionsEn: data.publicInstructionsEn === undefined ? undefined : this.optionalText(data.publicInstructionsEn) ?? null,
        staffNote: data.staffNote === undefined ? undefined : this.optionalText(data.staffNote) ?? null,
        confirmedAt: data.status === WarRoomRosterSlotStatus.CONFIRMED ? new Date() : undefined,
      },
      include: this.rosterSlotInclude(),
    });

    await this.auditService.log({
      actorId,
      action: 'WAR_ROOM_ROSTER_SLOT_UPDATED',
      targetType: 'WarRoomRosterSlot',
      targetId: slotId,
      metadata: {
        operationId,
        playerId: updated.playerId,
        status: updated.status,
        role: updated.role,
      },
    });

    return updated;
  }

  async markAttendance(operationId: string, slotId: string, actorId: string, data: MarkWarRoomAttendanceDto) {
    if (!ATTENDANCE_STATUSES.includes(data.status)) {
      throw new BadRequestException('Attendance status must be PRESENT, ABSENT or JUSTIFIED_ABSENCE.');
    }

    await this.assertRosterSlotBelongsToOperation(operationId, slotId);
    const updated = await this.repository.client.warRoomRosterSlot.update({
      where: { id: slotId },
      data: {
        status: data.status,
        staffNote: data.staffNote === undefined ? undefined : this.optionalText(data.staffNote) ?? null,
        attendanceMarkedAt: new Date(),
        attendanceMarkedBy: { connect: { id: actorId } },
      },
      include: this.rosterSlotInclude(),
    });

    await this.auditService.log({
      actorId,
      action: 'WAR_ROOM_ROSTER_ATTENDANCE_MARKED',
      targetType: 'WarRoomRosterSlot',
      targetId: slotId,
      metadata: {
        operationId,
        playerId: updated.playerId,
        status: updated.status,
      },
    });

    return updated;
  }

  async listPlayerAssignments(userId: string) {
    const player = await this.getPrimaryPlayerForUser(userId);
    const slots = await this.repository.client.warRoomRosterSlot.findMany({
      where: {
        playerId: player.id,
        operation: {
          status: { in: CONFIRMABLE_OPERATION_STATUSES },
        },
      },
      include: {
        operation: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            startsAt: true,
            endsAt: true,
            mapRegion: true,
            objective: true,
          },
        },
      },
      orderBy: {
        operation: { startsAt: 'asc' },
      },
      take: 50,
    });

    return slots.map((slot) => ({
      operation: slot.operation,
      slot: {
        id: slot.id,
        operationId: slot.operationId,
        playerId: slot.playerId,
        role: slot.role,
        status: slot.status,
        publicInstructionsPt: slot.publicInstructionsPt,
        publicInstructionsEn: slot.publicInstructionsEn,
        playerNote: slot.playerNote,
        confirmedAt: slot.confirmedAt,
      },
    }));
  }

  async confirmPlayerSlot(userId: string, slotId: string, data: PlayerWarRoomConfirmationDto) {
    return this.setPlayerSlotStatus(userId, slotId, WarRoomRosterSlotStatus.CONFIRMED, data, 'WAR_ROOM_ROSTER_SLOT_CONFIRMED');
  }

  async declinePlayerSlot(userId: string, slotId: string, data: PlayerWarRoomConfirmationDto) {
    return this.setPlayerSlotStatus(userId, slotId, WarRoomRosterSlotStatus.DECLINED, data, 'WAR_ROOM_ROSTER_SLOT_DECLINED');
  }

  private async setStatus(operationId: string, actorId: string, status: WarRoomOperationStatus, action: string) {
    const existing = await this.getOperation(operationId);
    const operation = await this.repository.client.warRoomOperation.update({
      where: { id: operationId },
      data: { status },
      include: this.operationInclude(),
    });

    await this.auditService.log({
      actorId,
      action,
      targetType: 'WarRoomOperation',
      targetId: operationId,
      metadata: {
        previousStatus: existing.status,
        status,
      },
    });

    return operation;
  }

  private operationInclude() {
    return {
      event: {
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          startsAt: true,
          checklist: true,
        },
      },
    };
  }

  private rosterSlotInclude() {
    return {
      player: {
        select: {
          id: true,
          nickname: true,
          class: true,
          dimensionalLayer: true,
          attendancePercentage: true,
          combatProfile: {
            select: {
              primaryClass: true,
              secondaryClass: true,
              declaredBuild: true,
              preferredRole: true,
              acceptedRoles: true,
              availability: true,
            },
          },
        },
      },
    };
  }

  private async assertPlayerExists(playerId: string) {
    const player = await this.repository.client.player.findUnique({
      where: { id: playerId },
      select: { id: true },
    });

    if (!player) {
      throw new NotFoundException('Player not found.');
    }
  }

  private async assertRosterSlotBelongsToOperation(operationId: string, slotId: string) {
    const slot = await this.repository.client.warRoomRosterSlot.findUnique({
      where: { id: slotId },
      select: { operationId: true },
    });

    if (!slot || slot.operationId !== operationId) {
      throw new NotFoundException('War Room roster slot not found.');
    }
  }

  private async getPrimaryPlayerForUser(userId: string) {
    const user = await this.repository.client.user.findUnique({
      where: { id: userId },
      include: {
        players: {
          where: { isActive: true },
          orderBy: { joinedAt: 'asc' },
          take: 1,
        },
      },
    });

    const player = user?.players[0];
    if (!player) {
      throw new NotFoundException('Player profile not found.');
    }

    return player;
  }

  private async setPlayerSlotStatus(
    userId: string,
    slotId: string,
    status: WarRoomRosterSlotStatus,
    data: PlayerWarRoomConfirmationDto,
    action: string,
  ) {
    const player = await this.getPrimaryPlayerForUser(userId);
    const slot = await this.repository.client.warRoomRosterSlot.findUnique({
      where: { id: slotId },
      include: { operation: true },
    });

    if (!slot || slot.playerId !== player.id) {
      throw new NotFoundException('War Room assignment not found.');
    }

    if (!CONFIRMABLE_OPERATION_STATUSES.includes(slot.operation.status)) {
      throw new ForbiddenException('This operation is not accepting confirmations.');
    }

    const updated = await this.repository.client.warRoomRosterSlot.update({
      where: { id: slotId },
      data: {
        status,
        playerNote: data.playerNote === undefined ? undefined : this.optionalText(data.playerNote) ?? null,
        confirmedAt: status === WarRoomRosterSlotStatus.CONFIRMED ? new Date() : null,
      },
      include: {
        operation: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            startsAt: true,
            endsAt: true,
            mapRegion: true,
            objective: true,
          },
        },
      },
    });

    await this.auditService.log({
      actorId: userId,
      action,
      targetType: 'WarRoomRosterSlot',
      targetId: slotId,
      metadata: {
        operationId: slot.operationId,
        playerId: player.id,
        status,
      },
    });

    return {
      operation: updated.operation,
      slot: {
        id: updated.id,
        operationId: updated.operationId,
        playerId: updated.playerId,
        role: updated.role,
        status: updated.status,
        publicInstructionsPt: updated.publicInstructionsPt,
        publicInstructionsEn: updated.publicInstructionsEn,
        playerNote: updated.playerNote,
        confirmedAt: updated.confirmedAt,
      },
    };
  }

  private buildRosterSummary(slots: Array<{ status: WarRoomRosterSlotStatus; role: PlayerCombatRole }>) {
    return {
      total: slots.length,
      pending: slots.filter((slot) => slot.status === WarRoomRosterSlotStatus.PENDING).length,
      confirmed: slots.filter((slot) => slot.status === WarRoomRosterSlotStatus.CONFIRMED).length,
      declined: slots.filter((slot) => slot.status === WarRoomRosterSlotStatus.DECLINED).length,
      present: slots.filter((slot) => slot.status === WarRoomRosterSlotStatus.PRESENT).length,
      absent: slots.filter((slot) => slot.status === WarRoomRosterSlotStatus.ABSENT).length,
      justifiedAbsence: slots.filter((slot) => slot.status === WarRoomRosterSlotStatus.JUSTIFIED_ABSENCE).length,
      reserves: slots.filter((slot) => slot.role === PlayerCombatRole.RESERVE).length,
    };
  }

  private buildCompositionImpact(slots: Array<{ status: WarRoomRosterSlotStatus; role: PlayerCombatRole; player: { class: PlayerClass; combatProfile?: { primaryClass: PlayerClass; secondaryClass: PlayerClass | null } | null } }>) {
    const activeSlots = slots.filter((slot) => slot.status !== WarRoomRosterSlotStatus.DECLINED);
    const roleTargets: Array<{ role: PlayerCombatRole; target: number }> = [
      { role: PlayerCombatRole.FRONTLINE, target: 2 },
      { role: PlayerCombatRole.SUPPORT, target: 1 },
      { role: PlayerCombatRole.CALLER, target: 1 },
      { role: PlayerCombatRole.FLEX, target: 2 },
    ];
    const roles = roleTargets.map(({ role, target }) => {
      const count = activeSlots.filter((slot) => slot.role === role).length;
      return { role, count, target, missing: Math.max(0, target - count) };
    });
    const classCounts = new Map<PlayerClass, number>();
    for (const slot of activeSlots) {
      const playerClass = slot.player.combatProfile?.primaryClass ?? slot.player.class;
      classCounts.set(playerClass, (classCounts.get(playerClass) ?? 0) + 1);
    }
    const shortages = roles
      .filter((role) => role.missing > 0)
      .map((role) => ({
        key: `MISSING_${role.role}`,
        label: `Falta ${role.role}`,
        detail: `Composicao atual tem ${role.count}/${role.target} para ${role.role}.`,
        severity: role.role === PlayerCombatRole.FRONTLINE || role.role === PlayerCombatRole.SUPPORT ? 'warning' as const : 'info' as const,
      }));

    return {
      roles,
      classes: Array.from(classCounts.entries()).map(([playerClass, count]) => ({ class: playerClass, count })),
      shortages,
    };
  }

  private buildRosterSuggestions(
    candidates: Array<{
      id: string;
      nickname: string;
      class: PlayerClass;
      dimensionalLayer: number;
      attendancePercentage: number;
      combatProfile?: {
        primaryClass: PlayerClass;
        secondaryClass: PlayerClass | null;
        declaredBuild: string | null;
        preferredRole: PlayerCombatRole | null;
        acceptedRoles: PlayerCombatRole[];
        availability: string;
      } | null;
    }>,
    compositionImpact: ReturnType<WarRoomService['buildCompositionImpact']>,
  ) {
    const missingRole = compositionImpact.roles.find((role) => role.missing > 0)?.role;

    return candidates
      .map((player) => {
        const profile = player.combatProfile;
        const recommendedRole = this.pickSuggestedRole(player, missingRole);
        const reasons = [
          `Camada ${player.dimensionalLayer}`,
          `Presenca ${Math.round(player.attendancePercentage)}%`,
        ];
        const warnings: string[] = [];
        let score = player.dimensionalLayer * 10 + Math.round(player.attendancePercentage);

        if (profile?.preferredRole === recommendedRole) {
          score += 25;
          reasons.push(`prefere ${recommendedRole}`);
        } else if (profile?.acceptedRoles?.includes(recommendedRole)) {
          score += 15;
          reasons.push(`aceita ${recommendedRole}`);
        }

        if (profile?.declaredBuild) {
          score += 5;
          reasons.push(`build: ${profile.declaredBuild}`);
        } else {
          warnings.push('build nao declarada');
        }

        if (player.attendancePercentage < 50) warnings.push('presenca historica baixa');
        if (!profile || profile.availability === 'UNSET') warnings.push('disponibilidade incompleta');

        return {
          playerId: player.id,
          nickname: player.nickname,
          class: profile?.primaryClass ?? player.class,
          dimensionalLayer: player.dimensionalLayer,
          attendancePercentage: player.attendancePercentage,
          recommendedRole,
          score,
          reasons,
          warnings,
          availability: profile?.availability ?? null,
        };
      })
      .sort((a, b) => b.score - a.score || b.dimensionalLayer - a.dimensionalLayer || a.nickname.localeCompare(b.nickname))
      .slice(0, 8);
  }

  private pickSuggestedRole(
    player: { combatProfile?: { preferredRole: PlayerCombatRole | null; acceptedRoles: PlayerCombatRole[] } | null },
    missingRole?: PlayerCombatRole,
  ) {
    const profile = player.combatProfile;
    if (missingRole && (profile?.preferredRole === missingRole || profile?.acceptedRoles?.includes(missingRole))) {
      return missingRole;
    }

    return profile?.preferredRole ?? profile?.acceptedRoles?.[0] ?? missingRole ?? PlayerCombatRole.FLEX;
  }

  private buildLiveChecklist(roster: Awaited<ReturnType<WarRoomService['getOperationRoster']>>) {
    const slots = roster.slots;
    const conflictCount = slots.reduce((total, slot) => total + (slot.conflicts?.length ?? 0), 0);
    const confirmed = slots.filter((slot) => slot.status === WarRoomRosterSlotStatus.CONFIRMED || slot.status === WarRoomRosterSlotStatus.PRESENT).length;
    const frontline = slots.filter((slot) => slot.role === PlayerCombatRole.FRONTLINE && slot.status !== WarRoomRosterSlotStatus.DECLINED).length;
    const support = slots.filter((slot) => slot.role === PlayerCombatRole.SUPPORT && slot.status !== WarRoomRosterSlotStatus.DECLINED).length;
    const callers = slots.filter((slot) => slot.role === PlayerCombatRole.CALLER && slot.status !== WarRoomRosterSlotStatus.DECLINED).length;
    const hasObjective = Boolean(roster.operation.objective?.trim());
    const eventChecklist = this.readEventChecklist(roster.operation.event?.checklist);

    return [
      ...eventChecklist.map((item) => ({
        key: `event-${item.key}`,
        label: item.label,
        ready: item.checked,
        detail: item.detail ?? (item.checked ? 'Checklist do evento marcado.' : 'Pendente no checklist do evento vinculado.'),
      })),
      {
        key: 'objective',
        label: 'Objetivo definido',
        ready: hasObjective,
        detail: hasObjective ? 'Objetivo da operacao registrado.' : 'Defina o objetivo antes de abrir a call.',
      },
      {
        key: 'confirmed-roster',
        label: 'Confirmacoes suficientes',
        ready: slots.length > 0 && confirmed >= Math.ceil(slots.length * 0.7),
        detail: `${confirmed}/${slots.length} escalados confirmados ou presentes.`,
      },
      {
        key: 'frontline',
        label: 'Frontline escalada',
        ready: frontline > 0,
        detail: frontline > 0 ? `${frontline} frontline(s) na escala.` : 'Sem frontline ativa na escala.',
      },
      {
        key: 'support',
        label: 'Suporte escalado',
        ready: support > 0,
        detail: support > 0 ? `${support} suporte(s) na escala.` : 'Sem suporte ativo na escala.',
      },
      {
        key: 'caller',
        label: 'Caller definido',
        ready: callers > 0,
        detail: callers > 0 ? `${callers} caller(s) ou shotcaller(s) escalados.` : 'Sem caller definido.',
      },
      {
        key: 'conflicts',
        label: 'Conflitos revisados',
        ready: conflictCount === 0,
        detail: conflictCount === 0 ? 'Nenhum conflito operacional aberto.' : `${conflictCount} alerta(s) na escala.`,
      },
    ];
  }

  private readEventChecklist(value: unknown): Array<{ key: string; label: string; detail?: string; checked: boolean }> {
    if (!Array.isArray(value)) return [];

    return value
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
      .map((item) => ({
        key: String(item.key ?? ''),
        label: String(item.label ?? item.key ?? ''),
        detail: typeof item.detail === 'string' ? item.detail : undefined,
        checked: Boolean(item.checked),
      }))
      .filter((item) => item.key && item.label);
  }

  private buildAfterActionSignals(
    operation: Awaited<ReturnType<WarRoomService['getOperation']>>,
    planned: { totalSlots: number; frontline: number; support: number; callers: number; reserves: number },
    actual: { present: number; absent: number; justifiedAbsence: number; substitutions: number; contributions: number; risks: number; wipes: number; objectives: number },
  ) {
    const attendanceRate = planned.totalSlots > 0 ? Math.round((actual.present / planned.totalSlots) * 100) : 0;
    const signals = [
      {
        key: 'attendance-rate',
        label: 'Presenca da escala',
        value: `${attendanceRate}%`,
        severity: attendanceRate >= 70 ? 'info' : attendanceRate >= 50 ? 'warning' : 'danger',
      },
      {
        key: 'objective-captures',
        label: 'Objetivos capturados',
        value: String(actual.objectives),
        severity: actual.objectives > 0 ? 'info' : 'warning',
      },
      {
        key: 'wipes',
        label: 'Wipes registrados',
        value: String(actual.wipes),
        severity: actual.wipes > 2 ? 'danger' : actual.wipes > 0 ? 'warning' : 'info',
      },
      {
        key: 'substitutions',
        label: 'Substituicoes',
        value: String(actual.substitutions),
        severity: actual.substitutions > 2 ? 'warning' : 'info',
      },
      {
        key: 'improvements',
        label: 'Pontos de melhoria',
        value: operation.improvementNotes ? 'Registrado' : 'Pendente',
        severity: operation.improvementNotes ? 'info' : 'warning',
      },
    ];

    return signals;
  }

  private buildAfterActionMarkdown(
    operation: Awaited<ReturnType<WarRoomService['getOperation']>>,
    planned: { totalSlots: number; frontline: number; support: number; callers: number; reserves: number },
    actual: { present: number; absent: number; justifiedAbsence: number; substitutions: number; contributions: number; risks: number; wipes: number; objectives: number },
    signals: Array<{ label: string; value: string; severity: string }>,
    timeline: Array<{ type: string; title: string; note: string | null; occurredAt: Date }>,
  ) {
    const lines = [
      `# Pos-guerra - ${operation.name}`,
      '',
      `- Tipo: ${operation.type}`,
      `- Janela: ${operation.startsAt.toISOString()} ate ${operation.endsAt.toISOString()}`,
      `- Resultado: ${operation.result ?? '-'}`,
      `- Placar: ${operation.score ?? '-'}`,
      `- Objetivo: ${operation.objective ?? '-'}`,
      '',
      '## Planejado vs realizado',
      '',
      `- Escalados: ${planned.totalSlots}`,
      `- Frontline/Suporte/Caller/Reserva: ${planned.frontline}/${planned.support}/${planned.callers}/${planned.reserves}`,
      `- Presentes/Ausentes/Justificados: ${actual.present}/${actual.absent}/${actual.justifiedAbsence}`,
      `- Objetivos/Wipes/Substituicoes/Contribuicoes/Riscos: ${actual.objectives}/${actual.wipes}/${actual.substitutions}/${actual.contributions}/${actual.risks}`,
      '',
      '## Sinais',
      '',
      ...signals.map((signal) => `- ${signal.label}: ${signal.value} (${signal.severity})`),
      '',
      '## Pontos de melhoria',
      '',
      operation.improvementNotes ?? '-',
      '',
      '## Timeline',
      '',
      ...timeline.slice(-20).map((event) => `- ${event.occurredAt.toISOString()} [${event.type}] ${event.title}${event.note ? ` - ${event.note}` : ''}`),
    ];

    return lines.join('\n');
  }

  private async attachRosterConflicts<
    TSlot extends {
      id: string;
      operationId: string;
      playerId: string;
      status: WarRoomRosterSlotStatus;
      requiredClass: PlayerClass | null;
      requiredLayer: number | null;
      player: {
        class: PlayerClass;
        dimensionalLayer: number;
        attendancePercentage: number;
        combatProfile: {
          primaryClass: PlayerClass;
          secondaryClass: PlayerClass | null;
        } | null;
      };
    },
  >(operation: Awaited<ReturnType<WarRoomService['getOperation']>>, slots: TSlot[]) {
    const playerIds = slots.map((slot) => slot.playerId);
    const [latestStatuses, overlappingSlots] = await Promise.all([
      this.repository.client.playerProgress.findMany({
        where: {
          playerId: { in: playerIds },
          category: ProgressCategory.STATUS,
        },
        select: { playerId: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.repository.client.warRoomRosterSlot.findMany({
        where: {
          playerId: { in: playerIds },
          operationId: { not: operation.id },
          status: { in: OPEN_SLOT_STATUSES },
          operation: {
            status: { notIn: [WarRoomOperationStatus.CANCELLED, WarRoomOperationStatus.CLOSED] },
            startsAt: { lt: operation.endsAt },
            endsAt: { gt: operation.startsAt },
          },
        },
        select: {
          playerId: true,
          operation: {
            select: {
              id: true,
              name: true,
              startsAt: true,
              endsAt: true,
            },
          },
        },
      }),
    ]);

    const latestByPlayer = new Map<string, Date>();
    for (const status of latestStatuses) {
      if (!latestByPlayer.has(status.playerId)) {
        latestByPlayer.set(status.playerId, status.createdAt);
      }
    }

    const overlapsByPlayer = new Map<string, typeof overlappingSlots>();
    for (const overlap of overlappingSlots) {
      overlapsByPlayer.set(overlap.playerId, [...(overlapsByPlayer.get(overlap.playerId) ?? []), overlap]);
    }

    const staleBefore = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    return slots.map((slot) => {
      const conflicts = [];
      for (const overlap of overlapsByPlayer.get(slot.playerId) ?? []) {
        conflicts.push({
          key: 'OVERLAPPING_OPERATION',
          label: 'Operacao sobreposta',
          detail: `Player tambem esta escalado em ${overlap.operation.name}.`,
          severity: 'danger',
          relatedOperationId: overlap.operation.id,
          relatedOperationName: overlap.operation.name,
          relatedStartsAt: overlap.operation.startsAt,
          relatedEndsAt: overlap.operation.endsAt,
        });
      }

      const latestStatus = latestByPlayer.get(slot.playerId);
      if (!latestStatus || latestStatus < staleBefore) {
        conflicts.push({
          key: 'STALE_STATUS',
          label: 'Status desatualizado',
          detail: latestStatus ? 'Ultimo status tem mais de 14 dias.' : 'Nenhum status recente encontrado.',
          severity: 'warning',
        });
      }

      if (slot.requiredLayer && slot.player.dimensionalLayer < slot.requiredLayer) {
        conflicts.push({
          key: 'LOW_LAYER',
          label: 'Camada abaixo do esperado',
          detail: `Camada ${slot.player.dimensionalLayer}, esperado ${slot.requiredLayer}.`,
          severity: 'warning',
        });
      }

      if (slot.requiredClass && !this.playerMatchesRequiredClass(slot.player, slot.requiredClass)) {
        conflicts.push({
          key: 'MISSING_CLASS',
          label: 'Classe ausente',
          detail: `Escala pede ${slot.requiredClass}, player esta como ${slot.player.class}.`,
          severity: 'warning',
        });
      }

      if (slot.player.attendancePercentage < 50) {
        conflicts.push({
          key: 'LOW_ATTENDANCE',
          label: 'Presenca baixa',
          detail: `Presenca historica em ${Math.round(slot.player.attendancePercentage)}%.`,
          severity: 'warning',
        });
      }

      return { ...slot, conflicts };
    });
  }

  private playerMatchesRequiredClass(
    player: {
      class: PlayerClass;
      combatProfile: { primaryClass: PlayerClass; secondaryClass: PlayerClass | null } | null;
    },
    requiredClass: PlayerClass,
  ): boolean {
    return player.class === requiredClass || player.combatProfile?.primaryClass === requiredClass || player.combatProfile?.secondaryClass === requiredClass;
  }

  private normalizeDateRange(startsAt: string, endsAt: string) {
    const range = {
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
    };
    this.assertDateRange(range.startsAt, range.endsAt);
    return range;
  }

  private assertDateRange(startsAt: Date, endsAt: Date): void {
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new BadRequestException('Invalid operation window.');
    }

    if (endsAt <= startsAt) {
      throw new BadRequestException('Operation end must be after start.');
    }
  }

  private optionalText(value?: string): string | undefined {
    const text = value?.trim();
    return text || undefined;
  }

  private normalizeLinks(links?: WarRoomInternalLinkDto[]): Prisma.InputJsonArray {
    return (links ?? [])
      .map((link) => ({
        label: link.label.trim(),
        href: link.href.trim(),
      }))
      .filter((link) => link.label && link.href)
      .slice(0, 12);
  }
}
