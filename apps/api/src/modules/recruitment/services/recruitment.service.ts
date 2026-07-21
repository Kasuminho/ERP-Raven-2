import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { PlayerCombatAvailability, PlayerStaffNoteSeverity, Prisma, RecruitmentApplicationStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { AuditService } from '../../audit/services/audit.service';
import { instantiateOnboardingPlan } from '../../onboarding/onboarding.service';
import { ConvertRecruitmentApplicationDto, CreateRecruitmentApplicationDto } from '../dto';

@Injectable()
export class RecruitmentService {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createApplication(data: CreateRecruitmentApplicationDto, ipKey: string) {
    this.assertRateLimit(ipKey);

    if (!data.rulesAccepted) {
      throw new BadRequestException('Rules must be accepted.');
    }

    const created = await this.prisma.recruitmentApplication.create({
      data: {
        nickname: data.nickname.trim(),
        discordTag: data.discordTag?.trim() || null,
        playerClass: data.playerClass,
        combatPower: data.combatPower,
        dimensionalLayer: data.dimensionalLayer,
        availability: data.availability.trim(),
        focus: data.focus.trim(),
        experience: data.experience.trim(),
        proofImageUrl: data.proofImageUrl?.trim() || null,
        notes: data.notes?.trim() || null,
        rulesAccepted: data.rulesAccepted,
      },
    });

    await this.auditService.log({
      action: 'RECRUITMENT_APPLICATION_CREATED',
      targetType: 'RecruitmentApplication',
      targetId: created.id,
      metadata: { playerClass: created.playerClass, dimensionalLayer: created.dimensionalLayer },
    });

    return created;
  }

  async listStaff(status?: RecruitmentApplicationStatus) {
    return this.prisma.recruitmentApplication.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
      include: {
        reviewedBy: { select: { id: true, discordUsername: true, discordNickname: true } },
      },
    });
  }

  async review(applicationId: string, actorId: string, status: RecruitmentApplicationStatus, reviewNote: string) {
    if (status === RecruitmentApplicationStatus.PENDING || status === RecruitmentApplicationStatus.CONVERTED) {
      throw new BadRequestException('Review status must move the application to triage, accepted, rejected or archived.');
    }

    const updated = await this.prisma.recruitmentApplication.update({
      where: { id: applicationId },
      data: {
        status,
        reviewedById: actorId,
        reviewedAt: new Date(),
        reviewNote: reviewNote.trim(),
      },
    });

    await this.auditService.log({
      actorId,
      action: 'RECRUITMENT_APPLICATION_REVIEWED',
      targetType: 'RecruitmentApplication',
      targetId: applicationId,
      metadata: { status, reviewNote },
    });

    return updated;
  }

  async convert(applicationId: string, actorId: string, data: ConvertRecruitmentApplicationDto) {
    return this.prisma.$transaction(async (tx) => {
      const application = await tx.recruitmentApplication.findUnique({
        where: { id: applicationId },
      });

      if (!application) {
        throw new NotFoundException('Recruitment application not found.');
      }

      if (application.status !== RecruitmentApplicationStatus.ACCEPTED) {
        throw new BadRequestException('Only accepted recruitment applications can be converted.');
      }

      if (application.convertedPlayerId) {
        throw new ConflictException('Recruitment application was already converted.');
      }

      const user = await tx.user.findUnique({ where: { id: data.userId } });
      if (!user) {
        throw new NotFoundException('Target user not found.');
      }

      const nickname = data.nickname?.trim() || application.nickname.trim();
      const duplicate = await tx.player.findFirst({
        where: {
          OR: [
            { nickname },
            { userId: data.userId },
          ],
        },
        select: { id: true, nickname: true, userId: true },
      });

      if (duplicate) {
        throw new ConflictException('A player with this nickname or user already exists.');
      }

      const player = await tx.player.create({
        data: {
          user: { connect: { id: data.userId } },
          nickname,
          class: application.playerClass,
          dimensionalLayer: application.dimensionalLayer,
          combatPower: application.combatPower,
          attendancePercentage: 0,
          isActive: true,
          combatProfile: {
            create: {
              primaryClass: application.playerClass,
              declaredBuild: application.focus,
              availability: PlayerCombatAvailability.UNSET,
              publicNote: `Recrutado pelo site. Disponibilidade declarada: ${application.availability}`,
              staffNote: `Origem: candidatura ${application.id}. Experiencia: ${application.experience}`,
              updatedBy: { connect: { id: actorId } },
            },
          },
        },
        include: { combatProfile: true },
      });

      await tx.playerStaffNote.create({
        data: {
          player: { connect: { id: player.id } },
          author: { connect: { id: actorId } },
          severity: PlayerStaffNoteSeverity.INFO,
          body: [
            `Onboarding de recrutamento: ${data.onboardingNote.trim()}`,
            'Checklist: regras, presenca, wishlist, progresso, privacidade e proximos eventos.',
            `Candidatura: ${application.id}. Discord: ${application.discordTag ?? 'nao informado'}.`,
          ].join('\n'),
        },
      });

      const onboardingPlan = await instantiateOnboardingPlan(tx, player.id, actorId, data.onboardingNote);

      const updated = await tx.recruitmentApplication.update({
        where: { id: applicationId },
        data: {
          status: RecruitmentApplicationStatus.CONVERTED,
          convertedById: actorId,
          convertedPlayerId: player.id,
          convertedAt: new Date(),
          reviewedById: actorId,
          reviewedAt: new Date(),
          reviewNote: data.onboardingNote.trim(),
        },
        include: {
          reviewedBy: { select: { id: true, discordUsername: true, discordNickname: true } },
          convertedBy: { select: { id: true, discordUsername: true, discordNickname: true } },
          convertedPlayer: { select: { id: true, nickname: true, class: true, dimensionalLayer: true, combatPower: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'RECRUITMENT_APPLICATION_CONVERTED',
          targetType: 'RecruitmentApplication',
          targetId: applicationId,
          metadata: {
            playerId: player.id,
            userId: data.userId,
            nickname,
            playerClass: application.playerClass,
            dimensionalLayer: application.dimensionalLayer,
            onboardingPlanId: onboardingPlan.id,
          } satisfies Prisma.InputJsonObject,
        },
      });

      return updated;
    });
  }

  private assertRateLimit(ipKey: string) {
    const now = Date.now();
    const windowMs = 60 * 60 * 1000;
    const recent = (this.hits.get(ipKey) ?? []).filter((timestamp) => now - timestamp < windowMs);

    if (recent.length >= 3) {
      throw new HttpException('Too many recruitment applications from this source.', HttpStatus.TOO_MANY_REQUESTS);
    }

    recent.push(now);
    this.hits.set(ipKey, recent);
  }
}
