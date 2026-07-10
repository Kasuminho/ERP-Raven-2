import { Injectable } from '@nestjs/common';
import { ItemInterestEntry, ItemInterestPost, ItemInterestStatus, ItemType, Prisma } from '@prisma/client';
import { randomInt } from 'node:crypto';

const TRANSMUTE_TIME_ZONE = 'America/Sao_Paulo';
const TRANSMUTE_HARD_LOCK_HOURS = 24;
const TRANSMUTE_WEIGHTED_LOOKBACK_DAYS = 30;

type TransmuteRafflePost = ItemInterestPost & {
  entries: ItemInterestEntry[];
  itemCatalog: { itemType: ItemType | null };
};

export type TransmuteRaffleResult = {
  entry: ItemInterestEntry | null;
  eligibleCount: number;
  blockedPlayerIds: string[];
  dayKey: string;
  weightedFallback: boolean;
  raffleWeights: Array<{
    entryId: string;
    playerId: string;
    recentAwards30d: number;
    weight: number;
  }>;
};

@Injectable()
export class ItemInterestTransmuteRaffleService {
  async pickWinnerForDay(tx: Prisma.TransactionClient, post: TransmuteRafflePost, now: Date): Promise<TransmuteRaffleResult> {
    const { dayKey } = this.transmuteDayRange(now);
    const hardLockStart = new Date(now.getTime() - TRANSMUTE_HARD_LOCK_HOURS * 60 * 60 * 1000);
    const weightedLookbackStart = new Date(now.getTime() - TRANSMUTE_WEIGHTED_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const awardedPosts = await tx.itemInterestPost.findMany({
      where: {
        id: { not: post.id },
        selectedEntryId: { not: null },
        deliveryEnabledAt: { gte: weightedLookbackStart, lte: now },
        status: { in: [ItemInterestStatus.READY_FOR_DELIVERY, ItemInterestStatus.DELIVERED] },
        ...(post.itemCatalog.itemType ? { itemCatalog: { itemType: post.itemCatalog.itemType } } : {}),
      },
      select: {
        selectedEntryId: true,
        deliveryEnabledAt: true,
        entries: {
          where: { isTransmuteRequest: true },
          select: { id: true, playerId: true },
        },
      },
    });
    const awardedRows = awardedPosts.flatMap((awardedPost) => {
      const winningEntry = awardedPost.entries.find((entry) => entry.id === awardedPost.selectedEntryId);
      return winningEntry && awardedPost.deliveryEnabledAt
        ? [{ playerId: winningEntry.playerId, awardedAt: awardedPost.deliveryEnabledAt }]
        : [];
    });
    const blockedPlayerIds = [...new Set(awardedRows
      .filter((row) => row.awardedAt >= hardLockStart)
      .map((row) => row.playerId))];
    const blocked = new Set(blockedPlayerIds);
    const eligibleEntries = post.entries.filter((entry) => !blocked.has(entry.playerId));

    if (eligibleEntries.length > 0) {
      return {
        entry: eligibleEntries[randomInt(eligibleEntries.length)],
        eligibleCount: eligibleEntries.length,
        blockedPlayerIds,
        dayKey,
        weightedFallback: false,
        raffleWeights: eligibleEntries.map((entry) => ({
          entryId: entry.id,
          playerId: entry.playerId,
          recentAwards30d: awardedRows.filter((row) => row.playerId === entry.playerId).length,
          weight: 1,
        })),
      };
    }

    const recentAwardsByPlayer = new Map<string, number>();
    for (const row of awardedRows) {
      recentAwardsByPlayer.set(row.playerId, (recentAwardsByPlayer.get(row.playerId) ?? 0) + 1);
    }
    const raffleWeights = post.entries.map((entry) => {
      const recentAwards30d = recentAwardsByPlayer.get(entry.playerId) ?? 0;
      return {
        entryId: entry.id,
        playerId: entry.playerId,
        recentAwards30d,
        weight: this.transmuteWeightedFallbackTickets(recentAwards30d),
      };
    });

    return {
      entry: this.pickWeightedTransmuteEntry(post.entries, raffleWeights),
      eligibleCount: post.entries.length,
      blockedPlayerIds,
      dayKey,
      weightedFallback: true,
      raffleWeights,
    };
  }

  private transmuteWeightedFallbackTickets(recentAwards30d: number): number {
    return Math.max(1, Math.floor(100 / ((recentAwards30d + 1) ** 2)));
  }

  private pickWeightedTransmuteEntry(
    entries: ItemInterestEntry[],
    weights: Array<{ entryId: string; weight: number }>,
  ): ItemInterestEntry | null {
    const weightByEntryId = new Map(weights.map((row) => [row.entryId, row.weight]));
    const totalWeight = weights.reduce((sum, row) => sum + row.weight, 0);

    if (totalWeight <= 0) {
      return null;
    }

    let winningTicket = randomInt(1, totalWeight + 1);
    for (const entry of entries) {
      winningTicket -= weightByEntryId.get(entry.id) ?? 0;
      if (winningTicket <= 0) {
        return entry;
      }
    }

    return null;
  }

  private transmuteDayRange(now: Date): { start: Date; end: Date; dayKey: string } {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TRANSMUTE_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    if (!year || !month || !day) {
      throw new Error('Unable to resolve transmute operational day.');
    }

    const dayKey = `${year}-${month}-${day}`;
    const start = new Date(`${dayKey}T00:00:00-03:00`);

    return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000), dayKey };
  }
}
