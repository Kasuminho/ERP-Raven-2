import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { EventAbsenceService } from '../src/modules/events/services/event-absence.service';

test('player absence defaults the reason to Staff-only and is audited', async () => {
  const creates: Array<{ data: Record<string, unknown> }> = [];
  const audits: unknown[] = [];
  const prisma = {
    player: { findFirst: async () => ({ id: 'player-1' }) },
    playerAbsence: {
      findFirst: async () => null,
      create: async (input: { data: Record<string, unknown> }) => {
        creates.push(input);
        return { id: 'absence-1', ...input.data };
      },
    },
  };
  const service = new EventAbsenceService(prisma as never, { log: async (input: unknown) => { audits.push(input); } } as never);

  const result = await service.create('user-1', {
    startsAt: '2099-01-01T10:00:00.000Z',
    endsAt: '2099-01-03T10:00:00.000Z',
    reason: 'Viagem',
  });

  assert.equal(result.reasonVisibility, 'STAFF_ONLY');
  assert.equal(creates.length, 1);
  assert.equal(audits.length, 1);
});

test('player absence rejects invalid and overlapping periods', async () => {
  const prisma = {
    player: { findFirst: async () => ({ id: 'player-1' }) },
    playerAbsence: { findFirst: async () => ({ id: 'existing' }) },
  };
  const service = new EventAbsenceService(prisma as never, {} as never);

  await assert.rejects(
    () => service.create('user-1', { startsAt: '2099-01-03T10:00:00.000Z', endsAt: '2099-01-01T10:00:00.000Z' }),
    BadRequestException,
  );
  await assert.rejects(
    () => service.create('user-1', { startsAt: '2099-01-01T10:00:00.000Z', endsAt: '2099-01-03T10:00:00.000Z' }),
    BadRequestException,
  );
});
