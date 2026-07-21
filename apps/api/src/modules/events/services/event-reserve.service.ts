import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventReserveStatus, EventRsvpNoteVisibility, EventRsvpStatus, EventStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { AuditService } from '../../audit/services/audit.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { RespondEventReservePromotionDto, UpsertEventReserveDto } from '../dto';

@Injectable()
export class EventReserveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async upsert(eventId: string, playerId: string, dto: UpsertEventReserveDto, actorId: string) {
    const [event, player] = await Promise.all([
      this.requireOpenFutureEvent(eventId),
      this.prisma.player.findFirst({ where: { id: playerId, isActive: true }, select: { id: true } }),
    ]);
    if (!player) throw new NotFoundException(`Active player ${playerId} was not found.`);
    await this.assertPlayerAvailable(playerId, event.startsAt);
    const existing = await this.prisma.eventReserveEntry.findUnique({ where: { eventId_playerId: { eventId, playerId } } });
    if (existing?.status === EventReserveStatus.PROMOTED) throw new BadRequestException('Promoted reserve entries cannot return to reserve.');
    const entry = await this.prisma.eventReserveEntry.upsert({
      where: { eventId_playerId: { eventId, playerId } },
      create: { eventId, playerId, position: dto.position, reason: dto.reason.trim(), createdById: actorId, updatedById: actorId },
      update: {
        position: dto.position,
        reason: dto.reason.trim(),
        status: EventReserveStatus.RESERVE,
        promotionRequestedAt: null,
        respondedAt: null,
        promotedAt: null,
        playerResponseNote: null,
        updatedById: actorId,
      },
    });
    await this.audit('EVENT_RESERVE_UPSERTED', entry.id, actorId, { eventId, playerId, position: dto.position, reason: dto.reason.trim() });
    return entry;
  }

  async remove(eventId: string, playerId: string, actorId: string) {
    const entry = await this.requireEntry(eventId, playerId);
    if (entry.status === EventReserveStatus.PROMOTED) throw new BadRequestException('Promoted reserve entries cannot be removed from history.');
    const updated = await this.prisma.eventReserveEntry.update({
      where: { id: entry.id },
      data: { status: EventReserveStatus.REMOVED, updatedById: actorId },
    });
    await this.audit('EVENT_RESERVE_REMOVED', entry.id, actorId, { eventId, playerId, previousStatus: entry.status });
    return updated;
  }

  async requestPromotion(eventId: string, playerId: string, actorId: string) {
    const event = await this.requireOpenFutureEvent(eventId);
    const entry = await this.requireEntry(eventId, playerId);
    if (entry.status !== EventReserveStatus.RESERVE) throw new BadRequestException('Only an active reserve can be promoted.');
    await this.assertPlayerAvailable(playerId, event.startsAt);
    const updated = await this.prisma.eventReserveEntry.update({
      where: { id: entry.id },
      data: { status: EventReserveStatus.PROMOTION_PENDING, promotionRequestedAt: new Date(), respondedAt: null, playerResponseNote: null, updatedById: actorId },
    });
    await this.notifications.createForPlayer({
      playerId,
      type: 'EVENT_RESERVE_PROMOTION',
      title: 'Vaga liberada / Slot available',
      body: `PT-BR: Uma vaga abriu em ${event.name}. Confirme ou recuse no RSVP. EN: A slot opened for ${event.name}. Confirm or decline it in RSVP.`,
      href: '/dashboard/attendance',
      metadata: { eventId, reserveEntryId: entry.id },
      deduplicationKey: `event-reserve-promotion:${entry.id}:${updated.promotionRequestedAt?.toISOString()}`,
    });
    await this.audit('EVENT_RESERVE_PROMOTION_REQUESTED', entry.id, actorId, { eventId, playerId });
    return updated;
  }

  async respond(eventId: string, userId: string, dto: RespondEventReservePromotionDto) {
    const player = await this.getPrimaryPlayer(userId);
    const event = await this.requireOpenFutureEvent(eventId);
    const entry = await this.requireEntry(eventId, player.id);
    if (entry.status !== EventReserveStatus.PROMOTION_PENDING) throw new BadRequestException('No reserve promotion is waiting for your response.');
    if (dto.accept) await this.assertPlayerAvailable(player.id, event.startsAt);
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const reserve = await tx.eventReserveEntry.update({
        where: { id: entry.id },
        data: {
          status: dto.accept ? EventReserveStatus.PROMOTED : EventReserveStatus.DECLINED,
          respondedAt: now,
          promotedAt: dto.accept ? now : null,
          playerResponseNote: dto.note?.trim() || null,
          updatedById: userId,
        },
      });
      if (dto.accept) {
        await tx.eventRsvp.upsert({
          where: { eventId_playerId: { eventId, playerId: player.id } },
          create: { eventId, playerId: player.id, status: EventRsvpStatus.CONFIRMED, noteVisibility: EventRsvpNoteVisibility.STAFF_ONLY },
          update: { status: EventRsvpStatus.CONFIRMED },
        });
      }
      return reserve;
    });
    await this.audit(dto.accept ? 'EVENT_RESERVE_PROMOTION_ACCEPTED' : 'EVENT_RESERVE_PROMOTION_DECLINED', entry.id, userId, {
      eventId,
      playerId: player.id,
      note: dto.note?.trim() || null,
    });
    return updated;
  }

  private async assertPlayerAvailable(playerId: string, startsAt: Date): Promise<void> {
    const absence = await this.prisma.playerAbsence.findFirst({
      where: { playerId, startsAt: { lte: startsAt }, endsAt: { gt: startsAt } },
      select: { id: true },
    });
    if (absence) throw new BadRequestException('Player is unavailable because this event overlaps a registered absence.');
  }

  private async requireOpenFutureEvent(eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: { id: true, name: true, status: true, startsAt: true } });
    if (!event) throw new NotFoundException(`Event ${eventId} was not found.`);
    if (event.startsAt <= new Date() || (event.status !== EventStatus.OPEN && event.status !== EventStatus.ATTENDANCE_REGISTRATION)) {
      throw new BadRequestException('Reserve changes require an open future event.');
    }
    return event;
  }

  private async requireEntry(eventId: string, playerId: string) {
    const entry = await this.prisma.eventReserveEntry.findUnique({ where: { eventId_playerId: { eventId, playerId } } });
    if (!entry) throw new NotFoundException('Reserve entry was not found.');
    return entry;
  }

  private async getPrimaryPlayer(userId: string): Promise<{ id: string }> {
    const player = await this.prisma.player.findFirst({ where: { userId, isActive: true }, select: { id: true }, orderBy: { joinedAt: 'asc' } });
    if (!player) throw new NotFoundException('Authenticated user does not have an active player profile.');
    return player;
  }

  private async audit(action: string, targetId: string, actorId: string, metadata: Prisma.InputJsonObject): Promise<void> {
    await this.auditService.log({ actorId, action, targetType: 'EventReserveEntry', targetId, metadata });
  }
}
