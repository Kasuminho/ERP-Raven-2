import { BadRequestException, Injectable } from '@nestjs/common';
import { DKPTransactionType, Event, EventStatus, EventType, Prisma } from '@prisma/client';
import { AuditService } from '../../audit/services/audit.service';
import { BusinessRulesService } from '../../business-rules/business-rules.service';
import { DkpService } from '../../dkp/services/dkp.service';
import { NotificationService } from '../../discord/services/notification.service';
import { AttendanceStatsResponseDto, CreateEventDto, PlayerAttendanceHistoryRowDto } from '../dto';
import {
  DuplicateAttendanceException,
  EventNotFoundException,
  FinalizedEventModificationException,
  InvalidEventStateException,
  PlayerNotFoundForAttendanceException,
} from '../exceptions/attendance-domain.exceptions';
import { EventDetails, EventsRepository } from '../repositories/events.repository';

export type FinalizeEventResult = {
  event: Event;
  nextEvent: Event | null;
  copiedAttendanceCount: number;
  attendanceCopyStatus: 'COPIED' | 'NEXT_EVENT_NOT_EMPTY' | 'NO_NEXT_EVENT';
};

export type EventFinalizationChecklist = {
  eventId: string;
  eventName: string;
  eventType: EventType;
  status: EventStatus;
  dkpPerPlayer: number;
  totalDkp: number;
  presentCount: number;
  absentCount: number;
  activePlayerCount: number;
  presentPlayers: Array<{
    id: string;
    nickname: string;
    class: string;
    dimensionalLayer: number;
  }>;
  absentPlayers: Array<{
    id: string;
    nickname: string;
    class: string;
    dimensionalLayer: number;
  }>;
  currentBoss: {
    id: string;
    name: string;
    type: EventType;
    startsAt: Date;
    attendanceBatchId: string | null;
    batchOrder: number | null;
  };
  nextBatchEvent: {
    id: string;
    name: string;
    type: EventType;
    startsAt: Date;
    status: EventStatus;
    attendanceBatchId: string | null;
    batchOrder: number | null;
    existingAttendanceCount: number;
  } | null;
  attendanceCopy: {
    willCopy: boolean;
    status: 'WILL_COPY' | 'NEXT_EVENT_NOT_EMPTY' | 'NO_NEXT_EVENT';
    targetEventId?: string;
    targetEventName?: string;
    copiedCountEstimate: number;
    messagePt: string;
  };
  warnings: Array<{
    tone: 'info' | 'warning' | 'danger';
    messagePt: string;
  }>;
};

export type EventBatchPanel = {
  batchId: string;
  title: string;
  startsAt: Date | null;
  totalEvents: number;
  finalizedEvents: number;
  cancelledEvents: number;
  pendingEvents: number;
  activePlayerCount: number;
  totalDkpDistributed: number;
  nextActionEvent: {
    id: string;
    name: string;
    type: EventType;
    status: EventStatus;
    batchOrder: number | null;
    presentCount: number;
    actionPt: string;
  } | null;
  events: Array<{
    id: string;
    name: string;
    type: EventType;
    status: EventStatus;
    startsAt: Date;
    finalizedAt: Date | null;
    dkpReward: number;
    dkpDistributedAt: Date | null;
    batchOrder: number | null;
    presentCount: number;
    absentCount: number;
    totalDkp: number;
    dkpDistributed: boolean;
    skipped: boolean;
    isNextAction: boolean;
  }>;
};

@Injectable()
export class AttendanceService {
  constructor(
    private readonly repository: EventsRepository,
    private readonly dkpService: DkpService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly businessRules: BusinessRulesService,
  ) {}

