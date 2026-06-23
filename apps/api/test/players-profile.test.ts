import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { PlayerClass } from '@prisma/client';
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
