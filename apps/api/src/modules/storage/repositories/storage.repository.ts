import { Injectable } from '@nestjs/common';
import { GuildStorageItem, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';

type StorageClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class StorageRepository {
  constructor(private readonly prisma: PrismaService) {}

  get client(): PrismaService {
    return this.prisma;
  }

  async findMany(
    options: { search?: string; category?: string; kind?: string } = {},
    client: StorageClient = this.prisma,
  ): Promise<GuildStorageItem[]> {
    const search = options.search?.trim();

    return client.guildStorageItem.findMany({
      where: {
        ...(options.category && options.category !== 'all' ? { category: options.category } : {}),
        ...(options.kind && options.kind !== 'all' ? { kind: options.kind } : {}),
        ...(search
          ? {
              OR: [
                { itemName: { contains: search, mode: 'insensitive' } },
                { source: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        itemCatalog: {
          select: {
            id: true,
            namePt: true,
            nameEn: true,
            category: true,
            itemTier: true,
            itemType: true,
            image1Url: true,
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { itemName: 'asc' }],
    });
  }

  async findById(id: string, client: StorageClient = this.prisma): Promise<GuildStorageItem | null> {
    return client.guildStorageItem.findUnique({
      where: { id },
      include: {
        itemCatalog: true,
      },
    });
  }

  async findByName(name: string, client: StorageClient = this.prisma): Promise<GuildStorageItem | null> {
    const trimmed = name.trim();
    return client.guildStorageItem.findFirst({
      where: {
        itemName: { equals: trimmed, mode: 'insensitive' },
      },
    });
  }

  async create(data: Prisma.GuildStorageItemCreateInput, client: StorageClient = this.prisma): Promise<GuildStorageItem> {
    return client.guildStorageItem.create({ data });
  }

  async update(id: string, data: Prisma.GuildStorageItemUpdateInput, client: StorageClient = this.prisma): Promise<GuildStorageItem> {
    return client.guildStorageItem.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, client: StorageClient = this.prisma): Promise<GuildStorageItem> {
    return client.guildStorageItem.delete({
      where: { id },
    });
  }
}
