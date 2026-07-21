import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventReminderChannel, EventRsvpStatus } from '@prisma/client';
import { EventReminderService } from '../src/modules/automation/services/event-reminder.service';

test('event reminder targets only unanswered or confirmed players and respects channels', async () => {
  const deliveries = new Map<string, any>();
  const webNotifications: unknown[] = [];
  const discordNotifications: unknown[] = [];
  const event = { id: 'event-1', name: 'Clash', startsAt: new Date('2099-01-02T10:00:00.000Z') };
  const players = [
    { id: 'p1', nickname: 'Aiko', timezone: 'America/Sao_Paulo', eventReminderChannel: EventReminderChannel.WEB, user: { discordId: 'd1' }, eventRsvps: [], absences: [], eventReserves: [] },
    { id: 'p2', nickname: 'Brann', timezone: 'America/Manaus', eventReminderChannel: EventReminderChannel.BOTH, user: { discordId: 'd2' }, eventRsvps: [{ eventId: event.id, status: EventRsvpStatus.CONFIRMED }], absences: [], eventReserves: [] },
    { id: 'p3', nickname: 'Cora', timezone: null, eventReminderChannel: EventReminderChannel.DISCORD, user: { discordId: 'd3' }, eventRsvps: [{ eventId: event.id, status: EventRsvpStatus.TENTATIVE }], absences: [], eventReserves: [] },
    { id: 'p4', nickname: 'Dara', timezone: null, eventReminderChannel: EventReminderChannel.WEB, user: { discordId: 'd4' }, eventRsvps: [], absences: [{ startsAt: new Date('2099-01-01'), endsAt: new Date('2099-01-03') }], eventReserves: [] },
    { id: 'p5', nickname: 'Eiko', timezone: null, eventReminderChannel: EventReminderChannel.WEB, user: { discordId: 'd5' }, eventRsvps: [], absences: [], eventReserves: [{ eventId: event.id }] },
  ];
  const prisma = {
    event: { findMany: async () => [event] },
    player: { findMany: async () => players },
    eventReminderDelivery: {
      upsert: async ({ where, create, update }: any) => {
        const key = `${where.eventId_playerId.eventId}:${where.eventId_playerId.playerId}`;
        const row = deliveries.get(key) ?? { id: key, ...create, webNotifiedAt: null, discordNotifiedAt: null, discordClaimedAt: null };
        Object.assign(row, update);
        deliveries.set(key, row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const row = deliveries.get(where.id);
        Object.assign(row, data);
        return row;
      },
      updateMany: async ({ where, data }: any) => {
        const row = deliveries.get(where.id);
        if (row.discordNotifiedAt || row.discordClaimedAt) return { count: 0 };
        Object.assign(row, data, { discordAttempts: (row.discordAttempts ?? 0) + 1 });
        return { count: 1 };
      },
    },
  };
  const service = new EventReminderService(
    prisma as never,
    { createForPlayer: async (data: unknown) => { webNotifications.push(data); return data; } } as never,
    { notifyEventReminder: async (data: unknown) => { discordNotifications.push(data); return true; } } as never,
  );

  const first = await service.sendUpcomingEventReminders(new Date('2099-01-01T12:00:00.000Z'));
  const second = await service.sendUpcomingEventReminders(new Date('2099-01-01T12:30:00.000Z'));

  assert.deepEqual(first, { eligible: 2, web: 2, discord: 1, discordFailed: 0 });
  assert.deepEqual(second, { eligible: 2, web: 0, discord: 0, discordFailed: 0 });
  assert.equal(webNotifications.length, 2);
  assert.equal(discordNotifications.length, 1);
  assert.equal((discordNotifications[0] as { requiresRsvp: boolean }).requiresRsvp, false);
});
