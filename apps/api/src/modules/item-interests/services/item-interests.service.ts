import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ItemCatalog, ItemInterestEntry, ItemInterestPost, ItemInterestStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { AuditService } from '../../audit/services/audit.service';
import { NotificationService } from '../../discord/services/notification.service';
import { BulkCreateItemInterestPostDto, CreateItemInterestPostDto, DeclareItemInterestDto, DeliverItemInterestDto } from '../dto';

export type ItemInterestDetails = ItemInterestPost & {
  itemCatalog: {
    id: string;
    kind: string;
    category: string;
    namePt: string;
    nameEn: string;
    nameEs: string | null;
    typePt: string;
    typeEn: string;
    typeEs: string | null;
    image1Url: string | null;
    image2Url: string | null;
  };
  entries: Array<ItemInterestEntry & {
    player: {
      id: string;
      nickname: string;
      dimensionalLayer: number;
      attendancePercentage: number;
    };
    dropHistory: {
      id: string;
      deliveredAt: Date | null;
    } | null;
    votes: Array<{
      id: string;
      round: number;
      voterId: string;
      voter: {
        discordUsername: string;
        discordNickname: string | null;
      };
    }>;
  }>;
  votes: Array<{
    id: string;
    entryId: string;
    voterId: string;
    round: number;
  }>;
};

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

@Injectable()
export class ItemInterestsService {
  private readonly staffVoteThreshold = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
  ) {}

  async listPosts(status?: ItemInterestStatus): Promise<ItemInterestDetails[]> {
    return this.prisma.itemInterestPost.findMany({
      where: status ? { status } : undefined,
      include: this.includeDetails(),
      orderBy: [{ status: 'asc' }, { closesAt: 'asc' }],
    });
  }

  async getPost(id: string): Promise<ItemInterestDetails> {
    const post = await this.prisma.itemInterestPost.findUnique({
      where: { id },
      include: this.includeDetails(),
    });

    if (!post) {
      throw new NotFoundException(`Interest post ${id} was not found.`);
    }

    return post;
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
    if (!data.imageUrl?.trim()) {
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
          imageUrl: data.imageUrl?.trim() || undefined,
        },
      });

      await this.auditWithinTransaction(tx, 'ITEM_INTEREST_DECLARED', entry.id, userId, {
        postId,
        playerId: player.id,
      });

      return entry;
    }).catch((error: unknown) => {
      if (this.isUniqueError(error)) {
        throw new BadRequestException('Player already declared interest for this post.');
      }
      throw error;
    });
  }

  async closePost(id: string, actorId: string): Promise<ItemInterestPost> {
    return this.closePostWithinTransaction(id, actorId, false);
  }

  async closeExpiredPosts(): Promise<{ closed: number; voting: number; empty: number }> {
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

    for (const post of expiredPosts) {
      const updated = await this.closePostWithinTransaction(post.id, undefined, true);

      if (updated.status === ItemInterestStatus.VOTING) {
        voting += 1;
      }

      if (updated.status === ItemInterestStatus.CLOSED) {
        empty += 1;
      }
    }

    return { closed: voting + empty, voting, empty };
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

  private async getPrimaryPlayer(userId: string, tx: Prisma.TransactionClient): Promise<{ id: string }> {
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

  private includeDetails() {
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
    };
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
      const post = await tx.itemInterestPost.findUnique({
        where: { id },
        include: { entries: true },
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

      if (automatic && post.closesAt > new Date()) {
        return post;
      }

      const nextStatus = post.entries.length > 0 ? ItemInterestStatus.VOTING : ItemInterestStatus.CLOSED;
      const updated = await tx.itemInterestPost.update({
        where: { id },
        data: {
          status: nextStatus,
          closedAt: new Date(),
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
}
