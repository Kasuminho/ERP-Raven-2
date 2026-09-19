import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Auction, ItemCatalog, ItemType, Prisma } from '@prisma/client';
import { AuditService } from '../../audit/services/audit.service';
import { AuctionsService } from '../../auctions/services/auctions.service';
import { BulkCreateItemsDto, CreateItemAuctionsDto, CreateItemDto, UpdateItemDto, ValidateItemsBatchDto } from '../dto';
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

  async validateItemsBatch(dto: ValidateItemsBatchDto): Promise<{
    existing: Array<{
      id: string;
      namePt: string;
      nameEn: string;
      category: string;
      itemTier: string | null;
      itemType: string | null;
      kind: string;
      isActive: boolean;
    }>;
    existingNames: string[];
  }> {
    const existing = await this.repository.findByNames(dto.names);
    const existingNames = Array.from(
      new Set(
        existing.flatMap((item) => [
          item.namePt.trim().toLowerCase(),
          item.nameEn.trim().toLowerCase(),
          ...(item.nameEs ? [item.nameEs.trim().toLowerCase()] : []),
        ]),
      ),
    );

    return {
      existing: existing.map((item) => ({
        id: item.id,
        namePt: item.namePt,
        nameEn: item.nameEn,
        category: item.category,
        itemTier: item.itemTier,
        itemType: item.itemType,
        kind: item.kind,
        isActive: item.isActive,
      })),
      existingNames,
    };
  }

  async createBulkItems(
    dto: BulkCreateItemsDto,
    actorId?: string,
  ): Promise<{
    created: ItemCatalog[];
    skipped: Array<{ name: string; reason: string }>;
    createdCount: number;
    skippedCount: number;
  }> {
    if (!dto.items || dto.items.length === 0) {
      return { created: [], skipped: [], createdCount: 0, skippedCount: 0 };
    }

    const allNames = dto.items.map((i) => i.namePt.trim()).filter(Boolean);
    const existingInDb = await this.repository.findByNames(allNames);
    const dbNames = new Set(
      existingInDb.flatMap((i) => [
        i.namePt.trim().toLowerCase(),
        i.nameEn.trim().toLowerCase(),
        ...(i.nameEs ? [i.nameEs.trim().toLowerCase()] : []),
      ]),
    );

    const toCreate: Prisma.ItemCatalogCreateInput[] = [];
    const skipped: Array<{ name: string; reason: string }> = [];
    const batchSeenNames = new Set<string>();

    for (const item of dto.items) {
      const namePt = item.namePt?.trim();
      if (!namePt) {
        skipped.push({ name: '(Vazio)', reason: 'Nome do item ausente' });
        continue;
      }

      const lowerName = namePt.toLowerCase();
      if (dbNames.has(lowerName)) {
        skipped.push({ name: namePt, reason: 'Já existe no catálogo' });
        continue;
      }

      if (batchSeenNames.has(lowerName)) {
        skipped.push({ name: namePt, reason: 'Duplicado no mesmo lote' });
        continue;
      }

      batchSeenNames.add(lowerName);

      const kind = item.kind?.trim() || (item.category?.trim().toLowerCase() === 'material' ? 'material' : 'equipment');
      const category = item.category?.trim().toLowerCase() || 'common';
      const nameEn = item.nameEn?.trim() || namePt;
      const typePt = item.typePt?.trim() || this.defaultTypePt(item.itemType, kind);
      const typeEn = item.typeEn?.trim() || this.defaultTypeEn(item.itemType, kind);

      toCreate.push({
        kind,
        category,
        itemTier: item.itemTier ?? null,
        itemType: item.itemType ?? null,
        namePt,
        nameEn,
        nameEs: item.nameEs?.trim() || undefined,
        typePt,
        typeEn,
        typeEs: item.typeEs?.trim() || undefined,
        preferredClasses: item.preferredClasses ?? [],
        image1Url: this.normalizeOptionalUrl(item.image1Url),
        image2Url: this.normalizeOptionalUrl(item.image2Url),
        isActive: true,
        diamondSaleEnabled: item.diamondSaleEnabled ?? false,
      });
    }

    const created = await this.repository.createInTransaction(toCreate);

    if (created.length > 0) {
      await this.auditService.log({
        actorId,
        action: 'ITEM_CATALOG_BULK_CREATED',
        targetType: 'ItemCatalog',
        targetId: 'bulk',
        metadata: {
          totalReceived: dto.items.length,
          createdCount: created.length,
          skippedCount: skipped.length,
          createdNames: created.map((i) => i.namePt),
          skippedNames: skipped.map((s) => s.name),
        },
      });
    }

    return {
      created,
      skipped,
      createdCount: created.length,
      skippedCount: skipped.length,
    };
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

    const category = data.category?.trim().toLowerCase();
    const kind = data.kind?.trim().toLowerCase();
    const isNonTierCategory = category === 'common' || category === 'uncommon';
    const isMaterialOrRequest = kind === 'request' || kind === 'material';

    if (!isMaterialOrRequest && !isNonTierCategory) {
      requiredFields.push('itemTier');
    }
    if (kind !== 'request' && kind !== 'material') {
      requiredFields.push('itemType');
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

  private defaultTypePt(type?: ItemType | null, kind?: string): string {
    if (kind === 'material') return 'Material';
    if (type === 'WEAPON') return 'Arma';
    if (type === 'ARMOR') return 'Armadura';
    if (type === 'ACCESSORY') return 'Acessório';
    if (type === 'CELESTIAL_STONE') return 'Pedra Celestial';
    return 'Geral';
  }

  private defaultTypeEn(type?: ItemType | null, kind?: string): string {
    if (kind === 'material') return 'Material';
    if (type === 'WEAPON') return 'Weapon';
    if (type === 'ARMOR') return 'Armor';
    if (type === 'ACCESSORY') return 'Accessory';
    if (type === 'CELESTIAL_STONE') return 'Celestial Stone';
    return 'General';
  }
}
