import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ItemCatalog, ItemRequest, ItemRequestUpdateStatus, Prisma } from '@prisma/client';
import { AuditService } from '../../audit/services/audit.service';
import { BusinessRulesService } from '../../business-rules/business-rules.service';
import { NotificationService } from '../../discord/services/notification.service';
import { getRequestableCatalogKey, requestableItemCategories, requestableItemKeys } from '../../items/requestable-items';
import { ImageStorageService } from '../../uploads/image-storage.service';
import { ApproveItemRequestUpdateDto, CreateItemRequestDto, DeliverItemRequestDto, UpdateItemRequestProofDto } from '../dto';
import { ItemRequestDetails, ItemRequestsRepository } from '../repositories/item-requests.repository';
import { ItemRequestDetailsWithForecast, ItemRequestQueueService } from './item-request-queue.service';

const categoryLimitExemptions = new Set(['creature of gaiety', 'elder dragon isteria', 'carnival queen']);
const categoryLimitExemptCategories = new Set(['creature']);
const updateExpiryExemptCategories = new Set(['creature']);

@Injectable()
export class ItemRequestsService {
  constructor(
    private readonly repository: ItemRequestsRepository,
    private readonly auditService: AuditService,
    private readonly imageStorage: ImageStorageService,
    private readonly notifications: NotificationService,
    private readonly queueService: ItemRequestQueueService,
    private readonly businessRules: BusinessRulesService,
  ) {}

  async createRequest(data: CreateItemRequestDto, actorId?: string): Promise<ItemRequest> {
    const quantity = Number(data.quantity);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('Quantity must be a positive integer.');
    }

    if (!data.playerId?.trim()) {
      throw new BadRequestException('playerId is required.');
    }

    const imageUrl = data.imageUrl?.trim();

    if (!imageUrl) {
      throw new BadRequestException('imageUrl is required.');
    }

    let previousImageUrl: string | undefined;
    const request = await this.repository.client.$transaction(async (tx) => {
      const player = await tx.player.findUnique({
        where: { id: data.playerId },
        include: { user: true },
      });

      if (!player || !player.isActive) {
        throw new NotFoundException(`Active player ${data.playerId} was not found.`);
      }

      const attendanceRules = await this.businessRules.getAttendanceEligibilityRules();
      if (player.attendancePercentage < attendanceRules.participationMinimumPercent) {
        throw new BadRequestException(`Minimum attendance to create an item request is ${attendanceRules.participationMinimumPercent}% in the last 30 days.`);
      }

      const item = await this.repository.findItemCatalog(data.itemCatalogId, tx);

      if (!item || !item.isActive) {
        throw new NotFoundException(`Active item ${data.itemCatalogId} was not found.`);
      }

      if (!this.isRequestableCatalogItem(item)) {
        throw new BadRequestException('This item is not available for Item Request.');
      }

      await this.validateCategoryLimit(player.user.discordId, item, tx);

      const itemName = this.itemKey(item);
      const existing = await this.repository.findByDiscordAndItem(player.user.discordId, itemName, tx);

      if (existing) {
        const updated = await this.repository.update(
          existing.id,
          {
            totalQuantity: quantity,
            remainingQuantity: quantity,
            player: { connect: { id: player.id } },
            discordId: player.user.discordId,
            playerName: player.nickname,
            imageUrl,
            warned3d: false,
            warned4d: false,
            legacyUpdatedAt: new Date(),
            threadId: data.threadId?.trim() || existing.threadId,
            threadChannelId: data.threadChannelId?.trim() || existing.threadChannelId,
          },
          tx,
        );
        previousImageUrl = existing.imageUrl && existing.imageUrl !== updated.imageUrl ? existing.imageUrl : undefined;
        await this.auditWithinTransaction(tx, 'ITEM_REQUEST_UPDATED', updated.id, actorId, { quantity, itemName });
        return updated;
      }

      const rankPosition = (await this.repository.countByItemName(itemName, tx)) + 1;
      const created = await this.repository.create(
        {
          itemCatalog: { connect: { id: item.id } },
          player: { connect: { id: player.id } },
          discordId: player.user.discordId,
          playerName: player.nickname,
          itemName,
          imageUrl,
          totalQuantity: quantity,
          remainingQuantity: quantity,
          rankPosition,
          threadId: data.threadId?.trim() || undefined,
          threadChannelId: data.threadChannelId?.trim() || undefined,
          legacyCreatedAt: new Date(),
          legacyUpdatedAt: new Date(),
        },
        tx,
      );

      await this.auditWithinTransaction(tx, 'ITEM_REQUEST_CREATED', created.id, actorId, {
        itemCatalogId: item.id,
        playerId: player.id,
        itemName,
        quantity,
        rankPosition,
      });

      return created;
    });

