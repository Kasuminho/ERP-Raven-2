import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { DaoshiCashReceipt, DaoshiReceiptStatus, DaoshiRaffle, Prisma } from '@prisma/client';
import { randomInt } from 'node:crypto';
import { AuditService } from '../../audit/services/audit.service';
import { CreateDaoshiReceiptDto, ReviewDaoshiReceiptDto } from '../dto';

const COUPON_CENTS = 20_000;
const MONTHLY_TARGET_CENTS = 1_000_000;
const PRIZE_USD_CENTS = 5_000;

export type DaoshiReceiptDetails = DaoshiCashReceipt & {
  player: {
    id: string;
    nickname: string;
    user: {
      discordId: string;
      discordUsername: string;
      discordNickname: string | null;
    };
  };
  reviewedBy?: {
    id: string;
    discordUsername: string;
    discordNickname: string | null;
  } | null;
};

export type DaoshiMonthlyEntry = {
  playerId: string;
  nickname: string;
  discordId: string;
  approvedCents: number;
  coupons: number;
  couponStart: number;
  couponEnd: number;
};

export type DaoshiMonthlySummary = {
  month: string;
  targetCents: number;
  prizeUsdCents: number;
  totalApprovedCents: number;
  totalCoupons: number;
  raffleEnabled: boolean;
  entries: DaoshiMonthlyEntry[];
  raffle?: DaoshiRaffle | null;
};

export type DaoshiPlayerSummary = {
  month: string;
  targetCents: number;
  prizeUsdCents: number;
  totalApprovedCents: number;
  guildProgressPercent: number;
  raffleEnabled: boolean;
  playerApprovedCents: number;
  playerCoupons: number;
};

@Injectable()
export class DaoshiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listMine(userId: string): Promise<DaoshiReceiptDetails[]> {
    const player = await this.getPrimaryPlayer(userId);

