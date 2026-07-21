import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventReserveStatus, EventRsvpNoteVisibility, EventRsvpStatus, EventStatus, Prisma } from '@prisma/client';
import type { EventCompositionTarget } from '@shared/types/events';
import { PrismaService } from '@database/prisma.service';
import type { EventRsvpStaffSummary, PlayerEventCommitment } from '@shared/types/events';
import { AuditService } from '../../audit/services/audit.service';
import { JustifyEventNoShowDto, RespondEventRsvpDto } from '../dto';

@Injectable()
export class EventRsvpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listMyCommitments(userId: string): Promise<PlayerEventCommitment<Date>[]> {
    const player = await this.getPrimaryPlayer(userId);
    const events = await this.prisma.event.findMany({
      where: {
        status: { in: [EventStatus.OPEN, EventStatus.ATTENDANCE_REGISTRATION] },
        startsAt: { gte: new Date() },
      },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        operationalCategory: true,
        priority: true,
        dkpReward: true,
        startsAt: true,
        endsAt: true,
        finalizedAt: true,
        attendanceBatchId: true,
        batchOrder: true,
        rsvps: {
          where: {
            OR: [
              { playerId: player.id },
              { noteVisibility: EventRsvpNoteVisibility.PLAYER_PUBLIC, note: { not: null } },
            ],
          },
          include: { player: { select: { nickname: true } } },
        },
        reserveEntries: {
          where: { playerId: player.id, status: { in: [EventReserveStatus.RESERVE, EventReserveStatus.PROMOTION_PENDING, EventReserveStatus.PROMOTED] } },
          select: {
            id: true, eventId: true, playerId: true, position: true, status: true,
            promotionRequestedAt: true, respondedAt: true, promotedAt: true, playerResponseNote: true, createdAt: true, updatedAt: true,
          },
        },
      },
      orderBy: [{ startsAt: 'asc' }, { batchOrder: 'asc' }],
      take: 100,
    });
    if (events.length === 0) return [];
    const absences = await this.prisma.playerAbsence.findMany({
      where: {
        startsAt: { lte: events[events.length - 1].startsAt },
        endsAt: { gt: events[0].startsAt },
        player: { isActive: true },
      },
      include: { player: { select: { nickname: true } } },
      orderBy: { startsAt: 'asc' },
    });

    return events.map(({ rsvps, reserveEntries, ...event }) => {
      const own = rsvps.find((rsvp) => rsvp.playerId === player.id) ?? null;
      const eventAbsences = absences.filter((row) => row.startsAt <= event.startsAt && row.endsAt > event.startsAt);
      const ownAbsence = eventAbsences.find((row) => row.playerId === player.id) ?? null;
      const absence = ownAbsence ? (({ player: _player, ...row }) => row)(ownAbsence) : null;
      return {
        event: { ...event, checklist: [], responsibleUserId: null, operationalNotes: null },
        myRsvp: own ? (({ player: _player, ...rsvp }) => rsvp)(own) : null,
        absence,
        requiresResponse: !absence && !own && !reserveEntries[0],
        reserve: reserveEntries[0] ?? null,
        absenceSummary: {
          unavailableCount: new Set(eventAbsences.map((row) => row.playerId)).size,
          sharedReasons: eventAbsences
            .filter((row) => row.reasonVisibility === 'PLAYER_PUBLIC' && row.reason)
            .map((row) => ({ nickname: row.player.nickname, reason: row.reason! })),
        },
        publicResponses: rsvps
          .filter((rsvp) => rsvp.playerId !== player.id && rsvp.noteVisibility === EventRsvpNoteVisibility.PLAYER_PUBLIC && rsvp.note)
          .map((rsvp) => ({ nickname: rsvp.player.nickname, status: rsvp.status, note: rsvp.note!, updatedAt: rsvp.updatedAt })),
      };
    }) as unknown as PlayerEventCommitment<Date>[];
  }

  async respond(eventId: string, userId: string, dto: RespondEventRsvpDto) {
    const [player, event] = await Promise.all([
      this.getPrimaryPlayer(userId),
      this.prisma.event.findUnique({ where: { id: eventId }, select: { id: true, name: true, status: true, startsAt: true } }),
    ]);
    if (!event) throw new NotFoundException(`Event ${eventId} was not found.`);
    if (event.status !== EventStatus.OPEN && event.status !== EventStatus.ATTENDANCE_REGISTRATION) {
      throw new BadRequestException('RSVP is closed for finalized or cancelled events.');
    }
    if (event.startsAt <= new Date()) {
      throw new BadRequestException('RSVP is closed after the event starts.');
    }
    const absence = await this.prisma.playerAbsence.findFirst({
      where: { playerId: player.id, startsAt: { lte: event.startsAt }, endsAt: { gt: event.startsAt } },
      select: { id: true },
    });
    if (absence) throw new BadRequestException('This event is already covered by a registered absence period.');

    const rsvp = await this.prisma.eventRsvp.upsert({
      where: { eventId_playerId: { eventId, playerId: player.id } },
      create: {
        eventId,
        playerId: player.id,
        status: dto.status,
        note: dto.note,
        noteVisibility: dto.noteVisibility ?? EventRsvpNoteVisibility.STAFF_ONLY,
      },
      update: {
        status: dto.status,
        note: dto.note ?? null,
        noteVisibility: dto.noteVisibility ?? EventRsvpNoteVisibility.STAFF_ONLY,
      },
    });
    await this.auditService.log({
      actorId: userId,
      action: 'EVENT_RSVP_UPDATED',
      targetType: 'EventRsvp',
      targetId: rsvp.id,
      metadata: { eventId, playerId: player.id, status: rsvp.status, noteVisibility: rsvp.noteVisibility },
    });
    return rsvp;
  }

  async listMyNoShows(userId: string) {
    const player = await this.getPrimaryPlayer(userId);
    return this.prisma.eventRsvp.findMany({
      where: { playerId: player.id, noShowDetectedAt: { not: null } },
      select: {
        eventId: true,
        noShowDetectedAt: true,
        noShowJustification: true,
        noShowJustifiedAt: true,
        event: { select: { name: true, startsAt: true } },
      },
      orderBy: { noShowDetectedAt: 'desc' },
      take: 30,
    }).then((rows) => rows.map((row) => ({
      eventId: row.eventId,
      eventName: row.event.name,
      startsAt: row.event.startsAt,
      detectedAt: row.noShowDetectedAt!,
      justification: row.noShowJustification,
      justifiedAt: row.noShowJustifiedAt,
    })));
  }

  async justifyNoShow(eventId: string, userId: string, dto: JustifyEventNoShowDto) {
    const player = await this.getPrimaryPlayer(userId);
    const rsvp = await this.prisma.eventRsvp.findUnique({
      where: { eventId_playerId: { eventId, playerId: player.id } },
      select: { id: true, noShowDetectedAt: true },
    });
    if (!rsvp?.noShowDetectedAt) throw new BadRequestException('No explainable no-show exists for this event.');
    const updated = await this.prisma.eventRsvp.update({
      where: { id: rsvp.id },
      data: { noShowJustification: dto.justification.trim(), noShowJustifiedAt: new Date() },
    });
    await this.auditService.log({
      actorId: userId,
      action: 'EVENT_NO_SHOW_JUSTIFIED',
      targetType: 'EventRsvp',
      targetId: rsvp.id,
      metadata: { eventId, playerId: player.id },
    });
    return updated;
  }

  async getStaffSummary(eventId: string): Promise<EventRsvpStaffSummary<Date>> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, startsAt: true, endsAt: true, compositionTargets: true },
    });
    if (!event) throw new NotFoundException(`Event ${eventId} was not found.`);
    const [activePlayers, responses, absenceImpacts, reserveEntries] = await Promise.all([
      this.prisma.player.count({ where: { isActive: true } }),
      this.prisma.eventRsvp.findMany({
        where: { eventId, player: { isActive: true } },
        include: {
          player: {
            select: {
              nickname: true,
              class: true,
              dimensionalLayer: true,
              timezone: true,
              combatProfile: { select: { primaryClass: true, preferredRole: true } },
            },
          },
        },
        orderBy: [{ status: 'asc' }, { player: { nickname: 'asc' } }],
      }),
      this.prisma.playerAbsence.findMany({
        where: {
          startsAt: { lte: event.startsAt },
          endsAt: { gt: event.startsAt },
          player: { isActive: true },
        },
        include: { player: { select: { nickname: true } } },
        orderBy: { player: { nickname: 'asc' } },
      }),
      this.prisma.eventReserveEntry.findMany({
        where: { eventId, status: { not: EventReserveStatus.REMOVED }, player: { isActive: true } },
        include: {
          player: {
            select: {
              nickname: true,
              class: true,
              dimensionalLayer: true,
              combatProfile: { select: { primaryClass: true, preferredRole: true } },
            },
          },
        },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    const absentPlayerIds = new Set(absenceImpacts.map((row) => row.playerId));
    const effectiveResponses = responses.filter((row) => !absentPlayerIds.has(row.playerId));
    const coveredPlayerIds = new Set([...responses.map((row) => row.playerId), ...absentPlayerIds]);
    const counts = {
      CONFIRMED: effectiveResponses.filter((row) => row.status === EventRsvpStatus.CONFIRMED).length,
      TENTATIVE: effectiveResponses.filter((row) => row.status === EventRsvpStatus.TENTATIVE).length,
      DECLINED: effectiveResponses.filter((row) => row.status === EventRsvpStatus.DECLINED).length,
      UNAVAILABLE_BY_ABSENCE: absentPlayerIds.size,
      UNANSWERED: Math.max(0, activePlayers - coveredPlayerIds.size),
    };
    const confirmed = effectiveResponses.filter((row) => row.status === EventRsvpStatus.CONFIRMED);
    const countBy = (values: Array<string | number | null | undefined>) => values.reduce<Record<string, number>>((result, value) => {
      const key = String(value ?? 'UNSET');
      result[key] = (result[key] ?? 0) + 1;
      return result;
    }, {});
    const targets = this.readCompositionTargets(event.compositionTargets).map((target) => {
      const confirmedCount = confirmed.filter((row) => {
        const playerClass = row.player.combatProfile?.primaryClass ?? row.player.class;
        const role = row.player.combatProfile?.preferredRole ?? null;
        return (!target.playerClass || target.playerClass === playerClass) && (!target.role || target.role === role);
      }).length;
      return { ...target, confirmed: confirmedCount, gap: Math.max(0, target.minimum - confirmedCount) };
    });
    const confirmedPlayerIds = confirmed.map((row) => row.playerId);
    const currentEndsAt = event.endsAt ?? new Date(event.startsAt.getTime() + 2 * 60 * 60 * 1000);
    const conflictCandidates = confirmedPlayerIds.length > 0 ? await this.prisma.eventRsvp.findMany({
      where: {
        playerId: { in: confirmedPlayerIds },
        status: EventRsvpStatus.CONFIRMED,
        eventId: { not: eventId },
        event: {
          status: { in: [EventStatus.OPEN, EventStatus.ATTENDANCE_REGISTRATION] },
          startsAt: { gte: new Date(event.startsAt.getTime() - 24 * 60 * 60 * 1000), lt: currentEndsAt },
        },
      },
      select: {
        playerId: true,
        player: { select: { nickname: true, timezone: true } },
        event: { select: { id: true, name: true, startsAt: true, endsAt: true } },
      },
    }) : [];
    const scheduleConflicts = conflictCandidates
      .filter((candidate) => (candidate.event.endsAt ?? new Date(candidate.event.startsAt.getTime() + 2 * 60 * 60 * 1000)) > event.startsAt)
      .map((candidate) => {
        const timezone = this.safeTimezone(candidate.player.timezone);
        return {
          playerId: candidate.playerId,
          nickname: candidate.player.nickname,
          timezone,
          conflictingEventId: candidate.event.id,
          conflictingEventName: candidate.event.name,
          currentEventLocal: this.localDateTime(event.startsAt, timezone),
          conflictingEventLocal: this.localDateTime(candidate.event.startsAt, timezone),
        };
      });
    const noShows = responses
      .filter((row) => row.noShowDetectedAt)
      .map((row) => ({
        playerId: row.playerId,
        nickname: row.player.nickname,
        detectedAt: row.noShowDetectedAt!,
        justification: row.noShowJustification,
        justifiedAt: row.noShowJustifiedAt,
      }));

    return {
      eventId,
      activePlayers,
      counts,
      confirmedComposition: {
        byClass: countBy(confirmed.map((row) => row.player.combatProfile?.primaryClass ?? row.player.class)),
        byRole: countBy(confirmed.map((row) => row.player.combatProfile?.preferredRole)),
        byLayer: countBy(confirmed.map((row) => row.player.dimensionalLayer)),
      },
      responses: responses.map(({ player, ...rsvp }) => ({
        ...rsvp,
        nickname: player.nickname,
        playerClass: player.combatProfile?.primaryClass ?? player.class,
        dimensionalLayer: player.dimensionalLayer,
        preferredRole: player.combatProfile?.preferredRole ?? null,
        unavailableByAbsence: absentPlayerIds.has(rsvp.playerId),
      })),
      absenceImpacts: absenceImpacts.map(({ player, ...absence }) => ({ ...absence, nickname: player.nickname })),
      compositionTargets: targets,
      reserveEntries: reserveEntries.map(({ player, ...entry }) => ({
        ...entry,
        nickname: player.nickname,
        playerClass: player.combatProfile?.primaryClass ?? player.class,
        dimensionalLayer: player.dimensionalLayer,
        preferredRole: player.combatProfile?.preferredRole ?? null,
      })),
      scheduleConflicts,
      noShows,
    };
  }

  async getPublicResponses(eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!event) throw new NotFoundException(`Event ${eventId} was not found.`);
    return this.prisma.eventRsvp.findMany({
      where: { eventId, noteVisibility: EventRsvpNoteVisibility.PLAYER_PUBLIC, player: { isActive: true } },
      select: { status: true, note: true, updatedAt: true, player: { select: { nickname: true } } },
      orderBy: { player: { nickname: 'asc' } },
    });
  }

  private async getPrimaryPlayer(userId: string): Promise<{ id: string }> {
    const player = await this.prisma.player.findFirst({
      where: { userId, isActive: true },
      select: { id: true },
      orderBy: { joinedAt: 'asc' },
    });
    if (!player) throw new NotFoundException('Authenticated user does not have an active player profile.');
    return player;
  }

  private readCompositionTargets(value: Prisma.JsonValue): EventCompositionTarget[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
      const target = item as Record<string, Prisma.JsonValue>;
      if (typeof target.minimum !== 'number') return [];
      return [{
        role: typeof target.role === 'string' ? target.role : null,
        playerClass: typeof target.playerClass === 'string' ? target.playerClass : null,
        minimum: target.minimum,
        label: typeof target.label === 'string' ? target.label : null,
      }];
    });
  }

  private safeTimezone(timezone?: string | null): string {
    const candidate = timezone?.trim() || 'America/Sao_Paulo';
    try {
      new Intl.DateTimeFormat('pt-BR', { timeZone: candidate }).format(new Date());
      return candidate;
    } catch {
      return 'America/Sao_Paulo';
    }
  }

  private localDateTime(date: Date, timezone: string): string {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, dateStyle: 'short', timeStyle: 'short' }).format(date);
  }
}
