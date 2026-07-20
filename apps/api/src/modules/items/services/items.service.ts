import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Auction, ItemCatalog } from '@prisma/client';
import { AuditService } from '../../audit/services/audit.service';
import { AuctionsService } from '../../auctions/services/auctions.service';
import { CreateItemAuctionsDto, CreateItemDto, UpdateItemDto } from '../dto';
import { ItemsRepository } from '../repositories/items.repository';
import { getRequestableCatalogKey, requestableItems } from '../requestable-items';

@Injectable()
export class ItemsService {
  constructor(
    private readonly repository: ItemsRepository,
    private readonly auctionsService: AuctionsService,
    private readonly auditService: AuditService,
  ) {}

  health(): { module: string; ready: boolean } {
    return this.repository.health();
  }

  async createItem(data: CreateItemDto): Promise<ItemCatalog> {
    this.validateItemPayload(data);

    const item = await this.repository.create({
      kind: data.kind.trim(),
      category: data.category.trim(),
      itemTier: data.itemTier,
      itemType: data.itemType,
      namePt: data.namePt.trim(),
      nameEn: data.nameEn.trim(),
      nameEs: data.nameEs?.trim() || undefined,
      typePt: data.typePt.trim(),
      typeEn: data.typeEn.trim(),
      typeEs: data.typeEs?.trim() || undefined,
      preferredClasses: data.preferredClasses ?? [],
      image1Url: this.normalizeOptionalUrl(data.image1Url),
      image2Url: this.normalizeOptionalUrl(data.image2Url),
      isActive: true,
      diamondSaleEnabled: data.diamondSaleEnabled ?? false,
    });

    await this.auditService.log({
      actorId: data.createdById,
      action: 'ITEM_CATALOG_CREATED',
      targetType: 'ItemCatalog',
      targetId: item.id,
      metadata: {
        itemTier: item.itemTier,
        itemType: item.itemType,
        namePt: item.namePt,
        nameEn: item.nameEn,
        nameEs: item.nameEs,
        preferredClasses: item.preferredClasses,
        image1Url: item.image1Url,
        image2Url: item.image2Url,
      },
    });

    return item;
  }

  async getItems(options: { activeOnly?: boolean; page?: number; limit?: number; search?: string } = {}): Promise<ItemCatalog[]> {
    return this.repository.findMany(options);
  }

  async getRequestableItems(): Promise<ItemCatalog[]> {
    await this.ensureRequestableCatalog();
    const items = await this.repository.findRequestable();
    const uniqueItems = new Map<string, ItemCatalog>();

    for (const item of items) {
      uniqueItems.set(getRequestableCatalogKey(item), item);
    }

    return Array.from(uniqueItems.values());
  }

  async getItem(id: string): Promise<ItemCatalog> {
    const item = await this.repository.findById(id);

    if (!item) {
      throw new NotFoundException(`Item ${id} was not found.`);
    }

    return item;
  }

  async updateItem(id: string, data: UpdateItemDto): Promise<ItemCatalog> {
    const existing = await this.getItem(id);
    const next = {
      kind: data.kind ?? existing.kind,
      category: data.category ?? existing.category,
      itemTier: data.itemTier ?? existing.itemTier,
      itemType: data.itemType ?? existing.itemType,
      namePt: data.namePt ?? existing.namePt,
      nameEn: data.nameEn ?? existing.nameEn,
      nameEs: data.nameEs ?? existing.nameEs ?? undefined,
      typePt: data.typePt ?? existing.typePt,
      typeEn: data.typeEn ?? existing.typeEn,
      typeEs: data.typeEs ?? existing.typeEs ?? undefined,
      preferredClasses: data.preferredClasses ?? existing.preferredClasses,
      image1Url: data.image1Url ?? existing.image1Url ?? undefined,
      image2Url: data.image2Url ?? existing.image2Url ?? undefined,
    };

    this.validateItemPayload(next as CreateItemDto);

    const updated = await this.repository.update(id, {
      kind: next.kind.trim(),
      category: next.category.trim(),
      itemTier: next.itemTier,
      itemType: next.itemType,
      namePt: next.namePt.trim(),
      nameEn: next.nameEn.trim(),
      nameEs: next.nameEs?.trim() || undefined,
      typePt: next.typePt.trim(),
      typeEn: next.typeEn.trim(),
      typeEs: next.typeEs?.trim() || undefined,
      preferredClasses: next.preferredClasses,
      image1Url: this.normalizeOptionalUrl(next.image1Url),
      image2Url: this.normalizeOptionalUrl(next.image2Url),
      isActive: data.isActive,
      diamondSaleEnabled: data.diamondSaleEnabled,
    });

    await this.auditService.log({
      actorId: data.updatedById,
      action: 'ITEM_CATALOG_UPDATED',
      targetType: 'ItemCatalog',
      targetId: updated.id,
      metadata: {
        previous: {
          kind: existing.kind,
          category: existing.category,
          itemTier: existing.itemTier,
          itemType: existing.itemType,
          namePt: existing.namePt,
          nameEn: existing.nameEn,
          nameEs: existing.nameEs,
          preferredClasses: existing.preferredClasses,
          diamondSaleEnabled: existing.diamondSaleEnabled,
        },
        next: {
          kind: updated.kind,
          category: updated.category,
          itemTier: updated.itemTier,
          itemType: updated.itemType,
          namePt: updated.namePt,
          nameEn: updated.nameEn,
          nameEs: updated.nameEs,
          preferredClasses: updated.preferredClasses,
          diamondSaleEnabled: updated.diamondSaleEnabled,
        },
      },
    });

    return updated;
  }

