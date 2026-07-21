import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventReserveStatus, EventStatus } from '@prisma/client';
import { EventReserveService } from '../src/modules/events/services/event-reserve.service';

test('reserve promotion requires player confirmation and preserves the reserve record', async () => {
  const notifications: unknown[] = [];
  const audits: unknown[] = [];
  const rsvps: unknown[] = [];
  const entry = {
    id: 'reserve-1', eventId: 'event-1', playerId: 'player-1', position: 1, reason: 'Cobertura',
    status: EventReserveStatus.RESERVE, promotionRequestedAt: null as Date | null, respondedAt: null as Date | null,
    promotedAt: null as Date | null, playerResponseNote: null as string | null, createdById: 'staff-1', updatedById: 'staff-1',
  };
  const event = { id: 'event-1', name: 'Clash', status: EventStatus.ATTENDANCE_REGISTRATION, startsAt: new Date('2099-01-01T20:00:00.000Z') };
  const updateEntry = async ({ data }: { data: Record<string, unknown> }) => {
    Object.assign(entry, data);
    return { ...entry };
  };
  const prisma = {
    event: { findUnique: async () => event },
    player: { findFirst: async () => ({ id: 'player-1' }) },
    playerAbsence: { findFirst: async () => null },
    eventReserveEntry: { findUnique: async () => ({ ...entry }), update: updateEntry },
    $transaction: async (handler: (tx: unknown) => Promise<unknown>) => handler({
      eventReserveEntry: { update: updateEntry },
      eventRsvp: { upsert: async (input: unknown) => { rsvps.push(input); return {}; } },
    }),
  };
  const service = new EventReserveService(
    prisma as never,
    { log: async (input: unknown) => { audits.push(input); } } as never,
    { createForPlayer: async (input: unknown) => { notifications.push(input); return {}; } } as never,
  );

  await service.requestPromotion('event-1', 'player-1', 'staff-1');
  assert.equal(entry.status, EventReserveStatus.PROMOTION_PENDING);
  assert.equal(notifications.length, 1);
  assert.equal(rsvps.length, 0);

  await service.respond('event-1', 'user-1', { accept: true });
  assert.equal(entry.id, 'reserve-1');
  assert.equal(entry.status, EventReserveStatus.PROMOTED);
  assert.ok(entry.promotedAt);
  assert.equal(rsvps.length, 1);
  assert.equal(audits.length, 2);
});
