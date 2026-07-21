import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OnboardingCompletionType, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { AuditService } from '../audit/services/audit.service';
import { CreateOnboardingTemplateDto } from './dto';

export const DEFAULT_ONBOARDING_STEPS = [
  { key: 'RULES', titlePt: 'Ler e reconhecer as regras', titleEn: 'Read and acknowledge the rules', descriptionPt: 'Leia a política publicada e registre Li e entendi.', descriptionEn: 'Read the published policy and select I read and understood.', href: '/dashboard/rules', isRequired: true, completionType: OnboardingCompletionType.RULES_ACK, displayOrder: 0 },
  { key: 'PROFILE', titlePt: 'Conferir perfil', titleEn: 'Review your profile', descriptionPt: 'Confirme nickname, classe e camada operacional.', descriptionEn: 'Confirm nickname, class, and operational layer.', href: '/dashboard/profile', isRequired: true, completionType: OnboardingCompletionType.PROFILE, displayOrder: 1 },
  { key: 'TIMEZONE', titlePt: 'Definir timezone', titleEn: 'Set your timezone', descriptionPt: 'Cadastre seu fuso para eventos e conflitos aparecerem corretamente.', descriptionEn: 'Set your timezone so events and conflicts display correctly.', href: '/dashboard/profile', isRequired: true, completionType: OnboardingCompletionType.TIMEZONE, displayOrder: 2 },
  { key: 'BUILD', titlePt: 'Declarar build', titleEn: 'Declare your build', descriptionPt: 'Informe sua build para a Staff planejar composição.', descriptionEn: 'Provide your build so Staff can plan composition.', href: '/dashboard/profile', isRequired: true, completionType: OnboardingCompletionType.BUILD, displayOrder: 3 },
  { key: 'WISHLIST', titlePt: 'Montar wishlist', titleEn: 'Build your wishlist', descriptionPt: 'Registre ao menos um objetivo de equipamento.', descriptionEn: 'Register at least one equipment goal.', href: '/dashboard/wishlist', isRequired: false, completionType: OnboardingCompletionType.WISHLIST, displayOrder: 4 },
  { key: 'ATTENDANCE', titlePt: 'Entender presença e DKP', titleEn: 'Understand attendance and DKP', descriptionPt: 'Leia o fluxo e marque concluído quando souber diferenciar RSVP, presença e DKP.', descriptionEn: 'Read the flow and complete this step once you understand RSVP, attendance, and DKP.', href: '/dashboard/attendance', isRequired: true, completionType: OnboardingCompletionType.MANUAL, displayOrder: 5 },
  { key: 'FIRST_EVENT', titlePt: 'Participar do primeiro evento', titleEn: 'Attend your first event', descriptionPt: 'Conclui automaticamente após a primeira presença registrada.', descriptionEn: 'Completes automatically after your first recorded attendance.', href: '/dashboard/attendance', isRequired: true, completionType: OnboardingCompletionType.FIRST_EVENT, displayOrder: 6 },
  { key: 'CHANNELS', titlePt: 'Escolher canais de lembrete', titleEn: 'Choose reminder channels', descriptionPt: 'Revise Web/Discord e marque concluído após salvar sua preferência.', descriptionEn: 'Review Web/Discord and complete this step after saving your preference.', href: '/dashboard/profile', isRequired: true, completionType: OnboardingCompletionType.MANUAL, displayOrder: 7 },
] as const;

const REQUIRED_STEP_TYPES = new Map<string, OnboardingCompletionType>(DEFAULT_ONBOARDING_STEPS.map((step) => [step.key, step.completionType]));

