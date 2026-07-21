import { Injectable, Logger } from '@nestjs/common';
import { CodexRequestStatus, PlayerCombatAvailability, ProgressCategory } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { NotificationService as DiscordNotificationService } from '../../discord/services/notification.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { buildRosterSignals, PLAYER_ATTENDANCE_WINDOW_DAYS, PLAYER_STATUS_MAX_AGE_DAYS, RosterSignal } from '../../players/services/player-reminder-policy';
import { AUTOMATION_TIMEZONE } from '../types/automation.types';

const DAY_MS = 24 * 60 * 60 * 1000;
const DISCORD_CLAIM_TTL_MS = 10 * 60 * 1000;

const SIGNAL_COPY: Record<RosterSignal, { pt: string; en: string }> = {
  SEM_BUILD: { pt: 'Build nao declarada.', en: 'Build is not declared.' },
  SEM_ROLE: { pt: 'Funcao de combate nao definida.', en: 'Combat role is not defined.' },
  SEM_STATUS_RECENTE: { pt: 'Nenhum STATUS enviado nos ultimos 21 dias.', en: 'No STATUS update in the last 21 days.' },
  PRESENCA_BAIXA: { pt: 'Presenca abaixo de 50% nos ultimos 15 dias.', en: 'Attendance below 50% in the last 15 days.' },
  SEM_DISPONIBILIDADE: { pt: 'Disponibilidade nao informada.', en: 'Availability is not set.' },
};

@Injectable()
export class PlayerReminderService {
  private readonly logger = new Logger(PlayerReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly discordNotifications: DiscordNotificationService,
  ) {}

  async sendDailyReminders(now = new Date()): Promise<{ eligible: number; web: number; discord: number; discordFailed: number }> {
    const statusCutoff = new Date(now.getTime() - PLAYER_STATUS_MAX_AGE_DAYS * DAY_MS);
    const attendanceCutoff = new Date(now.getTime() - PLAYER_ATTENDANCE_WINDOW_DAYS * DAY_MS);
    const reminderDate = this.dateInAutomationTimezone(now);
    const [players, latestStatuses, finalizedEvents] = await Promise.all([
      this.prisma.player.findMany({
        where: { isActive: true },
        select: {
          id: true,
          nickname: true,
          joinedAt: true,
          user: { select: { discordId: true } },
          combatProfile: { select: { declaredBuild: true, preferredRole: true, availability: true } },
          codexRequests: {
            where: { status: CodexRequestStatus.SENT },
            select: { id: true },
          },
        },
      }),
      this.prisma.playerProgress.groupBy({
        by: ['playerId'],
        where: { player: { isActive: true }, category: ProgressCategory.STATUS },
        _max: { createdAt: true },
      }),
      this.prisma.event.findMany({
        where: { status: 'FINALIZED', startsAt: { gte: attendanceCutoff, lte: now } },
        select: {
          startsAt: true,
          attendances: {
            where: { player: { isActive: true } },
            select: { playerId: true, attended: true },
          },
        },
      }),
    ]);

    const lastStatusByPlayer = new Map(latestStatuses.map((row) => [row.playerId, row._max.createdAt]));
    let eligible = 0;
    let web = 0;
    let discord = 0;
    let discordFailed = 0;

    for (const player of players) {
      const events = finalizedEvents.filter((event) => event.startsAt >= player.joinedAt);
      const attended = events.filter((event) => event.attendances.some((row) => row.playerId === player.id && row.attended)).length;
      const signals = buildRosterSignals({
        declaredBuild: player.combatProfile?.declaredBuild,
        preferredRole: player.combatProfile?.preferredRole,
        availability: player.combatProfile?.availability ?? PlayerCombatAvailability.UNSET,
        lastStatusAt: lastStatusByPlayer.get(player.id),
        statusCutoff,
        eligibleEvents: events.length,
        attendedEvents: attended,
      });
      const codexRequestIds = player.codexRequests.map((request) => request.id);
      if (signals.length === 0 && codexRequestIds.length === 0) continue;
      eligible += 1;

      const delivery = await this.prisma.playerReminderDelivery.upsert({
        where: { playerId_reminderDate: { playerId: player.id, reminderDate } },
        create: { playerId: player.id, reminderDate, signals: { roster: signals, codexRequestIds } },
        update: { signals: { roster: signals, codexRequestIds } },
      });
      const reasonsPt = signals.map((signal) => SIGNAL_COPY[signal].pt);
      const reasonsEn = signals.map((signal) => SIGNAL_COPY[signal].en);
      if (codexRequestIds.length > 0) {
        reasonsPt.push(`${codexRequestIds.length} Codex enviado(s) aguardando confirmar sucesso ou informar falha.`);
        reasonsEn.push(`${codexRequestIds.length} sent Codex request(s) waiting for success confirmation or a failure report.`);
      }

      if (!delivery.webNotifiedAt) {
        await this.notifications.createForPlayer({
          playerId: player.id,
          type: 'PLAYER_DAILY_REMINDER',
          title: 'Pendencias do dia / Daily action required',
          body: `PT-BR: ${reasonsPt.join(' ')} EN: ${reasonsEn.join(' ')}`,
          href: codexRequestIds.length > 0 && signals.length === 0 ? '/dashboard/codex' : '/dashboard/profile',
          metadata: { reminderDate, rosterSignals: signals, codexRequestIds },
          deduplicationKey: `player-daily-reminder:${player.id}:${reminderDate}`,
        });
        await this.prisma.playerReminderDelivery.update({ where: { id: delivery.id }, data: { webNotifiedAt: new Date() } });
        web += 1;
      }

      const claimCutoff = new Date(now.getTime() - DISCORD_CLAIM_TTL_MS);
      const claimed = await this.prisma.playerReminderDelivery.updateMany({
        where: {
          id: delivery.id,
          discordNotifiedAt: null,
          OR: [{ discordClaimedAt: null }, { discordClaimedAt: { lt: claimCutoff } }],
        },
        data: { discordClaimedAt: new Date(), discordAttempts: { increment: 1 } },
      });
      if (claimed.count === 0) continue;

      const sent = await this.discordNotifications.notifyPlayerDailyReminder({
        playerId: player.id,
        playerName: player.nickname,
        discordId: player.user.discordId,
        reasonsPt,
        reasonsEn,
        hasProfileSignals: signals.length > 0,
        hasCodex: codexRequestIds.length > 0,
      });
      await this.prisma.playerReminderDelivery.update({
        where: { id: delivery.id },
        data: sent
          ? { discordNotifiedAt: new Date(), discordClaimedAt: null, lastDiscordError: null }
          : { discordClaimedAt: null, lastDiscordError: 'Discord DM delivery failed; see audit log.' },
      });
      if (sent) discord += 1;
      else discordFailed += 1;
    }

    this.logger.log(`player_daily_reminders date=${reminderDate} eligible=${eligible} web=${web} discord=${discord} discord_failed=${discordFailed}`);
    return { eligible, web, discord, discordFailed };
  }

  private dateInAutomationTimezone(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: AUTOMATION_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
    return `${value('year')}-${value('month')}-${value('day')}`;
  }
}
