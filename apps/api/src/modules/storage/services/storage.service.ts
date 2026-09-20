import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GuildStorageItem } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { AuditService } from '../../audit/services/audit.service';
import { ItemRequestsService } from '../../item-requests/services/item-requests.service';
import { ItemsService } from '../../items/services/items.service';
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
    private readonly itemsService: ItemsService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
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
  }> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Nenhum item informado para importação.');
    }

    let createdCount = 0;
    let updatedCount = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const trimmedName = item.itemName.trim();
        const existing = await tx.guildStorageItem.findFirst({
          where: { itemName: { equals: trimmedName, mode: 'insensitive' } },
        });

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

          await tx.guildStorageItem.create({
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
          items: dto.items.map((i) => ({ name: i.itemName, qty: i.quantity })),
        },
      });
    });

    return {
      importedCount: dto.items.length,
      createdCount,
      updatedCount,
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
}