    return this.listReceipts({ playerId: player.id });
  }

  async getMySummary(userId: string, month = this.currentMonth()): Promise<DaoshiPlayerSummary> {
    const player = await this.getPrimaryPlayer(userId);
    const summary = await this.getMonthlySummary(month);
    const entry = summary.entries.find((row) => row.playerId === player.id);

    return {
      month,
      targetCents: MONTHLY_TARGET_CENTS,
      prizeUsdCents: PRIZE_USD_CENTS,
      totalApprovedCents: summary.totalApprovedCents,
      guildProgressPercent: Math.min(100, Math.round((summary.totalApprovedCents / MONTHLY_TARGET_CENTS) * 100)),
      raffleEnabled: summary.raffleEnabled,
      playerApprovedCents: entry?.approvedCents ?? 0,
      playerCoupons: entry?.coupons ?? 0,
    };
  }

  async createMine(userId: string, data: CreateDaoshiReceiptDto): Promise<DaoshiCashReceipt> {
    const player = await this.getPrimaryPlayer(userId);
    const proofImageUrl = data.proofImageUrl?.trim();
    const purchaseDate = new Date(data.purchaseDate);
    const purchaseCents = this.amountToCents(data.purchaseAmount);

    if (!proofImageUrl) {
      throw new BadRequestException('proofImageUrl is required.');
    }

    if (Number.isNaN(purchaseDate.getTime())) {
      throw new BadRequestException('purchaseDate must be a valid date.');
    }

    const created = await this.prisma.daoshiCashReceipt.create({
      data: {
        playerId: player.id,
        proofImageUrl,
        purchaseCents,
        purchaseDate,
        playerNote: data.playerNote?.trim() || undefined,
      },
    });

    await this.audit('DAOSHI_RECEIPT_CREATED', created.id, userId, {
      playerId: player.id,
      purchaseCents,
      purchaseDate: purchaseDate.toISOString(),
    });

    return created;
  }

  async listForStaff(status?: DaoshiReceiptStatus, month?: string): Promise<DaoshiReceiptDetails[]> {
    return this.listReceipts({
      ...(status ? { status } : {}),
      ...(month ? { purchaseDate: this.monthRangeWhere(month) } : {}),
    });
  }

  async approveReceipt(id: string, actorId: string, data: ReviewDaoshiReceiptDto): Promise<DaoshiCashReceipt> {
    const receipt = await this.getReceipt(id);
    const approvedCents = this.reviewAmountToCents(data, receipt.purchaseCents);

    const updated = await this.prisma.daoshiCashReceipt.update({
      where: { id },
      data: {
        status: DaoshiReceiptStatus.APPROVED,
        approvedCents,
        reviewNote: data.reviewNote?.trim() || undefined,
        reviewedById: actorId,
        reviewedAt: new Date(),
      },
    });

    await this.audit('DAOSHI_RECEIPT_APPROVED', id, actorId, {
      playerId: receipt.playerId,
      previousStatus: receipt.status,
      purchaseCents: receipt.purchaseCents,
      approvedCents,
      previousApprovedCents: receipt.approvedCents,
    });

    return updated;
  }

  async rejectReceipt(id: string, actorId: string, data: ReviewDaoshiReceiptDto): Promise<DaoshiCashReceipt> {
    const receipt = await this.getReceipt(id);

    if (!data.reviewNote?.trim()) {
      throw new BadRequestException('reviewNote is required when rejecting a receipt.');
    }

    const updated = await this.prisma.daoshiCashReceipt.update({
      where: { id },
      data: {
        status: DaoshiReceiptStatus.REJECTED,
        approvedCents: null,
        reviewNote: data.reviewNote.trim(),
        reviewedById: actorId,
        reviewedAt: new Date(),
      },
    });

    await this.audit('DAOSHI_RECEIPT_REJECTED', id, actorId, {
      playerId: receipt.playerId,
      previousStatus: receipt.status,
      reviewNote: data.reviewNote.trim(),
    });

    return updated;
  }

  async getMonthlySummary(month = this.currentMonth()): Promise<DaoshiMonthlySummary> {
    this.assertMonth(month);
    const receipts = await this.prisma.daoshiCashReceipt.findMany({
      where: {
        status: DaoshiReceiptStatus.APPROVED,
        purchaseDate: this.monthRangeWhere(month),
      },
      include: {
        player: {
          select: {
            id: true,
            nickname: true,
            user: {
              select: {
                discordId: true,
              },
            },
          },
        },
      },
      orderBy: [{ purchaseDate: 'asc' }, { createdAt: 'asc' }],
    });
    const byPlayer = new Map<string, DaoshiMonthlyEntry>();

    for (const receipt of receipts) {
      const approvedCents = receipt.approvedCents ?? 0;
      const current = byPlayer.get(receipt.playerId) ?? {
        playerId: receipt.playerId,
        nickname: receipt.player.nickname,
        discordId: receipt.player.user.discordId,
        approvedCents: 0,
        coupons: 0,
        couponStart: 0,
        couponEnd: 0,
      };
      current.approvedCents += approvedCents;
      byPlayer.set(receipt.playerId, current);
    }

    const entries = Array.from(byPlayer.values())
      .map((entry) => ({
        ...entry,
        coupons: Math.floor(entry.approvedCents / COUPON_CENTS),
      }))
      .filter((entry) => entry.coupons > 0)
      .sort((a, b) => b.coupons - a.coupons || a.nickname.localeCompare(b.nickname));

    let cursor = 1;
    for (const entry of entries) {
      entry.couponStart = cursor;
      entry.couponEnd = cursor + entry.coupons - 1;
      cursor = entry.couponEnd + 1;
    }

    const totalApprovedCents = receipts.reduce((sum, receipt) => sum + (receipt.approvedCents ?? 0), 0);
    const totalCoupons = entries.reduce((sum, entry) => sum + entry.coupons, 0);
    const raffle = await this.prisma.daoshiRaffle.findUnique({ where: { month } });

    return {
      month,
      targetCents: MONTHLY_TARGET_CENTS,
      prizeUsdCents: PRIZE_USD_CENTS,
      totalApprovedCents,
      totalCoupons,
      raffleEnabled: totalApprovedCents >= MONTHLY_TARGET_CENTS && totalCoupons > 0,
      entries,
      raffle,
    };
  }

  async runRaffle(month: string, actorId: string): Promise<DaoshiRaffle> {
    const summary = await this.getMonthlySummary(month);

    if (summary.raffle) {
      throw new BadRequestException(`Raffle for ${month} has already been executed.`);
    }

    if (!summary.raffleEnabled) {
      throw new BadRequestException('Monthly target must be reached before running the raffle.');
    }

    const winningCoupon = randomInt(1, summary.totalCoupons + 1);
    const winner = summary.entries.find((entry) => winningCoupon >= entry.couponStart && winningCoupon <= entry.couponEnd);

    if (!winner) {
      throw new BadRequestException('Unable to determine raffle winner.');
    }

    const raffle = await this.prisma.daoshiRaffle.create({
      data: {
        month,
        prizeUsdCents: PRIZE_USD_CENTS,
        totalCents: summary.totalApprovedCents,
        totalCoupons: summary.totalCoupons,
        winnerPlayerId: winner.playerId,
        winnerCoupon: winningCoupon,
        entries: summary.entries as unknown as Prisma.InputJsonValue,
        executedById: actorId,
      },
    });

    await this.audit('DAOSHI_RAFFLE_EXECUTED', raffle.id, actorId, {
      month,
      winnerPlayerId: winner.playerId,
      winnerNickname: winner.nickname,
      winnerCoupon: winningCoupon,
      totalCoupons: summary.totalCoupons,
      totalCents: summary.totalApprovedCents,
    });

    return raffle;
  }

  private async listReceipts(where: Prisma.DaoshiCashReceiptWhereInput): Promise<DaoshiReceiptDetails[]> {
    return this.prisma.daoshiCashReceipt.findMany({
      where,
      include: {
        player: {
          select: {
            id: true,
            nickname: true,
            user: {
              select: {
                discordId: true,
                discordUsername: true,
                discordNickname: true,
              },
            },
          },
        },
        reviewedBy: {
          select: {
            id: true,
            discordUsername: true,
            discordNickname: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { purchaseDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  private async getPrimaryPlayer(userId: string): Promise<{ id: string }> {
    const player = await this.prisma.player.findFirst({
      where: { userId, isActive: true },
      select: { id: true },
      orderBy: { joinedAt: 'asc' },
    });

    if (!player) {
      throw new NotFoundException('Authenticated user does not have an active player profile.');
    }

    return player;
  }

  private async getReceipt(id: string): Promise<DaoshiCashReceipt> {
    const receipt = await this.prisma.daoshiCashReceipt.findUnique({ where: { id } });

    if (!receipt) {
      throw new NotFoundException(`Daoshi receipt ${id} was not found.`);
    }

    return receipt;
  }

  private reviewAmountToCents(data: ReviewDaoshiReceiptDto, fallback: number): number {
    if (typeof data.approvedCents === 'number') {
      if (!Number.isInteger(data.approvedCents) || data.approvedCents <= 0) {
        throw new BadRequestException('approvedCents must be a positive integer.');
      }

      return data.approvedCents;
    }

    if (typeof data.approvedAmount === 'number') {
      return this.amountToCents(data.approvedAmount);
    }

    return fallback;
  }

  private amountToCents(amount: number): number {
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero.');
    }

    return Math.round(amount * 100);
  }

  private monthRangeWhere(month: string): Prisma.DateTimeFilter {
    this.assertMonth(month);
    const [year, monthIndex] = month.split('-').map(Number);
    const start = new Date(Date.UTC(year, monthIndex - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));

    return { gte: start, lt: end };
  }

  private currentMonth(): string {
    return new Date().toISOString().slice(0, 7);
  }

  private assertMonth(month: string): void {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException('Month must use YYYY-MM format.');
    }
  }

  private async audit(action: string, targetId: string, actorId: string | undefined, metadata: Prisma.InputJsonObject): Promise<void> {
    await this.auditService.log({
      actorId,
      action,
      targetType: 'Daoshi',
      targetId,
      metadata,
    });
  }
}
