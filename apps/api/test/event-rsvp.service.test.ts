import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventRsvpNoteVisibility, EventRsvpStatus, EventStatus, PlayerClass } from '@prisma/client';
import { EventRsvpService } from '../src/modules/events/services/event-rsvp.service';

test('RSVP updates commitment without touching attendance or DKP', async () => {
  const upserts: unknown[] = [];
  const audits: unknown[] = [];
  const prisma = {
    player: {
      findFirst: async () => ({ id: 'player-1' }),
    },
    event: {
      findUnique: async () => ({ id: 'event-1', name: 'Lunos', status: EventStatus.OPEN, startsAt: new Date('2099-01-01T20:00:00.000Z') }),
    },
    eventRsvp: {
      upsert: async (input: unknown) => {
        upserts.push(input);
        return {
          id: 'rsvp-1',
          eventId: 'event-1',
          playerId: 'player-1',
          status: EventRsvpStatus.CONFIRMED,
          note: 'Chego cedo',
          noteVisibility: EventRsvpNoteVisibility.STAFF_ONLY,
        };
      },
    },
    playerAbsence: { findFirst: async () => null },
  };
  const service = new EventRsvpService(prisma as never, { log: async (input: unknown) => { audits.push(input); } } as never);

  const result = await service.respond('event-1', 'user-1', {
    status: EventRsvpStatus.CONFIRMED,
    note: 'Chego cedo',
  });

  assert.equal(result.status, EventRsvpStatus.CONFIRMED);
  assert.equal(upserts.length, 1);
  assert.equal(audits.length, 1);
  assert.equal('eventAttendance' in prisma, false);
  assert.equal('dkpTransaction' in prisma, false);
});

test('Staff RSVP summary counts unanswered players and confirmed composition', async () => {
  const prisma = {
    event: { findUnique: async () => ({ id: 'event-1', startsAt: new Date('2099-01-01T20:00:00.000Z'), endsAt: new Date('2099-01-01T22:00:00.000Z'), compositionTargets: [{ role: 'FRONTLINE', minimum: 1 }] }) },
    player: { count: async () => 4 },
    eventRsvp: {
      findMany: async (input: { where?: { eventId?: unknown } }) => input.where?.eventId && typeof input.where.eventId === 'object' ? [{
        playerId: 'player-1',
        player: { nickname: 'Aiko', timezone: 'America/Manaus' },
        event: { id: 'event-2', name: 'Treino', startsAt: new Date('2099-01-01T21:00:00.000Z'), endsAt: new Date('2099-01-01T23:00:00.000Z') },
      }] : [
        {
          id: 'rsvp-1', eventId: 'event-1', playerId: 'player-1', status: EventRsvpStatus.CONFIRMED,
          note: null, noteVisibility: EventRsvpNoteVisibility.STAFF_ONLY, createdAt: new Date(), updatedAt: new Date(),
          player: { nickname: 'Aiko', class: PlayerClass.WARLORD, dimensionalLayer: 6, combatProfile: { primaryClass: PlayerClass.WARLORD, preferredRole: 'FRONTLINE' } },
        },
        {
          id: 'rsvp-2', eventId: 'event-1', playerId: 'player-2', status: EventRsvpStatus.DECLINED,
          note: 'Trabalho', noteVisibility: EventRsvpNoteVisibility.STAFF_ONLY, createdAt: new Date(), updatedAt: new Date(),
          player: { nickname: 'Brann', class: PlayerClass.ELEMENTALIST, dimensionalLayer: 4, combatProfile: null },
        },
      ],
    },
    playerAbsence: {
      findMany: async () => [{
        id: 'absence-1', playerId: 'player-3', startsAt: new Date('2098-12-31T00:00:00.000Z'), endsAt: new Date('2099-01-02T00:00:00.000Z'),
        reason: 'Viagem', reasonVisibility: 'STAFF_ONLY', createdAt: new Date(), updatedAt: new Date(), player: { nickname: 'Cora' },
      }],
    },
    eventReserveEntry: { findMany: async () => [] },
  };
  const service = new EventRsvpService(prisma as never, {} as never);

  const summary = await service.getStaffSummary('event-1');

  assert.deepEqual(summary.counts, { CONFIRMED: 1, TENTATIVE: 0, DECLINED: 1, UNAVAILABLE_BY_ABSENCE: 1, UNANSWERED: 1 });
  assert.deepEqual(summary.confirmedComposition.byClass, { WARLORD: 1 });
  assert.deepEqual(summary.confirmedComposition.byRole, { FRONTLINE: 1 });
  assert.deepEqual(summary.confirmedComposition.byLayer, { '6': 1 });
  assert.deepEqual(summary.compositionTargets, [{ role: 'FRONTLINE', playerClass: null, minimum: 1, label: null, confirmed: 1, gap: 0 }]);
  assert.equal(summary.absenceImpacts[0].nickname, 'Cora');
  assert.equal(summary.scheduleConflicts.length, 1);
  assert.equal(summary.scheduleConflicts[0].timezone, 'America/Manaus');
  assert.equal(summary.scheduleConflicts[0].conflictingEventName, 'Treino');
  assert.deepEqual(summary.noShows, []);
});

test('player can justify only a detected no-show and the action is audited', async () => {
  const audits: unknown[] = [];
  const prisma = {
    player: { findFirst: async () => ({ id: 'player-1' }) },
    eventRsvp: {
      findUnique: async () => ({ id: 'rsvp-1', noShowDetectedAt: new Date('2099-01-02T00:00:00.000Z') }),
      update: async ({ data }: { data: { noShowJustification: string; noShowJustifiedAt: Date } }) => ({ id: 'rsvp-1', ...data }),
    },
  };
  const service = new EventRsvpService(prisma as never, { log: async (input: unknown) => { audits.push(input); } } as never);
  const result = await service.justifyNoShow('event-1', 'user-1', { justification: '  Caiu minha internet.  ' });
  assert.equal(result.noShowJustification, 'Caiu minha internet.');
  assert.equal(audits.length, 1);
});
