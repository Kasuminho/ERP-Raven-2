import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PlayerClass, PlayerStaffNoteSeverity, Prisma, ProgressCategory, ProgressReviewStatus } from '@prisma/client';
import { AuditService } from '../../audit/services/audit.service';
import { NotificationsService } from '../../notifications/notifications.service';
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
      },
      orderBy: [{ isActive: 'desc' }, { nickname: 'asc' }],
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
      throw new Error('Player profile not found.');
    }

    const dimensionalLayer = data.dimensionalLayer === undefined ? undefined : Number(data.dimensionalLayer);

    if (dimensionalLayer !== undefined && (!Number.isInteger(dimensionalLayer) || dimensionalLayer < 1 || dimensionalLayer > 10)) {
      throw new Error('Dimensional layer must be an integer between 1 and 10.');
    }

    return this.repository.client.$transaction(async (tx) => {
      if (data.locale && ['pt', 'en', 'es'].includes(data.locale)) {
        await tx.user.update({ where: { id: userId }, data: { preferredLocale: data.locale } });
      }

      return tx.player.update({
        where: { id: player.id },
        data: {
          nickname: data.nickname?.trim() || undefined,
          class: data.class,
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
      this.repository.client.player.findFirst({ where: playerWhere, include: { user: true } }),
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
        description: 'Drop registrado no historico do jogador.',
        createdAt: row.deliveredAt ?? row.createdAt,
      })),
      ...progress.map((row) => ({
        id: row.id,
        type: 'PROGRESS',
        title: row.category,
        description: row.note ?? row.reviewStatus,
        createdAt: row.createdAt,
      })),
      ...itemRequests.map((row) => ({
        id: row.id,
        type: 'ITEM_REQUEST',
        title: row.itemName,
        description: `Rank #${row.rankPosition} - falta ${row.remainingQuantity}/${row.totalQuantity}.`,
        createdAt: row.updatedAt,
      })),
      ...transactions.map((row) => ({
        id: row.id,
        type: 'DKP',
        title: row.type,
        description: `${row.amount} DKP`,
        createdAt: row.createdAt,
      })),
      ...daoshiReceipts.map((row) => ({
        id: row.id,
        type: 'DAOSHI',
        title: `Daoshi ${row.status}`,
        description: `${(row.approvedCents ?? row.purchaseCents) / 100} BRL`,
        createdAt: row.reviewedAt ?? row.createdAt,
      })),
      ...codexRequests.map((row) => ({
        id: row.id,
        type: 'CODEX',
        title: `Codex ${row.status}`,
        description: row.note ?? 'Request de codex',
        createdAt: row.updatedAt,
      })),
      ...auctionBids.map((row) => ({
        id: row.id,
        type: 'AUCTION_BID',
        title: row.auction.itemName,
        description: `${row.bidAmount} DKP - ${row.auction.status}`,
        createdAt: row.createdAt,
      })),
      ...attendances.map((row) => ({
        id: row.id,
        type: 'ATTENDANCE',
        title: row.event.name,
        description: row.attended ? 'Presente' : 'Ausente',
        createdAt: row.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { discordId, player, drops, progress, itemRequests, transactions, daoshiReceipts, codexRequests, auctionBids, attendances, timeline };
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
}
