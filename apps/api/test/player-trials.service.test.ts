import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { PlayerTrialDecisionType, PlayerTrialStatus } from '@prisma/client';
import { PlayerTrialsService } from '../src/modules/player-trials/player-trials.service';

const now = new Date('2026-07-21T12:00:00.000Z');
const baseTrial = { id: 'trial-1', playerId: 'player-1', objectivePt: 'Objetivo claro.', objectiveEn: 'Clear objective.', plannedStartAt: new Date('2026-07-01T00:00:00.000Z'), plannedEndAt: new Date('2026-07-31T00:00:00.000Z'), status: PlayerTrialStatus.ACTIVE, decisionType: null, decisionReasonPt: null, decisionReasonEn: null, decidedAt: null, createdById: 'staff-1', decidedById: null, createdAt: now, updatedAt: now, criteria: [], checkIns: [], player: { id: 'player-1', nickname: 'Aiko', userId: 'user-1', isActive: true }, createdBy: { id: 'staff-1', discordUsername: 'staff', discordNickname: null }, decidedBy: null };

test('trial creation snapshots criteria and schedules factual check-ins at days 7, 14, and 30', async () => {
  let createdData: any;
  const prisma = {
    player: { findFirst: async () => ({ id: 'player-1' }) },
    playerTrial: {},
    playerAbsence: { findMany: async () => [] },
    $transaction: async (callback: any) => callback({ playerTrial: { findFirst: async () => null, create: async ({ data }: any) => { createdData = data; return { ...baseTrial, ...data, criteria: data.criteria.create, checkIns: data.checkIns.create }; } } }),
  };
  const audits: any[] = [];
  const service = new PlayerTrialsService(prisma as never, { log: async (entry: any) => audits.push(entry) } as never, { createForPlayer: async () => ({}) } as never);
  await service.create('staff-1', { playerId: 'player-1', objectivePt: 'Objetivo claro.', objectiveEn: 'Clear objective.', plannedStartAt: '2026-07-01', plannedEndAt: '2026-07-31', criteria: [{ key: 'TEAMWORK', titlePt: 'Equipe', titleEn: 'Teamwork', descriptionPt: 'Registro factual.', descriptionEn: 'Factual record.', isRequired: true, displayOrder: 0 }] });
  assert.deepEqual(createdData.checkIns.create.map((entry: any) => entry.day), [7, 14, 30]);
  assert.equal(createdData.criteria.create[0].descriptionEn, 'Factual record.');
  assert.equal(audits[0].metadata.criteriaPublishedBeforeEvaluation, true);
  assert.equal(audits[0].metadata.affectsLoot, false);
});

test('declared absence pauses an active trial and extends its displayed end without automatic decision', async () => {
  const realNow = Date.now;
  Date.now = () => new Date('2026-07-12T12:00:00.000Z').getTime();
  try {
    const prisma = {
      player: { findFirst: async () => ({ id: 'player-1' }) },
      playerTrial: { findFirst: async (_args: any) => baseTrial },
      playerAbsence: { findMany: async () => [{ id: 'absence-1', startsAt: new Date('2026-07-10T00:00:00.000Z'), endsAt: new Date('2026-07-15T00:00:00.000Z'), reason: 'Viagem', reasonVisibility: 'STAFF_ONLY' }] },
    };
    const service = new PlayerTrialsService(prisma as never, {} as never, {} as never);
    const result = await (service as any).decorate(baseTrial);
    assert.equal(result.effectiveStatus, 'PAUSED');
    assert.equal(result.pausedDays, 5);
    assert.equal(result.adjustedEndAt.toISOString(), '2026-08-05T00:00:00.000Z');
    assert.equal(result.automaticDecision, false);
  } finally { Date.now = realNow; }
});

test('approval, extension, and closure require a reason and extension requires a later end', async () => {
  const prisma = { playerTrial: { findFirst: async () => baseTrial, update: async ({ data }: any) => ({ ...baseTrial, ...data }) }, playerAbsence: { findMany: async () => [] } };
  const service = new PlayerTrialsService(prisma as never, { log: async () => ({}) } as never, { createForPlayer: async () => ({}) } as never);
  await assert.rejects(() => service.decide('staff-1', 'trial-1', { decision: PlayerTrialDecisionType.EXTEND, reasonPt: 'Mais tempo.', reasonEn: 'More time.', extendedEndAt: '2026-07-20' }), BadRequestException);
  const result = await service.decide('staff-1', 'trial-1', { decision: PlayerTrialDecisionType.APPROVE, reasonPt: 'Criterios atendidos.', reasonEn: 'Criteria met.' }) as any;
  assert.equal(result.trial.status, PlayerTrialStatus.APPROVED);
  assert.equal(result.affectsLoot, false);
});