  async createAuctionsFromItem(itemId: string, data: CreateItemAuctionsDto): Promise<Auction[]> {
    const quantity = this.normalizeAuctionQuantity(data.quantity);

    this.validateAuctionQuantity(quantity);

    if (!data.createdById) {
      throw new BadRequestException('createdById is required.');
    }

    const item = await this.getItem(itemId);

    if (!item.isActive) {
      throw new BadRequestException('Inactive items cannot open auctions.');
    }

    if (!item.itemTier || !item.itemType) {
      throw new BadRequestException('Item must have itemTier and itemType before opening auctions.');
    }

    const auctions: Auction[] = [];
    const itemName = this.formatAuctionItemName(item);

    for (let index = 0; index < quantity; index += 1) {
      auctions.push(
        await this.auctionsService.createAuction({
          itemCatalogId: item.id,
          itemName: quantity > 1 ? `${itemName} #${index + 1}` : itemName,
          itemType: item.itemType,
          itemTier: item.itemTier,
          createdById: data.createdById,
        }),
      );
    }

    await this.auditService.log({
      actorId: data.createdById,
      action: 'ITEM_CATALOG_AUCTIONS_CREATED',
      targetType: 'ItemCatalog',
      targetId: item.id,
      metadata: {
        quantity,
        auctionIds: auctions.map((auction) => auction.id),
      },
    });

    return auctions;
  }

  private validateItemPayload(data: CreateItemDto): void {
    const requiredFields: Array<keyof CreateItemDto> = ['kind', 'category', 'namePt', 'nameEn', 'typePt', 'typeEn'];

    if (data.kind !== 'request') {
      requiredFields.push('itemTier', 'itemType');
    }

    const missing = requiredFields.filter((field) => !String(data[field] ?? '').trim());

    if (missing.length > 0) {
      throw new BadRequestException(`Missing required item fields: ${missing.join(', ')}.`);
    }

    for (const url of [data.image1Url, data.image2Url]) {
      const normalized = this.normalizeOptionalUrl(url);

      if (normalized && !/^https?:\/\//i.test(normalized) && !normalized.startsWith('/uploads/')) {
        throw new BadRequestException('Image URLs must be absolute HTTP/HTTPS URLs or local upload paths.');
      }
    }
  }

  private normalizeAuctionQuantity(value: unknown): number {
    if (value === undefined || value === null || value === '') {
      return 1;
    }

    return Number(value);
  }

  private validateAuctionQuantity(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      throw new BadRequestException('Quantity must be an integer between 1 and 20.');
    }
  }

  private normalizeOptionalUrl(value?: string): string | undefined {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
  }

  private formatAuctionItemName(item: ItemCatalog): string {
    if (item.namePt.trim().toLowerCase() === item.nameEn.trim().toLowerCase()) {
      return item.nameEn;
    }

    return `${item.namePt} / ${item.nameEn}`;
  }

  private async ensureRequestableCatalog(): Promise<void> {
    for (const item of requestableItems) {
      const existing = await this.repository.findRequestableByKey(item.nameEn);

      const data = {
        kind: 'request',
        category: item.category,
        namePt: item.namePt,
        nameEn: item.nameEn,
        nameEs: item.nameEs,
        typePt: item.typePt,
        typeEn: item.typeEn,
        typeEs: item.typeEs,
        isActive: true,
      };

      if (existing) {
        await this.repository.update(existing.id, data);
        continue;
      }

      await this.repository.create(data);
    }
  }
}
