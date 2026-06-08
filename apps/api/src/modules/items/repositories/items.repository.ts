import { Injectable } from '@nestjs/common';
import { ItemCatalog, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';

type ItemClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class ItemsRepository {
  constructor(private readonly prisma: PrismaService) {}

  health(): { module: string; ready: boolean } {
    return { module: 'items', ready: true };
  }

  async create(data: Prisma.ItemCatalogCreateInput, client: ItemClient = this.prisma): Promise<ItemCatalog> {
    return client.itemCatalog.create({ data });
  }

  async update(id: string, data: Prisma.ItemCatalogUpdateInput, client: ItemClient = this.prisma): Promise<ItemCatalog> {
    return client.itemCatalog.update({
      where: { id },
      data,
    });
  }

  async findMany(
    options: { activeOnly?: boolean; page?: number; limit?: number; search?: string } = {},
    client: ItemClient = this.prisma,
  ): Promise<ItemCatalog[]> {
    const page = Number.isInteger(options.page) && Number(options.page) > 0 ? Number(options.page) : 1;
    const limit = Number.isInteger(options.limit) && Number(options.limit) > 0 ? Math.min(Number(options.limit), 500) : 250;
    const search = options.search?.trim();

    return client.itemCatalog.findMany({
      where: {
        ...(options.activeOnly ? { isActive: true } : {}),
        ...(search
          ? {
              OR: [
                { namePt: { contains: search, mode: 'insensitive' } },
                { nameEn: { contains: search, mode: 'insensitive' } },
                { nameEs: { contains: search, mode: 'insensitive' } },
                { typePt: { contains: search, mode: 'insensitive' } },
                { typeEn: { contains: search, mode: 'insensitive' } },
                { typeEs: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ isActive: 'desc' }, { namePt: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findActive(client: ItemClient = this.prisma): Promise<ItemCatalog[]> {
    return client.itemCatalog.findMany({
      where: { isActive: true },
      orderBy: [{ itemTier: 'asc' }, { namePt: 'asc' }],
    });
  }

  async findRequestable(client: ItemClient = this.prisma): Promise<ItemCatalog[]> {
    return client.itemCatalog.findMany({
      where: {
        isActive: true,
        kind: 'request',
      },
      orderBy: [{ category: 'asc' }, { namePt: 'asc' }],
    });
  }

  async findRequestableByKey(key: string, client: ItemClient = this.prisma): Promise<ItemCatalog | null> {
    return client.itemCatalog.findFirst({
      where: {
        kind: 'request',
        nameEn: {
          equals: key,
          mode: 'insensitive',
        },
      },
    });
  }

  async findById(id: string, client: ItemClient = this.prisma): Promise<ItemCatalog | null> {
    return client.itemCatalog.findUnique({
      where: { id },
    });
  }
}
