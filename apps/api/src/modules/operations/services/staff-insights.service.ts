import { Injectable } from '@nestjs/common';
import { ItemTier } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { LootFairnessSummary, PlayerComparisonSummary } from '../operations.types';

const HOURS = 60 * 60 * 1000;
const DAYS = 24 * HOURS;

@Injectable()
export class StaffInsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLootFairness(days = 30): Promise<LootFairnessSummary> {
    const boundedDays = Math.min(Math.max(days, 7), 180);
    const since = new Date(Date.now() - boundedDays * DAYS);
    const [players, drops, transactions] = await Promise.all([
      this.prisma.player.findMany({ where: { isActive: true }, select: { id: true, nickname: true, attendancePercentage: true } }),
      this.prisma.dropHistory.findMany({
        where: { deliveredAt: { gte: since } },
        include: { itemCatalog: true },
      }),
      this.prisma.dKPTransaction.groupBy({
        by: ['playerId'],
        _sum: { amount: true },
      }),
    ]);
    const dkpByPlayer = new Map(transactions.map((row) => [row.playerId, row._sum.amount ?? 0]));
    const dropRows = new Map<string, { dropsCount: number; t4Drops: number; legendaryDrops: number; lastDropAt?: Date | null }>();

    for (const drop of drops) {
      if (!drop.playerId) continue;
      const current = dropRows.get(drop.playerId) ?? { dropsCount: 0, t4Drops: 0, legendaryDrops: 0, lastDropAt: null };
      current.dropsCount += 1;
      if (drop.itemCatalog?.itemTier === ItemTier.T4) current.t4Drops += 1;
      if (drop.itemCatalog?.itemTier === ItemTier.LEGENDARY) current.legendaryDrops += 1;
      if (drop.deliveredAt && (!current.lastDropAt || drop.deliveredAt > current.lastDropAt)) current.lastDropAt = drop.deliveredAt;
      dropRows.set(drop.playerId, current);
    }

    return {
      days: boundedDays,
      generatedAt: new Date(),
      rows: players.map((player) => {
        const row = dropRows.get(player.id) ?? { dropsCount: 0, t4Drops: 0, legendaryDrops: 0, lastDropAt: null };
        return {
          playerId: player.id,
          nickname: player.nickname,
          attendancePercentage: player.attendancePercentage,
          currentDkp: dkpByPlayer.get(player.id) ?? 0,
          ...row,
        };
      }).sort((a, b) => b.dropsCount - a.dropsCount || b.t4Drops - a.t4Drops || b.legendaryDrops - a.legendaryDrops || b.attendancePercentage - a.attendancePercentage),
    };
  }

  async comparePlayers(playerIds: string[]): Promise<PlayerComparisonSummary> {
    const ids = [...new Set(playerIds)].slice(0, 4);
    if (ids.length === 0) return { players: [] };
    const since30 = new Date(Date.now() - 30 * DAYS);
    const since90 = new Date(Date.now() - 90 * DAYS);
    const players = await this.prisma.player.findMany({
      where: { id: { in: ids } },
      select: { id: true, nickname: true, class: true, dimensionalLayer: true, attendancePercentage: true, combatPower: true },
    });

    const rows = await Promise.all(players.map(async (player) => {
      const [dkp, drops30d, drops90d, activeRequests, lastDrop] = await Promise.all([
        this.prisma.dKPTransaction.aggregate({ where: { playerId: player.id }, _sum: { amount: true } }),
        this.prisma.dropHistory.count({ where: { playerId: player.id, deliveredAt: { gte: since30 } } }),
        this.prisma.dropHistory.count({ where: { playerId: player.id, deliveredAt: { gte: since90 } } }),
        this.prisma.itemRequest.count({ where: { playerId: player.id, remainingQuantity: { gt: 0 } } }),
        this.prisma.dropHistory.findFirst({ where: { playerId: player.id }, orderBy: { deliveredAt: 'desc' } }),
      ]);
      return {
        playerId: player.id,
        nickname: player.nickname,
        class: player.class,
        dimensionalLayer: player.dimensionalLayer,
        attendancePercentage: player.attendancePercentage,
        combatPower: player.combatPower,
        currentDkp: dkp._sum.amount ?? 0,
        drops30d,
        drops90d,
        activeRequests,
        lastDropAt: lastDrop?.deliveredAt ?? null,
      };
    }));

    return { players: rows };
  }
}
