import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { GuildPolicyStatus } from '@prisma/client';
import { GuildPolicyService } from '../src/modules/business-rules/guild-policy.service';

const identity = { id: 'staff-1', discordUsername: 'Staff', discordNickname: null };

test('policy draft snapshots only publishable operational rules and is audited', async () => {
  const audits: unknown[] = [];
  const created: any[] = [];
  const prisma = {
    guildPolicyVersion: {
      create: async ({ data }: any) => {
        created.push(data);
        return { id: 'policy-1', version: null, status: GuildPolicyStatus.DRAFT, ...data, diffPt: [], diffEn: [], publishedAt: null, createdAt: new Date(), updatedAt: new Date(), createdBy: identity, publishedBy: null };
      },
    },
  };
  const rules = [
    { key: 'attendanceEligibilityRules', category: 'eligibility', label: 'Cortes', description: 'Cortes D30', value: { bidMinimumPercent: 65 } },
    { key: 'maintenanceMode', category: 'operations', label: 'Manutencao', description: 'Interna', value: { enabled: false } },
  ];
  const service = new GuildPolicyService(
    prisma as never,
    { listRules: async () => rules } as never,
    { log: async (input: unknown) => { audits.push(input); } } as never,
    {} as never,
  );
  await service.createDraft({
    titlePt: 'Politica vigente', titleEn: 'Current policy', summaryPt: 'Resumo da versao.', summaryEn: 'Version summary.', effectiveAt: '2099-01-01T00:00:00.000Z',
  }, 'staff-1');
  assert.deepEqual((created[0].snapshot as { rules: Array<{ key: string }> }).rules.map((rule) => rule.key), ['attendanceEligibilityRules']);
  assert.equal(audits.length, 1);
});

test('publishing assigns the next version, generates a plain diff and makes the document immutable', async () => {
  const currentSnapshot = { rules: [{ key: 'attendanceEligibilityRules', category: 'eligibility', label: 'Cortes', value: { bidMinimumPercent: 65 } }] };
  const previousSnapshot = { rules: [{ key: 'attendanceEligibilityRules', category: 'eligibility', label: 'Cortes', value: { bidMinimumPercent: 60 } }] };
  const draft: any = {
    id: 'policy-2', version: null, status: GuildPolicyStatus.DRAFT, titlePt: 'v2', titleEn: 'v2', summaryPt: 'Resumo v2', summaryEn: 'Summary v2',
    effectiveAt: new Date('2099-02-01'), snapshot: currentSnapshot, diffPt: [], diffEn: [], createdAt: new Date(), updatedAt: new Date(), publishedAt: null,
    isEmergency: false, emergencyReason: null, createdBy: identity, publishedBy: null,
  };
  let publishedData: any;
  const tx = {
    guildPolicyVersion: {
      findUnique: async () => draft,
      findFirst: async () => ({ version: 1, snapshot: previousSnapshot }),
      aggregate: async () => ({ _max: { version: 1 } }),
      update: async ({ data }: any) => {
        publishedData = data;
        return { ...draft, ...data, createdBy: identity, publishedBy: identity };
      },
    },
    player: { findMany: async () => [{ id: 'player-1' }] },
    guildPolicyReceipt: { createMany: async () => ({ count: 1 }) },
  };
  const prisma = {
    $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    guildPolicyVersion: { findUnique: async () => ({ ...draft, status: GuildPolicyStatus.PUBLISHED }) },
  };
  const notifications: unknown[] = [];
  const service = new GuildPolicyService(
    prisma as never,
    {} as never,
    { log: async () => undefined } as never,
    { createForPlayer: async (input: unknown) => { notifications.push(input); } } as never,
  );
  const result = await service.publish(draft.id, 'staff-1') as any;
  assert.equal(result.version, 2);
  assert.ok((publishedData.diffPt as string[]).some((line) => line.includes('bidMinimumPercent') && line.includes('60') && line.includes('65')));
  assert.equal(notifications.length, 1);
  await assert.rejects(
    service.updateDraft(draft.id, { titlePt: 'Tentativa' }, 'staff-1'),
    (error) => error instanceof BadRequestException && error.message === 'Published policies are immutable.',
  );
});

test('public workspace separates current, upcoming and historical published policies by effective date', async () => {
  const row = (id: string, version: number, effectiveAt: string) => ({
    id, version, status: GuildPolicyStatus.PUBLISHED, titlePt: id, titleEn: id, summaryPt: id, summaryEn: id,
    effectiveAt: new Date(effectiveAt), isEmergency: false, emergencyReason: null, snapshot: { rules: [] }, diffPt: [], diffEn: [], createdAt: new Date(), updatedAt: new Date(), publishedAt: new Date(), createdBy: identity, publishedBy: identity,
  });
  const prisma = { guildPolicyVersion: { findMany: async () => [row('future', 3, '2099-03-01'), row('current', 2, '2099-02-01'), row('old', 1, '2099-01-01')] } };
  const service = new GuildPolicyService(prisma as never, {} as never, {} as never, {} as never);
  const workspace = await service.getPublicWorkspace(new Date('2099-02-15'));
  assert.equal(workspace.current?.id, 'current');
  assert.deepEqual(workspace.upcoming.map((policy) => policy.id), ['future']);
  assert.deepEqual(workspace.history.map((policy) => policy.id), ['old']);
});

test('policy open and acknowledgement receipts are idempotent and do not imply legal agreement', async () => {
  const audits: any[] = [];
  let receipt: any = null;
  let upserts = 0;
  const policy = { id: 'policy-1', version: 1, status: GuildPolicyStatus.PUBLISHED };
  const prisma = {
    player: { findFirst: async () => ({ id: 'player-1' }) },
    guildPolicyVersion: { findUnique: async () => policy },
    guildPolicyReceipt: {
      findUnique: async () => receipt,
      upsert: async ({ create, update }: any) => {
        upserts += 1;
        receipt = receipt ? { ...receipt, ...update } : { id: 'receipt-1', ...create };
        return receipt;
      },
    },
  };
  const service = new GuildPolicyService(
    prisma as never,
    {} as never,
    { log: async (input: unknown) => { audits.push(input); } } as never,
    {} as never,
  );

  await service.markOpened(policy.id, 'user-1');
  await service.markOpened(policy.id, 'user-1');
  await service.acknowledge(policy.id, 'user-1');
  await service.acknowledge(policy.id, 'user-1');

  assert.equal(upserts, 2);
  assert.deepEqual(audits.map((entry) => entry.action), ['GUILD_POLICY_OPENED', 'GUILD_POLICY_ACKNOWLEDGED']);
  assert.equal(audits[1].metadata.legalAgreement, false);
});