    await this.deleteStoredImage(previousImageUrl);
    return request;
  }

  async createSelfRequest(userId: string, data: { itemCatalogId: string; quantity: number; imageUrl?: string }): Promise<ItemRequest> {
    const user = await this.repository.client.user.findUnique({
      where: { id: userId },
      include: { players: true },
    });

    if (!user) {
      throw new NotFoundException('Authenticated user was not found.');
    }

    const player = user.players.find((row) => row.isActive) ?? user.players[0];

    if (!player) {
      throw new NotFoundException('Authenticated user does not have an active player profile.');
    }

    return this.createRequest(
      {
        itemCatalogId: data.itemCatalogId,
        quantity: data.quantity,
        imageUrl: data.imageUrl,
        playerId: player.id,
      },
      userId,
    );
  }

  async getRequestsForStaff(): Promise<ItemRequestDetailsWithForecast[]> {
    return this.queueService.enrichWithQueueContext(await this.repository.findMany());
  }

  async getPublicRankings(): Promise<ItemRequestDetailsWithForecast[]> {
    return this.queueService.enrichWithQueueContext(await this.repository.findMany());
  }

  async getRequestsForCurrentUser(userId: string): Promise<ItemRequestDetailsWithForecast[]> {
    const player = await this.getPrimaryPlayer(userId);
    return this.queueService.enrichWithQueueContext(await this.repository.findByPlayer(player.id));
  }

  async getPlayerRequests(discordId: string): Promise<ItemRequestDetailsWithForecast[]> {
    return this.queueService.enrichWithQueueContext(await this.repository.findByDiscord(discordId));
  }

  async getItemRanking(itemName: string): Promise<ItemRequestDetailsWithForecast[]> {
    return this.queueService.enrichWithQueueContext(await this.repository.findByItemName(itemName));
  }

  async markUpdated(id: string, actorId?: string): Promise<ItemRequest> {
    const updated = await this.repository.update(id, {
      legacyUpdatedAt: new Date(),
      warned3d: false,
      warned4d: false,
      updateProofStatus: ItemRequestUpdateStatus.APPROVED,
      updateProofReviewedAt: new Date(),
      updateProofReviewedById: actorId,
      lastReminderStage: null,
      lastReminderAt: null,
    });
    await this.audit('ITEM_REQUEST_PROOF_UPDATED', id, actorId, { itemName: updated.itemName });
    return updated;
  }

  async markPlayerUpdated(id: string, userId: string, data: UpdateItemRequestProofDto): Promise<ItemRequest> {
    const imageUrl = data.imageUrl?.trim();

    if (!imageUrl) {
      throw new BadRequestException('imageUrl is required.');
    }

    const player = await this.getPrimaryPlayer(userId);
    let previousUpdateProofUrl: string | undefined;

    const updated = await this.repository.client.$transaction(async (tx) => {
      const request = await this.repository.findById(id, tx);

      if (!request) {
        throw new NotFoundException(`Item request ${id} was not found.`);
      }

      if (request.playerId !== player.id) {
        throw new BadRequestException('You can only update your own item requests.');
      }

      previousUpdateProofUrl = request.updateProofImageUrl && request.updateProofImageUrl !== imageUrl ? request.updateProofImageUrl : undefined;
      const now = new Date();

      const result = await this.repository.update(
        id,
        {
          updateProofImageUrl: imageUrl,
          updateProofNote: data.note?.trim() || undefined,
          updateProofStatus: ItemRequestUpdateStatus.PENDING,
          updateProofSubmittedAt: now,
          updateProofReviewedAt: null,
          updateProofReviewedById: null,
        },
        tx,
      );

      await this.auditWithinTransaction(tx, 'ITEM_REQUEST_PLAYER_UPDATED', id, userId, {
        itemName: request.itemName,
        note: data.note?.trim() || undefined,
      });

      return result;
    });

    await this.deleteStoredImage(previousUpdateProofUrl);
    return updated;
  }

  async approvePlayerUpdate(id: string, data: ApproveItemRequestUpdateDto, actorId?: string): Promise<ItemRequest> {
    const remainingQuantity = Number(data.remainingQuantity);

    if (!Number.isInteger(remainingQuantity) || remainingQuantity <= 0) {
      throw new BadRequestException('Remaining quantity must be a positive integer.');
    }

    const updated = await this.repository.client.$transaction(async (tx) => {
      const request = await this.repository.findById(id, tx);

      if (!request) {
        throw new NotFoundException(`Item request ${id} was not found.`);
      }

      if (request.updateProofStatus !== ItemRequestUpdateStatus.PENDING || !request.updateProofImageUrl) {
        throw new BadRequestException('This item request does not have a pending player update.');
      }

      if (remainingQuantity > request.totalQuantity) {
        throw new BadRequestException('Remaining quantity cannot be greater than total quantity.');
      }

      const now = new Date();
      const result = await this.repository.update(
        id,
        {
          remainingQuantity,
          legacyUpdatedAt: now,
          warned3d: false,
          warned4d: false,
          updateProofStatus: ItemRequestUpdateStatus.APPROVED,
          updateProofReviewedAt: now,
          updateProofReviewedById: actorId,
          lastReminderStage: null,
          lastReminderAt: null,
        },
        tx,
      );

      await this.auditWithinTransaction(tx, 'ITEM_REQUEST_PLAYER_UPDATE_APPROVED', id, actorId, {
        itemName: request.itemName,
        playerName: request.playerName,
        remainingQuantity,
        previousRemainingQuantity: request.remainingQuantity,
        note: data.note?.trim() || undefined,
      });

      return result;
    });

    return updated;
  }

  async deliver(id: string, data: DeliverItemRequestDto, actorId?: string): Promise<{ delivered: number; completed: boolean }> {
    const quantity = Number(data.quantity);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('Quantity must be a positive integer.');
    }

    await this.assertMaterialPriorityAllowsDelivery(id, actorId);

    let completedImageUrl: string | undefined;
    let completedUpdateProofUrl: string | undefined;
    const result = await this.repository.client.$transaction(async (tx) => {
      const request = await this.repository.findById(id, tx);

      if (!request) {
        throw new NotFoundException(`Item request ${id} was not found.`);
      }

      const nextRemaining = request.remainingQuantity - quantity;

      if (nextRemaining > 0) {
        await this.repository.update(
          id,
          {
            remainingQuantity: nextRemaining,
            legacyUpdatedAt: new Date(),
            warned3d: false,
            warned4d: false,
            lastReminderStage: null,
            lastReminderAt: null,
          },
          tx,
        );
        await this.createDropHistory(request, quantity, actorId, tx);
        await this.auditWithinTransaction(tx, 'ITEM_REQUEST_DELIVERED_PARTIAL', id, actorId, {
          quantity,
          remainingQuantity: nextRemaining,
          reason: data.reason,
        });
        return { delivered: quantity, completed: false, promotedReminder: null };
      }

      await this.repository.delete(id, tx);
      completedImageUrl = request.imageUrl ?? undefined;
      completedUpdateProofUrl = request.updateProofImageUrl ?? undefined;
      await this.createDropHistory(request, quantity, actorId, tx);
      await this.reorderRanks(request.itemName, tx);
      const promotedReminder = await this.resetQueueAfterCompletedDelivery(request.itemName, actorId, tx);
      await this.auditWithinTransaction(tx, 'ITEM_REQUEST_DELIVERED_COMPLETE', id, actorId, {
        quantity,
        itemName: request.itemName,
        reason: data.reason,
      });

      return { delivered: quantity, completed: true, promotedReminder };
    });

    if (result.completed) {
      await this.deleteStoredImage(completedImageUrl);
      await this.deleteStoredImage(completedUpdateProofUrl);
    }

    if (result.promotedReminder) {
      await this.notifications.notifyItemRequestReminder({
        requestId: result.promotedReminder.requestId,
        discordId: result.promotedReminder.discordId,
        playerName: result.promotedReminder.playerName,
        itemName: result.promotedReminder.itemName,
        rankPosition: result.promotedReminder.rankPosition,
        stage: '3d',
        daysIdle: 3,
      });
      await this.notifications.notifyStaffItemRequestReminder({
        requestId: result.promotedReminder.requestId,
        discordId: result.promotedReminder.discordId,
        playerName: result.promotedReminder.playerName,
        itemName: result.promotedReminder.itemName,
        rankPosition: result.promotedReminder.rankPosition,
        stage: '3d',
        daysIdle: 3,
      });
    }

    return { delivered: result.delivered, completed: result.completed };
  }

  async deleteRequest(id: string, actorId?: string): Promise<void> {
    let deletedImageUrl: string | undefined;
    let deletedUpdateProofUrl: string | undefined;
    await this.repository.client.$transaction(async (tx) => {
      const request = await this.repository.findById(id, tx);

      if (!request) {
        return;
      }

      await this.repository.delete(id, tx);
      deletedImageUrl = request.imageUrl ?? undefined;
      deletedUpdateProofUrl = request.updateProofImageUrl ?? undefined;
      await this.reorderRanks(request.itemName, tx);
      await this.auditWithinTransaction(tx, 'ITEM_REQUEST_DELETED', id, actorId, {
        itemName: request.itemName,
        playerName: request.playerName,
      });
    });
    await this.deleteStoredImage(deletedImageUrl);
    await this.deleteStoredImage(deletedUpdateProofUrl);
  }

  async dropRank(id: string, actorId?: string): Promise<void> {
    const promoted = await this.repository.client.$transaction(async (tx) => {
      const request = await this.repository.findById(id, tx);

      if (!request) {
        throw new NotFoundException(`Item request ${id} was not found.`);
      }

      const below = await tx.itemRequest.findFirst({
        where: { itemName: request.itemName, rankPosition: request.rankPosition + 1 },
      });

      if (!below) {
        return null;
      }

      const now = new Date();
      const resetToD3 = new Date(now.getTime() - 3 * 86_400_000);

      await tx.itemRequest.update({
        where: { id: below.id },
        data: { rankPosition: request.rankPosition },
      });
      await tx.itemRequest.update({
        where: { id: request.id },
        data: { rankPosition: request.rankPosition + 1 },
      });
      const reset = await tx.itemRequest.updateMany({
        where: { itemName: request.itemName },
        data: {
          legacyUpdatedAt: resetToD3,
          warned3d: true,
          warned4d: false,
          lastReminderStage: '3d',
          lastReminderAt: now,
        },
      });
      await this.auditWithinTransaction(tx, 'ITEM_REQUEST_RANK_DROPPED', id, actorId, {
        itemName: request.itemName,
        playerName: request.playerName,
        from: request.rankPosition,
        to: request.rankPosition + 1,
        promotedRequestId: below.id,
        promotedPlayerName: below.playerName,
        resetCount: reset.count,
        resetToD3: resetToD3.toISOString(),
      });

      return {
        requestId: below.id,
        discordId: below.discordId,
        playerName: below.playerName,
        itemName: below.itemName,
        rankPosition: request.rankPosition,
      };
    });

    if (promoted) {
      await this.notifications.notifyItemRequestReminder({
        ...promoted,
        stage: '3d',
        daysIdle: 3,
      });
      await this.notifications.notifyStaffItemRequestReminder({
        ...promoted,
        stage: '3d',
        daysIdle: 3,
      });
    }
  }

  async processStaleRequests(now = new Date()): Promise<{ warned3d: number; warned4d: number; dropped: number }> {
    const requests = await this.repository.client.itemRequest.findMany({
      where: { rankPosition: 1 },
      include: { itemCatalog: true },
      orderBy: [{ itemName: 'asc' }, { rankPosition: 'asc' }],
    });
    const result = { warned3d: 0, warned4d: 0, dropped: 0 };

    for (const request of requests) {
      if (this.isUpdateExpiryExemptRequest(request)) {
        if (request.warned3d || request.warned4d || request.lastReminderStage || request.lastReminderAt) {
          await this.repository.update(request.id, {
            warned3d: false,
            warned4d: false,
            lastReminderStage: null,
            lastReminderAt: null,
          });
          await this.audit('ITEM_REQUEST_EXPIRY_CLEARED_FOR_BOSS', request.id, undefined, {
            itemName: request.itemName,
            category: request.itemCatalog?.category,
          });
        }
        continue;
      }

      const lastUpdate = request.legacyUpdatedAt ?? request.updatedAt ?? request.createdAt;
      const daysIdle = Math.floor((now.getTime() - lastUpdate.getTime()) / 86_400_000);

      if (daysIdle >= 5) {
        await this.notifications.notifyItemRequestReminder({
          requestId: request.id,
          discordId: request.discordId,
          playerName: request.playerName,
          itemName: request.itemName,
          stage: 'dropped',
          daysIdle,
          rankPosition: request.rankPosition + 1,
        });
        await this.notifications.notifyStaffItemRequestReminder({
          requestId: request.id,
          discordId: request.discordId,
          playerName: request.playerName,
          itemName: request.itemName,
          stage: 'dropped',
          daysIdle,
          rankPosition: request.rankPosition + 1,
        });
        await this.dropRank(request.id);
        result.dropped += 1;
        continue;
      }

      if (daysIdle >= 4 && !request.warned4d) {
        await this.notifications.notifyItemRequestReminder({
          requestId: request.id,
          discordId: request.discordId,
          playerName: request.playerName,
          itemName: request.itemName,
          stage: '4d',
          daysIdle,
          rankPosition: request.rankPosition,
        });
        await this.notifications.notifyStaffItemRequestReminder({
          requestId: request.id,
          discordId: request.discordId,
          playerName: request.playerName,
          itemName: request.itemName,
          stage: '4d',
          daysIdle,
          rankPosition: request.rankPosition,
        });
        await this.repository.update(request.id, { warned4d: true, lastReminderStage: '4d', lastReminderAt: now });
        await this.audit('ITEM_REQUEST_WARNED_4D', request.id, undefined, { itemName: request.itemName, daysIdle });
        result.warned4d += 1;
        continue;
      }

      if (daysIdle >= 3 && !request.warned3d) {
        await this.notifications.notifyItemRequestReminder({
          requestId: request.id,
          discordId: request.discordId,
          playerName: request.playerName,
          itemName: request.itemName,
          stage: '3d',
          daysIdle,
          rankPosition: request.rankPosition,
        });
        await this.notifications.notifyStaffItemRequestReminder({
          requestId: request.id,
          discordId: request.discordId,
          playerName: request.playerName,
          itemName: request.itemName,
          stage: '3d',
          daysIdle,
          rankPosition: request.rankPosition,
        });
        await this.repository.update(request.id, { warned3d: true, lastReminderStage: '3d', lastReminderAt: now });
        await this.audit('ITEM_REQUEST_WARNED_3D', request.id, undefined, { itemName: request.itemName, daysIdle });
        result.warned3d += 1;
      }
    }

    return result;
  }

  private async validateCategoryLimit(discordId: string, item: ItemCatalog, tx: Prisma.TransactionClient): Promise<void> {
    if (this.isCategoryLimitExemptItem(item)) {
      return;
    }

    const existingRequests = await this.repository.findByDiscord(discordId, tx);
    const sameCategory = existingRequests.find((request) => {
      if (this.isUpdateExpiryExemptRequest(request)) {
        return false;
      }

      return request.itemCatalog?.category === item.category && request.itemName !== this.itemKey(item);
    });

    if (sameCategory) {
      throw new BadRequestException(`Player already has an active request in category ${item.category}.`);
    }
  }

  private async reorderRanks(itemName: string, tx: Prisma.TransactionClient): Promise<void> {
    const rows = await tx.itemRequest.findMany({
      where: { itemName },
      orderBy: { rankPosition: 'asc' },
    });

    for (const [index, request] of rows.entries()) {
      await tx.itemRequest.update({
        where: { id: request.id },
        data: { rankPosition: index + 1 },
      });
    }
  }

  private async resetQueueAfterCompletedDelivery(
    itemName: string,
    actorId: string | undefined,
    tx: Prisma.TransactionClient,
  ): Promise<{
    requestId: string;
    discordId: string;
    playerName: string;
    itemName: string;
    rankPosition: number;
  } | null> {
    const firstRequest = await tx.itemRequest.findFirst({
      where: { itemName, rankPosition: 1 },
      include: { itemCatalog: true },
      orderBy: [{ rankPosition: 'asc' }, { createdAt: 'asc' }],
    });

    if (!firstRequest) {
      return null;
    }

    if (this.isUpdateExpiryExemptRequest(firstRequest)) {
      await this.auditWithinTransaction(tx, 'ITEM_REQUEST_QUEUE_RESET_SKIPPED_FOR_BOSS', firstRequest.id, actorId, {
        itemName,
        promotedPlayerName: firstRequest.playerName,
        category: firstRequest.itemCatalog?.category,
      });
      return null;
    }

    const now = new Date();
    const resetToD3 = new Date(now.getTime() - 3 * 86_400_000);
    const reset = await tx.itemRequest.updateMany({
      where: { itemName },
      data: {
        legacyUpdatedAt: resetToD3,
        warned3d: true,
        warned4d: false,
        lastReminderStage: '3d',
        lastReminderAt: now,
      },
    });

    await this.auditWithinTransaction(tx, 'ITEM_REQUEST_QUEUE_RESET_AFTER_DELIVERY', firstRequest.id, actorId, {
      itemName,
      promotedPlayerName: firstRequest.playerName,
      resetCount: reset.count,
      resetToD3: resetToD3.toISOString(),
    });

    return {
      requestId: firstRequest.id,
      discordId: firstRequest.discordId,
      playerName: firstRequest.playerName,
      itemName: firstRequest.itemName,
      rankPosition: firstRequest.rankPosition,
    };
  }

  private itemKey(item: ItemCatalog): string {
    return getRequestableCatalogKey(item);
  }

  private async assertMaterialPriorityAllowsDelivery(id: string, actorId?: string): Promise<void> {
    const request = await this.repository.findById(id);

    if (!request) {
      return;
    }

    const priorities = this.queueService.materialPrioritiesForRows(await this.repository.findMany());
    const priority = priorities.get(id);

    if (!priority?.affected) {
      return;
    }

    await this.audit('ITEM_REQUEST_T3_PRIORITY_DELIVERY_BLOCKED', id, actorId, {
      itemName: request.itemName,
      playerName: request.playerName,
      materialKey: priority.materialKey ?? null,
      blockingCraftRequests: priority.blockingCraftRequests,
      blockingRequestIds: priority.blockingRequestIds,
      blockingItemNames: priority.blockingItemNames,
      reason: priority.reason,
    });

    throw new BadRequestException(priority.staffSummaryPt);
  }

  private isRequestableCatalogItem(item: ItemCatalog): boolean {
    return item.kind === 'request'
      || requestableItemKeys.has(this.itemKey(item))
      || requestableItemCategories.has(item.category);
  }

  private isCategoryLimitExemptItem(item: ItemCatalog): boolean {
    return categoryLimitExemptions.has(this.itemKey(item))
      || Boolean(item.category && categoryLimitExemptCategories.has(item.category));
  }

  private isUpdateExpiryExemptRequest(request: Pick<ItemRequestDetails, 'itemName' | 'itemCatalog'>): boolean {
    return categoryLimitExemptions.has(request.itemName)
      || Boolean(request.itemCatalog?.category && updateExpiryExemptCategories.has(request.itemCatalog.category));
  }

  private async createDropHistory(
    request: ItemRequestDetails,
    quantity: number,
    actorId: string | undefined,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    for (let index = 0; index < quantity; index += 1) {
      await tx.dropHistory.create({
        data: {
          itemCatalogId: request.itemCatalogId,
          playerId: request.playerId,
          discordId: request.discordId,
          nicknameIngame: request.playerName,
          itemName: request.itemName,
          threadId: request.threadId,
          staffDiscordId: actorId,
          deliveredAt: new Date(),
        },
      });
    }
  }

  private async audit(action: string, targetId: string, actorId: string | undefined, metadata: Prisma.InputJsonObject): Promise<void> {
    await this.auditService.log({ actorId, action, targetType: 'ItemRequest', targetId, metadata });
  }

  private async auditWithinTransaction(
    tx: Prisma.TransactionClient,
    action: string,
    targetId: string,
    actorId: string | undefined,
    metadata: Prisma.InputJsonObject,
  ): Promise<void> {
    await this.auditService.logWithinTransaction({ actorId, action, targetType: 'ItemRequest', targetId, metadata }, tx);
  }

  private async getPrimaryPlayer(userId: string): Promise<{ id: string }> {
    const player = await this.repository.client.player.findFirst({
      where: { userId, isActive: true },
      select: { id: true },
      orderBy: { joinedAt: 'asc' },
    });

    if (!player) {
      throw new NotFoundException('Authenticated user does not have an active player profile.');
    }

    return player;
  }

  private async deleteStoredImage(imageUrl?: string): Promise<void> {
    if (!imageUrl) {
      return;
    }

    try {
      await this.imageStorage.deleteByUrl(imageUrl);
    } catch {
      await this.audit('ITEM_REQUEST_IMAGE_DELETE_FAILED', 'image-cleanup', undefined, { imageUrl });
    }
  }
}
