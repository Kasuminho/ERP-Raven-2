import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { SearchResult } from './search.types';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: string, includePlayers = false): Promise<SearchResult[]> {
    const term = query.trim().slice(0, 80);
    if (term.length < 2) return [];

    const [items, auctions, events, players] = await Promise.all([
      this.prisma.itemCatalog.findMany({
        where: {
          isActive: true,
          OR: [
            { namePt: { contains: term, mode: 'insensitive' } },
            { nameEn: { contains: term, mode: 'insensitive' } },
            { typePt: { contains: term, mode: 'insensitive' } },
            { typeEn: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: { id: true, namePt: true, nameEn: true, itemTier: true, itemType: true },
        orderBy: { namePt: 'asc' },
        take: 6,
      }),
      this.prisma.auction.findMany({
        where: { itemName: { contains: term, mode: 'insensitive' } },
        select: { id: true, itemName: true, itemTier: true, status: true },
        orderBy: { updatedAt: 'desc' },
        take: 6,
      }),
      this.prisma.event.findMany({
        where: { name: { contains: term, mode: 'insensitive' } },
        select: { id: true, name: true, type: true, status: true },
        orderBy: { startsAt: 'desc' },
        take: 6,
      }),
      includePlayers
        ? this.prisma.player.findMany({
            where: { isActive: true, nickname: { contains: term, mode: 'insensitive' } },
            select: { id: true, nickname: true, class: true, dimensionalLayer: true },
            orderBy: { nickname: 'asc' },
            take: 6,
          })
        : Promise.resolve([]),
    ]);

    return [
      ...items.map((item): SearchResult => ({
        id: item.id,
        kind: 'item',
        title: item.namePt || item.nameEn,
        subtitle: [item.itemTier, item.itemType, item.nameEn !== item.namePt ? item.nameEn : ''].filter(Boolean).join(' - '),
        href: `/dashboard/item-requests?item=${encodeURIComponent(item.id)}`,
      })),
      ...auctions.map((auction): SearchResult => ({
        id: auction.id,
        kind: 'auction',
        title: auction.itemName,
        subtitle: `${auction.itemTier} - ${auction.status}`,
        href: `/dashboard/auctions/${auction.id}`,
      })),
      ...events.map((event): SearchResult => ({
        id: event.id,
        kind: 'event',
        title: event.name,
        subtitle: `${event.type} - ${event.status}`,
        href: `/dashboard/attendance?event=${encodeURIComponent(event.id)}`,
      })),
      ...players.map((player): SearchResult => ({
        id: player.id,
        kind: 'player',
        title: player.nickname,
        subtitle: `${player.class} - L${player.dimensionalLayer}`,
        href: `/dashboard/staff/players/${player.id}`,
      })),
    ].slice(0, 20);
  }
}