  async createEvent(data: CreateEventDto): Promise<Event> {
    const startsAt = new Date(data.startsAt);

    if (!data.name?.trim()) {
      throw new BadRequestException('Event name is required.');
    }

    if (!data.type || !Object.values(EventType).includes(data.type)) {
      throw new BadRequestException('Valid event type is required.');
    }

    if (Number.isNaN(startsAt.getTime())) {
      throw new BadRequestException('Valid event start date is required.');
    }

    if (!data.createdById) {
      throw new BadRequestException('Authenticated user is required to create an event.');
    }

    const reward = await this.businessRules.getEventReward(data.type);
    const event = await this.repository.create({
      name: data.name.trim(),
      type: data.type,
      status: EventStatus.ATTENDANCE_REGISTRATION,
      dkpReward: reward,
      startsAt,
      createdBy: { connect: { id: data.createdById } },
      attendanceBatchId: data.attendanceBatchId,
      batchOrder: data.batchOrder,
    });

    await this.audit('EVENT_CREATED', 'Event', event.id, data.createdById, {
      eventId: event.id,
      type: event.type,
      dkpReward: event.dkpReward,
      startsAt: event.startsAt.toISOString(),
    });
    await this.notificationService.notifyAttendanceStarted({
      eventId: event.id,
      eventName: event.name,
      startsAt: event.startsAt,
    });

    return event;
  }

