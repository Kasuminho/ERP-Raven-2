import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DKPTransactionType, PlayerClass, PlayerCombatAvailability, PlayerCombatProfileChangeStatus, PlayerCombatRole, PlayerStaffNoteSeverity, Prisma, ProgressCategory, ProgressReviewStatus } from '@prisma/client';
import { AuditService } from '../../audit/services/audit.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { RequestCombatProfileChangeDto, ReviewCombatProfileChangeDto, UpdateCombatProfileDto, UpdatePlayerMembershipDto } from '../dto';
import { PlayersRepository } from '../repositories/players.repository';

const reviewRequiredCategories = new Set<ProgressCategory>([
  ProgressCategory.STATUS,
  ProgressCategory.DIMENSIONAL_RIFT,
]);

const multiImageProgressCategories = new Set<ProgressCategory>([
  ProgressCategory.STELLAS_AMPLIFICATION,
  ProgressCategory.SKILLS,
]);

type AuditIdentity = {
  discordId: string;
  playerId?: string;
  playerNickname?: string;
  discordUsername?: string;
  discordNickname?: string | null;
  nicknameIngame?: string | null;
  requestPlayerName?: string | null;
  dropsCount: number;
  requestsCount: number;
  lastActivityAt?: Date | null;
};

type PlayerTimelineTone = 'gold' | 'green' | 'red' | 'blue' | 'muted';

type PlayerTimelineCopy = {
  title: string;
  description: string;
  titleEn: string;
  descriptionEn: string;
  tone: PlayerTimelineTone;
};

type RosterSignal = 'SEM_BUILD' | 'SEM_ROLE' | 'SEM_STATUS_RECENTE' | 'PRESENCA_BAIXA' | 'SEM_DISPONIBILIDADE';

