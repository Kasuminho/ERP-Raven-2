import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PlayerCombatAvailability } from '@prisma/client';
import { buildRosterSignals } from '../src/modules/players/services/player-reminder-policy';

const statusCutoff = new Date('2026-06-30T12:00:00.000Z');

test('player reminder policy flags profile gaps, stale status and attendance below 50%', () => {
    assert.deepEqual(buildRosterSignals({
      declaredBuild: null,
      preferredRole: null,
      availability: PlayerCombatAvailability.UNSET,
      lastStatusAt: new Date('2026-06-29T12:00:00.000Z'),
      statusCutoff,
      eligibleEvents: 4,
      attendedEvents: 1,
    }), [
      'SEM_BUILD',
      'SEM_ROLE',
      'SEM_STATUS_RECENTE',
      'PRESENCA_BAIXA',
      'SEM_DISPONIBILIDADE',
    ]);
});

test('player reminder policy does not punish attendance without eligible finalized events', () => {
    assert.deepEqual(buildRosterSignals({
      declaredBuild: 'Tank sustain',
      preferredRole: 'FRONTLINE',
      availability: PlayerCombatAvailability.DAILY,
      lastStatusAt: statusCutoff,
      statusCutoff,
      eligibleEvents: 0,
      attendedEvents: 0,
    }), []);
});

test('player reminder policy accepts exactly 50% attendance', () => {
    assert.equal(buildRosterSignals({
      declaredBuild: 'Support',
      preferredRole: 'SUPPORT',
      availability: PlayerCombatAvailability.LOW,
      lastStatusAt: new Date('2026-07-01T12:00:00.000Z'),
      statusCutoff,
      eligibleEvents: 4,
      attendedEvents: 2,
    }).includes('PRESENCA_BAIXA'), false);
});
