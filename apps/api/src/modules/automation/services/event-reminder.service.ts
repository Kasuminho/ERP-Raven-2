import { Injectable, Logger } from '@nestjs/common';
import { EventReminderChannel, EventReserveStatus, EventRsvpStatus, EventStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { NotificationService as DiscordNotificationService } from '../../discord/services/notification.service';
import { NotificationsService } from '../../notifications/notifications.service';

const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;
const DISCORD_CLAIM_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class EventReminderService {
  private readonly logger = new Logger(EventReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly discordNotifications: DiscordNotificationService,
  ) {}

  async sendUpcomingEventReminders(now = new Date()) {
    const events = await this.prisma.event.findMany({
      where: {
        status: { in: [EventStatus.OPEN, EventStatus.ATTENDANCE_REGISTRATION] },
        startsAt: { gt: now, lte: new Date(now.getTime() + REMINDER_WINDOW_MS) },
      },
      select: { id: true, name: true, startsAt: true },
      orderBy: { startsAt: 'asc' },
    });
    if (events.length === 0) return { eligible: 0, web: 0, discord: 0, discordFailed: 0 };

    const players = await this.prisma.player.findMany({
      where: { isActive: true, eventReminderChannel: { not: EventReminderChannel.NONE } },
      select: {
        id: true,
        nickname: true,
        timezone: true,
        eventReminderChannel: true,
        user: { select: { discordId: true } },
        eventRsvps: { where: { eventId: { in: events.map((event) => event.id) } }, select: { eventId: true, status: true } },
        absences: { where: { startsAt: { lte: events[events.length - 1].startsAt }, endsAt: { gt: events[0].startsAt } }, select: { startsAt: true, endsAt: true } },
        eventReserves: {
          where: { eventId: { in: events.map((event) => event.id) }, status: { in: [EventReserveStatus.RESERVE, EventReserveStatus.PROMOTION_PENDING] } },
          select: { eventId: true },
        },
      },
    });
    let eligible = 0;
    let web = 0;
    let discord = 0;
    let discordFailed = 0;

    for (const event of events) {
      for (const player of players) {
        if (player.absences.some((absence) => absence.startsAt <= event.startsAt && absence.endsAt > event.startsAt)) continue;
        if (player.eventReserves.some((reserve) => reserve.eventId === event.id)) continue;
        const rsvp = player.eventRsvps.find((row) => row.eventId === event.id);
        if (rsvp && rsvp.status !== EventRsvpStatus.CONFIRMED) continue;
        eligible += 1;
        const requiresRsvp = !rsvp;
        const delivery = await this.prisma.eventReminderDelivery.upsert({
          where: { eventId_playerId: { eventId: event.id, playerId: player.id } },
          create: { eventId: event.id, playerId: player.id, rsvpStatus: rsvp?.status ?? null },
          update: { rsvpStatus: rsvp?.status ?? null },
        });
        const channel = player.eventReminderChannel;
        if ((channel === EventReminderChannel.WEB || channel === EventReminderChannel.BOTH) && !delivery.webNotifiedAt) {
          await this.notifications.createForPlayer({
            playerId: player.id,
            type: 'EVENT_REMINDER',
            title: requiresRsvp ? 'RSVP pendente / RSVP required' : 'Evento confirmado / Confirmed event',
            body: requiresRsvp
              ? `${event.name} comeca em ate 24h. Responda seu RSVP. / ${event.name} starts within 24h. Answer your RSVP.`
              : `${event.name} comeca em ate 24h. Voce confirmou presenca. / ${event.name} starts within 24h. You confirmed attendance.`,
            href: '/dashboard/attendance',
            metadata: { eventId: event.id, startsAt: event.startsAt.toISOString(), requiresRsvp },
            deduplicationKey: `event-reminder:${event.id}:${player.id}:web`,
          });
          await this.prisma.eventReminderDelivery.update({ where: { id: delivery.id }, data: { webNotifiedAt: new Date() } });
          web += 1;
        }
        if (channel !== EventReminderChannel.DISCORD && channel !== EventReminderChannel.BOTH) continue;
        const claimed = await this.prisma.eventReminderDelivery.updateMany({
          where: {
            id: delivery.id,
            discordNotifiedAt: null,
            OR: [{ discordClaimedAt: null }, { discordClaimedAt: { lt: new Date(now.getTime() - DISCORD_CLAIM_TTL_MS) } }],
          },
          data: { discordClaimedAt: new Date(), discordAttempts: { increment: 1 } },
        });
        if (claimed.count === 0) continue;
        const sent = await this.discordNotifications.notifyEventReminder({
          eventId: event.id,
          playerId: player.id,
          playerName: player.nickname,
          discordId: player.user.discordId,
          eventName: event.name,
          startsAt: event.startsAt,
          timezone: this.safeTimezone(player.timezone),
          requiresRsvp,
        });
        await this.prisma.eventReminderDelivery.update({
          where: { id: delivery.id },
          data: sent
            ? { discordNotifiedAt: new Date(), discordClaimedAt: null, lastDiscordError: null }
            : { discordClaimedAt: null, lastDiscordError: 'Discord DM delivery failed; see audit log.' },
        });
        if (sent) discord += 1;
        else discordFailed += 1;
      }
    }
    this.logger.log(`event_reminders eligible=${eligible} web=${web} discord=${discord} discord_failed=${discordFailed}`);
    return { eligible, web, discord, discordFailed };
  }

  private safeTimezone(timezone?: string | null) {
    const value = timezone?.trim() || 'America/Sao_Paulo';
    try {
      new Intl.DateTimeFormat('pt-BR', { timeZone: value }).format(new Date());
      return value;
    } catch {
      return 'America/Sao_Paulo';
    }
  }
}