export async function instantiateOnboardingPlan(
  tx: Prisma.TransactionClient,
  playerId: string,
  actorId: string,
  staffNote?: string,
) {
  let template = await tx.onboardingTemplate.findFirst({ where: { isActive: true }, include: { steps: { orderBy: { displayOrder: 'asc' } } }, orderBy: { version: 'desc' } });
  if (!template) {
    const aggregate = await tx.onboardingTemplate.aggregate({ _max: { version: true } });
    template = await tx.onboardingTemplate.create({
      data: { name: 'Onboarding padrão G3X', version: (aggregate._max.version ?? 0) + 1, dueDays: 30, isActive: true, createdById: actorId, steps: { create: DEFAULT_ONBOARDING_STEPS.map((step) => ({ ...step })) } },
      include: { steps: { orderBy: { displayOrder: 'asc' } } },
    });
  }
  const dueAt = new Date(Date.now() + template.dueDays * 24 * 60 * 60 * 1000);
  return tx.playerOnboardingPlan.create({
    data: {
      playerId,
      templateId: template.id,
      dueAt,
      staffNote: staffNote?.trim() || null,
      steps: { create: template.steps.map((step) => ({ key: step.key, titlePt: step.titlePt, titleEn: step.titleEn, descriptionPt: step.descriptionPt, descriptionEn: step.descriptionEn, href: step.href, isRequired: step.isRequired, completionType: step.completionType, displayOrder: step.displayOrder })) },
    },
  });
}

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async getMine(userId: string) {
    const player = await this.prisma.player.findFirst({
      where: { userId, isActive: true },
      include: { combatProfile: true, onboardingPlan: { include: { template: { select: { id: true, name: true, version: true } }, steps: { orderBy: { displayOrder: 'asc' } } } } },
      orderBy: { joinedAt: 'asc' },
    });
    if (!player) throw new NotFoundException('Authenticated user does not have an active player profile.');
    if (!player.onboardingPlan) return { plan: null, nextStep: null, progress: { completed: 0, total: 0, requiredCompleted: 0, requiredTotal: 0 } };

    const [rulesAcknowledged, wishlistItems, attendedEvents] = await Promise.all([
      this.prisma.guildPolicyReceipt.count({ where: { playerId: player.id, acknowledgedAt: { not: null } } }),
      this.prisma.playerWishlistItem.count({ where: { playerId: player.id, status: { in: ['ACTIVE', 'FULFILLED'] } } }),
      this.prisma.eventAttendance.count({ where: { playerId: player.id, attended: true } }),
    ]);
    const automatic: Record<OnboardingCompletionType, boolean> = {
      MANUAL: false,
      RULES_ACK: rulesAcknowledged > 0,
      PROFILE: Boolean(player.nickname && player.class && player.dimensionalLayer > 0),
      TIMEZONE: Boolean(player.timezone?.trim()),
      BUILD: Boolean(player.combatProfile?.declaredBuild?.trim()),
      WISHLIST: wishlistItems > 0,
      FIRST_EVENT: attendedEvents > 0,
    };
    const newlyCompleted = player.onboardingPlan.steps.filter((step) => !step.completedAt && automatic[step.completionType]).map((step) => step.id);
    if (newlyCompleted.length > 0) await this.prisma.playerOnboardingStep.updateMany({ where: { id: { in: newlyCompleted } }, data: { completedAt: new Date() } });
    return this.buildPlayerWorkspace(player.onboardingPlan.id);
  }

  async completeManualStep(userId: string, stepId: string) {
    const step = await this.prisma.playerOnboardingStep.findFirst({ where: { id: stepId, plan: { player: { userId, isActive: true } } }, include: { plan: true } });
    if (!step) throw new NotFoundException('Onboarding step not found.');
    if (step.completionType !== OnboardingCompletionType.MANUAL) throw new BadRequestException('Automatic onboarding steps cannot be completed manually.');
    if (!step.completedAt) {
      await this.prisma.playerOnboardingStep.update({ where: { id: stepId }, data: { completedAt: new Date(), completedById: userId } });
      await this.audit.log({ actorId: userId, action: 'ONBOARDING_STEP_COMPLETED', targetType: 'PlayerOnboardingStep', targetId: stepId, metadata: { playerId: step.plan.playerId, key: step.key } });
    }
    return this.buildPlayerWorkspace(step.planId);
  }

  async getStaffWorkspace() {
    const [templates, plans] = await Promise.all([
      this.prisma.onboardingTemplate.findMany({ include: { createdBy: { select: { id: true, discordUsername: true, discordNickname: true } }, steps: { orderBy: { displayOrder: 'asc' } } }, orderBy: { version: 'desc' } }),
      this.prisma.playerOnboardingPlan.findMany({ include: { player: { select: { id: true, nickname: true, isActive: true } }, steps: { orderBy: { displayOrder: 'asc' } }, template: { select: { name: true, version: true } } }, orderBy: { startedAt: 'desc' }, take: 200 }),
    ]);
    return { activeTemplate: templates.find((template) => template.isActive) ?? null, templates, plans };
  }

  async createTemplate(actorId: string, dto: CreateOnboardingTemplateDto) {
    const keys = dto.steps.map((step) => step.key);
    if (new Set(keys).size !== keys.length) throw new BadRequestException('Onboarding template step keys must be unique.');
    const orders = dto.steps.map((step) => step.displayOrder);
    if (new Set(orders).size !== orders.length) throw new BadRequestException('Onboarding template display orders must be unique.');
    for (const [key, completionType] of REQUIRED_STEP_TYPES) {
      const step = dto.steps.find((candidate) => candidate.key === key);
      if (!step) throw new BadRequestException(`Onboarding template requires the ${key} step.`);
      if (step.completionType !== completionType) throw new BadRequestException(`Onboarding step ${key} must use ${completionType} verification.`);
    }
    const template = await this.prisma.$transaction(async (tx) => {
      await tx.onboardingTemplate.updateMany({ where: { isActive: true }, data: { isActive: false } });
      const aggregate = await tx.onboardingTemplate.aggregate({ _max: { version: true } });
      return tx.onboardingTemplate.create({ data: { name: dto.name.trim(), dueDays: dto.dueDays, version: (aggregate._max.version ?? 0) + 1, isActive: true, createdById: actorId, steps: { create: dto.steps.map((step) => ({ ...step, key: step.key.trim(), titlePt: step.titlePt.trim(), titleEn: step.titleEn.trim(), descriptionPt: step.descriptionPt.trim(), descriptionEn: step.descriptionEn.trim(), href: step.href.trim() })) } }, include: { steps: { orderBy: { displayOrder: 'asc' } } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await this.audit.log({ actorId, action: 'ONBOARDING_TEMPLATE_PUBLISHED', targetType: 'OnboardingTemplate', targetId: template.id, metadata: { version: template.version, dueDays: template.dueDays, stepKeys: template.steps.map((step) => step.key) } });
    return template;
  }

  private async buildPlayerWorkspace(planId: string) {
    let plan = await this.prisma.playerOnboardingPlan.findUnique({ where: { id: planId }, include: { template: { select: { id: true, name: true, version: true } }, steps: { orderBy: { displayOrder: 'asc' } } } });
    if (!plan) throw new NotFoundException('Onboarding plan not found.');
    const requiredComplete = plan.steps.filter((step) => step.isRequired).every((step) => Boolean(step.completedAt));
    if (requiredComplete && !plan.completedAt) plan = await this.prisma.playerOnboardingPlan.update({ where: { id: planId }, data: { completedAt: new Date() }, include: { template: { select: { id: true, name: true, version: true } }, steps: { orderBy: { displayOrder: 'asc' } } } });
    const completed = plan.steps.filter((step) => step.completedAt).length;
    const required = plan.steps.filter((step) => step.isRequired);
    return { plan, nextStep: plan.steps.find((step) => step.isRequired && !step.completedAt) ?? plan.steps.find((step) => !step.completedAt) ?? null, progress: { completed, total: plan.steps.length, requiredCompleted: required.filter((step) => step.completedAt).length, requiredTotal: required.length } };
  }
}
