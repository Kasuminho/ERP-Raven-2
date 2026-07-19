import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DKPTransactionType, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { AuditService } from '../audit/services/audit.service';
import { NotificationService } from '../discord/services/notification.service';

const HOURS = 60 * 60 * 1000;
const DELIVERY_URGENT_AFTER_HOURS = 12;
const DELIVERY_OVERDUE_AFTER_HOURS = 24;

@Injectable()
export class DropsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
  ) {}

  async getDeliveredDrops(pagination: { page?: number; limit?: number } = {}) {
    const { skip, take } = this.normalizePagination(pagination, 100, 500);

    return this.prisma.dropHistory.findMany({
      include: { itemCatalog: true, auction: true, player: true },
      orderBy: [{ deliveredAt: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
    });
  }

  async getPendingAuctionDeliveries(pagination: { page?: number; limit?: number } = {}) {
    const { skip, take } = this.normalizePagination(pagination, 100, 200);
    const wins = await this.prisma.dKPTransaction.findMany({
      where: {
        type: DKPTransactionType.AUCTION_WIN,
        referenceId: { not: null },
      },
      include: {
        player: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
    const auctionIds = [...new Set(wins.map((win) => win.referenceId).filter((id): id is string => Boolean(id)))];
    const [auctions, drops] = await Promise.all([
      this.prisma.auction.findMany({
        where: { id: { in: auctionIds } },
        include: { itemCatalog: true },
      }),
      this.prisma.dropHistory.findMany({
        where: { auctionId: { in: auctionIds } },
        select: { auctionId: true },
      }),
    ]);
    const auctionsById = new Map(auctions.map((auction) => [auction.id, auction]));
    const deliveredAuctionIds = new Set(drops.map((drop) => drop.auctionId).filter(Boolean));

    const now = new Date();

    return wins
      .map((win) => {
        const auction = win.referenceId ? auctionsById.get(win.referenceId) : undefined;

        if (!auction || deliveredAuctionIds.has(auction.id)) {
          return null;
        }

        const ageHours = Math.max(0, Math.floor((now.getTime() - win.createdAt.getTime()) / HOURS));
        const deliveryDueAt = new Date(win.createdAt.getTime() + DELIVERY_OVERDUE_AFTER_HOURS * HOURS);
        const urgency = this.auctionDeliveryUrgency(ageHours);

        return {
          auction,
          player: win.player,
          transaction: win,
          urgency,
          ageHours,
          deliveryDueAt,
          priorityReason: this.auctionDeliveryPriorityReason(urgency, ageHours),
        };
      })
      .filter(Boolean);
  }

  async getMyDrops(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return [];
    }

    return this.prisma.dropHistory.findMany({
      where: {
        OR: [
          { discordId: user.discordId },
          { player: { userId: user.id } },
        ],
      },
      include: { itemCatalog: true, auction: true, player: true },
      orderBy: [{ deliveredAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getPublishedAuctionResults(pagination: { page?: number; limit?: number } = {}) {
    const { skip, take } = this.normalizePagination(pagination, 50, 100);
    const drops = await this.prisma.dropHistory.findMany({
      where: {
        auctionId: { not: null },
        deliveredAt: { not: null },
        proofImageUrl: { not: null },
        playerId: { not: null },
      },
      select: {
        id: true,
        auctionId: true,
        itemName: true,
        proofImageUrl: true,
        deliveredAt: true,
        player: { select: { id: true, nickname: true } },
        auction: {
          select: {
            id: true,
            itemName: true,
            itemTier: true,
            itemType: true,
            auctionMode: true,
            itemCatalog: {
              select: { namePt: true, nameEn: true, image1Url: true, image2Url: true },
            },
          },
        },
      },
      orderBy: [{ deliveredAt: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
    });

    return drops.map((drop) => ({
      id: drop.id,
      auctionId: drop.auctionId!,
      itemNamePt: drop.auction?.itemCatalog?.namePt || drop.itemName || drop.auction?.itemName || 'Item',
      itemNameEn: drop.auction?.itemCatalog?.nameEn || drop.itemName || drop.auction?.itemName || 'Item',
      itemTier: drop.auction?.itemTier,
      itemType: drop.auction?.itemType,
      auctionMode: drop.auction?.auctionMode,
      winner: drop.player!,
      proofImageUrl: drop.proofImageUrl!,
      itemImageUrl: drop.auction?.itemCatalog?.image1Url || drop.auction?.itemCatalog?.image2Url || null,
      deliveredAt: drop.deliveredAt!,
    }));
  }

  async getItemAuditSummaries(search?: string) {
    const normalizedSearch = search?.trim();
    const where: Prisma.DropHistoryWhereInput | undefined = normalizedSearch
      ? {
          OR: [
            { itemName: { contains: normalizedSearch, mode: 'insensitive' } },
            { itemCatalog: { namePt: { contains: normalizedSearch, mode: 'insensitive' } } },
            { itemCatalog: { nameEn: { contains: normalizedSearch, mode: 'insensitive' } } },
            { itemCatalog: { nameEs: { contains: normalizedSearch, mode: 'insensitive' } } },
          ],
        }
      : undefined;

    const drops = await this.prisma.dropHistory.findMany({
      where,
      include: {
        itemCatalog: true,
        player: {
          include: {
            user: {
              select: {
                discordId: true,
                discordUsername: true,
                discordNickname: true,
              },
            },
          },
        },
      },
      orderBy: [{ deliveredAt: 'desc' }, { createdAt: 'desc' }],
      take: 2000,
    });

    const byItem = new Map<string, {
      itemKey: string;
      itemCatalogId?: string;
      itemName: string;
      namePt?: string;
      nameEn?: string;
      nameEs?: string | null;
      itemTier?: string | null;
      itemType?: string | null;
      imageUrl?: string | null;
      deliveredCount: number;
      uniquePlayers: Set<string>;
      lastDeliveredAt?: Date | null;
      sources: Set<string>;
    }>();

    for (const drop of drops) {
      const itemName = drop.itemCatalog?.namePt || drop.itemName || 'Item sem nome';
      const itemKey = drop.itemCatalogId ?? `legacy:${itemName.toLowerCase()}`;
      const current = byItem.get(itemKey) ?? {
        itemKey,
        itemCatalogId: drop.itemCatalogId ?? undefined,
        itemName,
        namePt: drop.itemCatalog?.namePt,
        nameEn: drop.itemCatalog?.nameEn,
        nameEs: drop.itemCatalog?.nameEs,
        itemTier: drop.itemCatalog?.itemTier,
        itemType: drop.itemCatalog?.itemType,
        imageUrl: drop.itemCatalog?.image1Url || drop.itemCatalog?.image2Url,
        deliveredCount: 0,
        uniquePlayers: new Set<string>(),
        lastDeliveredAt: drop.deliveredAt,
        sources: new Set<string>(),
      };

      current.deliveredCount += 1;
      current.uniquePlayers.add(drop.playerId ?? drop.discordId ?? drop.nicknameIngame ?? drop.id);
      current.sources.add(drop.auctionId ? 'AUCTION' : drop.itemInterestEntryId ? 'INTEREST' : 'LEGACY_OR_REQUEST');

      if (drop.deliveredAt && (!current.lastDeliveredAt || drop.deliveredAt > current.lastDeliveredAt)) {
        current.lastDeliveredAt = drop.deliveredAt;
      }

      byItem.set(itemKey, current);
    }

    return [...byItem.values()]
      .map((item) => ({
        ...item,
        uniquePlayers: item.uniquePlayers.size,
        sources: [...item.sources],
      }))
      .sort((a, b) => {
        const dateDiff = (b.lastDeliveredAt?.getTime() ?? 0) - (a.lastDeliveredAt?.getTime() ?? 0);
        return dateDiff || b.deliveredCount - a.deliveredCount || a.itemName.localeCompare(b.itemName);
      })
      .slice(0, 300);
  }

  async getItemAuditDetails(query: { itemCatalogId?: string; itemName?: string }) {
    const itemCatalogId = query.itemCatalogId?.trim();
    const itemName = query.itemName?.trim();

    if (!itemCatalogId && !itemName) {
      throw new BadRequestException('itemCatalogId or itemName is required.');
    }

    const drops = await this.prisma.dropHistory.findMany({
      where: itemCatalogId
        ? { itemCatalogId }
        : {
            OR: [
              { itemName: { equals: itemName, mode: 'insensitive' } },
              { itemCatalog: { namePt: { equals: itemName, mode: 'insensitive' } } },
              { itemCatalog: { nameEn: { equals: itemName, mode: 'insensitive' } } },
              { itemCatalog: { nameEs: { equals: itemName, mode: 'insensitive' } } },
            ],
          },
      include: {
        itemCatalog: true,
        player: {
          include: {
            user: {
              select: {
                discordId: true,
                discordUsername: true,
                discordNickname: true,
              },
            },
          },
        },
        auction: true,
        itemInterestEntry: {
          include: {
            post: true,
          },
        },
      },
      orderBy: [{ deliveredAt: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });

    const staffIds = [...new Set(drops.map((drop) => drop.staffDiscordId).filter((id): id is string => Boolean(id)))];
    const staffUsers = await this.prisma.user.findMany({
      where: { id: { in: staffIds } },
      select: {
        id: true,
        discordUsername: true,
        discordNickname: true,
      },
    });
    const staffById = new Map(staffUsers.map((user) => [user.id, user]));

    return drops.map((drop) => ({
      ...drop,
      source: drop.auctionId ? 'AUCTION' : drop.itemInterestEntryId ? 'INTEREST' : 'LEGACY_OR_REQUEST',
      staff: drop.staffDiscordId ? staffById.get(drop.staffDiscordId) ?? null : null,
    }));
  }

  async getItemAuditFull(query: { itemCatalogId?: string; itemName?: string }) {
    const itemCatalogId = query.itemCatalogId?.trim();
    const itemName = query.itemName?.trim();

    if (!itemCatalogId && !itemName) {
      throw new BadRequestException('itemCatalogId or itemName is required.');
    }

    const itemWhere = itemCatalogId
      ? { itemCatalogId }
      : {
          OR: [
            { itemName: { equals: itemName, mode: 'insensitive' as const } },
            { itemCatalog: { namePt: { equals: itemName, mode: 'insensitive' as const } } },
            { itemCatalog: { nameEn: { equals: itemName, mode: 'insensitive' as const } } },
            { itemCatalog: { nameEs: { equals: itemName, mode: 'insensitive' as const } } },
          ],
        };

    const [drops, auctions, interestPosts] = await Promise.all([
      this.getItemAuditDetails(query),
      this.prisma.auction.findMany({
        where: itemCatalogId
          ? { itemCatalogId }
          : {
              OR: [
                { itemName: { equals: itemName, mode: 'insensitive' } },
                { itemCatalog: { namePt: { equals: itemName, mode: 'insensitive' } } },
                { itemCatalog: { nameEn: { equals: itemName, mode: 'insensitive' } } },
                { itemCatalog: { nameEs: { equals: itemName, mode: 'insensitive' } } },
              ],
            },
        include: {
          itemCatalog: true,
          bids: {
            include: { player: { select: { id: true, nickname: true, dimensionalLayer: true } } },
            orderBy: { bidAmount: 'desc' },
          },
          dropHistory: { include: { player: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.itemInterestPost.findMany({
        where: itemCatalogId
          ? { itemCatalogId }
          : {
              OR: [
                { title: { contains: itemName, mode: 'insensitive' } },
                { itemCatalog: { namePt: { equals: itemName, mode: 'insensitive' } } },
                { itemCatalog: { nameEn: { equals: itemName, mode: 'insensitive' } } },
                { itemCatalog: { nameEs: { equals: itemName, mode: 'insensitive' } } },
              ],
            },
        include: {
          itemCatalog: true,
          entries: {
            include: {
              player: { select: { id: true, nickname: true, dimensionalLayer: true } },
              dropHistory: true,
              votes: { include: { voter: { select: { id: true, discordUsername: true, discordNickname: true } } } },
            },
            orderBy: { createdAt: 'asc' },
          },
          votes: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    const targetIds = [
      ...drops.map((drop) => drop.id),
      ...drops.map((drop) => drop.auctionId).filter((id): id is string => Boolean(id)),
      ...drops.map((drop) => drop.itemInterestEntryId).filter((id): id is string => Boolean(id)),
      ...auctions.map((auction) => auction.id),
      ...auctions.flatMap((auction) => auction.bids.map((bid) => bid.id)),
      ...interestPosts.map((post) => post.id),
      ...interestPosts.flatMap((post) => post.entries.map((entry) => entry.id)),
    ];

    const logs = targetIds.length > 0
      ? await this.prisma.auditLog.findMany({
          where: { targetId: { in: [...new Set(targetIds)] } },
          include: {
            actor: {
              select: {
                id: true,
                discordUsername: true,
                discordNickname: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 300,
        })
      : [];

    const winners = auctions
      .filter((auction) => auction.dropHistory)
      .map((auction) => ({
        auctionId: auction.id,
        itemName: auction.itemName,
        playerId: auction.dropHistory?.playerId,
        playerName: auction.dropHistory?.player?.nickname ?? auction.dropHistory?.nicknameIngame,
        deliveredAt: auction.dropHistory?.deliveredAt,
        proofImageUrl: auction.dropHistory?.proofImageUrl,
      }));

    return {
      summary: {
        deliveredCount: drops.length,
        auctionsCount: auctions.length,
        interestPostsCount: interestPosts.length,
        winnersCount: winners.length,
        logsCount: logs.length,
      },
      drops,
      auctions,
      interestPosts,
      winners,
      logs,
      query: itemWhere,
    };
  }

  async deliverAuctionDrop(auctionId: string, proofImageUrl: string | undefined, actorId: string) {
    if (!proofImageUrl?.trim()) {
      throw new BadRequestException('Proof image is required to deliver an auction drop.');
    }

    const drop = await this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.dropHistory.findUnique({
          where: { auctionId },
        });

        if (existing) {
          throw new BadRequestException('This auction drop has already been delivered.');
        }

        const auction = await tx.auction.findUnique({
          where: { id: auctionId },
          include: { itemCatalog: true },
        });

        if (!auction) {
          throw new NotFoundException('Auction not found.');
        }

        const win = await tx.dKPTransaction.findFirst({
          where: {
            referenceId: auctionId,
            type: DKPTransactionType.AUCTION_WIN,
          },
          include: {
            player: {
              include: {
                user: true,
              },
            },
          },
        });

        if (!win) {
          throw new BadRequestException('Auction has no registered winner transaction yet.');
        }

        const created = await tx.dropHistory.create({
          data: {
            auction: { connect: { id: auction.id } },
            player: { connect: { id: win.playerId } },
            itemCatalog: auction.itemCatalogId ? { connect: { id: auction.itemCatalogId } } : undefined,
            discordId: win.player.user.discordId,
            nicknameIngame: win.player.nickname,
            itemName: auction.itemName,
            staffDiscordId: actorId,
            proofImageUrl: proofImageUrl?.trim() || undefined,
            deliveredAt: new Date(),
          },
          include: {
            auction: true,
            itemCatalog: true,
            player: {
              include: {
                user: true,
              },
            },
          },
        });

        await tx.auditLog.create({
          data: {
            actorId,
            action: 'AUCTION_DROP_DELIVERED',
            targetType: 'Auction',
            targetId: auctionId,
            metadata: {
              auctionId,
              playerId: win.playerId,
              dropHistoryId: created.id,
              proofImageUrl: created.proofImageUrl,
            } satisfies Prisma.InputJsonObject,
          },
        });

        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    try {
      await this.notificationService.notifyAuctionDropDelivered({
        auctionId,
        itemName: drop.itemCatalog?.namePt || drop.itemName || drop.auction?.itemName || 'Drop',
        playerName: drop.player?.nickname || drop.nicknameIngame || 'Player',
        discordId: drop.discordId ?? undefined,
        proofImageUrl: drop.proofImageUrl ?? undefined,
      });

      await this.auditService.log({
        actorId,
        action: 'AUCTION_DROP_DELIVERY_NOTIFIED',
        targetType: 'DropHistory',
        targetId: drop.id,
        metadata: {
          auctionId,
          proofImageUrl: drop.proofImageUrl,
        },
      });
    } catch (error) {
      await this.auditService.log({
        actorId,
        action: 'AUCTION_DROP_DELIVERY_NOTIFICATION_FAILED',
        targetType: 'DropHistory',
        targetId: drop.id,
        metadata: {
          auctionId,
          message: error instanceof Error ? error.message : 'Unknown Discord notification error',
        },
      });
    }

    return drop;
  }

  private normalizePagination(
    pagination: { page?: number; limit?: number },
    defaultLimit: number,
    maxLimit: number,
  ): { skip: number; take: number } {
    const page = Number.isInteger(pagination.page) && Number(pagination.page) > 0 ? Number(pagination.page) : 1;
    const limit = Number.isInteger(pagination.limit) && Number(pagination.limit) > 0
      ? Math.min(Number(pagination.limit), maxLimit)
      : defaultLimit;

    return {
      skip: (page - 1) * limit,
      take: limit,
    };
  }

  private auctionDeliveryUrgency(ageHours: number): 'overdue' | 'urgent' | 'today' {
    if (ageHours >= DELIVERY_OVERDUE_AFTER_HOURS) return 'overdue';
    if (ageHours >= DELIVERY_URGENT_AFTER_HOURS) return 'urgent';
    return 'today';
  }

  private auctionDeliveryPriorityReason(urgency: 'overdue' | 'urgent' | 'today', ageHours: number): string {
    if (urgency === 'overdue') {
      return `Entrega pendente ha ${ageHours}h desde o AUCTION_WIN; virou atrasada e precisa comprovante.`;
    }
    if (urgency === 'urgent') {
      return `Entrega pendente ha ${ageHours}h desde o AUCTION_WIN; resolver ainda hoje evita fila esquecida.`;
    }
    return `Entrega criada ha ${ageHours}h pelo AUCTION_WIN; anexar prova e concluir o drop.`;
  }
}
