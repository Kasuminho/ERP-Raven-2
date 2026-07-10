import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ItemCatalog, ItemInterestEntry, ItemInterestPost, ItemInterestStatus, ItemType, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import type {
  ItemInterestEntryRelations as SharedItemInterestEntryRelations,
  ItemInterestPostRelations as SharedItemInterestPostRelations,
  ItemInterestStaffComparison as SharedItemInterestStaffComparison,
} from '@shared/types/interests';
import { AuditService } from '../../audit/services/audit.service';
import { NotificationService } from '../../discord/services/notification.service';
import { ImageStorageService } from '../../uploads/image-storage.service';
import { BulkCreateItemInterestPostDto, CreateItemInterestPostDto, DeclareItemInterestDto, DeliverItemInterestDto } from '../dto';
import { ItemInterestTransmuteRaffleService } from './item-interest-transmute-raffle.service';

type ItemInterestCatalogDetails = {
  id: string;
  kind: string;
  category: string;
  namePt: string;
  nameEn: string;
  nameEs: string | null;
  typePt: string;
  typeEn: string;
  typeEs: string | null;
  itemType: ItemType | null;
  image1Url: string | null;
  image2Url: string | null;
};

type ItemInterestVoteDetails = {
  id: string;
  round: number;
  voterId: string;
  voter: {
    discordUsername: string;
    discordNickname: string | null;
  };
};

type ItemInterestPostVoteDetails = {
  id: string;
  entryId: string;
  voterId: string;
  round: number;
};

export type ItemInterestStaffComparison = SharedItemInterestStaffComparison<Date, string, string>;

export type ItemInterestDetails = ItemInterestPost & SharedItemInterestPostRelations<
  Date,
  ItemInterestCatalogDetails,
  ItemInterestEntry & SharedItemInterestEntryRelations<
    Date,
    {
      id: string;
      nickname: string;
      dimensionalLayer: number;
      attendancePercentage: number;
    },
    ItemInterestVoteDetails,
    ItemInterestStaffComparison
  >,
  ItemInterestPostVoteDetails,
  { seenAt: Date }
>;

const criteriaTexts: Record<string, { pt: string; en: string }> = {
  'skill:PvE': {
    pt: '- Jogadores que utilizam esta skill\n- Skill inferior a anunciada\n- Participacao em boss e obrigatoria',
    en: '- Players who use this skill\n- Skill lower than the announced one\n- Boss participation is mandatory',
  },
  'skill:PvP': {
    pt: '- Jogadores que utilizam esta skill\n- Skill inferior a anunciada\n- Level 75+ obrigatorio\n- Prioridade por nivel',
    en: '- Players who use this skill\n- Skill lower than the announced one\n- Mandatory Level 75+\n- Priority by level',
  },
  'equipment:PvE': {
    pt: '- Jogadores que utilizam este equipamento\n- Equipamento inferior ao anunciado\n- Participacao em boss e obrigatoria',
    en: '- Players who use this equipment\n- Equipment lower than the announced one\n- Boss participation is mandatory',
  },
  'equipment:PvP': {
    pt: '- Jogadores que utilizam este equipamento\n- Equipamento inferior ao anunciado\n- Level 75+ obrigatorio\n- Prioridade para quem falta ao item\n- Enviar print dos equipamentos PvP',
    en: '- Players who use this equipment\n- Equipment lower than the announced one\n- Mandatory Level 75+\n- Priority for players missing the item\n- Send PvP equipment screenshot',
  },
};

const TRANSMUTE_IMAGE_URL = '/transmutar.png';