@Injectable()
export class PlayersService {
  constructor(
    private readonly repository: PlayersRepository,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  health(): { module: string; ready: boolean } {
    return this.repository.health();
  }

  async getMe(userId: string) {
    return this.repository.client.user.findUnique({
      where: { id: userId },
      include: {
        players: {
          include: {
            roles: { include: { role: true } },
            combatProfile: true,
          },
        },
      },
    });
  }

  async listPlayers() {
    return this.repository.client.player.findMany({
      include: {
        user: {
          select: {
            discordId: true,
            discordUsername: true,
            discordNickname: true,
            preferredLocale: true,
          },
        },
        roles: { include: { role: true } },
        combatProfile: true,
      },
      orderBy: [{ isActive: 'desc' }, { nickname: 'asc' }],
    });
  }

  async updateMembership(playerId: string, actorId: string, dto: UpdatePlayerMembershipDto) {
    const player = await this.repository.client.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException('Player not found.');

    const activate = dto.action === 'ACTIVATE';
    if (!activate && player.userId === actorId) {
      throw new BadRequestException('Voce nao pode desativar o proprio acesso.');
    }
    if (!activate && !dto.reason?.trim()) {
      throw new BadRequestException('Informe o motivo da desativacao.');
    }

    const updated = await this.repository.client.player.update({
      where: { id: playerId },
      data: activate
        ? {
            isActive: true,
            deactivatedAt: null,
            deactivatedById: null,
            deactivationReason: null,
            reactivationRequestedAt: null,
          }
        : {
            isActive: false,
            deactivatedAt: new Date(),
            deactivatedById: actorId,
            deactivationReason: dto.reason!.trim(),
            reactivationRequestedAt: null,
          },
      include: {
        user: { select: { discordId: true, discordUsername: true, discordNickname: true, preferredLocale: true } },
        roles: { include: { role: true } },
        combatProfile: true,
      },
    });

    await this.auditService.log({
      action: activate ? 'PLAYER_REACTIVATED' : 'PLAYER_DEACTIVATED',
      targetType: 'Player',
      targetId: playerId,
      actorId,
      metadata: { reason: dto.reason?.trim() ?? null, previousIsActive: player.isActive },
    });
    return updated;
  }

  async getCombatRosterMatrix() {
    const staleStatusCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const [players, progressRows, attendanceRows] = await Promise.all([
      this.repository.client.player.findMany({
        where: { isActive: true },
        include: {
          user: {
            select: {
              discordId: true,
              discordUsername: true,
              discordNickname: true,
              preferredLocale: true,
            },
          },
          combatProfile: true,
        },
        orderBy: [{ dimensionalLayer: 'desc' }, { attendancePercentage: 'desc' }, { nickname: 'asc' }],
      }),
      this.repository.client.playerProgress.findMany({
        where: {
          player: { isActive: true },
        },
        select: {
          playerId: true,
          category: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      }),
      this.repository.client.eventAttendance.findMany({
        where: {
          player: { isActive: true },
          attended: true,
        },
        select: {
          playerId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      }),
    ]);

    const lastProgressAt = new Map<string, Date>();
    const lastStatusAt = new Map<string, Date>();
    const lastAttendanceAt = new Map<string, Date>();

    for (const row of progressRows) {
      if (!lastProgressAt.has(row.playerId)) {
        lastProgressAt.set(row.playerId, row.createdAt);
      }

      if (row.category === ProgressCategory.STATUS && !lastStatusAt.has(row.playerId)) {
        lastStatusAt.set(row.playerId, row.createdAt);
      }
    }

    for (const row of attendanceRows) {
      if (!lastAttendanceAt.has(row.playerId)) {
        lastAttendanceAt.set(row.playerId, row.createdAt);
      }
    }

    const rows = players.map((player) => {
      const profile = player.combatProfile;
      const primaryClass = profile?.primaryClass ?? player.class;
      const preferredRole = profile?.preferredRole ?? null;
      const availability = profile?.availability ?? PlayerCombatAvailability.UNSET;
      const playerLastStatusAt = lastStatusAt.get(player.id) ?? null;
      const signals: RosterSignal[] = [];

      if (!profile?.declaredBuild) signals.push('SEM_BUILD');
      if (!preferredRole) signals.push('SEM_ROLE');
      if (!playerLastStatusAt || playerLastStatusAt < staleStatusCutoff) signals.push('SEM_STATUS_RECENTE');
      if (player.attendancePercentage < 50) signals.push('PRESENCA_BAIXA');
      if (availability === PlayerCombatAvailability.UNSET) signals.push('SEM_DISPONIBILIDADE');

      return {
        playerId: player.id,
        nickname: player.nickname,
        playerClass: player.class,
        dimensionalLayer: player.dimensionalLayer,
        combatPower: player.combatPower,
        attendancePercentage: player.attendancePercentage,
        isActive: player.isActive,
        primaryClass,
        secondaryClass: profile?.secondaryClass ?? null,
        declaredBuild: profile?.declaredBuild ?? null,
        preferredRole,
        acceptedRoles: profile?.acceptedRoles ?? [],
        availability,
        lastProgressAt: lastProgressAt.get(player.id) ?? null,
        lastStatusAt: playerLastStatusAt,
        lastAttendanceAt: lastAttendanceAt.get(player.id) ?? null,
        signals,
      };
    });

    const totals = {
      activePlayers: rows.length,
      mappedProfiles: rows.filter((row) => Boolean(row.declaredBuild || row.preferredRole || row.availability !== PlayerCombatAvailability.UNSET)).length,
      missingBuild: rows.filter((row) => row.signals.includes('SEM_BUILD')).length,
      staleStatus: rows.filter((row) => row.signals.includes('SEM_STATUS_RECENTE')).length,
      lowAttendance: rows.filter((row) => row.signals.includes('PRESENCA_BAIXA')).length,
      frontline: rows.filter((row) => row.preferredRole === PlayerCombatRole.FRONTLINE).length,
      support: rows.filter((row) => row.preferredRole === PlayerCombatRole.SUPPORT).length,
      reserve: rows.filter((row) => row.preferredRole === PlayerCombatRole.RESERVE).length,
    };

    const alerts = this.buildRosterAlerts(rows, totals);
    const counts = {
      byClass: this.countBy(Object.values(PlayerClass), rows, (row) => row.primaryClass),
      byRole: this.countBy([...Object.values(PlayerCombatRole), 'UNSET'] as Array<PlayerCombatRole | 'UNSET'>, rows, (row) => row.preferredRole ?? 'UNSET'),
      byLayer: this.countBy(['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10'], rows, (row) => `C${row.dimensionalLayer}`),
      byAvailability: this.countBy(Object.values(PlayerCombatAvailability), rows, (row) => row.availability),
    };

    return {
      generatedAt: new Date(),
      totals,
      counts,
      alerts,
      rows,
      markdown: this.buildRosterMarkdown(totals, alerts, rows),
    };
  }

  async getMyCombatProfile(userId: string) {
    const player = await this.getPrimaryPlayerByUser(userId);

    if (!player) {
      throw new NotFoundException('Player profile not found.');
    }

    return this.repository.client.player.findUnique({
      where: { id: player.id },
      include: {
        combatProfile: true,
        combatProfileRequests: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
  }

  async updateCombatProfile(playerId: string, actorId: string, data: UpdateCombatProfileDto) {
    const normalized = this.normalizeCombatProfilePayload(data, true);
    const primaryClass = normalized.primaryClass;
    const reason = data.reason?.trim() || undefined;

    if (!primaryClass) {
      throw new BadRequestException('Primary class is required.');
    }

    return this.repository.client.$transaction(async (tx) => {
      const player = await tx.player.findUnique({
        where: { id: playerId },
        include: { combatProfile: true },
      });

      if (!player) {
        throw new NotFoundException('Player not found.');
      }

      const previous = player.combatProfile;
      const profile = await tx.playerCombatProfile.upsert({
        where: { playerId },
        create: {
          player: { connect: { id: playerId } },
          primaryClass,
          secondaryClass: normalized.secondaryClass ?? null,
          declaredBuild: normalized.declaredBuild ?? null,
          preferredRole: normalized.preferredRole ?? null,
          acceptedRoles: normalized.acceptedRoles,
          availability: normalized.availability ?? PlayerCombatAvailability.UNSET,
          publicNote: normalized.publicNote ?? null,
          staffNote: normalized.staffNote ?? null,
          updatedBy: { connect: { id: actorId } },
        },
        update: {
          primaryClass,
          secondaryClass: normalized.secondaryClass ?? null,
          declaredBuild: normalized.declaredBuild ?? null,
          preferredRole: normalized.preferredRole ?? null,
          acceptedRoles: normalized.acceptedRoles,
          availability: normalized.availability ?? PlayerCombatAvailability.UNSET,
          publicNote: normalized.publicNote ?? null,
          staffNote: normalized.staffNote ?? null,
          updatedBy: { connect: { id: actorId } },
        },
      });

      if (player.class !== primaryClass) {
        await tx.player.update({
          where: { id: playerId },
          data: { class: primaryClass },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'PLAYER_COMBAT_PROFILE_UPDATED',
          targetType: 'Player',
          targetId: playerId,
          metadata: {
            previousPrimaryClass: previous?.primaryClass ?? player.class,
            primaryClass,
            previousBuild: previous?.declaredBuild,
            declaredBuild: normalized.declaredBuild,
            preferredRole: normalized.preferredRole,
            acceptedRoles: normalized.acceptedRoles,
            availability: normalized.availability ?? PlayerCombatAvailability.UNSET,
            reason,
          } satisfies Prisma.InputJsonObject,
        },
      });

      return profile;
    });
  }

  async requestCombatProfileChange(userId: string, data: RequestCombatProfileChangeDto) {
    const player = await this.getPrimaryPlayerByUser(userId);

    if (!player) {
      throw new NotFoundException('Player profile not found.');
    }

    const normalized = this.normalizeCombatProfilePayload(data, false);

    if (
      normalized.primaryClass === undefined
      && normalized.secondaryClass === undefined
      && normalized.declaredBuild === undefined
      && normalized.preferredRole === undefined
      && normalized.acceptedRoles === undefined
      && normalized.availability === undefined
      && !data.note?.trim()
      && !data.proofImageUrl?.trim()
    ) {
      throw new BadRequestException('At least one combat profile change must be provided.');
    }

    const request = await this.repository.client.playerCombatProfileChangeRequest.create({
      data: {
        player: { connect: { id: player.id } },
        primaryClass: normalized.primaryClass,
        secondaryClass: normalized.secondaryClass,
        declaredBuild: normalized.declaredBuild,
        preferredRole: normalized.preferredRole,
        acceptedRoles: normalized.acceptedRoles ?? [],
        availability: normalized.availability,
        proofImageUrl: data.proofImageUrl?.trim() || undefined,
        note: data.note?.trim() || undefined,
      },
    });

    await this.auditService.log({
      actorId: userId,
      action: 'PLAYER_COMBAT_PROFILE_CHANGE_REQUESTED',
      targetType: 'Player',
      targetId: player.id,
      metadata: {
        requestId: request.id,
        primaryClass: request.primaryClass,
        preferredRole: request.preferredRole,
        availability: request.availability,
      },
    });

    return request;
  }

  async listCombatProfileRequests() {
    return this.repository.client.playerCombatProfileChangeRequest.findMany({
      where: { status: PlayerCombatProfileChangeStatus.PENDING },
      include: {
        player: {
          include: {
            user: {
              select: {
                discordId: true,
                discordUsername: true,
                discordNickname: true,
                preferredLocale: true,
              },
            },
            combatProfile: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
  }

  async approveCombatProfileRequest(requestId: string, reviewerId: string, data: ReviewCombatProfileChangeDto) {
    return this.repository.client.$transaction(async (tx) => {
      const request = await tx.playerCombatProfileChangeRequest.findUnique({
        where: { id: requestId },
        include: { player: { include: { combatProfile: true } } },
      });

      if (!request) {
        throw new NotFoundException('Combat profile change request not found.');
      }

      if (request.status !== PlayerCombatProfileChangeStatus.PENDING) {
        throw new BadRequestException('Combat profile change request is not pending.');
      }

      const current = request.player.combatProfile;
      const primaryClass = request.primaryClass ?? current?.primaryClass ?? request.player.class;
      const profile = await tx.playerCombatProfile.upsert({
        where: { playerId: request.playerId },
        create: {
          player: { connect: { id: request.playerId } },
          primaryClass,
          secondaryClass: request.secondaryClass ?? undefined,
          declaredBuild: request.declaredBuild ?? undefined,
          preferredRole: request.preferredRole ?? undefined,
          acceptedRoles: request.acceptedRoles,
          availability: request.availability ?? PlayerCombatAvailability.UNSET,
          updatedBy: { connect: { id: reviewerId } },
        },
        update: {
          primaryClass,
          secondaryClass: request.secondaryClass ?? current?.secondaryClass ?? undefined,
          declaredBuild: request.declaredBuild ?? current?.declaredBuild ?? undefined,
          preferredRole: request.preferredRole ?? current?.preferredRole ?? undefined,
          acceptedRoles: request.acceptedRoles.length > 0 ? request.acceptedRoles : current?.acceptedRoles ?? [],
          availability: request.availability ?? current?.availability ?? PlayerCombatAvailability.UNSET,
          updatedBy: { connect: { id: reviewerId } },
        },
      });

      if (request.player.class !== primaryClass) {
        await tx.player.update({
          where: { id: request.playerId },
          data: { class: primaryClass },
        });
      }

      const updatedRequest = await tx.playerCombatProfileChangeRequest.update({
        where: { id: requestId },
        data: {
          status: PlayerCombatProfileChangeStatus.APPROVED,
          reviewedBy: { connect: { id: reviewerId } },
          reviewedAt: new Date(),
          reviewNote: data.reviewNote?.trim() || undefined,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: reviewerId,
          action: 'PLAYER_COMBAT_PROFILE_CHANGE_APPROVED',
          targetType: 'Player',
          targetId: request.playerId,
          metadata: {
            requestId,
            primaryClass,
            profileUpdatedAt: profile.updatedAt,
          } satisfies Prisma.InputJsonObject,
        },
      });

      return updatedRequest;
    });
  }

  async rejectCombatProfileRequest(requestId: string, reviewerId: string, reviewNote?: string) {
    return this.repository.client.$transaction(async (tx) => {
      const request = await tx.playerCombatProfileChangeRequest.findUnique({ where: { id: requestId } });

      if (!request) {
        throw new NotFoundException('Combat profile change request not found.');
      }

      if (request.status !== PlayerCombatProfileChangeStatus.PENDING) {
        throw new BadRequestException('Combat profile change request is not pending.');
      }

      const updated = await tx.playerCombatProfileChangeRequest.update({
        where: { id: requestId },
        data: {
          status: PlayerCombatProfileChangeStatus.REJECTED,
          reviewedBy: { connect: { id: reviewerId } },
          reviewedAt: new Date(),
          reviewNote: reviewNote?.trim() || undefined,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: reviewerId,
          action: 'PLAYER_COMBAT_PROFILE_CHANGE_REJECTED',
          targetType: 'Player',
          targetId: request.playerId,
          metadata: {
            requestId,
            reviewNote,
          } satisfies Prisma.InputJsonObject,
        },
      });

      return updated;
    });
  }

  async listAuditIdentities() {
    const [players, drops, itemRequests] = await Promise.all([
      this.listPlayers(),
      this.repository.client.dropHistory.findMany({
        where: { discordId: { not: null } },
        select: {
          discordId: true,
          nicknameIngame: true,
          deliveredAt: true,
        },
        orderBy: { deliveredAt: 'desc' },
      }),
      this.repository.client.itemRequest.findMany({
        where: { discordId: { not: '' } },
        select: {
          discordId: true,
          playerName: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const byDiscordId = new Map<string, AuditIdentity>();

    const ensure = (discordId: string) => {
      const trimmed = discordId.trim();
      const existing = byDiscordId.get(trimmed);

      if (existing) {
        return existing;
      }

      const identity: AuditIdentity = {
        discordId: trimmed,
        dropsCount: 0,
        requestsCount: 0,
      };
      byDiscordId.set(trimmed, identity);

      return identity;
    };

    for (const player of players) {
      const identity = ensure(player.user.discordId);
      identity.playerId = player.id;
      identity.playerNickname = player.nickname;
      identity.discordUsername = player.user.discordUsername;
      identity.discordNickname = player.user.discordNickname;
    }

    for (const drop of drops) {
      if (!drop.discordId) continue;

      const identity = ensure(drop.discordId);
      identity.dropsCount += 1;
      identity.nicknameIngame ??= drop.nicknameIngame;

      if (drop.deliveredAt && (!identity.lastActivityAt || drop.deliveredAt > identity.lastActivityAt)) {
        identity.lastActivityAt = drop.deliveredAt;
      }
    }

    for (const request of itemRequests) {
      const identity = ensure(request.discordId);
      identity.requestsCount += 1;
      identity.requestPlayerName ??= request.playerName;

      if (!identity.lastActivityAt || request.updatedAt > identity.lastActivityAt) {
        identity.lastActivityAt = request.updatedAt;
      }
    }

    return [...byDiscordId.values()].sort((a, b) => {
      if (a.playerId && !b.playerId) return -1;
      if (!a.playerId && b.playerId) return 1;

      return (b.lastActivityAt?.getTime() ?? 0) - (a.lastActivityAt?.getTime() ?? 0);
    });
  }

  async getPrimaryPlayerByUser(userId: string) {
    const user = await this.repository.client.user.findUnique({
      where: { id: userId },
      include: { players: true },
    });

    return user?.players[0] ?? null;
  }

  async updatePreferences(userId: string, data: { timezone?: string; locale?: string }) {
    const locale = data.locale && ['pt', 'en', 'es'].includes(data.locale) ? data.locale : undefined;
    const timezone = data.timezone?.trim() || undefined;

    return this.repository.client.$transaction(async (tx) => {
      if (locale) {
        await tx.user.update({ where: { id: userId }, data: { preferredLocale: locale } });
      }

      const player = await tx.player.findFirst({ where: { userId } });

      if (player && timezone) {
        await tx.player.update({ where: { id: player.id }, data: { timezone } });
      }

      return tx.user.findUnique({
        where: { id: userId },
        include: { players: true },
      });
    });
  }

  async updatePrimaryPlayerProfile(
    userId: string,
    data: {
      nickname?: string;
      class?: PlayerClass;
      dimensionalLayer?: number;
      timezone?: string;
      locale?: string;
    },
  ) {
    const player = await this.getPrimaryPlayerByUser(userId);

    if (!player) {
      throw new NotFoundException('Player profile not found.');
    }

    const nickname = this.normalizeOptionalNickname(data.nickname);
    const playerClass = this.normalizeOptionalPlayerClass(data.class);
    const dimensionalLayer = this.normalizeOptionalLayer(data.dimensionalLayer);

    this.assertProfileUpdateHasChanges({ nickname, class: playerClass, dimensionalLayer, timezone: data.timezone, locale: data.locale });

    return this.repository.client.$transaction(async (tx) => {
      if (data.locale && ['pt', 'en', 'es'].includes(data.locale)) {
        await tx.user.update({ where: { id: userId }, data: { preferredLocale: data.locale } });
      }

      return tx.player.update({
        where: { id: player.id },
        data: {
          nickname,
          class: playerClass,
          dimensionalLayer,
          timezone: data.timezone?.trim() || undefined,
        },
        include: {
          user: true,
          roles: { include: { role: true } },
        },
      });
    });
  }

  async createProgress(userId: string, data: {
    category?: ProgressCategory;
    level?: number;
    note?: string;
    imageUrl?: string;
    imageUrls?: string[];
    combatPower?: number;
    dimensionalLayer?: number;
  }) {
    const player = await this.getPrimaryPlayerByUser(userId);

    if (!player) {
      throw new NotFoundException('Player profile not found.');
    }

    const category = this.normalizeProgressCategory(data.category);
    const imageUrls = this.normalizeImageUrls(data.imageUrls, data.imageUrl);
    const requiresStaffReview = reviewRequiredCategories.has(category);
    const combatPower = this.normalizeOptionalPositiveInteger(data.combatPower, 'Combat power must be a positive integer.');
    const dimensionalLayer = this.normalizeOptionalLayer(data.dimensionalLayer);

    if (imageUrls.length === 0) {
      throw new BadRequestException('At least one progress image is required.');
    }

    const maxImages = multiImageProgressCategories.has(category) ? 5 : 1;

    if (imageUrls.length > maxImages) {
      throw new BadRequestException(`${category} accepts up to ${maxImages} progress image(s).`);
    }

    const progress = await this.repository.client.$transaction(async (tx) => {
      await tx.playerProgress.deleteMany({
        where: {
          playerId: player.id,
          category,
        },
      });

      return tx.playerProgress.create({
        data: {
          player: { connect: { id: player.id } },
          category,
          level: data.level,
          note: data.note?.trim() || undefined,
          imageUrl: imageUrls[0],
          imageUrls,
          requiresStaffReview,
          reviewStatus: requiresStaffReview ? ProgressReviewStatus.PENDING : ProgressReviewStatus.NOT_REQUIRED,
          combatPower,
          dimensionalLayer,
        },
        include: this.progressInclude(),
      });
    });

    await this.auditService.log({
      actorId: userId,
      action: requiresStaffReview ? 'PLAYER_PROGRESS_SUBMITTED_FOR_REVIEW' : 'PLAYER_PROGRESS_CREATED',
      targetType: 'PlayerProgress',
      targetId: progress.id,
      metadata: {
        playerId: player.id,
        category,
        imageCount: imageUrls.length,
        combatPower,
        dimensionalLayer,
      },
    });

    return progress;
  }

  async listPendingProgressReviews() {
    return this.repository.client.playerProgress.findMany({
      where: { reviewStatus: ProgressReviewStatus.PENDING },
      include: this.progressInclude(),
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
  }

  async createProgressComment(progressId: string, authorId: string, body?: string) {
    const text = body?.trim();

    if (!text) {
      throw new BadRequestException('Comment body is required.');
    }

    const [progress, author] = await Promise.all([
      this.repository.client.playerProgress.findUnique({
        where: { id: progressId },
        select: { id: true, playerId: true, category: true, player: { select: { nickname: true } } },
      }),
      this.repository.client.user.findUnique({
        where: { id: authorId },
        include: {
          players: {
            include: {
              roles: { include: { role: true } },
            },
          },
        },
      }),
    ]);

    if (!progress) {
      throw new NotFoundException('Progress post not found.');
    }

    const isOwner = author?.players.some((player) => player.id === progress.playerId) ?? false;
    const isStaff = author?.players.some((player) => player.roles.some((role) => ['STAFF', 'ADMIN'].includes(role.role.name))) ?? false;

    if (!isOwner && !isStaff) {
      throw new BadRequestException('Only the player or Staff can comment this progress post.');
    }

    const comment = await this.repository.client.playerProgressComment.create({
      data: {
        progress: { connect: { id: progressId } },
        author: { connect: { id: authorId } },
        body: text,
      },
      include: {
        author: {
          select: {
            id: true,
            discordUsername: true,
            discordNickname: true,
          },
        },
      },
    });

    await this.auditService.log({
      actorId: authorId,
      action: 'PLAYER_PROGRESS_COMMENT_CREATED',
      targetType: 'PlayerProgress',
      targetId: progressId,
      metadata: {
        playerId: progress.playerId,
        commentId: comment.id,
      },
    });

    if (isStaff && !isOwner) {
      await this.notificationsService.createForPlayer({
        playerId: progress.playerId,
        type: 'PROGRESS_STAFF_COMMENT',
        title: 'Staff comentou no seu progresso',
        body: `Seu post de ${progress.category} recebeu um comentario da Staff.`,
        href: '/dashboard/profile',
        metadata: {
          progressId,
          category: progress.category,
          playerName: progress.player.nickname,
          commentId: comment.id,
        },
      });
    }

    return comment;
  }

  async markProgressCommentsRead(userId: string, progressId: string) {
    const player = await this.getPrimaryPlayerByUser(userId);

    if (!player) {
      throw new NotFoundException('Player profile not found.');
    }

    const progress = await this.repository.client.playerProgress.findFirst({
      where: {
        id: progressId,
        playerId: player.id,
      },
    });

    if (!progress) {
      throw new NotFoundException('Progress post not found.');
    }

    return this.repository.client.playerProgress.update({
      where: { id: progressId },
      data: { playerReadCommentsAt: new Date() },
      include: this.progressInclude(),
    });
  }

  async approveProgressReview(progressId: string, reviewerId: string, data: { combatPower?: number; dimensionalLayer?: number; reviewNote?: string }) {
    const combatPower = this.normalizeOptionalPositiveInteger(data.combatPower, 'Combat power must be a positive integer.');
    const dimensionalLayer = this.normalizeOptionalLayer(data.dimensionalLayer);

    const progress = await this.repository.client.$transaction(async (tx) => {
      const existing = await tx.playerProgress.findUnique({
        where: { id: progressId },
        include: { player: true },
      });

      if (!existing) {
        throw new NotFoundException('Progress review not found.');
      }

      if (existing.reviewStatus !== ProgressReviewStatus.PENDING) {
        throw new BadRequestException('Progress review is not pending.');
      }

      const updatePlayer: Prisma.PlayerUpdateInput = {};

      if (combatPower !== undefined) {
        updatePlayer.combatPower = combatPower;
      }

      if (dimensionalLayer !== undefined) {
        updatePlayer.dimensionalLayer = dimensionalLayer;
      }

      if (Object.keys(updatePlayer).length > 0) {
        await tx.player.update({
          where: { id: existing.playerId },
          data: updatePlayer,
        });
      }

      const updated = await tx.playerProgress.update({
        where: { id: progressId },
        data: {
          reviewStatus: ProgressReviewStatus.APPROVED,
          reviewedBy: { connect: { id: reviewerId } },
          reviewedAt: new Date(),
          reviewNote: data.reviewNote?.trim() || undefined,
          combatPower: combatPower ?? existing.combatPower,
          dimensionalLayer: dimensionalLayer ?? existing.dimensionalLayer,
        },
        include: { player: true },
      });

      await tx.auditLog.create({
        data: {
          actorId: reviewerId,
          action: 'PLAYER_PROGRESS_APPROVED',
          targetType: 'PlayerProgress',
          targetId: progressId,
          metadata: {
            playerId: existing.playerId,
            category: existing.category,
            combatPower,
            dimensionalLayer,
          } satisfies Prisma.InputJsonObject,
        },
      });

      return updated;
    });

    return progress;
  }

  async rejectProgressReview(progressId: string, reviewerId: string, reviewNote?: string) {
    const progress = await this.repository.client.$transaction(async (tx) => {
      const existing = await tx.playerProgress.findUnique({ where: { id: progressId } });

      if (!existing) {
        throw new NotFoundException('Progress review not found.');
      }

      if (existing.reviewStatus !== ProgressReviewStatus.PENDING) {
        throw new BadRequestException('Progress review is not pending.');
      }

      const updated = await tx.playerProgress.update({
        where: { id: progressId },
        data: {
          reviewStatus: ProgressReviewStatus.REJECTED,
          reviewedBy: { connect: { id: reviewerId } },
          reviewedAt: new Date(),
          reviewNote: reviewNote?.trim() || undefined,
        },
        include: { player: true },
      });

      await tx.auditLog.create({
        data: {
          actorId: reviewerId,
          action: 'PLAYER_PROGRESS_REJECTED',
          targetType: 'PlayerProgress',
          targetId: progressId,
          metadata: {
            playerId: existing.playerId,
            category: existing.category,
            reviewNote,
          } satisfies Prisma.InputJsonObject,
        },
      });

      return updated;
    });

    return progress;
  }

  async getMyHistory(userId: string) {
    const player = await this.getPrimaryPlayerByUser(userId);
    const user = await this.repository.client.user.findUnique({ where: { id: userId } });

    if (!player || !user) {
      return { player, drops: [], progress: [], itemRequests: [] };
    }

    return this.getHistoryByPlayerAndDiscord(player.id, user.discordId);
  }

  async getStaffPlayerHistory(playerId: string) {
    const player = await this.repository.client.player.findUnique({
      where: { id: playerId },
      include: { user: true },
    });

    if (!player) {
      return { player: null, drops: [], progress: [], itemRequests: [] };
    }

    return this.getHistoryByPlayerAndDiscord(player.id, player.user.discordId);
  }

  async getStaffDiscordHistory(discordId: string) {
    const normalizedDiscordId = discordId.trim();
    const player = await this.repository.client.player.findFirst({
      where: { user: { discordId: normalizedDiscordId } },
      include: { user: true },
    });

    return this.getHistoryByPlayerAndDiscord(player?.id ?? null, normalizedDiscordId);
  }

  async listStaffNotes(playerId: string) {
    const player = await this.repository.client.player.findUnique({
      where: { id: playerId },
      select: { id: true },
    });

    if (!player) {
      throw new NotFoundException('Player not found.');
    }

    return this.repository.client.playerStaffNote.findMany({
      where: { playerId },
      include: {
        author: {
          select: {
            id: true,
            discordUsername: true,
            discordNickname: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async createStaffNote(
    playerId: string,
    authorId: string,
    data: { severity?: PlayerStaffNoteSeverity; body?: string },
  ) {
    const body = data.body?.trim();

    if (!body) {
      throw new BadRequestException('Staff note body is required.');
    }

    const severity = data.severity && Object.values(PlayerStaffNoteSeverity).includes(data.severity)
      ? data.severity
      : PlayerStaffNoteSeverity.INFO;

    const note = await this.repository.client.$transaction(async (tx) => {
      const player = await tx.player.findUnique({
        where: { id: playerId },
        select: { id: true },
      });

      if (!player) {
        throw new NotFoundException('Player not found.');
      }

      const created = await tx.playerStaffNote.create({
        data: {
          player: { connect: { id: playerId } },
          author: { connect: { id: authorId } },
          severity,
          body,
        },
        include: {
          author: {
            select: {
              id: true,
              discordUsername: true,
              discordNickname: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: authorId,
          action: 'PLAYER_STAFF_NOTE_CREATED',
          targetType: 'Player',
          targetId: playerId,
          metadata: {
            noteId: created.id,
            severity,
          } satisfies Prisma.InputJsonObject,
        },
      });

      return created;
    });

    return note;
  }

  private async getHistoryByPlayerAndDiscord(playerId: string | null, discordId: string) {
    const playerWhere = playerId ? { id: playerId } : { user: { discordId } };
    const dropWhere: Prisma.DropHistoryWhereInput = playerId
      ? { OR: [{ discordId }, { playerId }] }
      : { discordId };
    const progressWhere: Prisma.PlayerProgressWhereInput = playerId
      ? { playerId }
      : { player: { user: { discordId } } };
    const requestWhere: Prisma.ItemRequestWhereInput = playerId
      ? { OR: [{ discordId }, { playerId }] }
      : { discordId };
    const transactionWhere: Prisma.DKPTransactionWhereInput = playerId
      ? { playerId }
      : { player: { user: { discordId } } };

    const [player, drops, progress, itemRequests, transactions, daoshiReceipts, codexRequests, auctionBids, attendances] = await Promise.all([
      this.repository.client.player.findFirst({ where: playerWhere, include: { user: true, combatProfile: true } }),
      this.repository.client.dropHistory.findMany({
        where: dropWhere,
        include: { itemCatalog: true },
        orderBy: { deliveredAt: 'desc' },
      }),
      this.repository.client.playerProgress.findMany({
        where: progressWhere,
        include: this.progressInclude(),
        orderBy: { createdAt: 'desc' },
      }),
      this.repository.client.itemRequest.findMany({
        where: requestWhere,
        include: { itemCatalog: true },
        orderBy: [{ itemName: 'asc' }, { rankPosition: 'asc' }],
      }),
      this.repository.client.dKPTransaction.findMany({
        where: transactionWhere,
        orderBy: { createdAt: 'desc' },
      }),
      playerId
        ? this.repository.client.daoshiCashReceipt.findMany({ where: { playerId }, orderBy: { createdAt: 'desc' } })
        : [],
      playerId
        ? this.repository.client.codexRequest.findMany({ where: { playerId }, orderBy: { createdAt: 'desc' } })
        : [],
      playerId
        ? this.repository.client.auctionBid.findMany({ where: { playerId }, include: { auction: true }, orderBy: { createdAt: 'desc' } })
        : [],
      playerId
        ? this.repository.client.eventAttendance.findMany({ where: { playerId }, include: { event: true }, orderBy: { createdAt: 'desc' } })
        : [],
    ]);

    const timeline = [
      ...drops.map((row) => ({
        id: row.id,
        type: 'DROP_DELIVERED',
        title: row.itemName ?? row.itemCatalog?.namePt ?? 'Drop entregue',
        description: `Voce recebeu ${row.itemName ?? row.itemCatalog?.namePt ?? 'um drop'} e agora isso esta registrado no seu historico.`,
        titleEn: row.itemCatalog?.nameEn ?? row.itemName ?? 'Delivered drop',
        descriptionEn: `You received ${row.itemCatalog?.nameEn ?? row.itemName ?? 'a drop'} and it is now registered in your history.`,
        tone: 'green' as PlayerTimelineTone,
        href: '/dashboard/drops',
        metadata: {
          itemName: row.itemName,
          itemCatalogId: row.itemCatalogId,
        },
        createdAt: row.deliveredAt ?? row.createdAt,
      })),
      ...progress.map((row) => {
        const copy = this.progressTimelineCopy(row.category, row.reviewStatus);
        return {
          id: row.id,
          type: 'PROGRESS',
          ...copy,
          href: '/dashboard/profile',
          metadata: {
            category: row.category,
            reviewStatus: row.reviewStatus,
          },
          createdAt: row.createdAt,
        };
      }),
      ...itemRequests.map((row) => ({
        id: row.id,
        type: 'ITEM_REQUEST',
        title: row.itemName,
        description: `Rank #${row.rankPosition} - falta ${row.remainingQuantity}/${row.totalQuantity}.`,
        titleEn: row.itemCatalog?.nameEn ?? row.itemName,
        descriptionEn: `Rank #${row.rankPosition} - ${row.remainingQuantity}/${row.totalQuantity} still missing.`,
        tone: row.remainingQuantity > 0 ? ('blue' as PlayerTimelineTone) : ('green' as PlayerTimelineTone),
        href: '/dashboard/item-requests',
        metadata: {
          rankPosition: row.rankPosition,
          remainingQuantity: row.remainingQuantity,
          totalQuantity: row.totalQuantity,
          updateProofStatus: row.updateProofStatus,
        },
        createdAt: row.updatedAt,
      })),
      ...transactions.map((row) => {
        const copy = this.dkpTimelineCopy(row.type, row.amount);
        return {
          id: row.id,
          type: 'DKP',
          ...copy,
          href: '/dashboard/profile',
          metadata: {
            amount: row.amount,
            transactionType: row.type,
            referenceId: row.referenceId,
          },
          createdAt: row.createdAt,
        };
      }),
      ...daoshiReceipts.map((row) => ({
        id: row.id,
        type: 'DAOSHI',
        title: `Daoshi ${row.status}`,
        description: this.daoshiTimelineDescription(row.status, row.approvedCents ?? row.purchaseCents),
        titleEn: `Daoshi ${row.status}`,
        descriptionEn: this.daoshiTimelineDescriptionEn(row.status, row.approvedCents ?? row.purchaseCents),
        tone: row.status === 'APPROVED' ? ('green' as PlayerTimelineTone) : row.status === 'REJECTED' ? ('red' as PlayerTimelineTone) : ('blue' as PlayerTimelineTone),
        href: '/dashboard/daoshi',
        metadata: {
          status: row.status,
          cents: row.approvedCents ?? row.purchaseCents,
        },
        createdAt: row.reviewedAt ?? row.createdAt,
      })),
      ...codexRequests.map((row) => ({
        id: row.id,
        type: 'CODEX',
        title: `Codex ${row.status}`,
        description: this.codexTimelineDescription(row.status),
        titleEn: `Codex ${row.status}`,
        descriptionEn: this.codexTimelineDescriptionEn(row.status),
        tone: row.status === 'CONFIRMED' ? ('green' as PlayerTimelineTone) : row.status === 'CANCELLED' ? ('red' as PlayerTimelineTone) : ('blue' as PlayerTimelineTone),
        href: '/dashboard/codex',
        metadata: {
          status: row.status,
        },
        createdAt: row.updatedAt,
      })),
      ...auctionBids.map((row) => ({
        id: row.id,
        type: 'AUCTION_BID',
        title: row.auction.itemName,
        description: `Voce registrou ${row.bidAmount} DKP neste leilao. Estado atual: ${row.auction.status}.`,
        titleEn: row.auction.itemName,
        descriptionEn: `You placed ${row.bidAmount} DKP in this auction. Current status: ${row.auction.status}.`,
        tone: row.auction.status === 'FINISHED' ? ('green' as PlayerTimelineTone) : row.auction.status === 'CANCELLED' || row.auction.status === 'RELISTED' ? ('red' as PlayerTimelineTone) : ('gold' as PlayerTimelineTone),
        href: `/dashboard/auctions/${row.auctionId}`,
        metadata: {
          bidAmount: row.bidAmount,
          auctionId: row.auctionId,
          auctionStatus: row.auction.status,
          isValid: row.isValid,
        },
        createdAt: row.createdAt,
      })),
      ...attendances.map((row) => ({
        id: row.id,
        type: 'ATTENDANCE',
        title: row.event.name,
        description: row.attended ? 'Presenca confirmada para este evento.' : 'Ausencia registrada para este evento.',
        titleEn: row.event.name,
        descriptionEn: row.attended ? 'Attendance confirmed for this event.' : 'Absence registered for this event.',
        tone: row.attended ? ('green' as PlayerTimelineTone) : ('muted' as PlayerTimelineTone),
        href: '/dashboard/attendance',
        metadata: {
          eventId: row.eventId,
          attended: row.attended,
          eventType: row.event.type,
        },
        createdAt: row.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { discordId, player, drops, progress, itemRequests, transactions, daoshiReceipts, codexRequests, auctionBids, attendances, timeline };
  }

  private dkpTimelineCopy(type: DKPTransactionType, amount: number): PlayerTimelineCopy {
    const absoluteAmount = Math.abs(amount);
    const signedAmount = amount > 0 ? `+${amount}` : `${amount}`;

    if (type === DKPTransactionType.EVENT_REWARD) {
      return {
        title: 'DKP ganho em evento',
        description: `Voce ganhou ${absoluteAmount} DKP por participar da operacao da guilda.`,
        titleEn: 'DKP earned from event',
        descriptionEn: `You earned ${absoluteAmount} DKP by joining the guild operation.`,
        tone: 'green',
      };
    }

    if (type === DKPTransactionType.AUCTION_LOCK) {
      return {
        title: 'DKP reservado para leilao',
        description: `${absoluteAmount} DKP ficaram travados enquanto seu lance disputa o item.`,
        titleEn: 'DKP locked for auction',
        descriptionEn: `${absoluteAmount} DKP was locked while your bid competes for the item.`,
        tone: 'gold',
      };
    }

    if (type === DKPTransactionType.AUCTION_REFUND) {
      return {
        title: 'DKP devolvido',
        description: `${absoluteAmount} DKP voltaram para voce depois do ciclo do leilao.`,
        titleEn: 'DKP refunded',
        descriptionEn: `${absoluteAmount} DKP returned to you after the auction cycle.`,
        tone: 'green',
      };
    }

    if (type === DKPTransactionType.AUCTION_WIN) {
      return {
        title: 'DKP consumido em vitoria',
        description: `${absoluteAmount} DKP foram consumidos pela vitoria no leilao.`,
        titleEn: 'DKP spent on auction win',
        descriptionEn: `${absoluteAmount} DKP was spent on the auction win.`,
        tone: 'red',
      };
    }

    return {
      title: 'Ajuste manual de DKP',
      description: `A Staff ajustou seu saldo em ${signedAmount} DKP.`,
      titleEn: 'Manual DKP adjustment',
      descriptionEn: `Staff adjusted your balance by ${signedAmount} DKP.`,
      tone: amount >= 0 ? 'green' : 'red',
    };
  }

  private progressTimelineCopy(category: ProgressCategory, status: ProgressReviewStatus): PlayerTimelineCopy {
    const categoryLabel = this.progressCategoryLabel(category);
    const categoryLabelEn = this.progressCategoryLabelEn(category);

    if (status === ProgressReviewStatus.APPROVED) {
      return {
        title: `${categoryLabel} aprovado`,
        description: `A Staff aprovou seu progresso em ${categoryLabel}. Bom, agora nao da pra fingir que nao evoluiu.`,
        titleEn: `${categoryLabelEn} approved`,
        descriptionEn: `Staff approved your ${categoryLabelEn} progress.`,
        tone: 'green',
      };
    }

    if (status === ProgressReviewStatus.REJECTED) {
      return {
        title: `${categoryLabel} rejeitado`,
        description: `A Staff rejeitou essa atualizacao de ${categoryLabel}. Revise o print e tente de novo.`,
        titleEn: `${categoryLabelEn} rejected`,
        descriptionEn: `Staff rejected this ${categoryLabelEn} update. Review the proof and try again.`,
        tone: 'red',
      };
    }

    if (status === ProgressReviewStatus.PENDING) {
      return {
        title: `${categoryLabel} em review`,
        description: `Sua atualizacao de ${categoryLabel} entrou na fila de review da Staff.`,
        titleEn: `${categoryLabelEn} under review`,
        descriptionEn: `Your ${categoryLabelEn} update entered the Staff review queue.`,
        tone: 'blue',
      };
    }

    return {
      title: `${categoryLabel} registrado`,
      description: `Seu progresso em ${categoryLabel} foi registrado no historico.`,
      titleEn: `${categoryLabelEn} registered`,
      descriptionEn: `Your ${categoryLabelEn} progress was registered in history.`,
      tone: 'muted',
    };
  }

  private progressCategoryLabel(category: ProgressCategory): string {
    const labels: Record<ProgressCategory, string> = {
      STELLAS_AMPLIFICATION: 'Amplificacao de Stellas',
      EQUIPMENT: 'Equipamento',
      RELICS: 'Reliquias',
      STIGMA: 'Stigma',
      ITEM_COLLECTION: 'Colecao de itens',
      SKILLS: 'Skills',
      PARADISE_STONES: 'Pedras do Paraiso',
      STATUS: 'Status/CP',
      DIMENSIONAL_RIFT: 'Fenda Dimensional',
      RUNES: 'Runas',
    };

    return labels[category] ?? category;
  }

  private progressCategoryLabelEn(category: ProgressCategory): string {
    const labels: Record<ProgressCategory, string> = {
      STELLAS_AMPLIFICATION: 'Stellas Amplification',
      EQUIPMENT: 'Equipment',
      RELICS: 'Relics',
      STIGMA: 'Stigma',
      ITEM_COLLECTION: 'Item Collection',
      SKILLS: 'Skills',
      PARADISE_STONES: 'Paradise Stones',
      STATUS: 'Status/CP',
      DIMENSIONAL_RIFT: 'Dimensional Rift',
      RUNES: 'Runes',
    };

    return labels[category] ?? category;
  }

  private daoshiTimelineDescription(status: string, cents: number): string {
    const amount = this.formatBrl(cents);
    if (status === 'APPROVED') return `Recibo aprovado com ${amount} validados para Daoshi.`;
    if (status === 'REJECTED') return `Recibo rejeitado pela Staff. Valor informado: ${amount}.`;
    return `Recibo enviado para review da Staff. Valor informado: ${amount}.`;
  }

  private daoshiTimelineDescriptionEn(status: string, cents: number): string {
    const amount = this.formatBrl(cents);
    if (status === 'APPROVED') return `Receipt approved with ${amount} validated for Daoshi.`;
    if (status === 'REJECTED') return `Receipt rejected by Staff. Submitted amount: ${amount}.`;
    return `Receipt sent to Staff review. Submitted amount: ${amount}.`;
  }

  private codexTimelineDescription(status: string): string {
    if (status === 'CONFIRMED') return 'Codex confirmado como entregue.';
    if (status === 'SENT') return 'Codex enviado, aguardando confirmacao.';
    if (status === 'NEEDS_RETRY') return 'Codex precisa de nova tentativa.';
    if (status === 'CANCELLED') return 'Request de codex cancelado.';
    return 'Request de codex entrou na fila.';
  }

  private codexTimelineDescriptionEn(status: string): string {
    if (status === 'CONFIRMED') return 'Codex confirmed as delivered.';
    if (status === 'SENT') return 'Codex sent, waiting for confirmation.';
    if (status === 'NEEDS_RETRY') return 'Codex needs another attempt.';
    if (status === 'CANCELLED') return 'Codex request cancelled.';
    return 'Codex request entered the queue.';
  }

  private formatBrl(cents: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  }

  private normalizeProgressCategory(category?: ProgressCategory): ProgressCategory {
    if (!category || !Object.values(ProgressCategory).includes(category)) {
      return ProgressCategory.STATUS;
    }

    return category;
  }

  private normalizeImageUrls(imageUrls?: string[], imageUrl?: string): string[] {
    return [...(imageUrls ?? []), imageUrl]
      .filter((url): url is string => Boolean(url?.trim()))
      .map((url) => url.trim())
      .filter((url, index, all) => all.indexOf(url) === index);
  }

  private progressInclude() {
    return {
      player: {
        include: {
          user: {
            select: {
              discordId: true,
              discordUsername: true,
            },
          },
        },
      },
      comments: {
        include: {
          author: {
            select: {
              id: true,
              discordUsername: true,
              discordNickname: true,
              players: {
                select: {
                  roles: {
                    select: {
                      role: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' as const },
      },
    };
  }

  private normalizeOptionalPositiveInteger(value: unknown, message: string): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const number = Number(value);

    if (!Number.isInteger(number) || number < 0) {
      throw new BadRequestException(message);
    }

    return number;
  }

  private normalizeOptionalLayer(value: unknown): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const number = Number(value);

    if (!Number.isInteger(number) || number < 1 || number > 10) {
      throw new BadRequestException('Dimensional layer must be an integer between 1 and 10.');
    }

    return number;
  }

  private normalizeOptionalNickname(value: unknown): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    const nickname = String(value).trim();

    if (!nickname) {
      return undefined;
    }

    if (nickname.length < 2 || nickname.length > 32) {
      throw new BadRequestException('Nickname must be between 2 and 32 characters.');
    }

    return nickname;
  }

  private normalizeOptionalPlayerClass(value: unknown): PlayerClass | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (!Object.values(PlayerClass).includes(value as PlayerClass)) {
      throw new BadRequestException('Invalid player class.');
    }

    return value as PlayerClass;
  }

  private normalizeOptionalCombatRole(value: unknown): PlayerCombatRole | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (!Object.values(PlayerCombatRole).includes(value as PlayerCombatRole)) {
      throw new BadRequestException('Invalid combat role.');
    }

    return value as PlayerCombatRole;
  }

  private normalizeOptionalAvailability(value: unknown): PlayerCombatAvailability | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (!Object.values(PlayerCombatAvailability).includes(value as PlayerCombatAvailability)) {
      throw new BadRequestException('Invalid combat availability.');
    }

    return value as PlayerCombatAvailability;
  }

  private normalizeOptionalText(value: unknown, maxLength: number, fieldName: string): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    const text = String(value).trim();

    if (!text) {
      return undefined;
    }

    if (text.length > maxLength) {
      throw new BadRequestException(`${fieldName} must be at most ${maxLength} characters.`);
    }

    return text;
  }

  private normalizeCombatRoles(values: unknown): PlayerCombatRole[] | undefined {
    if (values === undefined || values === null) {
      return undefined;
    }

    if (!Array.isArray(values)) {
      throw new BadRequestException('Accepted roles must be a list.');
    }

    const roles = values.map((value) => this.normalizeOptionalCombatRole(value)).filter((value): value is PlayerCombatRole => Boolean(value));
    return [...new Set(roles)];
  }

  private normalizeCombatProfilePayload(data: Partial<UpdateCombatProfileDto & RequestCombatProfileChangeDto>, requirePrimaryClass: boolean): {
    primaryClass?: PlayerClass;
    secondaryClass?: PlayerClass;
    declaredBuild?: string;
    preferredRole?: PlayerCombatRole;
    acceptedRoles?: PlayerCombatRole[];
    availability?: PlayerCombatAvailability;
    publicNote?: string;
    staffNote?: string;
  } {
    const primaryClass = this.normalizeOptionalPlayerClass(data.primaryClass);

    if (requirePrimaryClass && !primaryClass) {
      throw new BadRequestException('Primary class is required.');
    }

    return {
      primaryClass,
      secondaryClass: this.normalizeOptionalPlayerClass(data.secondaryClass),
      declaredBuild: this.normalizeOptionalText(data.declaredBuild, 120, 'Declared build'),
      preferredRole: this.normalizeOptionalCombatRole(data.preferredRole),
      acceptedRoles: this.normalizeCombatRoles(data.acceptedRoles) ?? (requirePrimaryClass ? [] : undefined),
      availability: this.normalizeOptionalAvailability(data.availability),
      publicNote: this.normalizeOptionalText(data.publicNote, 240, 'Public note'),
      staffNote: this.normalizeOptionalText(data.staffNote, 500, 'Staff note'),
    };
  }

  private countBy<TKey extends string, TRow>(keys: TKey[], rows: TRow[], selectKey: (row: TRow) => TKey) {
    return keys.map((key) => ({
      key,
      label: key,
      count: rows.filter((row) => selectKey(row) === key).length,
    }));
  }

  private buildRosterAlerts(
    rows: Array<{
      playerId: string;
      nickname: string;
      preferredRole: PlayerCombatRole | null;
      availability: PlayerCombatAvailability;
      signals: RosterSignal[];
    }>,
    totals: {
      activePlayers: number;
      frontline: number;
      support: number;
      reserve: number;
      missingBuild: number;
      staleStatus: number;
      lowAttendance: number;
    },
  ) {
    const alerts: Array<{
      key: string;
      severity: 'high' | 'medium' | 'low';
      title: string;
      description: string;
      playerIds?: string[];
    }> = [];

    if (totals.frontline === 0) {
      alerts.push({
        key: 'missing-frontline',
        severity: 'high',
        title: 'Sem frontline declarado',
        description: 'Nenhum player ativo esta marcado como frontline. Escala de Clash sem parede vira aula pratica de respawn.',
      });
    }

    if (totals.support === 0) {
      alerts.push({
        key: 'missing-support',
        severity: 'high',
        title: 'Sem suporte declarado',
        description: 'Nenhum player ativo esta marcado como suporte. Se a call pedir sustain, hoje e na fe.',
      });
    }

    if (totals.reserve > Math.max(2, Math.floor(totals.activePlayers * 0.35))) {
      alerts.push({
        key: 'reserve-heavy',
        severity: 'medium',
        title: 'Reserva demais no roster',
        description: `${totals.reserve} player(s) estao como reserva. Pode ser estrategia, pode ser banco lotado.`,
      });
    }

    if (totals.missingBuild > 0) {
      alerts.push({
        key: 'missing-build',
        severity: 'medium',
        title: 'Builds ainda nao mapeadas',
        description: `${totals.missingBuild} player(s) ativos nao tem build declarada no perfil de combate.`,
        playerIds: rows.filter((row) => row.signals.includes('SEM_BUILD')).map((row) => row.playerId),
      });
    }

    if (totals.staleStatus > 0) {
      alerts.push({
        key: 'stale-status',
        severity: 'medium',
        title: 'STATUS recente faltando',
        description: `${totals.staleStatus} player(s) estao sem STATUS nos ultimos 14 dias.`,
        playerIds: rows.filter((row) => row.signals.includes('SEM_STATUS_RECENTE')).map((row) => row.playerId),
      });
    }

    if (totals.lowAttendance > 0) {
      alerts.push({
        key: 'low-attendance',
        severity: 'low',
        title: 'Presenca baixa',
        description: `${totals.lowAttendance} player(s) ativos estao abaixo de 50% de presenca.`,
        playerIds: rows.filter((row) => row.signals.includes('PRESENCA_BAIXA')).map((row) => row.playerId),
      });
    }

    const unsetAvailability = rows.filter((row) => row.availability === PlayerCombatAvailability.UNSET);
    if (unsetAvailability.length > 0) {
      alerts.push({
        key: 'unset-availability',
        severity: 'low',
        title: 'Disponibilidade incompleta',
        description: `${unsetAvailability.length} player(s) ainda nao tem janela de disponibilidade marcada.`,
        playerIds: unsetAvailability.map((row) => row.playerId),
      });
    }

    return alerts;
  }

  private buildRosterMarkdown(
    totals: {
      activePlayers: number;
      mappedProfiles: number;
      missingBuild: number;
      staleStatus: number;
      lowAttendance: number;
      frontline: number;
      support: number;
      reserve: number;
    },
    alerts: Array<{ severity: string; title: string; description: string }>,
    rows: Array<{
      nickname: string;
      primaryClass: PlayerClass;
      dimensionalLayer: number;
      preferredRole: PlayerCombatRole | null;
      availability: PlayerCombatAvailability;
      attendancePercentage: number;
      declaredBuild?: string | null;
    }>,
  ): string {
    const lines = [
      '# Matriz de composicao G3X',
      '',
      `- Players ativos: ${totals.activePlayers}`,
      `- Perfis mapeados: ${totals.mappedProfiles}`,
      `- Frontline: ${totals.frontline}`,
      `- Suporte: ${totals.support}`,
      `- Reservas: ${totals.reserve}`,
      `- Sem build: ${totals.missingBuild}`,
      `- Sem STATUS recente: ${totals.staleStatus}`,
      `- Presenca baixa: ${totals.lowAttendance}`,
      '',
      '## Alertas',
      ...(alerts.length > 0 ? alerts.map((alert) => `- [${alert.severity}] ${alert.title}: ${alert.description}`) : ['- Nenhum alerta critico agora. Estranho, mas aceito.']),
      '',
      '## Roster resumido',
      ...rows.slice(0, 80).map((row) => `- ${row.nickname}: ${row.primaryClass}, C${row.dimensionalLayer}, role ${row.preferredRole ?? 'UNSET'}, ${Math.round(row.attendancePercentage)}% presenca, disponibilidade ${row.availability}, build ${row.declaredBuild ?? 'nao mapeada'}`),
    ];

    return lines.join('\n');
  }

  private assertProfileUpdateHasChanges(data: {
    nickname?: string;
    class?: PlayerClass;
    dimensionalLayer?: number;
    timezone?: string;
    locale?: string;
  }): void {
    if (
      data.nickname === undefined
      && data.class === undefined
      && data.dimensionalLayer === undefined
      && !data.timezone?.trim()
      && !data.locale
    ) {
      throw new BadRequestException('At least one profile field must be provided.');
    }
  }
}
