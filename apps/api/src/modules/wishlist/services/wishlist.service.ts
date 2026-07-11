import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { WishlistStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { AuditService } from '../../audit/services/audit.service';
import { CreateWishlistItemDto } from '../dto';

@Injectable()
export class WishlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listMine(userId: string) {
    const player = await this.getPrimaryPlayer(userId);

    return this.prisma.playerWishlistItem.findMany({
      where: { playerId: player.id, status: { not: WishlistStatus.REMOVED } },
      include: { itemCatalog: true },
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { updatedAt: 'desc' }],
      take: 200,
    });
  }

  async createMine(userId: string, data: CreateWishlistItemDto) {
    const player = await this.getPrimaryPlayer(userId);
    const item = await this.prisma.itemCatalog.findUnique({ where: { id: data.itemCatalogId } });

    if (!item || !item.isActive) {
      throw new NotFoundException('Item de catalogo nao encontrado.');
    }

    const existing = await this.prisma.playerWishlistItem.findFirst({
      where: {
        playerId: player.id,
        itemCatalogId: item.id,
        status: { in: [WishlistStatus.ACTIVE, WishlistStatus.PAUSED] },
      },
    });

    if (existing) {
      throw new BadRequestException('Este item ja esta na sua wishlist ativa/pausada.');
    }

    const created = await this.prisma.playerWishlistItem.create({
      data: {
        playerId: player.id,
        itemCatalogId: item.id,
        priority: data.priority,
        reason: data.reason.trim(),
        build: data.build?.trim() || null,
        note: data.note?.trim() || null,
        proofImageUrl: data.proofImageUrl?.trim() || null,
      },
      include: { itemCatalog: true },
    });

    await this.auditService.log({
      actorId: userId,
      action: 'WISHLIST_ITEM_CREATED',
      targetType: 'PlayerWishlistItem',
      targetId: created.id,
      metadata: { playerId: player.id, itemCatalogId: item.id, priority: created.priority },
    });

    return created;
  }

  async setMineStatus(userId: string, wishlistItemId: string, status: WishlistStatus) {
    const player = await this.getPrimaryPlayer(userId);
    const existing = await this.prisma.playerWishlistItem.findFirst({ where: { id: wishlistItemId, playerId: player.id } });

    if (!existing || existing.status === WishlistStatus.FULFILLED) {
      throw new NotFoundException('Wishlist item nao encontrado.');
    }

    const updated = await this.prisma.playerWishlistItem.update({
      where: { id: wishlistItemId },
      data: { status },
      include: { itemCatalog: true },
    });

    await this.auditService.log({
      actorId: userId,
      action: `WISHLIST_ITEM_${status}`,
      targetType: 'PlayerWishlistItem',
      targetId: wishlistItemId,
      metadata: { playerId: player.id, previousStatus: existing.status, status },
    });

    return updated;
  }

  async listStaffDemand() {
    const rows = await this.prisma.playerWishlistItem.findMany({
      where: { status: { in: [WishlistStatus.ACTIVE, WishlistStatus.PAUSED] } },
      include: {
        itemCatalog: true,
        player: {
          select: {
            id: true,
            nickname: true,
            class: true,
            dimensionalLayer: true,
            attendancePercentage: true,
            combatPower: true,
            combatProfile: { select: { declaredBuild: true, preferredRole: true } },
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      take: 500,
    });
    const byItem = new Map<string, typeof rows>();

    for (const row of rows) {
      byItem.set(row.itemCatalogId, [...(byItem.get(row.itemCatalogId) ?? []), row]);
    }

    return [...byItem.entries()].map(([itemCatalogId, itemRows]) => {
      const activeRows = itemRows.filter((row) => row.status === WishlistStatus.ACTIVE);
      const priorityCounts = this.countBy(itemRows.map((row) => row.priority));
      const classCounts = this.countBy(itemRows.map((row) => row.player.class));
      const layers = itemRows.map((row) => row.player.dimensionalLayer);
      const item = itemRows[0].itemCatalog;

      return {
        itemCatalogId,
        item: {
          id: item.id,
          namePt: item.namePt,
          nameEn: item.nameEn,
          itemTier: item.itemTier,
          itemType: item.itemType,
          category: item.category,
        },
        total: itemRows.length,
        active: activeRows.length,
        paused: itemRows.length - activeRows.length,
        priorityCounts,
        classCounts,
        minLayer: Math.min(...layers),
        maxLayer: Math.max(...layers),
        latestUpdatedAt: itemRows.reduce((latest, row) => latest > row.updatedAt ? latest : row.updatedAt, itemRows[0].updatedAt),
        players: itemRows.map((row) => this.staffPlayerRow(row)),
      };
    }).sort((left, right) => right.active - left.active || right.total - left.total || left.item.namePt.localeCompare(right.item.namePt));
  }

  async getStaffDemandForItem(itemCatalogId: string) {
    const demand = await this.listStaffDemand();
    return demand.find((row) => row.itemCatalogId === itemCatalogId) ?? null;
  }

  async fulfillByStaff(wishlistItemId: string, actorId: string, note?: string) {
    const existing = await this.prisma.playerWishlistItem.findUnique({ where: { id: wishlistItemId } });

    if (!existing || existing.status === WishlistStatus.REMOVED) {
      throw new NotFoundException('Wishlist item nao encontrado.');
    }

    const updated = await this.prisma.playerWishlistItem.update({
      where: { id: wishlistItemId },
      data: {
        status: WishlistStatus.FULFILLED,
        fulfilledById: actorId,
        fulfilledAt: new Date(),
        fulfilledNote: note?.trim() || null,
      },
      include: { itemCatalog: true, player: { select: { id: true, nickname: true } } },
    });

    await this.auditService.log({
      actorId,
      action: 'WISHLIST_ITEM_FULFILLED_BY_STAFF',
      targetType: 'PlayerWishlistItem',
      targetId: wishlistItemId,
      metadata: {
        playerId: updated.playerId,
        itemCatalogId: updated.itemCatalogId,
        previousStatus: existing.status,
        note,
      },
    });

    return updated;
  }

  private async getPrimaryPlayer(userId: string) {
    const player = await this.prisma.player.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!player) {
      throw new NotFoundException('Player principal nao encontrado.');
    }

    return player;
  }

  private staffPlayerRow(row: {
    id: string;
    playerId: string;
    status: string;
    priority: string;
    reason: string;
    build?: string | null;
    note?: string | null;
    proofImageUrl?: string | null;
    createdAt: Date;
    updatedAt: Date;
    player: {
      id: string;
      nickname: string;
      class: string;
      dimensionalLayer: number;
      attendancePercentage: number;
      combatPower: number;
      combatProfile?: { declaredBuild?: string | null; preferredRole?: string | null } | null;
    };
  }) {
    return {
      id: row.id,
      playerId: row.playerId,
      status: row.status,
      priority: row.priority,
      reason: row.reason,
      build: row.build ?? row.player.combatProfile?.declaredBuild ?? null,
      note: row.note,
      proofImageUrl: row.proofImageUrl,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      player: row.player,
      signals: {
        lowAttendance: row.player.attendancePercentage < 60,
        highLayer: row.player.dimensionalLayer >= 4,
        hasBuild: Boolean(row.build || row.player.combatProfile?.declaredBuild),
      },
    };
  }

  private countBy(values: string[]) {
    return values.reduce<Record<string, number>>((counts, value) => {
      counts[value] = (counts[value] ?? 0) + 1;
      return counts;
    }, {});
  }
}