  async registerAttendance(eventId: string, playerId: string, reviewerId?: string): Promise<void> {
    await this.repository.client.$transaction(
      async (tx) => {
        const event = await this.requireEvent(eventId, tx);

        if (event.status === EventStatus.CANCELLED) {
          throw new InvalidEventStateException(`Event ${eventId} is cancelled and cannot receive attendance.`);
        }

        const player = await this.repository.findPlayer(playerId, tx);

        if (!player) {
          throw new PlayerNotFoundForAttendanceException(playerId);
        }

        const existingAttendance = await this.repository.findAttendance(eventId, playerId, tx);

        if (existingAttendance) {
          throw new DuplicateAttendanceException(eventId, playerId);
        }

        const attendance = await this.repository.createAttendance(eventId, playerId, tx);

        if (event.status === EventStatus.FINALIZED) {
          const adjustment = await this.dkpService.createTransactionWithinTransaction(
            {
              playerId,
              amount: event.dkpReward,
              type: DKPTransactionType.ADMIN_ADJUSTMENT,
              referenceId: this.getAttendanceAdjustmentReference('attendance-add', eventId, attendance.id),
              createdById: reviewerId ?? event.createdById,
            },
            tx,
          );

          await this.updatePlayerAttendanceMetric(playerId, tx);

          await this.auditWithinTransaction(tx, 'ATTENDANCE_FINALIZED_ADD_DKP_ADJUSTED', 'Event', eventId, reviewerId, {
            eventId,
            playerId,
            amount: event.dkpReward,
            transactionId: adjustment.id,
          });
        }

        await this.auditWithinTransaction(tx, 'ATTENDANCE_REGISTERED', 'Event', eventId, reviewerId, {
          eventId,
          playerId,
          finalizedAdjustment: event.status === EventStatus.FINALIZED,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async removeAttendance(eventId: string, playerId: string, staffOverride = false, reviewerId?: string): Promise<void> {
    await this.repository.client.$transaction(
      async (tx) => {
        const event = await this.requireEvent(eventId, tx);

        if (event.status === EventStatus.CANCELLED) {
          throw new InvalidEventStateException(`Event ${eventId} is cancelled and cannot be modified.`);
        }

        if (event.status === EventStatus.FINALIZED && !staffOverride) {
          throw new FinalizedEventModificationException(eventId);
        }

        const attendance = await this.repository.findAttendance(eventId, playerId, tx);

        if (!attendance) {
          return;
        }

        await this.repository.deleteAttendance(attendance.id, tx);

        if (event.status === EventStatus.FINALIZED) {
          const adjustment = await this.dkpService.createTransactionWithinTransaction(
            {
              playerId,
              amount: -event.dkpReward,
              type: DKPTransactionType.ADMIN_ADJUSTMENT,
              referenceId: this.getAttendanceAdjustmentReference('attendance-remove', eventId, attendance.id),
              createdById: reviewerId ?? event.createdById,
            },
            tx,
          );

          await this.updatePlayerAttendanceMetric(playerId, tx);

          await this.auditWithinTransaction(tx, 'ATTENDANCE_FINALIZED_REMOVE_DKP_ADJUSTED', 'Event', eventId, reviewerId, {
            eventId,
            playerId,
            amount: -event.dkpReward,
            transactionId: adjustment.id,
          });
        }

        await this.auditWithinTransaction(
          tx,
          staffOverride ? 'ATTENDANCE_REMOVED_BY_STAFF' : 'ATTENDANCE_REMOVED',
          'Event',
          eventId,
          reviewerId,
          {
            eventId,
            playerId,
            staffOverride,
          },
        );
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async finalizeEvent(eventId: string): Promise<FinalizeEventResult> {
    const result = await this.repository.client.$transaction(
      async (tx) => {
        const event = await this.requireEvent(eventId, tx);

        if (event.status === EventStatus.FINALIZED) {
          throw new InvalidEventStateException(`Event ${eventId} is already finalized.`);
        }

        if (event.status === EventStatus.CANCELLED) {
          throw new InvalidEventStateException(`Event ${eventId} is cancelled and cannot be finalized.`);
        }

        const finalized = await this.repository.updateEvent(
          eventId,
          {
            status: EventStatus.FINALIZED,
            finalizedAt: new Date(),
          },
          tx,
        );

        const rewardTransactionIds = await this.distributeDKPWithinTransaction(eventId, tx);
        const attendances = await this.repository.findAttendedPlayers(eventId, tx);
        const activePlayerCount = await this.repository.countActivePlayers(tx);
        const players = await this.repository.findPlayers(tx);
        const presentCount = attendances.length;
        const absentCount = Math.max(activePlayerCount - presentCount, 0);

        for (const player of players) {
          await this.updatePlayerAttendanceMetric(player.id, tx);
        }

        await this.auditWithinTransaction(tx, 'EVENT_FINALIZED', 'Event', eventId, event.createdById, {
          eventId,
          attendanceCount: presentCount,
          activePlayerCount,
          absentCount,
          totalDkp: presentCount * event.dkpReward,
          rewardTransactionIds,
        });

        const nextEvent = await this.findNextBatchEvent(event, tx);
        let copiedAttendanceCount = 0;
        let attendanceCopyStatus: FinalizeEventResult['attendanceCopyStatus'] = nextEvent ? 'COPIED' : 'NO_NEXT_EVENT';

        if (nextEvent) {
          const existingAttendanceCount = await tx.eventAttendance.count({ where: { eventId: nextEvent.id } });

          if (existingAttendanceCount > 0) {
            attendanceCopyStatus = 'NEXT_EVENT_NOT_EMPTY';
          } else if (attendances.length > 0) {
            const copied = await tx.eventAttendance.createMany({
              data: attendances.map((attendance) => ({
                eventId: nextEvent.id,
                playerId: attendance.playerId,
                attended: true,
              })),
              skipDuplicates: true,
            });
            copiedAttendanceCount = copied.count;
            await this.auditWithinTransaction(tx, 'EVENT_BATCH_ATTENDANCE_COPIED', 'Event', nextEvent.id, event.createdById, {
              sourceEventId: event.id,
              targetEventId: nextEvent.id,
              attendanceBatchId: event.attendanceBatchId,
              copiedAttendanceCount,
            });
          }
        }

        return {
          event: finalized,
          nextEvent,
          copiedAttendanceCount,
          attendanceCopyStatus,
          summary: {
            rewardPerPlayer: event.dkpReward,
            totalDkp: presentCount * event.dkpReward,
            presentCount,
            absentCount,
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await this.notificationService.notifyEventFinalized({
      eventId,
      eventName: result.event.name,
      ...result.summary,
    });

    return {
      event: result.event,
      nextEvent: result.nextEvent,
      copiedAttendanceCount: result.copiedAttendanceCount,
      attendanceCopyStatus: result.attendanceCopyStatus,
    };
  }

  async distributeDKP(eventId: string): Promise<string[]> {
    return this.repository.client.$transaction(
      (tx) => this.distributeDKPWithinTransaction(eventId, tx),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async calculateAttendancePercentage(playerId: string): Promise<number> {
    return this.repository.client.$transaction((tx) => this.calculateAttendancePercentageWithinTransaction(playerId, tx));
  }

  async getPlayerAttendanceStats(playerId: string): Promise<AttendanceStatsResponseDto> {
    return this.repository.client.$transaction(async (tx) => {
      const player = await this.repository.findPlayer(playerId, tx);

      if (!player) {
        throw new PlayerNotFoundForAttendanceException(playerId);
      }

      const [participatedEvents, eligibleEvents] = await Promise.all([
        this.repository.countPlayerFinalizedAttendance(playerId, tx),
        this.repository.countFinalizedEvents(tx),
      ]);

      return {
        playerId,
        participatedEvents,
        eligibleEvents,
        attendancePercentage: this.toAttendancePercentage(participatedEvents, eligibleEvents),
      };
    });
  }

  async getPlayerAttendanceHistory(playerId: string): Promise<PlayerAttendanceHistoryRowDto[]> {
    return this.repository.client.$transaction(async (tx) => {
      const player = await this.repository.findPlayer(playerId, tx);

      if (!player) {
        throw new PlayerNotFoundForAttendanceException(playerId);
      }

      const events = await tx.event.findMany({
        where: { status: { not: EventStatus.CANCELLED } },
        include: {
          attendances: {
            where: { playerId },
            take: 1,
          },
        },
        orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
        take: 200,
      });

      return events.map((event) => {
        const attended = event.attendances.some((attendance) => attendance.attended);
        const attendanceStatus = attended
          ? 'PRESENT'
          : event.status === EventStatus.FINALIZED
            ? 'ABSENT'
            : 'PENDING';

        return {
          eventId: event.id,
          name: event.name,
          type: event.type,
          status: event.status,
          dkpReward: event.dkpReward,
          startsAt: event.startsAt,
          finalizedAt: event.finalizedAt,
          attendanceStatus,
        };
      });
    });
  }

  async getFinalizationChecklist(eventId: string): Promise<EventFinalizationChecklist> {
    return this.repository.client.$transaction(async (tx) => {
      const event = await this.requireEvent(eventId, tx);
      const [details, activePlayers] = await Promise.all([
        this.repository.findDetails(eventId, tx),
        tx.player.findMany({ where: { isActive: true }, orderBy: { nickname: 'asc' } }),
      ]);

      if (!details) {
        throw new EventNotFoundException(eventId);
      }

      const presentRows = details.attendances.filter((attendance) => attendance.attended);
      const presentPlayerIds = new Set(presentRows.map((attendance) => attendance.playerId));
      const presentPlayers = presentRows
        .map((attendance) => attendance.player)
        .filter((player): player is NonNullable<typeof player> => Boolean(player))
        .map((player) => ({
          id: player.id,
          nickname: player.nickname,
          class: player.class,
          dimensionalLayer: player.dimensionalLayer,
        }))
        .sort((a, b) => a.nickname.localeCompare(b.nickname));
      const absentPlayers = activePlayers
        .filter((player) => !presentPlayerIds.has(player.id))
        .map((player) => ({
          id: player.id,
          nickname: player.nickname,
          class: player.class,
          dimensionalLayer: player.dimensionalLayer,
        }));
      const nextEvent = await this.findNextBatchEvent(event, tx);
      const existingAttendanceCount = nextEvent
        ? await tx.eventAttendance.count({ where: { eventId: nextEvent.id } })
        : 0;
      const attendanceCopy = this.buildAttendanceCopyPreview(event, nextEvent, existingAttendanceCount, presentRows.length);
      const warnings = this.buildFinalizationWarnings(event, presentRows.length, absentPlayers.length, activePlayers.length, nextEvent, existingAttendanceCount);

      return {
        eventId: event.id,
        eventName: event.name,
        eventType: event.type,
        status: event.status,
        dkpPerPlayer: event.dkpReward,
        totalDkp: presentRows.length * event.dkpReward,
        presentCount: presentRows.length,
        absentCount: absentPlayers.length,
        activePlayerCount: activePlayers.length,
        presentPlayers,
        absentPlayers,
        currentBoss: {
          id: event.id,
          name: event.name,
          type: event.type,
          startsAt: event.startsAt,
          attendanceBatchId: event.attendanceBatchId,
          batchOrder: event.batchOrder,
        },
        nextBatchEvent: nextEvent
          ? {
              id: nextEvent.id,
              name: nextEvent.name,
              type: nextEvent.type,
              startsAt: nextEvent.startsAt,
              status: nextEvent.status,
              attendanceBatchId: nextEvent.attendanceBatchId,
              batchOrder: nextEvent.batchOrder,
              existingAttendanceCount,
            }
          : null,
        attendanceCopy,
        warnings,
      };
    });
  }

  async getBatchPanel(batchId: string): Promise<EventBatchPanel> {
    return this.repository.client.$transaction(async (tx) => {
      const events = await tx.event.findMany({
        where: { attendanceBatchId: batchId },
        include: {
          attendances: {
            where: { attended: true },
            select: { id: true },
          },
        },
        orderBy: [{ batchOrder: 'asc' }, { startsAt: 'asc' }, { createdAt: 'asc' }],
      });

      if (events.length === 0) {
        throw new EventNotFoundException(batchId);
      }

      const [activePlayerCount, announcement] = await Promise.all([
        tx.player.count({ where: { isActive: true } }),
        tx.announcement.findUnique({ where: { id: batchId } }),
      ]);
      const nextAction = events.find((event) => event.status === EventStatus.OPEN || event.status === EventStatus.ATTENDANCE_REGISTRATION) ?? null;
      const panelEvents = events.map((event) => {
        const presentCount = event.attendances.length;
        const dkpDistributed = event.status === EventStatus.FINALIZED && Boolean(event.dkpDistributedAt);
        const totalDkp = dkpDistributed ? presentCount * event.dkpReward : 0;

        return {
          id: event.id,
          name: event.name,
          type: event.type,
          status: event.status,
          startsAt: event.startsAt,
          finalizedAt: event.finalizedAt,
          dkpReward: event.dkpReward,
          dkpDistributedAt: event.dkpDistributedAt,
          batchOrder: event.batchOrder,
          presentCount,
          absentCount: Math.max(activePlayerCount - presentCount, 0),
          totalDkp,
          dkpDistributed,
          skipped: event.status === EventStatus.CANCELLED,
          isNextAction: event.id === nextAction?.id,
        };
      });

      return {
        batchId,
        title: announcement?.title ?? events[0]?.name ?? batchId,
        startsAt: announcement?.eventTime ?? events[0]?.startsAt ?? null,
        totalEvents: events.length,
        finalizedEvents: events.filter((event) => event.status === EventStatus.FINALIZED).length,
        cancelledEvents: events.filter((event) => event.status === EventStatus.CANCELLED).length,
        pendingEvents: events.filter((event) => event.status === EventStatus.OPEN || event.status === EventStatus.ATTENDANCE_REGISTRATION).length,
        activePlayerCount,
        totalDkpDistributed: panelEvents.reduce((sum, event) => sum + event.totalDkp, 0),
        nextActionEvent: nextAction
          ? {
              id: nextAction.id,
              name: nextAction.name,
              type: nextAction.type,
              status: nextAction.status,
              batchOrder: nextAction.batchOrder,
              presentCount: nextAction.attendances.length,
              actionPt: nextAction.attendances.length > 0 ? 'Revisar e finalizar' : 'Abrir chamada',
            }
          : null,
        events: panelEvents,
      };
    });
  }

  async getEventAttendance(eventId: string): Promise<EventDetails> {
    const event = await this.repository.findDetails(eventId);

    if (!event) {
      throw new EventNotFoundException(eventId);
    }

    return event;
  }

  async getEvents(options: { page?: number; limit?: number; hideFinalized?: boolean } = {}): Promise<Event[]> {
    return this.repository.findMany(options);
  }

  async getEvent(eventId: string): Promise<EventDetails> {
    return this.getEventAttendance(eventId);
  }

  async cancelEvent(eventId: string, reviewerId: string | undefined, reason?: string): Promise<Event> {
    return this.repository.client.$transaction(
      async (tx) => {
        const event = await this.requireEvent(eventId, tx);

        if (event.status === EventStatus.CANCELLED) {
          return event;
        }

        const eventTransactions = await tx.dKPTransaction.findMany({
          where: {
            OR: [
              { type: DKPTransactionType.EVENT_REWARD, referenceId: eventId },
              { type: DKPTransactionType.ADMIN_ADJUSTMENT, referenceId: { startsWith: `attendance-add:${eventId}:` } },
              { type: DKPTransactionType.ADMIN_ADJUSTMENT, referenceId: { startsWith: `attendance-remove:${eventId}:` } },
            ],
          },
        });
        const netByPlayer = new Map<string, number>();

        for (const transaction of eventTransactions) {
          netByPlayer.set(transaction.playerId, (netByPlayer.get(transaction.playerId) ?? 0) + transaction.amount);
        }

        const reversalTransactionIds: string[] = [];

        for (const [playerId, netAmount] of netByPlayer.entries()) {
          if (netAmount === 0) {
            continue;
          }

          const referenceId = `event-cancel:${eventId}:${playerId}`;
          const existingReversal = await tx.dKPTransaction.findUnique({
            where: {
              playerId_type_referenceId: {
                playerId,
                type: DKPTransactionType.ADMIN_ADJUSTMENT,
                referenceId,
              },
            },
          });

          if (existingReversal) {
            reversalTransactionIds.push(existingReversal.id);
            continue;
          }

          const reversal = await this.dkpService.createTransactionWithinTransaction(
            {
              playerId,
              amount: -netAmount,
              type: DKPTransactionType.ADMIN_ADJUSTMENT,
              referenceId,
              createdById: reviewerId ?? event.createdById,
            },
            tx,
          );
          reversalTransactionIds.push(reversal.id);
        }

        const cancelled = await this.repository.updateEvent(
          eventId,
          {
            status: EventStatus.CANCELLED,
          },
          tx,
        );
        const players = await this.repository.findPlayers(tx);

        for (const player of players) {
          await this.updatePlayerAttendanceMetric(player.id, tx);
        }

        await this.auditWithinTransaction(tx, 'EVENT_CANCELLED', 'Event', eventId, reviewerId, {
          eventId,
          reason: reason?.trim() || 'No reason provided.',
          previousStatus: event.status,
          reversedNetByPlayer: Object.fromEntries(netByPlayer.entries()),
          reversalTransactionIds,
        });

        return cancelled;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async distributeDKPWithinTransaction(
    eventId: string,
    tx: Prisma.TransactionClient,
  ): Promise<string[]> {
    const event = await this.requireEvent(eventId, tx);

    if (event.status !== EventStatus.FINALIZED) {
      throw new InvalidEventStateException('DKP can only be distributed for finalized events.');
    }

    if (event.dkpDistributedAt) {
      return [];
    }

    const attendances = await this.repository.findAttendedPlayers(eventId, tx);
    const transactionIds: string[] = [];

    for (const attendance of attendances) {
      const transaction = await this.dkpService.createTransactionWithinTransaction(
        {
          playerId: attendance.playerId,
          amount: event.dkpReward,
          type: DKPTransactionType.EVENT_REWARD,
          referenceId: eventId,
          createdById: event.createdById,
        },
        tx,
      );
      transactionIds.push(transaction.id);
    }

    await this.repository.updateEvent(
      eventId,
      {
        dkpDistributedAt: new Date(),
      },
      tx,
    );

    await this.auditWithinTransaction(tx, 'DKP_DISTRIBUTED', 'Event', eventId, event.createdById, {
      eventId,
      reward: event.dkpReward,
      playerIds: attendances.map((attendance) => attendance.playerId),
      transactionIds,
    });

    return transactionIds;
  }

  private async updatePlayerAttendanceMetric(playerId: string, tx: Prisma.TransactionClient): Promise<void> {
    const percentage = await this.calculateAttendancePercentageWithinTransaction(playerId, tx);

    await tx.player.update({
      where: { id: playerId },
      data: { attendancePercentage: percentage },
    });
  }

  private async calculateAttendancePercentageWithinTransaction(
    playerId: string,
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    const [participatedEvents, eligibleEvents] = await Promise.all([
      this.repository.countPlayerFinalizedAttendance(playerId, tx),
      this.repository.countFinalizedEvents(tx),
    ]);

    return this.toAttendancePercentage(participatedEvents, eligibleEvents);
  }

  private toAttendancePercentage(participatedEvents: number, eligibleEvents: number): number {
    if (eligibleEvents === 0) {
      return 0;
    }

    return Number(((participatedEvents / eligibleEvents) * 100).toFixed(2));
  }

  private async requireEvent(eventId: string, tx: Prisma.TransactionClient): Promise<Event> {
    const event = await this.repository.findById(eventId, tx);

    if (!event) {
      throw new EventNotFoundException(eventId);
    }

    return event;
  }

  private async findNextBatchEvent(event: Event, tx: Prisma.TransactionClient): Promise<Event | null> {
    if (!event.attendanceBatchId || event.batchOrder === null) {
      return null;
    }

    return tx.event.findFirst({
      where: {
        attendanceBatchId: event.attendanceBatchId,
        batchOrder: { gt: event.batchOrder },
        status: { in: [EventStatus.OPEN, EventStatus.ATTENDANCE_REGISTRATION] },
      },
      orderBy: { batchOrder: 'asc' },
    });
  }

  private buildAttendanceCopyPreview(
    event: Event,
    nextEvent: Event | null,
    existingAttendanceCount: number,
    presentCount: number,
  ): EventFinalizationChecklist['attendanceCopy'] {
    if (!nextEvent) {
      return {
        willCopy: false,
        status: 'NO_NEXT_EVENT',
        copiedCountEstimate: 0,
        messagePt: event.attendanceBatchId
          ? 'Este e o ultimo boss ativo do lote; nenhuma presenca sera copiada.'
          : 'Evento fora de lote; nenhuma presenca sera copiada.',
      };
    }

    if (existingAttendanceCount > 0) {
      return {
        willCopy: false,
        status: 'NEXT_EVENT_NOT_EMPTY',
        targetEventId: nextEvent.id,
        targetEventName: nextEvent.name,
        copiedCountEstimate: 0,
        messagePt: `${nextEvent.name} ja tem ${existingAttendanceCount} presenca(s); a finalizacao nao sobrescreve chamada existente.`,
      };
    }

    return {
      willCopy: presentCount > 0,
      status: 'WILL_COPY',
      targetEventId: nextEvent.id,
      targetEventName: nextEvent.name,
      copiedCountEstimate: presentCount,
      messagePt: `${presentCount} presenca(s) serao copiadas para ${nextEvent.name} e a Staff revisa antes de finalizar o proximo boss.`,
    };
  }

  private buildFinalizationWarnings(
    event: Event,
    presentCount: number,
    absentCount: number,
    activePlayerCount: number,
    nextEvent: Event | null,
    existingAttendanceCount: number,
  ): EventFinalizationChecklist['warnings'] {
    const warnings: EventFinalizationChecklist['warnings'] = [];

    if (event.status === EventStatus.FINALIZED) {
      warnings.push({ tone: 'danger', messagePt: 'Este evento ja esta finalizado; a acao de finalizar deve ficar bloqueada.' });
    }

    if (event.status === EventStatus.CANCELLED) {
      warnings.push({ tone: 'danger', messagePt: 'Este evento esta cancelado; nao finalize evento cancelado.' });
    }

    if (presentCount === 0) {
      warnings.push({ tone: 'danger', messagePt: 'Nenhum presente marcado; finalize bloqueado para nao distribuir DKP errado.' });
    }

    if (activePlayerCount > 0 && presentCount < Math.ceil(activePlayerCount * 0.25)) {
      warnings.push({ tone: 'warning', messagePt: 'Presenca abaixo de 25% dos players ativos. Confere a chamada antes de bater o martelo.' });
    }

    if (absentCount > presentCount && presentCount > 0) {
      warnings.push({ tone: 'warning', messagePt: 'Ha mais ausentes que presentes. Pode estar certo, mas merece aquela olhada de Staff sem sono.' });
    }

    if (event.startsAt.getTime() > Date.now() + 15 * 60 * 1000) {
      warnings.push({ tone: 'warning', messagePt: 'O horario do evento ainda esta no futuro; confirme se este e mesmo o boss que acabou.' });
    }

    if (nextEvent && existingAttendanceCount > 0) {
      warnings.push({ tone: 'warning', messagePt: 'O proximo boss ja tem presenca registrada; a copia automatica sera pulada.' });
    }

    if (!nextEvent) {
      warnings.push({ tone: 'info', messagePt: event.attendanceBatchId ? 'Nenhum proximo boss ativo no lote.' : 'Evento sem lote de bosses.' });
    }

    return warnings;
  }

  private getAttendanceAdjustmentReference(action: 'attendance-add' | 'attendance-remove', eventId: string, attendanceId: string): string {
    return `${action}:${eventId}:${attendanceId}`;
  }

  private async audit(
    action: string,
    targetType: string,
    targetId: string,
    actorId: string | undefined,
    metadata: Prisma.InputJsonObject,
  ): Promise<void> {
    await this.auditService.log({ action, targetType, targetId, actorId, metadata });
  }

  private async auditWithinTransaction(
    tx: Prisma.TransactionClient,
    action: string,
    targetType: string,
    targetId: string,
    actorId: string | undefined,
    metadata: Prisma.InputJsonObject,
  ): Promise<void> {
    await this.auditService.logWithinTransaction({ action, targetType, targetId, actorId, metadata }, tx);
  }
}
