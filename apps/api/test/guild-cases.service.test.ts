import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GuildCaseCategory, GuildCaseEntryVisibility, GuildCaseSeverity, GuildCaseStatus } from '@prisma/client';
import { GuildCasesService } from '../src/modules/guild-cases/guild-cases.service';

test('player creates a private case with a player-visible history entry and audit', async () => {
  let createData: any;
  const audits: any[] = [];
  const prisma = {
    player: { findFirst: async () => ({ id: 'player-1' }) },
    guildCase: {
      create: async ({ data }: any) => {
        createData = data;
        return { id: 'case-1', ...data, status: GuildCaseStatus.OPEN };
      },
    },
  };
  const service = new GuildCasesService(prisma as never, { log: async (input: unknown) => { audits.push(input); } } as never, {} as never);
  await service.create('user-1', { category: GuildCaseCategory.QUESTION, severity: GuildCaseSeverity.MEDIUM, subject: 'Regra do evento', description: 'Preciso entender como esta regra sera aplicada.' });
  assert.equal(createData.playerId, 'player-1');
  assert.equal(createData.entries.create.visibility, GuildCaseEntryVisibility.PLAYER);
  assert.equal(audits[0].action, 'GUILD_CASE_CREATED');
});

test('Staff response stores separate bilingual player content, notifies privately and records no automatic decision', async () => {
  const entries: any[] = [];
  const notifications: any[] = [];
  const audits: any[] = [];
  const existing = { id: 'case-1', playerId: 'player-1', status: GuildCaseStatus.IN_REVIEW };
  const tx = {
    guildCaseEntry: { create: async ({ data }: any) => { entries.push(data); return data; } },
    guildCase: { update: async ({ data }: any) => ({ ...existing, ...data, updatedAt: new Date('2026-07-21T12:00:00.000Z') }) },
  };
  const prisma = {
    guildCase: { findUnique: async () => existing },
    $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  };
  const service = new GuildCasesService(
    prisma as never,
    { log: async (input: unknown) => { audits.push(input); } } as never,
    { createForPlayer: async (input: unknown) => { notifications.push(input); } } as never,
  );
  await service.respond('case-1', 'staff-1', { bodyPt: 'Resposta em portugues.', bodyEn: 'Response in English.', resolve: true });
  assert.equal(entries[0].visibility, GuildCaseEntryVisibility.PLAYER);
  assert.equal(entries[0].bodyPt, 'Resposta em portugues.');
  assert.equal(entries[0].bodyEn, 'Response in English.');
  assert.equal(notifications[0].playerId, 'player-1');
  assert.equal(audits[0].metadata.automaticDecision, false);
});

test('resolved private case reopens only when its owner sends new context', async () => {
  const entries: any[] = [];
  const existing = { id: 'case-1', playerId: 'player-1', status: GuildCaseStatus.RESOLVED, assignedToId: null };
  const tx = {
    guildCaseEntry: { create: async ({ data }: any) => { entries.push(data); return data; } },
    guildCase: { update: async ({ data }: any) => ({ ...existing, ...data }) },
  };
  const prisma = {
    player: { findFirst: async () => ({ id: 'player-1' }) },
    guildCase: { findFirst: async () => existing },
    $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  };
  const service = new GuildCasesService(prisma as never, { log: async () => undefined } as never, {} as never);
  const result = await service.addPlayerMessage('user-1', 'case-1', { message: 'Ainda preciso esclarecer um ponto.' }) as any;
  assert.equal(result.status, GuildCaseStatus.OPEN);
  assert.equal(entries.some((entry) => entry.kind === 'STATUS_CHANGED'), true);
});
