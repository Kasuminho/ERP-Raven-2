import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PlayerCombatAvailability } from '@prisma/client';
import { PlayerReminderService } from '../src/modules/automation/services/player-reminder.service';

test('daily reminder is consolidated and delivered once per player and Sao Paulo day', async () => {
  const webNotifications: unknown[] = [];
  const discordNotifications: unknown[] = [];
  const delivery = {
    id: 'delivery-1',
    playerId: 'player-1',
    reminderDate: '2026-07-21',
    signals: {},
    webNotifiedAt: null as Date | null,
    discordClaimedAt: null as Date | null,
    discordNotifiedAt: null as Date | null,
    discordAttempts: 0,
    lastDiscordError: null as string | null,
  };
  const prisma = {
    player: {
      findMany: async () => [{
        id: 'player-1',
        nickname: 'Aiko',
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
        user: { discordId: 'discord-1' },
        combatProfile: { declaredBuild: null, preferredRole: null, availability: PlayerCombatAvailability.UNSET },
        codexRequests: [{ id: 'codex-1' }],
      }],
    },
    playerProgress: { groupBy: async () => [] },
    event: { findMany: async () => [] },
    playerReminderDelivery: {
      upsert: async ({ update }: { update: { signals: unknown } }) => {
        delivery.signals = update.signals;
        return { ...delivery };
      },
      updateMany: async () => {
        if (delivery.discordNotifiedAt || delivery.discordClaimedAt) return { count: 0 };
        delivery.discordClaimedAt = new Date();
        delivery.discordAttempts += 1;
        return { count: 1 };
      },
      update: async ({ data }: { data: Record<string, unknown> }) => {
        Object.assign(delivery, data);
        return { ...delivery };
      },
    },
  };
  const service = new PlayerReminderService(
    prisma as never,
    { createForPlayer: async (data: unknown) => { webNotifications.push(data); return {}; } } as never,
    { notifyPlayerDailyReminder: async (data: unknown) => { discordNotifications.push(data); return true; } } as never,
  );
  const now = new Date('2026-07-21T15:45:00.000Z');

  const first = await service.sendDailyReminders(now);
  const second = await service.sendDailyReminders(now);

  assert.deepEqual(first, { eligible: 1, web: 1, discord: 1, discordFailed: 0 });
  assert.deepEqual(second, { eligible: 1, web: 0, discord: 0, discordFailed: 0 });
  assert.equal(webNotifications.length, 1);
  assert.equal(discordNotifications.length, 1);
  assert.equal(delivery.reminderDate, '2026-07-21');
  assert.deepEqual(delivery.signals, {
    roster: ['SEM_BUILD', 'SEM_ROLE', 'SEM_STATUS_RECENTE', 'SEM_DISPONIBILIDADE'],
    codexRequestIds: ['codex-1'],
  });
});
