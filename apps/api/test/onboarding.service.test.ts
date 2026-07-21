import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { OnboardingCompletionType } from '@prisma/client';
import { instantiateOnboardingPlan, OnboardingService } from '../src/modules/onboarding/onboarding.service';

test('recruitment onboarding plan snapshots the active template and deadline', async () => {
  let planData: any;
  const tx = {
    onboardingTemplate: { findFirst: async () => ({ id: 'template-1', dueDays: 21, steps: [{ key: 'RULES', titlePt: 'Regras', titleEn: 'Rules', descriptionPt: 'Leia.', descriptionEn: 'Read.', href: '/dashboard/rules', isRequired: true, completionType: OnboardingCompletionType.RULES_ACK, displayOrder: 0 }] }) },
    playerOnboardingPlan: { create: async ({ data }: any) => { planData = data; return { id: 'plan-1', ...data }; } },
  };
  await instantiateOnboardingPlan(tx as never, 'player-1', 'staff-1', 'Acompanhar primeira semana.');
  assert.equal(planData.playerId, 'player-1');
  assert.equal(planData.steps.create[0].titleEn, 'Rules');
  assert.equal(planData.staffNote, 'Acompanhar primeira semana.');
  const days = Math.round((planData.dueAt.getTime() - Date.now()) / 86_400_000);
  assert.equal(days, 21);
});

test('player workspace reconciles provable automatic steps and keeps manual confirmation pending', async () => {
  const updatedIds: string[] = [];
  const steps = [
    { id: 'rules', key: 'RULES', isRequired: true, completionType: OnboardingCompletionType.RULES_ACK, completedAt: null, displayOrder: 0 },
    { id: 'timezone', key: 'TIMEZONE', isRequired: true, completionType: OnboardingCompletionType.TIMEZONE, completedAt: null, displayOrder: 1 },
    { id: 'attendance', key: 'ATTENDANCE', isRequired: true, completionType: OnboardingCompletionType.MANUAL, completedAt: null, displayOrder: 2 },
  ].map((step) => ({ ...step, titlePt: step.key, titleEn: step.key, descriptionPt: step.key, descriptionEn: step.key, href: '/dashboard/onboarding' }));
  const plan = { id: 'plan-1', playerId: 'player-1', templateId: 'template-1', startedAt: new Date(), dueAt: new Date(Date.now() + 1000), completedAt: null, staffNote: null, createdAt: new Date(), updatedAt: new Date(), template: { id: 'template-1', name: 'Padrao', version: 1 }, steps };
  const prisma = {
    player: { findFirst: async () => ({ id: 'player-1', nickname: 'Aiko', class: 'VANGUARD', dimensionalLayer: 4, timezone: 'America/Sao_Paulo', combatProfile: { declaredBuild: 'Tank' }, onboardingPlan: plan }) },
    guildPolicyReceipt: { count: async () => 1 },
    playerWishlistItem: { count: async () => 0 },
    eventAttendance: { count: async () => 0 },
    playerOnboardingStep: { updateMany: async ({ where }: any) => { updatedIds.push(...where.id.in); for (const step of steps) if (where.id.in.includes(step.id)) step.completedAt = new Date(); return { count: where.id.in.length }; } },
    playerOnboardingPlan: { findUnique: async () => plan },
  };
  const service = new OnboardingService(prisma as never, {} as never);
  const result = await service.getMine('user-1') as any;
  assert.deepEqual(updatedIds.sort(), ['rules', 'timezone']);
  assert.equal(result.nextStep.id, 'attendance');
  assert.equal(result.progress.requiredCompleted, 2);
});

test('only manual onboarding steps accept player confirmation and completion is audited', async () => {
  const audits: any[] = [];
  let completedAt: Date | null = null;
  const step = { id: 'step-1', planId: 'plan-1', key: 'ATTENDANCE', completionType: OnboardingCompletionType.MANUAL, completedAt: null, plan: { id: 'plan-1', playerId: 'player-1' } };
  const plan = { id: 'plan-1', completedAt: null, template: { id: 'template-1', name: 'Padrao', version: 1 }, steps: [{ ...step, titlePt: 'Presenca', titleEn: 'Attendance', descriptionPt: 'Leia', descriptionEn: 'Read', href: '/dashboard/attendance', isRequired: true, displayOrder: 0, completedAt }] };
  const prisma = {
    playerOnboardingStep: { findFirst: async () => step, update: async () => { completedAt = new Date(); plan.steps[0].completedAt = completedAt; return step; } },
    playerOnboardingPlan: { findUnique: async () => plan, update: async ({ data }: any) => ({ ...plan, ...data }) },
  };
  const service = new OnboardingService(prisma as never, { log: async (input: unknown) => { audits.push(input); } } as never);
  await service.completeManualStep('user-1', 'step-1');
  assert.equal(audits[0].action, 'ONBOARDING_STEP_COMPLETED');

  const automaticPrisma = { playerOnboardingStep: { findFirst: async () => ({ ...step, completionType: OnboardingCompletionType.PROFILE }) } };
  const automaticService = new OnboardingService(automaticPrisma as never, {} as never);
  await assert.rejects(() => automaticService.completeManualStep('user-1', 'step-1'), BadRequestException);
});

test('Staff cannot publish a template that drops a required onboarding journey', async () => {
  const service = new OnboardingService({} as never, {} as never);
  await assert.rejects(
    () => service.createTemplate('staff-1', { name: 'Incompleto', dueDays: 30, steps: [{ key: 'RULES', titlePt: 'Ler regras', titleEn: 'Read rules', descriptionPt: 'Leia tudo.', descriptionEn: 'Read all.', href: '/dashboard/rules', isRequired: true, completionType: OnboardingCompletionType.RULES_ACK, displayOrder: 0 }] }),
    (error) => error instanceof BadRequestException && error.message.includes('PROFILE'),
  );
});
