import { Injectable } from '@nestjs/common';
import { ItemRequest, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';

type ItemRequestClient = PrismaService | Prisma.TransactionClient;

export type ItemRequestDetails = Prisma.ItemRequestGetPayload<{
  include: {
    itemCatalog: true;
    player: {
      include: {
        user: {
          select: {
            discordId: true;
            discordUsername: true;
            discordNickname: true;
          };
        };
      };
    };
  };
}>;

@Injectable()
export class ItemRequestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  get client(): PrismaService {
    return this.prisma;
  }

  async create(data: Prisma.ItemRequestCreateInput, client: ItemRequestClient = this.prisma): Promise<ItemRequest> {
    return client.itemRequest.create({ data });
  }

  async findMany(client: ItemRequestClient = this.prisma): Promise<ItemRequestDetails[]> {
    return client.itemRequest.findMany({
      include: { itemCatalog: true, player: { include: { user: { select: { discordId: true, discordUsername: true, discordNickname: true } } } } },
      orderBy: [{ itemName: 'asc' }, { rankPosition: 'asc' }],
    });
  }

  async findById(id: string, client: ItemRequestClient = this.prisma): Promise<ItemRequestDetails | null> {
    return client.itemRequest.findUnique({
      where: { id },
      include: { itemCatalog: true, player: { include: { user: { select: { discordId: true, discordUsername: true, discordNickname: true } } } } },
    });
  }

  async findByDiscordAndItem(
    discordId: string,
    itemName: string,
    client: ItemRequestClient = this.prisma,
  ): Promise<ItemRequest | null> {
    return client.itemRequest.findFirst({
      where: { discordId, itemName },
    });
  }

  async findByDiscord(discordId: string, client: ItemRequestClient = this.prisma): Promise<ItemRequestDetails[]> {
    return client.itemRequest.findMany({
      where: { discordId },
      include: { itemCatalog: true, player: { include: { user: { select: { discordId: true, discordUsername: true, discordNickname: true } } } } },
      orderBy: [{ itemName: 'asc' }, { rankPosition: 'asc' }],
    });
  }

  async findByPlayer(playerId: string, client: ItemRequestClient = this.prisma): Promise<ItemRequestDetails[]> {
    return client.itemRequest.findMany({
      where: { playerId },
      include: { itemCatalog: true, player: { include: { user: { select: { discordId: true, discordUsername: true, discordNickname: true } } } } },
      orderBy: [{ itemName: 'asc' }, { rankPosition: 'asc' }],
    });
  }

  async findByItemName(itemName: string, client: ItemRequestClient = this.prisma): Promise<ItemRequestDetails[]> {
    return client.itemRequest.findMany({
      where: { itemName },
      include: { itemCatalog: true, player: { include: { user: { select: { discordId: true, discordUsername: true, discordNickname: true } } } } },
      orderBy: { rankPosition: 'asc' },
    });
  }

  async countByItemName(itemName: string, client: ItemRequestClient = this.prisma): Promise<number> {
    return client.itemRequest.count({ where: { itemName } });
  }

  async findItemCatalog(id: string, client: ItemRequestClient = this.prisma) {
    return client.itemCatalog.findUnique({ where: { id } });
  }

  async update(id: string, data: Prisma.ItemRequestUpdateInput, client: ItemRequestClient = this.prisma): Promise<ItemRequest> {
    return client.itemRequest.update({ where: { id }, data });
  }

  async delete(id: string, client: ItemRequestClient = this.prisma): Promise<ItemRequest> {
    return client.itemRequest.delete({ where: { id } });
  }
}
