import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { PlayerClass, PlayerCombatAvailability, PlayerCombatRole, ProgressCategory } from '@prisma/client';
import { PlayersService } from '../src/modules/players/services/players.service';

function createService() {
  const player = {
    id: 'player-1',
    userId: 'user-1',
    nickname: 'OldName',
    class: PlayerClass.VANGUARD,
    dimensionalLayer: 1,
    combatPower: 0,
    timezone: 'America/Sao_Paulo',
    attendancePercentage: 0,
    isActive: true,
    joinedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const updates: unknown[] = [];
  const tx = {
    user: {
      update: async () => undefined,
    },
    player: {
      update: async ({ data }: { data: unknown }) => {
        updates.push(data);
        return { ...player, ...(data as object), user: {}, roles: [] };
      },
    },
  };
  const client = {
    user: {
      findUnique: async () => ({ players: [player] }),
    },
    $transaction: async <T>(callback: (transaction: typeof tx) => Promise<T>) => callback(tx),
  };
  const service = new PlayersService(
    { client } as never,
    {} as never,
    {} as never,
  );

  return { service, updates };
}

test('profile update rejects dimensional layer outside the supported range', async () => {
  const { service } = createService();

  await assert.rejects(
    service.updatePrimaryPlayerProfile('user-1', { dimensionalLayer: 58 }),
    (error) => error instanceof BadRequestException && error.message === 'Dimensional layer must be an integer between 1 and 10.',
  );
});

test('profile update rejects unknown player classes before Prisma sees them', async () => {
  const { service } = createService();

  await assert.rejects(
    service.updatePrimaryPlayerProfile('user-1', { class: 'DAOIST' as PlayerClass }),
    (error) => error instanceof BadRequestException && error.message === 'Invalid player class.',
  );
});

test('profile update accepts unicode nicknames', async () => {
  const { service, updates } = createService();
  const unicodeNickname = '\u5de5\u30e0\u53e3\u5c3a';

  await service.updatePrimaryPlayerProfile('user-1', {
    nickname: ` ${unicodeNickname} `,
    class: PlayerClass.ASSASSIN,
    dimensionalLayer: 1,
  });

  assert.deepEqual(updates[0], {
    nickname: unicodeNickname,
    class: PlayerClass.ASSASSIN,
    dimensionalLayer: 1,
    timezone: undefined,
  });
});

test('combat roster matrix reports composition gaps and stale status', async () => {
  const now = new Date('2026-07-11T12:00:00.000Z');
  const stale = new Date('2026-06-01T12:00:00.000Z');
  const client = {
    player: {
      findMany: async () => [
        {
          id: 'player-1',
          nickname: 'Aiko',
          class: PlayerClass.WARLORD,
          dimensionalLayer: 6,
          combatPower: 1000,
          attendancePercentage: 82,
          isActive: true,
          joinedAt: new Date('2026-01-01T00:00:00.000Z'),
          combatProfile: {
            primaryClass: PlayerClass.WARLORD,
            secondaryClass: null,
            declaredBuild: 'Frontline CC',
            preferredRole: PlayerCombatRole.FRONTLINE,
            acceptedRoles: [PlayerCombatRole.CALLER],
            availability: PlayerCombatAvailability.DAILY,
          },
        },
        {
          id: 'player-2',
          nickname: 'Brann',
          class: PlayerClass.ELEMENTALIST,
          dimensionalLayer: 4,
          combatPower: 800,
          attendancePercentage: 35,
          isActive: true,
          joinedAt: new Date('2026-01-01T00:00:00.000Z'),
          combatProfile: null,
        },
      ],
    },
    playerProgress: {
      findMany: async () => [
        { playerId: 'player-1', category: ProgressCategory.STATUS, createdAt: now },
        { playerId: 'player-2', category: ProgressCategory.STATUS, createdAt: stale },
      ],
    },
    event: {
      findMany: async () => [{
        startsAt: now,
        attendances: [{ playerId: 'player-1', attended: true }],
      }],
    },
  };
  const service = new PlayersService(
    { client } as never,
    {} as never,
    {} as never,
  );

  const matrix = await service.getCombatRosterMatrix();

  assert.equal(matrix.totals.activePlayers, 2);
  assert.equal(matrix.totals.frontline, 1);
  assert.equal(matrix.totals.support, 0);
  assert.equal(matrix.totals.missingBuild, 1);
  assert.equal(matrix.totals.staleStatus, 1);
  assert.equal(matrix.totals.lowAttendance, 1);
  assert.ok(matrix.alerts.some((alert) => alert.key === 'missing-support'));
  assert.ok(matrix.markdown.includes('Matriz de composicao G3X'));
});
