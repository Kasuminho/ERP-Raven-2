import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { GuildStorageItem, StorageRequestStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { AuditService } from '../../audit/services/audit.service';
import { NotificationService } from '../../discord/services/notification.service';
import { ItemRequestsService } from '../../item-requests/services/item-requests.service';
import { ItemsService } from '../../items/services/items.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { DispatchStorageItemDto, ImportStorageItemsDto, ScanOcrDto, UpdateStorageItemDto } from '../dto';
import { StorageRepository } from '../repositories/storage.repository';
import { GeminiOcrService, ScannedItemResult } from './gemini-ocr.service';

export interface StorageQueueWaiter {
  requestId: string;
  playerId?: string;
  playerName: string;
  playerNickname?: string;
  playerClass?: string;
  attendancePercentage: number;
  rankPosition: number;
  remainingQuantity: number;
  totalQuantity: number;
  createdAt: Date;
}

export interface StorageItemWithQueue extends GuildStorageItem {
  queueCount: number;
  queueWaiters: StorageQueueWaiter[];
  itemCatalog?: any;
}

@Injectable()
export class StorageService {
  constructor(
    private readonly repository: StorageRepository,
    private readonly geminiOcrService: GeminiOcrService,
    private readonly itemRequestsService: ItemRequestsService,
    @Inject(forwardRef(() => ItemsService))
    private readonly itemsService: ItemsService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getStorageItems(options?: { search?: string; category?: string; kind?: string }): Promise<{
    items: StorageItemWithQueue[];
    totalUnits: number;
    totalUniqueItems: number;
    totalQueueAlerts: number;
  }> {
    const rawItems = await this.repository.findMany(options);

    // Fetch active item requests
    const activeRequests = await this.prisma.itemRequest.findMany({
      where: { remainingQuantity: { gt: 0 } },
      include: {
        player: {
          select: {
            id: true,
            nickname: true,
            class: true,
            attendancePercentage: true,
            isActive: true,
          },
        },
      },
      orderBy: [{ rankPosition: 'asc' }, { createdAt: 'asc' }],
    });

    let totalUnits = 0;
    let totalQueueAlerts = 0;

    const itemsWithQueue: StorageItemWithQueue[] = rawItems.map((item) => {
      totalUnits += item.quantity;

      const lowerName = item.itemName.trim().toLowerCase();
      const matchingRequests = activeRequests.filter((req) => {
        if (item.itemCatalogId && req.itemCatalogId === item.itemCatalogId) return true;
        return req.itemName.trim().toLowerCase() === lowerName;
      });

      const queueWaiters: StorageQueueWaiter[] = matchingRequests.map((req) => ({
        requestId: req.id,
        playerId: req.player?.id,
        playerName: req.playerName,
        playerNickname: req.player?.nickname,
        playerClass: req.player?.class,
        attendancePercentage: req.player?.attendancePercentage ?? 0,
        rankPosition: req.rankPosition,
        remainingQuantity: req.remainingQuantity,
        totalQuantity: req.totalQuantity,
        createdAt: req.createdAt,
      }));

      // Sort by attendance descending (priority), then rank position ascending
      queueWaiters.sort((a, b) => {
        if (b.attendancePercentage !== a.attendancePercentage) {
          return b.attendancePercentage - a.attendancePercentage;
        }
        return a.rankPosition - b.rankPosition;
      });

      if (queueWaiters.length > 0 && item.quantity > 0) {
        totalQueueAlerts += 1;
      }

      return {
        ...item,
        queueCount: queueWaiters.length,
        queueWaiters,
      };
    });

    return {
      items: itemsWithQueue,
      totalUnits,
      totalUniqueItems: itemsWithQueue.length,
      totalQueueAlerts,
    };
  }

  async scanStoragePrints(dto: ScanOcrDto): Promise<{
    scannedItems: Array<
      ScannedItemResult & {
        catalogId?: string;
        catalogMatched: boolean;
        queueAlertCount: number;
      }
    >;
    totalScannedUnits: number;
    totalPrintsProcessed: number;
  }> {
    const rawScanned = await this.geminiOcrService.scanBatch(dto.images, dto.apiKey);

    // Aggregate items across multiple prints by itemName
    const aggregatedMap = new Map<string, ScannedItemResult>();

    for (const item of rawScanned) {
      const key = item.itemName.trim().toLowerCase();
      const existing = aggregatedMap.get(key);

      if (existing) {
        existing.quantity += item.quantity;
        if (!existing.acquisitionInfo && item.acquisitionInfo) {
          existing.acquisitionInfo = item.acquisitionInfo;
        }
        if (!existing.acquisitionDate && item.acquisitionDate) {
          existing.acquisitionDate = item.acquisitionDate;
        }
      } else {
        aggregatedMap.set(key, { ...item });
      }
    }

    const uniqueItems = Array.from(aggregatedMap.values());

    // Check catalog and active queues
    const allNames = uniqueItems.map((i) => i.itemName);
    const existingCatalog = await this.itemsService.validateItemsBatch({ names: allNames });
    const catalogMap = new Map<string, string>();
    for (const cat of existingCatalog.existing) {
      catalogMap.set(cat.namePt.trim().toLowerCase(), cat.id);
      catalogMap.set(cat.nameEn.trim().toLowerCase(), cat.id);
    }

    const activeRequests = await this.prisma.itemRequest.findMany({
      where: { remainingQuantity: { gt: 0 } },
      select: { itemName: true, itemCatalogId: true },
    });

    let totalUnits = 0;
    const finalScanned = uniqueItems.map((item) => {
      totalUnits += item.quantity;
      const lower = item.itemName.trim().toLowerCase();
      const catId = catalogMap.get(lower);

      const queueCount = activeRequests.filter((r) => {
        if (catId && r.itemCatalogId === catId) return true;
        return r.itemName.trim().toLowerCase() === lower;
      }).length;

      return {
        ...item,
        catalogId: catId,
        catalogMatched: Boolean(catId),
        queueAlertCount: queueCount,
      };
    });

    return {
      scannedItems: finalScanned,
      totalScannedUnits: totalUnits,
      totalPrintsProcessed: dto.images.length,
    };
  }

  async importItems(
    dto: ImportStorageItemsDto,
    actorId?: string,
  ): Promise<{
    importedCount: number;
    updatedCount: number;
    createdCount: number;
    skippedDuplicatesCount: number;
  }> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Nenhum item informado para importação.');
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedDuplicatesCount = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const trimmedName = item.itemName.trim();
        const existing = await tx.guildStorageItem.findFirst({
          where: { itemName: { equals: trimmedName, mode: 'insensitive' } },
        });

        let parsedAcquisitionDate: Date | null = null;
        if (item.acquisitionDate) {
          const d = new Date(item.acquisitionDate);
          if (!isNaN(d.getTime())) {
            parsedAcquisitionDate = d;
          }
        }

        // Deduplicação: se tem acquisitionDate e acquisitionInfo
        if (existing && item.acquisitionDate && item.acquisitionInfo) {
          const existingEntry = await tx.guildStorageEntry.findFirst({
            where: {
              storageItemId: existing.id,
              acquisitionDate: parsedAcquisitionDate,
              acquisitionInfo: item.acquisitionInfo,
            },
          });

          if (existingEntry) {
            skippedDuplicatesCount += 1;
            continue;
          }
        }

        if (existing) {
          await tx.guildStorageItem.update({
            where: { id: existing.id },
            data: {
              quantity: existing.quantity + item.quantity,
              source: item.source || existing.source,
              category: item.category || existing.category,
              itemType: item.itemType || existing.itemType,
              kind: item.kind || existing.kind,
              lastImportAt: new Date(),
            },
          });

          if (item.acquisitionDate || item.acquisitionInfo) {
            await tx.guildStorageEntry.create({
              data: {
                storageItemId: existing.id,
                itemName: existing.itemName,
                quantity: item.quantity,
                acquisitionDate: parsedAcquisitionDate,
                acquisitionInfo: item.acquisitionInfo,
                source: item.source || existing.source,
              },
            });
          }

          updatedCount += 1;
        } else {
          // Find matching catalog item if any
          const catalog = await tx.itemCatalog.findFirst({
            where: {
              OR: [
                { namePt: { equals: trimmedName, mode: 'insensitive' } },
                { nameEn: { equals: trimmedName, mode: 'insensitive' } },
              ],
            },
          });

          const created = await tx.guildStorageItem.create({
            data: {
              itemName: trimmedName,
              quantity: item.quantity,
              category: item.category || catalog?.category || 'common',
              itemTier: item.itemTier || catalog?.itemTier || null,
              itemType: item.itemType || catalog?.itemType || null,
              kind: item.kind || catalog?.kind || 'equipment',
              source: item.source,
              itemCatalogId: catalog?.id,
              lastImportAt: new Date(),
            },
          });

          if (item.acquisitionDate || item.acquisitionInfo) {
            await tx.guildStorageEntry.create({
              data: {
                storageItemId: created.id,
                itemName: created.itemName,
                quantity: item.quantity,
                acquisitionDate: parsedAcquisitionDate,
                acquisitionInfo: item.acquisitionInfo,
                source: item.source,
              },
            });
          }

          createdCount += 1;
        }
      }

      await this.auditService.log({
        actorId,
        action: 'GUILD_STORAGE_IMPORTED',
        targetType: 'GuildStorageItem',
        targetId: 'batch',
        metadata: {
          itemsCount: dto.items.length,
          createdCount,
          updatedCount,
          skippedDuplicatesCount,
          items: dto.items.map((i) => ({ name: i.itemName, qty: i.quantity })),
        },
      });
    });

    return {
      importedCount: dto.items.length,
      createdCount,
      updatedCount,
      skippedDuplicatesCount,
    };
  }

  async dispatchItem(
    dto: DispatchStorageItemDto,
    actorId: string,
  ): Promise<{
    deliveredQuantity: number;
    remainingStock: number;
    requestCompleted: boolean;
  }> {
    const storageItem = await this.repository.findById(dto.storageItemId);
    if (!storageItem) {
      throw new NotFoundException('Item do baú não encontrado.');
    }

    if (storageItem.quantity < dto.quantity) {
      throw new BadRequestException(
        `Estoque insuficiente no baú. Disponível: ${storageItem.quantity}, solicitado: ${dto.quantity}.`,
      );
    }

    const request = await this.prisma.itemRequest.findUnique({
      where: { id: dto.requestId },
      include: { player: true },
    });

    if (!request || request.remainingQuantity <= 0) {
      throw new NotFoundException('Pedido de item não encontrado ou já concluído.');
    }

    const quantityToDeliver = Math.min(dto.quantity, request.remainingQuantity);
    const newStock = storageItem.quantity - quantityToDeliver;

    // Execute delivery through ItemRequestsService
    const deliveryResult = await this.itemRequestsService.deliver(
      dto.requestId,
      {
        quantity: quantityToDeliver,
        reason: dto.reason || 'Envio manual e baixa direta via Baú da Guilda',
      },
      actorId,
    );

    // Update storage stock
    if (newStock <= 0) {
      await this.repository.delete(storageItem.id);
    } else {
      await this.repository.update(storageItem.id, { quantity: newStock });
    }

    await this.auditService.log({
      actorId,
      action: 'GUILD_STORAGE_DISPATCHED',
      targetType: 'GuildStorageItem',
      targetId: storageItem.id,
      metadata: {
        storageItemId: storageItem.id,
        itemName: storageItem.itemName,
        requestId: dto.requestId,
        playerId: request.playerId,
        playerName: request.playerName,
        deliveredQuantity: quantityToDeliver,
        remainingStock: newStock,
        attendancePercentage: request.player?.attendancePercentage,
      },
    });

    return {
      deliveredQuantity: quantityToDeliver,
      remainingStock: newStock,
      requestCompleted: deliveryResult.completed,
    };
  }

  async updateItem(id: string, dto: UpdateStorageItemDto, actorId?: string): Promise<GuildStorageItem> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException('Item do baú não encontrado.');
    }

    const updated = await this.repository.update(id, {
      ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
      ...(dto.source !== undefined ? { source: dto.source } : {}),
    });

    await this.auditService.log({
      actorId,
      action: 'GUILD_STORAGE_ITEM_UPDATED',
      targetType: 'GuildStorageItem',
      targetId: id,
      metadata: {
        previousQuantity: existing.quantity,
        newQuantity: updated.quantity,
      },
    });

    return updated;
  }

  async deleteItem(id: string, actorId?: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException('Item do baú não encontrado.');
    }

    await this.repository.delete(id);

    await this.auditService.log({
      actorId,
      action: 'GUILD_STORAGE_ITEM_DELETED',
      targetType: 'GuildStorageItem',
      targetId: id,
      metadata: { itemName: existing.itemName, quantity: existing.quantity },
    });
  }

  async getGeminiConfig(): Promise<{ hasConfiguredKey: boolean }> {
    const hasKey = await this.geminiOcrService.hasConfiguredKey();
    return { hasConfiguredKey: hasKey };
  }

  async setGeminiConfig(apiKey: string, actorId?: string): Promise<{ success: boolean }> {
    await this.geminiOcrService.setApiKey(apiKey, actorId);
    return { success: true };
  }

  async createStorageRequest(
    userId: string,
    data: { storageItemId: string; quantity: number; playerNote?: string },
  ) {
    const player = await this.prisma.player.findFirst({
      where: { userId, isActive: true },
      select: {
        id: true,
        nickname: true,
        class: true,
        attendancePercentage: true,
        user: { select: { discordId: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    if (!player) {
      throw new NotFoundException('Player ativo não encontrado para este usuário.');
    }

    const pendingCount = await this.prisma.guildStorageRequest.count({
      where: {
        playerId: player.id,
        status: StorageRequestStatus.PENDING,
      },
    });

    if (pendingCount >= 5) {
      throw new BadRequestException(
        'Você já possui 5 solicitações ativas no Baú da Guilda. Aguarde a Staff enviar ou rejeitar para solicitar novos itens.',
      );
    }

    const storageItem = await this.prisma.guildStorageItem.findUnique({
      where: { id: data.storageItemId },
    });

    if (!storageItem) {
      throw new NotFoundException('Item do baú não encontrado.');
    }

    if (storageItem.quantity <= 0) {
      throw new BadRequestException('Item sem estoque disponível no Baú da Guilda.');
    }

    if (!data.quantity || data.quantity <= 0) {
      throw new BadRequestException('A quantidade solicitada deve ser maior que zero.');
    }

    const request = await this.prisma.guildStorageRequest.create({
      data: {
        storageItemId: storageItem.id,
        playerId: player.id,
        quantity: data.quantity,
        playerNote: data.playerNote?.trim() || null,
        status: StorageRequestStatus.PENDING,
      },
      include: {
        storageItem: true,
        player: true,
      },
    });

    await this.notificationService.notifyStorageItemRequested({
      requestId: request.id,
      itemName: storageItem.itemName,
      quantity: data.quantity,
      playerName: player.nickname,
      discordId: player.user?.discordId ?? undefined,
      currentStock: storageItem.quantity,
      playerClass: player.class,
      attendancePercentage: player.attendancePercentage ?? 0,
      playerNote: data.playerNote,
    });

    return request;
  }

  async getMyRequests(userId: string) {
    const player = await this.prisma.player.findFirst({
      where: { userId, isActive: true },
      select: { id: true },
      orderBy: { joinedAt: 'asc' },
    });

    if (!player) {
      return {
        requests: [],
        summary: {
          activeCount: 0,
          maxAllowed: 5,
          canRequestMore: false,
        },
      };
    }

    const requests = await this.prisma.guildStorageRequest.findMany({
      where: { playerId: player.id },
      include: {
        storageItem: true,
        deliveredBy: { select: { id: true, discordUsername: true } },
        rejectedBy: { select: { id: true, discordUsername: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const activeCount = requests.filter((r) => r.status === StorageRequestStatus.PENDING).length;

    return {
      requests,
      summary: {
        activeCount,
        maxAllowed: 5,
        canRequestMore: activeCount < 5,
      },
    };
  }

  async cancelMyRequest(userId: string, requestId: string) {
    const player = await this.prisma.player.findFirst({
      where: { userId, isActive: true },
      select: { id: true },
      orderBy: { joinedAt: 'asc' },
    });

    if (!player) {
      throw new NotFoundException('Player ativo não encontrado para este usuário.');
    }

    const request = await this.prisma.guildStorageRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.playerId !== player.id) {
      throw new NotFoundException('Solicitação não encontrada.');
    }

    if (request.status !== StorageRequestStatus.PENDING) {
      throw new BadRequestException('Apenas solicitações pendentes podem ser canceladas.');
    }

    return this.prisma.guildStorageRequest.update({
      where: { id: requestId },
      data: { status: StorageRequestStatus.CANCELLED },
      include: {
        storageItem: true,
      },
    });
  }

  async getStaffRequests() {
    return this.prisma.guildStorageRequest.findMany({
      where: { status: StorageRequestStatus.PENDING },
      include: {
        player: {
          select: {
            id: true,
            nickname: true,
            class: true,
            attendancePercentage: true,
          },
        },
        storageItem: {
          select: {
            id: true,
            itemName: true,
            category: true,
            quantity: true,
            itemTier: true,
            itemType: true,
            kind: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async dispatchStorageRequest(actorId: string, requestId: string, staffNote?: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const request = await tx.guildStorageRequest.findUnique({
        where: { id: requestId },
        include: {
          storageItem: true,
          player: {
            select: {
              id: true,
              userId: true,
              nickname: true,
              user: { select: { discordId: true } },
            },
          },
        },
      });

      if (!request) {
        throw new NotFoundException('Solicitação não encontrada.');
      }

      if (request.status !== StorageRequestStatus.PENDING) {
        throw new BadRequestException('Apenas solicitações pendentes podem ser despachadas.');
      }

      if (request.storageItem.quantity < request.quantity) {
        throw new BadRequestException(
          `Estoque insuficiente no baú. Disponível: ${request.storageItem.quantity}, solicitado: ${request.quantity}.`,
        );
      }

      const updatedStock = request.storageItem.quantity - request.quantity;
      await tx.guildStorageItem.update({
        where: { id: request.storageItemId },
        data: { quantity: updatedStock },
      });

      const updatedRequest = await tx.guildStorageRequest.update({
        where: { id: requestId },
        data: {
          status: StorageRequestStatus.DELIVERED,
          deliveredAt: new Date(),
          deliveredById: actorId,
          staffNote: staffNote?.trim() || null,
        },
        include: {
          storageItem: true,
          player: true,
        },
      });

      await this.auditService.log({
        actorId,
        action: 'GUILD_STORAGE_REQUEST_DELIVERED',
        targetType: 'GuildStorageRequest',
        targetId: requestId,
        metadata: {
          requestId,
          playerId: request.playerId,
          playerName: request.player.nickname,
          itemName: request.storageItem.itemName,
          quantity: request.quantity,
          staffNote,
        },
      });

      return { updatedRequest, request };
    });

    const { updatedRequest, request } = result;

    await this.notificationService.notifyStorageItemDispatched({
      requestId: request.id,
      itemName: request.storageItem.itemName,
      quantity: request.quantity,
      playerName: request.player.nickname,
      discordId: request.player.user?.discordId ?? undefined,
      staffName: staffNote,
    });

    await this.notificationsService.createForPlayer({
      playerId: request.playerId,
      type: 'STORAGE_REQUEST_DELIVERED',
      title: 'Item do Baú Entregue!',
      body: `Seu pedido de ${request.quantity}x ${request.storageItem.itemName} foi enviado pela Staff.${staffNote ? ` Nota: ${staffNote}` : ''}`,
      href: '/dashboard/storage',
      metadata: {
        requestId: request.id,
        itemName: request.storageItem.itemName,
        quantity: request.quantity,
      },
    });

    return updatedRequest;
  }

  async rejectStorageRequest(actorId: string, requestId: string, staffNote?: string) {
    const request = await this.prisma.guildStorageRequest.findUnique({
      where: { id: requestId },
      include: {
        storageItem: true,
        player: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Solicitação não encontrada.');
    }

    if (request.status !== StorageRequestStatus.PENDING) {
      throw new BadRequestException('Apenas solicitações pendentes podem ser rejeitadas.');
    }

    const updatedRequest = await this.prisma.guildStorageRequest.update({
      where: { id: requestId },
      data: {
        status: StorageRequestStatus.REJECTED,
        rejectedAt: new Date(),
        rejectedById: actorId,
        staffNote: staffNote?.trim() || null,
      },
      include: {
        storageItem: true,
        player: true,
      },
    });

    await this.auditService.log({
      actorId,
      action: 'GUILD_STORAGE_REQUEST_REJECTED',
      targetType: 'GuildStorageRequest',
      targetId: requestId,
      metadata: {
        requestId,
        playerId: request.playerId,
        playerName: request.player.nickname,
        itemName: request.storageItem.itemName,
        quantity: request.quantity,
        staffNote,
      },
    });

    await this.notificationsService.createForPlayer({
      playerId: request.playerId,
      type: 'STORAGE_REQUEST_REJECTED',
      title: 'Item do Baú Recusado',
      body: `Seu pedido de ${request.quantity}x ${request.storageItem.itemName} foi recusado pela Staff.${staffNote ? ` Motivo: ${staffNote}` : ''}`,
      href: '/dashboard/storage',
      metadata: {
        requestId: request.id,
        itemName: request.storageItem.itemName,
        quantity: request.quantity,
      },
    });

    return updatedRequest;
  }
}