@Injectable()
export class ItemInterestsService {
  private readonly staffVoteThreshold = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly imageStorage: ImageStorageService,
    private readonly transmuteRaffle: ItemInterestTransmuteRaffleService,
  ) {}

  async listPosts(status?: ItemInterestStatus, userId?: string): Promise<ItemInterestDetails[]> {
    const viewerPlayer = userId
      ? await this.prisma.player.findFirst({
          where: { userId, isActive: true },
          select: { id: true },
          orderBy: { joinedAt: 'asc' },
        })
      : null;
    const posts = await this.prisma.itemInterestPost.findMany({
      where: status ? { status } : undefined,
      include: this.includeDetails(viewerPlayer?.id),
      orderBy: [{ status: 'asc' }, { closesAt: 'asc' }],
    });

    return this.withViewerState(await this.enrichLootStats(posts), viewerPlayer?.id);
  }

  async listPostsForStaff(status?: ItemInterestStatus): Promise<ItemInterestDetails[]> {
    const posts = await this.prisma.itemInterestPost.findMany({
      where: status ? { status } : undefined,
      include: this.includeDetails(),
      orderBy: [{ status: 'asc' }, { closesAt: 'asc' }],
    });

    return this.withStaffComparison(await this.enrichLootStats(posts));
  }

  async getPost(id: string): Promise<ItemInterestDetails> {
    const post = await this.prisma.itemInterestPost.findUnique({
      where: { id },
      include: this.includeDetails(),
    });

    if (!post) {
      throw new NotFoundException(`Interest post ${id} was not found.`);
    }

    return (await this.enrichLootStats([post]))[0];
  }

  async createPost(data: CreateItemInterestPostDto, actorId: string): Promise<ItemInterestPost> {
    const { post, item, mode } = await this.createPostInternal(data, actorId);

    await this.notifyCreatedPost(post, item, mode, actorId);

    return post;
  }

  async createBulkPosts(data: BulkCreateItemInterestPostDto, actorId: string): Promise<ItemInterestPost[]> {
    const itemCatalogIds = [...new Set(data.itemCatalogIds ?? [])].filter(Boolean);

    if (itemCatalogIds.length === 0) {
      throw new BadRequestException('Select at least one item to open interests.');
    }

    const created: Array<{ post: ItemInterestPost; item: ItemCatalog; mode: string }> = [];

    for (const itemCatalogId of itemCatalogIds) {
      created.push(await this.createPostInternal({ itemCatalogId, mode: data.mode, closesAt: data.closesAt }, actorId));
    }

    const weakSkillPosts = created.filter(({ item }) => this.isWeakSkill(item));
    const individualPosts = created.filter(({ item }) => !this.isWeakSkill(item));

    for (const row of individualPosts) {
      await this.notifyCreatedPost(row.post, row.item, row.mode, actorId);
    }

    if (weakSkillPosts.length > 0) {
      try {
        await this.notificationService.notifyItemInterestSkillBatchCreated({
          batchId: `skill-batch-${Date.now()}`,
          count: weakSkillPosts.length,
          mode: data.mode ?? 'PvE',
          closesAt: weakSkillPosts[0].post.closesAt,
          sampleTitles: weakSkillPosts.map(({ item }) => this.formatTitle(item.namePt, item.nameEn)),
        });
      } catch (error) {
        await this.audit('ITEM_INTEREST_SKILL_BATCH_NOTIFICATION_FAILED', 'skill-batch', actorId, {
          count: weakSkillPosts.length,
          message: error instanceof Error ? error.message : 'Unknown Discord notification error',
        });
      }
    }

    return created.map((row) => row.post);
  }

  private async createPostInternal(
    data: CreateItemInterestPostDto,
    actorId: string,
  ): Promise<{ post: ItemInterestPost; item: ItemCatalog; mode: string }> {
    const closesAt = new Date(data.closesAt);

    if (Number.isNaN(closesAt.getTime()) || closesAt <= new Date()) {
      throw new BadRequestException('closesAt must be a valid future date.');
    }

    const item = await this.prisma.itemCatalog.findUnique({ where: { id: data.itemCatalogId } });

    if (!item || !item.isActive) {
      throw new NotFoundException(`Active item ${data.itemCatalogId} was not found.`);
    }

    const mode = data.mode ?? 'PvE';
    const criteria = this.criteriaFor(item.kind, mode);
    const created = await this.prisma.itemInterestPost.create({
      data: {
        itemCatalogId: item.id,
        mode,
        title: data.title?.trim() || this.formatTitle(item.namePt, item.nameEn),
        criteriaPt: criteria.pt,
        criteriaEn: criteria.en,
        closesAt,
        createdById: actorId,
      },
    });

    await this.audit('ITEM_INTEREST_POST_CREATED', created.id, actorId, {
      itemCatalogId: item.id,
      mode,
      title: created.title,
    });

    return { post: created, item, mode };
  }

  async declareInterest(postId: string, userId: string, data: DeclareItemInterestDto): Promise<ItemInterestEntry> {
    const normalizedImageUrl = data.imageUrl?.trim();
    const isTransmuteRequest = data.isTransmuteRequest === true || normalizedImageUrl === TRANSMUTE_IMAGE_URL;
    const imageUrl = isTransmuteRequest ? TRANSMUTE_IMAGE_URL : normalizedImageUrl;

    if (!imageUrl) {
      throw new BadRequestException('Interest declaration print is required.');
    }

    return this.prisma.$transaction(async (tx) => {
      const post = await tx.itemInterestPost.findUnique({ where: { id: postId } });

      if (!post) {
        throw new NotFoundException(`Interest post ${postId} was not found.`);
      }

      if (post.status !== 'OPEN' || post.closesAt <= new Date()) {
        throw new BadRequestException('This interest post is closed.');
      }

      const player = await this.getPrimaryPlayer(userId, tx);
      const entry = await tx.itemInterestEntry.create({
        data: {
          postId,
          playerId: player.id,
          note: data.note?.trim() || undefined,
          imageUrl,
          isTransmuteRequest,
        },
      });

      await this.auditWithinTransaction(tx, 'ITEM_INTEREST_DECLARED', entry.id, userId, {
        postId,
        playerId: player.id,
        isTransmuteRequest,
      });

      return entry;
    }).catch((error: unknown) => {
      if (this.isUniqueError(error)) {
        throw new BadRequestException('Player already declared interest for this post.');
      }
      throw error;
    });
  }

  async markSeen(postId: string, userId: string): Promise<{ seenAt: Date }> {
    const player = await this.getPrimaryPlayer(userId, this.prisma);
    const post = await this.prisma.itemInterestPost.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    if (!post) {
      throw new NotFoundException(`Interest post ${postId} was not found.`);
    }

    const view = await this.prisma.itemInterestView.upsert({
      where: {
        postId_playerId: {
          postId,
          playerId: player.id,
        },
      },
      create: {
        postId,
        playerId: player.id,
      },
      update: {
        seenAt: new Date(),
      },
      select: {
        seenAt: true,
      },
    });

    await this.audit('ITEM_INTEREST_MARKED_SEEN', postId, userId, {
      playerId: player.id,
      seenAt: view.seenAt.toISOString(),
    });

    return view;
  }

  async closePost(id: string, actorId: string): Promise<ItemInterestPost> {
    return this.closePostWithinTransaction(id, actorId, false);
  }

  async cancelPost(id: string, actorId: string, reason: string): Promise<ItemInterestPost> {
    const normalizedReason = reason?.trim();

    if (!normalizedReason) {
      throw new BadRequestException('A cancellation reason is required.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const post = await tx.itemInterestPost.findUnique({
        where: { id },
        include: { entries: { select: { id: true, imageUrl: true, playerId: true } } },
      });

      if (!post) {
        throw new NotFoundException(`Interest post ${id} was not found.`);
      }

      if (post.status === ItemInterestStatus.DELIVERED) {
        throw new BadRequestException('Delivered interest posts cannot be removed.');
      }

      if (post.status === ItemInterestStatus.CANCELLED) {
        throw new BadRequestException('This interest post was already removed.');
      }

      const updated = await tx.itemInterestPost.update({
        where: { id },
        data: {
          status: ItemInterestStatus.CANCELLED,
          closedAt: new Date(),
          selectedEntryId: null,
          deliveryEnabledAt: null,
          votingCandidateEntryIds: [],
        },
      });

      await this.auditWithinTransaction(tx, 'ITEM_INTEREST_POST_CANCELLED', id, actorId, {
        reason: normalizedReason,
        previousStatus: post.status,
        entriesCount: post.entries.length,
        playerIds: post.entries.map((entry) => entry.playerId),
      });

      return { updated, imageUrls: post.entries.map((entry) => entry.imageUrl).filter((url): url is string => Boolean(url)) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    await this.cleanupCancelledInterestImages(id, actorId, result.imageUrls);
    return result.updated;
  }

  async closeExpiredPosts(): Promise<{ closed: number; voting: number; empty: number; autoSelected: number }> {
    const expiredPosts = await this.prisma.itemInterestPost.findMany({
      where: {
        status: ItemInterestStatus.OPEN,
        closesAt: { lte: new Date() },
      },
      select: { id: true },
      orderBy: { closesAt: 'asc' },
      take: 50,
    });

    let voting = 0;
    let empty = 0;
    let autoSelected = 0;

    for (const post of expiredPosts) {
      const updated = await this.closePostWithinTransaction(post.id, undefined, true);

      if (updated.status === ItemInterestStatus.VOTING) {
        voting += 1;
      }

      if (updated.status === ItemInterestStatus.READY_FOR_DELIVERY) {
        autoSelected += 1;
      }

      if (updated.status === ItemInterestStatus.CLOSED) {
        empty += 1;
      }
    }

    return { closed: voting + empty + autoSelected, voting, empty, autoSelected };
  }

  async vote(postId: string, entryId: string, voterId: string): Promise<ItemInterestDetails> {
    await this.prisma.$transaction(async (tx) => {
      const post = await tx.itemInterestPost.findUnique({
        where: { id: postId },
        include: { entries: true },
      });

      if (!post) {
        throw new NotFoundException(`Interest post ${postId} was not found.`);
      }

      if (post.status !== ItemInterestStatus.VOTING) {
        throw new BadRequestException('Voting is not open for this interest post.');
      }

      const candidateIds = this.jsonStringArray(post.votingCandidateEntryIds);
      const entry = post.entries.find((row) => row.id === entryId);

      if (!entry) {
        throw new BadRequestException('Selected player did not declare interest in this post.');
      }

      if (candidateIds.length > 0 && !candidateIds.includes(entryId)) {
        throw new BadRequestException('This voting round is restricted to tied candidates.');
      }

      await tx.itemInterestVote.upsert({
        where: {
          postId_voterId_round: {
            postId,
            voterId,
            round: post.votingRound,
          },
        },
        create: {
          postId,
          entryId,
          voterId,
          round: post.votingRound,
        },
        update: {
          entryId,
        },
      });

      const votes = await tx.itemInterestVote.findMany({
        where: { postId, round: post.votingRound },
      });
      const counts = this.voteCounts(votes);
      const winner = [...counts.entries()].find(([, count]) => count >= this.staffVoteThreshold);

      if (winner) {
        await tx.itemInterestPost.update({
          where: { id: postId },
          data: {
            status: ItemInterestStatus.READY_FOR_DELIVERY,
            selectedEntryId: winner[0],
            deliveryEnabledAt: new Date(),
          },
        });
      }

      await this.auditWithinTransaction(tx, 'ITEM_INTEREST_VOTE_CAST', postId, voterId, {
        entryId,
        round: post.votingRound,
        selectedEntryId: winner?.[0],
        threshold: this.staffVoteThreshold,
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return this.getPost(postId);
  }

  async startTieBreak(postId: string, actorId: string): Promise<ItemInterestDetails> {
    await this.prisma.$transaction(async (tx) => {
      const post = await tx.itemInterestPost.findUnique({
        where: { id: postId },
        include: { entries: true },
      });

      if (!post) {
        throw new NotFoundException(`Interest post ${postId} was not found.`);
      }

      if (post.status !== ItemInterestStatus.VOTING) {
        throw new BadRequestException('Only active voting posts can start a tie-break.');
      }

      const votes = await tx.itemInterestVote.findMany({
        where: { postId, round: post.votingRound },
      });
      const counts = this.voteCounts(votes);
      const maxVotes = Math.max(0, ...counts.values());
      const tiedEntryIds = [...counts.entries()]
        .filter(([, count]) => count === maxVotes && count > 0)
        .map(([entryId]) => entryId);

      if (tiedEntryIds.length < 2) {
        throw new BadRequestException('Tie-break requires at least two tied candidates with votes.');
      }

      await tx.itemInterestPost.update({
        where: { id: postId },
        data: {
          votingRound: post.votingRound + 1,
          votingCandidateEntryIds: tiedEntryIds,
          selectedEntryId: null,
          deliveryEnabledAt: null,
        },
      });

      await this.auditWithinTransaction(tx, 'ITEM_INTEREST_TIE_BREAK_STARTED', postId, actorId, {
        previousRound: post.votingRound,
        nextRound: post.votingRound + 1,
        tiedEntryIds,
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return this.getPost(postId);
  }

  async markDelivered(id: string, data: DeliverItemInterestDto, actorId: string): Promise<ItemInterestPost> {
    const entryIds = [...new Set(data.entryIds ?? [])].filter(Boolean);

    if (entryIds.length === 0) {
      throw new BadRequestException('Select at least one interested player to receive the item.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const post = await tx.itemInterestPost.findUnique({
        where: { id },
        include: { itemCatalog: true },
      });

      if (!post) {
        throw new NotFoundException(`Interest post ${id} was not found.`);
      }

      if (post.status === 'DELIVERED' || post.status === 'CANCELLED') {
        throw new BadRequestException('This interest post is already resolved.');
      }

      if (post.status !== ItemInterestStatus.READY_FOR_DELIVERY || !post.selectedEntryId) {
        throw new BadRequestException('Interest delivery requires a completed Staff vote.');
      }

      if (entryIds.length !== 1 || entryIds[0] !== post.selectedEntryId) {
        throw new BadRequestException('Only the Staff vote winner can receive this item.');
      }

      const entries = await tx.itemInterestEntry.findMany({
        where: {
          id: { in: entryIds },
          postId: id,
        },
        include: {
          player: {
            include: { user: true },
          },
          dropHistory: true,
        },
      });

      if (entries.length !== entryIds.length) {
        throw new BadRequestException('One or more selected players did not declare interest in this post.');
      }

      const alreadyDelivered = entries.find((entry) => entry.dropHistory);

      if (alreadyDelivered) {
        throw new BadRequestException(`Interest entry ${alreadyDelivered.id} was already delivered.`);
      }

      const deliveredAt = new Date();

      for (const entry of entries) {
        await tx.dropHistory.create({
          data: {
            itemCatalogId: post.itemCatalogId,
            itemInterestEntryId: entry.id,
            playerId: entry.playerId,
            discordId: entry.player.user.discordId,
            nicknameIngame: entry.player.nickname,
            itemName: post.itemCatalog.namePt || post.title,
            staffDiscordId: actorId,
            proofImageUrl: data.proofImageUrl?.trim() || undefined,
            deliveredAt,
          },
        });
      }

      const updated = await tx.itemInterestPost.update({
        where: { id },
        data: {
          status: 'DELIVERED',
          closedAt: deliveredAt,
          proofImageUrl: data.proofImageUrl?.trim() || undefined,
        },
      });

      await this.auditWithinTransaction(tx, 'ITEM_INTEREST_POST_DELIVERED', id, actorId, {
        proofImageUrl: updated.proofImageUrl,
        entryIds,
        playerIds: entries.map((entry) => entry.playerId),
        dropCount: entries.length,
      });

      return {
        updated,
        notification: {
          title: post.title,
          itemName: this.formatTitle(post.itemCatalog.namePt, post.itemCatalog.nameEn),
          playerNames: entries.map((entry) => entry.player.nickname),
          proofImageUrl: updated.proofImageUrl,
        },
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    try {
      await this.notificationService.notifyItemInterestDelivered({
        postId: id,
        ...result.notification,
      });
    } catch (error) {
      await this.audit('ITEM_INTEREST_DELIVERY_NOTIFICATION_FAILED', id, actorId, {
        proofImageUrl: result.notification.proofImageUrl,
        playerNames: result.notification.playerNames,
        message: error instanceof Error ? error.message : 'Unknown Discord notification error',
      });
    }

    return result.updated;
  }

  private criteriaFor(kind: string, mode: string): { pt: string; en: string } {
    const normalizedKind = kind.trim().toLowerCase() === 'skill' ? 'skill' : 'equipment';
    return criteriaTexts[`${normalizedKind}:${mode}`] ?? criteriaTexts['equipment:PvE'];
  }

  private formatTitle(namePt: string, nameEn: string): string {
    return namePt.trim().toLowerCase() === nameEn.trim().toLowerCase() ? namePt : `${namePt} / ${nameEn}`;
  }

  private async getPrimaryPlayer(userId: string, tx: Prisma.TransactionClient | PrismaService): Promise<{ id: string }> {
    const player = await tx.player.findFirst({
      where: { userId, isActive: true },
      select: { id: true },
      orderBy: { joinedAt: 'asc' },
    });

    if (!player) {
      throw new NotFoundException('Authenticated user does not have an active player profile.');
    }

    return player;
  }

  private includeDetails(viewerPlayerId?: string) {
    return {
      itemCatalog: {
        select: {
          id: true,
          kind: true,
          category: true,
          namePt: true,
          nameEn: true,
          nameEs: true,
          typePt: true,
          typeEn: true,
          typeEs: true,
          itemType: true,
          image1Url: true,
          image2Url: true,
        },
      },
      entries: {
        include: {
          dropHistory: {
            select: {
              id: true,
              deliveredAt: true,
            },
          },
          player: {
            select: {
              id: true,
              nickname: true,
              dimensionalLayer: true,
              attendancePercentage: true,
            },
          },
          votes: {
            include: {
              voter: {
                select: {
                  discordUsername: true,
                  discordNickname: true,
                },
              },
            },
            orderBy: [{ round: 'asc' as const }, { updatedAt: 'asc' as const }],
          },
        },
        orderBy: { createdAt: 'asc' as const },
      },
      votes: {
        select: {
          id: true,
          entryId: true,
          voterId: true,
          round: true,
        },
      },
      views: viewerPlayerId
        ? {
            where: { playerId: viewerPlayerId },
            select: { seenAt: true },
          }
        : {
            where: { id: '__never__' },
            select: { seenAt: true },
          },
    };
  }

  private withViewerState(posts: ItemInterestDetails[], viewerPlayerId?: string): ItemInterestDetails[] {
    if (!viewerPlayerId) {
      return posts.map((post) => ({
        ...post,
        viewerHasDeclared: false,
        viewerSeenAt: null,
      }));
    }

    return posts.map((post) => ({
      ...post,
      viewerHasDeclared: post.entries.some((entry) => entry.playerId === viewerPlayerId),
      viewerSeenAt: post.views?.[0]?.seenAt ?? null,
    }));
  }

  private async enrichLootStats(posts: ItemInterestDetails[]): Promise<ItemInterestDetails[]> {
    const playerIds = [...new Set(posts.flatMap((post) => post.entries.map((entry) => entry.playerId)))];
    const itemCatalogIds = [...new Set(posts.map((post) => post.itemCatalogId))];

    if (playerIds.length === 0) {
      return posts;
    }

    const drops = await this.prisma.dropHistory.findMany({
      where: {
        playerId: { in: playerIds },
      },
      include: {
        itemCatalog: {
          select: {
            id: true,
            kind: true,
            category: true,
          },
        },
      },
      orderBy: [{ deliveredAt: 'desc' }, { createdAt: 'desc' }],
      take: 5000,
    });
    const itemCatalogs = await this.prisma.itemCatalog.findMany({
      where: { id: { in: itemCatalogIds } },
      select: {
        id: true,
        kind: true,
        category: true,
      },
    });
    const itemsById = new Map(itemCatalogs.map((item) => [item.id, item]));

    return posts.map((post) => {
      const item = itemsById.get(post.itemCatalogId);

      return {
        ...post,
        entries: post.entries.map((entry) => {
          const playerDrops = drops.filter((drop) => drop.playerId === entry.playerId);
          const sameItemDrops = playerDrops.filter((drop) => drop.itemCatalogId === post.itemCatalogId).length;
          const sameTypeDrops = item
            ? playerDrops.filter((drop) => drop.itemCatalog?.kind === item.kind && drop.itemCatalog?.category === item.category).length
            : 0;
          const lastDropAt = playerDrops[0]?.deliveredAt ?? playerDrops[0]?.createdAt ?? null;
          const queueDays = Math.max(0, Math.floor((Date.now() - entry.createdAt.getTime()) / 86_400_000));

          return {
            ...entry,
            lootStats: {
              queueDays,
              totalDrops: playerDrops.length,
              sameItemDrops,
              sameTypeDrops,
              lastDropAt,
            },
          };
        }),
      };
    });
  }

  private async withStaffComparison(posts: ItemInterestDetails[]): Promise<ItemInterestDetails[]> {
    const playerIds = [...new Set(posts.flatMap((post) => post.entries.map((entry) => entry.playerId)))];

    if (playerIds.length === 0) {
      return posts;
    }

    const [players, dkpTotals, activeLocks, activeRequests, staffNotes] = await Promise.all([
      this.prisma.player.findMany({
        where: { id: { in: playerIds } },
        select: {
          id: true,
          class: true,
          dimensionalLayer: true,
          attendancePercentage: true,
        },
      }),
      this.prisma.dKPTransaction.groupBy({
        by: ['playerId'],
        where: { playerId: { in: playerIds } },
        _sum: { amount: true },
      }),
      this.prisma.dKPLock.groupBy({
        by: ['playerId'],
        where: { playerId: { in: playerIds }, released: false },
        _sum: { amount: true },
      }),
      this.prisma.itemRequest.findMany({
        where: { playerId: { in: playerIds }, remainingQuantity: { gt: 0 } },
        include: {
          itemCatalog: {
            select: {
              category: true,
              itemTier: true,
              itemType: true,
            },
          },
        },
        orderBy: [{ playerId: 'asc' }, { rankPosition: 'asc' }],
      }),
      this.prisma.playerStaffNote.findMany({
        where: { playerId: { in: playerIds } },
        include: {
          author: {
            select: {
              discordUsername: true,
              discordNickname: true,
            },
          },
        },
        orderBy: [{ playerId: 'asc' }, { createdAt: 'desc' }],
        take: 500,
      }),
    ]);

    const playersById = new Map(players.map((player) => [player.id, player]));
    const totalDkpByPlayer = new Map(dkpTotals.map((row) => [row.playerId, row._sum.amount ?? 0]));
    const lockedDkpByPlayer = new Map(activeLocks.map((row) => [row.playerId, row._sum.amount ?? 0]));
    const requestsByPlayer = new Map<string, typeof activeRequests>();
    const latestNoteByPlayer = new Map<string, (typeof staffNotes)[number]>();

    for (const request of activeRequests) {
      const requests = requestsByPlayer.get(request.playerId ?? '') ?? [];
      requests.push(request);
      if (request.playerId) {
        requestsByPlayer.set(request.playerId, requests);
      }
    }

    for (const note of staffNotes) {
      if (!latestNoteByPlayer.has(note.playerId)) {
        latestNoteByPlayer.set(note.playerId, note);
      }
    }

    return posts.map((post) => ({
      ...post,
      entries: post.entries.map((entry) => {
        const player = playersById.get(entry.playerId);
        const totalDkp = totalDkpByPlayer.get(entry.playerId) ?? 0;
        const lockedDkp = lockedDkpByPlayer.get(entry.playerId) ?? 0;
        const activePlayerRequests = requestsByPlayer.get(entry.playerId) ?? [];
        const latestNote = latestNoteByPlayer.get(entry.playerId);
        const recentLoot = {
          queueDays: entry.lootStats?.queueDays ?? 0,
          totalDrops: entry.lootStats?.totalDrops ?? 0,
          sameItemDrops: entry.lootStats?.sameItemDrops ?? 0,
          sameTypeDrops: entry.lootStats?.sameTypeDrops ?? 0,
          lastDropAt: entry.lootStats?.lastDropAt ?? null,
        };

        return {
          ...entry,
          staffComparison: {
            playerClass: player?.class ?? 'UNKNOWN',
            dimensionalLayer: player?.dimensionalLayer ?? entry.player.dimensionalLayer,
            attendancePercentage: player?.attendancePercentage ?? entry.player.attendancePercentage,
            totalDkp,
            lockedDkp,
            availableDkp: totalDkp - lockedDkp,
            activeRequests: activePlayerRequests.map((request) => ({
              id: request.id,
              itemName: request.itemName,
              remainingQuantity: request.remainingQuantity,
              totalQuantity: request.totalQuantity,
              rankPosition: request.rankPosition,
              category: request.itemCatalog?.category,
              itemTier: request.itemCatalog?.itemTier,
              itemType: request.itemCatalog?.itemType,
            })),
            latestStaffNote: latestNote
              ? {
                  severity: latestNote.severity,
                  body: latestNote.body,
                  createdAt: latestNote.createdAt,
                  authorName: latestNote.author.discordNickname || latestNote.author.discordUsername,
                }
              : null,
            recentLoot,
            decisionSignalsPt: this.interestDecisionSignalsPt({
              attendancePercentage: player?.attendancePercentage ?? entry.player.attendancePercentage,
              availableDkp: totalDkp - lockedDkp,
              activeRequestsCount: activePlayerRequests.length,
              latestNoteSeverity: latestNote?.severity,
              recentLoot,
            }),
            summaryPt: this.interestComparisonSummaryPt(entry.player.nickname, {
              playerClass: player?.class ?? 'UNKNOWN',
              dimensionalLayer: player?.dimensionalLayer ?? entry.player.dimensionalLayer,
              attendancePercentage: player?.attendancePercentage ?? entry.player.attendancePercentage,
              availableDkp: totalDkp - lockedDkp,
              activeRequestsCount: activePlayerRequests.length,
              recentLoot,
            }),
          },
        };
      }),
    }));
  }

  private interestDecisionSignalsPt(data: {
    attendancePercentage: number;
    availableDkp: number;
    activeRequestsCount: number;
    latestNoteSeverity?: string;
    recentLoot: ItemInterestStaffComparison['recentLoot'];
  }): string[] {
    const signals: string[] = [];

    if (data.attendancePercentage >= 75) {
      signals.push('Presenca forte para boss/rotina.');
    } else if (data.attendancePercentage < 40) {
      signals.push('Presenca baixa; revisar contexto antes de votar.');
    }

    if (data.availableDkp <= 0) {
      signals.push('DKP disponivel zerado/negativo.');
    }

    if (data.recentLoot.sameItemDrops > 0) {
      signals.push('Ja recebeu este mesmo item no historico.');
    } else if (data.recentLoot.sameTypeDrops === 0) {
      signals.push('Sem drop recente do mesmo tipo registrado.');
    }

    if (data.activeRequestsCount > 0) {
      signals.push(`${data.activeRequestsCount} request(s) ativo(s) podem indicar outra prioridade de progressao.`);
    }

    if (data.latestNoteSeverity === 'WARNING' || data.latestNoteSeverity === 'STRIKE') {
      signals.push(`Nota Staff ${data.latestNoteSeverity} recente pede leitura antes da decisao.`);
    }

    return signals.length ? signals : ['Sem alerta automatico; decidir pelo criterio do post e conversa da Staff.'];
  }

  private interestComparisonSummaryPt(
    playerName: string,
    data: {
      playerClass: string;
      dimensionalLayer: number;
      attendancePercentage: number;
      availableDkp: number;
      activeRequestsCount: number;
      recentLoot: ItemInterestStaffComparison['recentLoot'];
    },
  ): string {
    const lastDrop = data.recentLoot.lastDropAt ? data.recentLoot.lastDropAt.toISOString().slice(0, 10) : 'sem drop registrado';
    return `${playerName}: ${data.playerClass}, camada ${data.dimensionalLayer}, presenca ${Math.round(data.attendancePercentage)}%, DKP disp. ${data.availableDkp}, ${data.activeRequestsCount} request(s), ultimo drop ${lastDrop}.`;
  }

  private async notifyCreatedPost(post: ItemInterestPost, item: ItemCatalog, mode: string, actorId: string): Promise<void> {
    try {
      await this.notificationService.notifyItemInterestCreated({
        postId: post.id,
        title: post.title,
        itemName: this.formatTitle(item.namePt, item.nameEn),
        mode,
        criteriaPt: post.criteriaPt,
        criteriaEn: post.criteriaEn,
        closesAt: post.closesAt,
        imageUrl: item.image1Url || item.image2Url,
      });
    } catch (error) {
      await this.audit('ITEM_INTEREST_POST_NOTIFICATION_FAILED', post.id, actorId, {
        itemCatalogId: item.id,
        message: error instanceof Error ? error.message : 'Unknown Discord notification error',
      });
    }
  }

  private isWeakSkill(item: ItemCatalog): boolean {
    return item.kind.trim().toLowerCase() === 'skill' && !['heroic', 'legendary'].includes(item.category.trim().toLowerCase());
  }

  private async closePostWithinTransaction(id: string, actorId: string | undefined, automatic: boolean): Promise<ItemInterestPost> {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const post = await tx.itemInterestPost.findUnique({
        where: { id },
        include: {
          entries: true,
          itemCatalog: {
            select: {
              itemType: true,
            },
          },
        },
      });

      if (!post) {
        throw new NotFoundException(`Interest post ${id} was not found.`);
      }

      if (post.status !== ItemInterestStatus.OPEN) {
        if (automatic) {
          return post;
        }

        throw new BadRequestException('Only open interest posts can be closed for voting.');
      }

      if (automatic && post.closesAt > now) {
        return post;
      }

      if (post.entries.length === 0) {
        const updated = await tx.itemInterestPost.update({
          where: { id },
          data: {
            status: ItemInterestStatus.CLOSED,
            closedAt: now,
            votingRound: 1,
            votingCandidateEntryIds: [],
            selectedEntryId: null,
            deliveryEnabledAt: null,
          },
        });

        await this.auditWithinTransaction(tx, automatic ? 'ITEM_INTEREST_POST_AUTO_CLOSED' : 'ITEM_INTEREST_POST_CLOSED', id, actorId, {
          automatic,
          previousStatus: post.status,
          nextStatus: ItemInterestStatus.CLOSED,
          entriesCount: 0,
          closesAt: post.closesAt.toISOString(),
        });

        return updated;
      }

      if (post.entries.every((entry) => entry.isTransmuteRequest)) {
        const selection = await this.transmuteRaffle.pickWinnerForDay(tx, post, now);

        if (selection.entry) {
          const updated = await tx.itemInterestPost.update({
            where: { id },
            data: {
              status: ItemInterestStatus.READY_FOR_DELIVERY,
              closedAt: now,
              votingRound: 1,
              votingCandidateEntryIds: [],
              selectedEntryId: selection.entry.id,
              deliveryEnabledAt: now,
            },
          });

          await this.auditWithinTransaction(tx, 'ITEM_INTEREST_TRANSMUTE_AUTO_SELECTED', id, actorId, {
            automatic,
            previousStatus: post.status,
            nextStatus: ItemInterestStatus.READY_FOR_DELIVERY,
            entriesCount: post.entries.length,
            eligibleCount: selection.eligibleCount,
            blockedPlayerIds: selection.blockedPlayerIds,
            weightedFallback: selection.weightedFallback,
            raffleWeights: selection.raffleWeights,
            selectedEntryId: selection.entry.id,
            selectedPlayerId: selection.entry.playerId,
            transmuteDay: selection.dayKey,
            closesAt: post.closesAt.toISOString(),
          });

          return updated;
        }

        const updated = await tx.itemInterestPost.update({
          where: { id },
          data: {
            status: ItemInterestStatus.CLOSED,
            closedAt: now,
            votingRound: 1,
            votingCandidateEntryIds: [],
            selectedEntryId: null,
            deliveryEnabledAt: null,
          },
        });

        await this.auditWithinTransaction(tx, 'ITEM_INTEREST_TRANSMUTE_CLOSED_NO_ELIGIBLE_PLAYER', id, actorId, {
          automatic,
          previousStatus: post.status,
          nextStatus: ItemInterestStatus.CLOSED,
          entriesCount: post.entries.length,
          blockedPlayerIds: selection.blockedPlayerIds,
          weightedFallback: selection.weightedFallback,
          raffleWeights: selection.raffleWeights,
          transmuteDay: selection.dayKey,
          closesAt: post.closesAt.toISOString(),
        });

        return updated;
      }

      const nextStatus = ItemInterestStatus.VOTING;
      const updated = await tx.itemInterestPost.update({
        where: { id },
        data: {
          status: nextStatus,
          closedAt: now,
          votingRound: 1,
          votingCandidateEntryIds: [],
          selectedEntryId: null,
          deliveryEnabledAt: null,
        },
      });

      await this.auditWithinTransaction(tx, automatic ? 'ITEM_INTEREST_POST_AUTO_CLOSED' : 'ITEM_INTEREST_POST_CLOSED', id, actorId, {
        automatic,
        previousStatus: post.status,
        nextStatus,
        entriesCount: post.entries.length,
        closesAt: post.closesAt.toISOString(),
      });

      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private jsonStringArray(value: Prisma.JsonValue): string[] {
    return Array.isArray(value) ? value.filter((row): row is string => typeof row === 'string') : [];
  }

  private voteCounts(votes: Array<{ entryId: string }>): Map<string, number> {
    const counts = new Map<string, number>();

    for (const vote of votes) {
      counts.set(vote.entryId, (counts.get(vote.entryId) ?? 0) + 1);
    }

    return counts;
  }

  private isUniqueError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  private async audit(action: string, targetId: string, actorId: string, metadata: Prisma.InputJsonObject): Promise<void> {
    await this.auditService.log({ actorId, action, targetType: 'ItemInterestPost', targetId, metadata });
  }

  private async auditWithinTransaction(
    tx: Prisma.TransactionClient,
    action: string,
    targetId: string,
    actorId: string | undefined,
    metadata: Prisma.InputJsonObject,
  ): Promise<void> {
    await this.auditService.logWithinTransaction({ actorId, action, targetType: 'ItemInterest', targetId, metadata }, tx);
  }

  private async cleanupCancelledInterestImages(postId: string, actorId: string, imageUrls: string[]): Promise<void> {
    let deletedCount = 0;
    const failures: string[] = [];

    for (const imageUrl of [...new Set(imageUrls)]) {
      try {
        if (await this.imageStorage.deleteByUrl(imageUrl)) {
          deletedCount += 1;
        }
      } catch (error) {
        failures.push(error instanceof Error ? error.message : 'Unknown storage deletion error');
      }
    }

    await this.audit('ITEM_INTEREST_CANCELLED_IMAGES_CLEANED', postId, actorId, {
      deletedCount,
      failedCount: failures.length,
      failures,
    });
  }
}
