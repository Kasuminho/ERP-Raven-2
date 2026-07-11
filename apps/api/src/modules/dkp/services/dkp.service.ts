import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuctionMode, AuctionStatus, BusinessRule, DKPLock, DKPTransaction, DKPTransactionType, DkpPolicySimulation, DkpPolicySimulationStatus, DkpPolicySimulationType, ItemTier, ItemType, Prisma } from '@prisma/client';
import { AuditService } from '../../audit/services/audit.service';
import { BusinessRulesService } from '../../business-rules/business-rules.service';
import { CreateDkpTransactionDto, PreviewDkpBidPolicySimulationDto, PreviewDkpDecaySimulationDto, PromoteDkpPolicySimulationDto, SaveDkpBidPolicySimulationDto, SaveDkpDecaySimulationDto } from '../dto';
import {
  DkpLockNotFoundException,
  DuplicateDkpLockException,
  InsufficientDkpException,
  InvalidDkpLockException,
  InvalidDkpTransactionException,
} from '../exceptions/dkp-domain.exceptions';
import { DkpRepository } from '../repositories/dkp.repository';

interface DkpSnapshot {
  total: number;
  locked: number;
  available: number;
}

export type ConsumedDkpLockResult = {
  transaction: DKPTransaction;
  releasedLock: DKPLock;
};

export type DkpLeaderboardRow = {
  playerId: string;
  nickname: string;
  total: number;
  locked: number;
  available: number;
};

export type StaffDkpPlayerRow = DkpLeaderboardRow & {
  userId: string;
  discordId: string;
  discordUsername: string;
  class: string;
  dimensionalLayer: number;
};

export type DkpEconomySummary = {
  generatedAt: Date;
  activePlayers: number;
  totalPositiveDkp: number;
  totalNegativeDkp: number;
  netDkp: number;
  totalLockedDkp: number;
  eventRewardDkp: number;
  auctionSpentDkp: number;
  adminAdjustmentDkp: number;
  averageDkp: number;
  medianDkp: number;
  top10DkpSharePercent: number;
  recentActivePlayers: number;
  distribution: Array<{ bucket: string; min: number; max: number | null; players: number; totalDkp: number }>;
  topBalances: DkpLeaderboardRow[];
  topEarners: Array<{ playerId: string; nickname: string; amount: number }>;
  topSpenders: Array<{ playerId: string; nickname: string; amount: number }>;
  inactiveHighDkpPlayers: Array<{ playerId: string; nickname: string; total: number; lastActivityAt: Date | null }>;
  signals: Array<{
    key: string;
    label: string;
    detail: string;
    severity: 'info' | 'warning' | 'danger';
  }>;
  markdown: string;
};

export type DkpDecaySimulationSummary = {
  generatedAt: Date;
  persisted: boolean;
  simulationId?: string;
  name?: string;
  config: {
    percent: number;
    minimumDkp: number;
  };
  totals: {
    players: number;
    affectedPlayers: number;
    totalBefore: number;
    totalAfter: number;
    totalReduced: number;
  };
  distributionBefore: DkpEconomySummary['distribution'];
  distributionAfter: DkpEconomySummary['distribution'];
  topImpacted: Array<{
    playerId: string;
    nickname: string;
    before: number;
    after: number;
    reduced: number;
  }>;
  markdown: string;
};

export type DkpBidPolicySimulationSummary = {
  generatedAt: Date;
  persisted: boolean;
  simulationId?: string;
  name?: string;
  config: {
    minimumCost: number;
    winTaxPercent: number;
    tierCaps: Record<string, number>;
    itemTypeCaps: Record<string, number>;
    layerCaps: Record<string, number>;
    fixedCostByTier: Record<string, number>;
    modeMultiplierPercent: Record<string, number>;
  };
  totals: {
    auctionsAnalyzed: number;
    changedAuctions: number;
    currentSpent: number;
    proposedSpent: number;
    delta: number;
    cappedAuctions: number;
    raisedByFloorAuctions: number;
  };
  rows: Array<{
    auctionId: string;
    itemName: string;
    itemTier: ItemTier;
    itemType: ItemType;
    auctionMode: AuctionMode;
    winnerPlayerId: string;
    winnerNickname: string;
    winnerLayer: number;
    currentCost: number;
    proposedCost: number;
    delta: number;
    capApplied?: number | null;
    floorApplied: boolean;
    taxAmount: number;
  }>;
  risks: Array<{
    key: string;
    label: string;
    detail: string;
    severity: 'info' | 'warning' | 'danger';
  }>;
  markdown: string;
};

export type PromotedDkpPolicySimulation = {
  simulation: DkpPolicySimulation;
  businessRule: BusinessRule;
};

@Injectable()
export class DkpService {
  constructor(
    private readonly repository: DkpRepository,
    private readonly auditService: AuditService,
    private readonly businessRules: BusinessRulesService,
  ) {}

  health(): { module: string; ready: boolean } {
    return this.repository.health();
  }

  async calculateTotalDKP(playerId: string): Promise<number> {
    return this.repository.sumTransactions(playerId);
  }

  async calculateLockedDKP(playerId: string): Promise<number> {
    return this.repository.sumActiveLocks(playerId);
  }

  async calculateAvailableDKP(playerId: string): Promise<number> {
    const [total, locked] = await Promise.all([
      this.calculateTotalDKP(playerId),
      this.calculateLockedDKP(playerId),
    ]);

    return total - locked;
  }

  async getLeaderboard(limit = 10): Promise<DkpLeaderboardRow[]> {
    const boundedLimit = Math.max(1, Math.min(Number(limit) || 10, 50));
    const rows = await this.repository.client.player.findMany({
      where: { isActive: true },
      select: {
        id: true,
        nickname: true,
      },
      orderBy: { nickname: 'asc' },
    });

    const snapshots = await Promise.all(
      rows.map(async (player) => {
        const [total, locked] = await Promise.all([
          this.calculateTotalDKP(player.id),
          this.calculateLockedDKP(player.id),
        ]);

        return {
          playerId: player.id,
          nickname: player.nickname,
          total,
          locked,
          available: total - locked,
        };
      }),
    );

    return snapshots
      .sort((a, b) => b.total - a.total || b.available - a.available || a.nickname.localeCompare(b.nickname))
      .slice(0, boundedLimit);
  }

  async getStaffPlayerRows(search?: string): Promise<StaffDkpPlayerRow[]> {
    const normalizedSearch = search?.trim();
    const players = await this.repository.client.player.findMany({
      where: {
        isActive: true,
        ...(normalizedSearch
          ? {
              OR: [
                { nickname: { contains: normalizedSearch, mode: 'insensitive' } },
                { user: { discordUsername: { contains: normalizedSearch, mode: 'insensitive' } } },
                { user: { discordNickname: { contains: normalizedSearch, mode: 'insensitive' } } },
                { user: { discordId: { contains: normalizedSearch } } },
              ],
            }
          : {}),
      },
      include: { user: true },
      orderBy: { nickname: 'asc' },
      take: 200,
    });

    const rows = await Promise.all(players.map(async (player) => {
      const [total, locked] = await Promise.all([
        this.calculateTotalDKP(player.id),
        this.calculateLockedDKP(player.id),
      ]);

      return {
        playerId: player.id,
        userId: player.userId,
        nickname: player.nickname,
        discordId: player.user.discordId,
        discordUsername: player.user.discordUsername,
        class: player.class,
        dimensionalLayer: player.dimensionalLayer,
        total,
        locked,
        available: total - locked,
      };
    }));

    return rows.sort((a, b) => b.total - a.total || a.nickname.localeCompare(b.nickname));
  }

  async getEconomySummary(): Promise<DkpEconomySummary> {
    const recentCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const inactiveCutoff = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);
    const [activePlayers, positive, negative, locks, eventRewards, auctionWins, adminAdjustments, transactions, topBalances, activePlayerRows, recentAttendances, activeLocks] = await Promise.all([
      this.repository.client.player.count({ where: { isActive: true } }),
      this.repository.client.dKPTransaction.aggregate({
        where: { amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      this.repository.client.dKPTransaction.aggregate({
        where: { amount: { lt: 0 } },
        _sum: { amount: true },
      }),
      this.repository.client.dKPLock.aggregate({
        where: { released: false },
        _sum: { amount: true },
      }),
      this.repository.client.dKPTransaction.aggregate({
        where: { type: DKPTransactionType.EVENT_REWARD },
        _sum: { amount: true },
      }),
      this.repository.client.dKPTransaction.aggregate({
        where: { type: DKPTransactionType.AUCTION_WIN },
        _sum: { amount: true },
      }),
      this.repository.client.dKPTransaction.aggregate({
        where: { type: DKPTransactionType.ADMIN_ADJUSTMENT },
        _sum: { amount: true },
      }),
      this.repository.client.dKPTransaction.findMany({
        include: {
          player: {
            select: {
              id: true,
              nickname: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5000,
      }),
      this.getLeaderboard(10),
      this.repository.client.player.findMany({
        where: { isActive: true },
        select: {
          id: true,
          nickname: true,
          joinedAt: true,
        },
        orderBy: { nickname: 'asc' },
        take: 500,
      }),
      this.repository.client.eventAttendance.findMany({
        where: {
          createdAt: { gte: recentCutoff },
        },
        select: {
          playerId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.repository.client.dKPLock.findMany({
        where: { released: false },
        select: {
          playerId: true,
          amount: true,
        },
      }),
    ]);

    const earned = new Map<string, { playerId: string; nickname: string; amount: number }>();
    const spent = new Map<string, { playerId: string; nickname: string; amount: number }>();

    for (const transaction of transactions) {
      const target = transaction.amount >= 0 ? earned : spent;
      const current = target.get(transaction.playerId) ?? {
        playerId: transaction.playerId,
        nickname: transaction.player.nickname,
        amount: 0,
      };
      current.amount += Math.abs(transaction.amount);
      target.set(transaction.playerId, current);
    }

    const transactionActivity = new Map<string, Date>();
    for (const transaction of transactions) {
      const current = transactionActivity.get(transaction.playerId);
      if (!current || transaction.createdAt > current) {
        transactionActivity.set(transaction.playerId, transaction.createdAt);
      }
    }

    const attendanceActivity = new Map<string, Date>();
    for (const attendance of recentAttendances) {
      const current = attendanceActivity.get(attendance.playerId);
      if (!current || attendance.createdAt > current) {
        attendanceActivity.set(attendance.playerId, attendance.createdAt);
      }
    }

    const lockedByPlayer = new Map<string, number>();
    for (const lock of activeLocks) {
      lockedByPlayer.set(lock.playerId, (lockedByPlayer.get(lock.playerId) ?? 0) + lock.amount);
    }

    const activeSnapshots = activePlayerRows.map((player) => {
      const balance = topBalances.find((row) => row.playerId === player.id);
      const total = balance?.total ?? transactions
        .filter((transaction) => transaction.playerId === player.id)
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      const locked = lockedByPlayer.get(player.id) ?? balance?.locked ?? 0;
      const lastTransactionAt = transactionActivity.get(player.id);
      const lastAttendanceAt = attendanceActivity.get(player.id);
      const lastActivityAt = [lastTransactionAt, lastAttendanceAt, player.joinedAt]
        .filter((value): value is Date => Boolean(value))
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
      return {
        playerId: player.id,
        nickname: player.nickname,
        total,
        locked,
        available: total - locked,
        lastActivityAt,
      };
    }).sort((a, b) => b.total - a.total || a.nickname.localeCompare(b.nickname));

    const totals = activeSnapshots.map((row) => row.total).sort((a, b) => a - b);
    const medianDkp = this.median(totals);
    const averageDkp = activeSnapshots.length > 0
      ? Math.round(activeSnapshots.reduce((sum, row) => sum + row.total, 0) / activeSnapshots.length)
      : 0;
    const top10Total = activeSnapshots.slice(0, 10).reduce((sum, row) => sum + Math.max(row.total, 0), 0);
    const positiveCirculation = activeSnapshots.reduce((sum, row) => sum + Math.max(row.total, 0), 0);
    const top10DkpSharePercent = positiveCirculation > 0 ? Math.round((top10Total / positiveCirculation) * 100) : 0;
    const recentActivePlayers = new Set([
      ...transactions.filter((transaction) => transaction.createdAt >= recentCutoff).map((transaction) => transaction.playerId),
      ...recentAttendances.map((attendance) => attendance.playerId),
    ]).size;
    const inactiveHighDkpPlayers = activeSnapshots
      .filter((row) => row.total >= Math.max(averageDkp * 1.5, medianDkp * 2, 100) && (!row.lastActivityAt || row.lastActivityAt < inactiveCutoff))
      .slice(0, 10)
      .map((row) => ({
        playerId: row.playerId,
        nickname: row.nickname,
        total: row.total,
        lastActivityAt: row.lastActivityAt,
      }));
    const distribution = this.buildDkpDistribution(activeSnapshots);
    const auctionWinnerIds = new Set(transactions
      .filter((transaction) => transaction.type === DKPTransactionType.AUCTION_WIN && transaction.createdAt >= recentCutoff)
      .map((transaction) => transaction.playerId));
    const signals = this.buildEconomySignals({
      activePlayers,
      averageDkp,
      medianDkp,
      top10DkpSharePercent,
      recentActivePlayers,
      inactiveHighDkpPlayersCount: inactiveHighDkpPlayers.length,
      auctionWinnerDiversity: auctionWinnerIds.size,
      auctionSpentDkp: Math.abs(auctionWins._sum.amount ?? 0),
      netDkp: (positive._sum.amount ?? 0) + (negative._sum.amount ?? 0),
    });

    const summary = {
      generatedAt: new Date(),
      activePlayers,
      totalPositiveDkp: positive._sum.amount ?? 0,
      totalNegativeDkp: Math.abs(negative._sum.amount ?? 0),
      netDkp: (positive._sum.amount ?? 0) + (negative._sum.amount ?? 0),
      totalLockedDkp: locks._sum.amount ?? 0,
      eventRewardDkp: eventRewards._sum.amount ?? 0,
      auctionSpentDkp: Math.abs(auctionWins._sum.amount ?? 0),
      adminAdjustmentDkp: adminAdjustments._sum.amount ?? 0,
      averageDkp,
      medianDkp,
      top10DkpSharePercent,
      recentActivePlayers,
      distribution,
      topBalances,
      topEarners: [...earned.values()].sort((a, b) => b.amount - a.amount).slice(0, 10),
      topSpenders: [...spent.values()].sort((a, b) => b.amount - a.amount).slice(0, 10),
      inactiveHighDkpPlayers,
      signals,
      markdown: '',
    };
    return {
      ...summary,
      markdown: this.buildEconomyMarkdown(summary),
    };
  }

  async previewDecaySimulation(data: PreviewDkpDecaySimulationDto): Promise<DkpDecaySimulationSummary> {
    return this.buildDecaySimulation(data, false);
  }

  async saveDecaySimulation(actorId: string, data: SaveDkpDecaySimulationDto): Promise<DkpDecaySimulationSummary> {
    const preview = await this.buildDecaySimulation(data, false);
    const saved = await this.repository.client.dkpPolicySimulation.create({
      data: {
        type: DkpPolicySimulationType.DECAY,
        name: data.name.trim(),
        config: preview.config,
        result: JSON.parse(JSON.stringify(preview)) as Prisma.InputJsonObject,
        createdBy: { connect: { id: actorId } },
      },
    });

    await this.auditService.log({
      actorId,
      action: 'DKP_DECAY_SIMULATION_SAVED',
      targetType: 'DkpPolicySimulation',
      targetId: saved.id,
      metadata: {
        percent: preview.config.percent,
        minimumDkp: preview.config.minimumDkp,
        affectedPlayers: preview.totals.affectedPlayers,
        totalReduced: preview.totals.totalReduced,
      },
    });

    return {
      ...preview,
      persisted: true,
      simulationId: saved.id,
      name: saved.name,
    };
  }

  async listPolicySimulations(): Promise<DkpPolicySimulation[]> {
    return this.repository.client.dkpPolicySimulation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  async previewBidPolicySimulation(data: PreviewDkpBidPolicySimulationDto): Promise<DkpBidPolicySimulationSummary> {
    return this.buildBidPolicySimulation(data, false);
  }

  async saveBidPolicySimulation(actorId: string, data: SaveDkpBidPolicySimulationDto): Promise<DkpBidPolicySimulationSummary> {
    const preview = await this.buildBidPolicySimulation(data, false);
    const saved = await this.repository.client.dkpPolicySimulation.create({
      data: {
        type: DkpPolicySimulationType.BID_POLICY,
        name: data.name.trim(),
        config: preview.config,
        result: JSON.parse(JSON.stringify(preview)) as Prisma.InputJsonObject,
        createdBy: { connect: { id: actorId } },
      },
    });

    await this.auditService.log({
      actorId,
      action: 'DKP_BID_POLICY_SIMULATION_SAVED',
      targetType: 'DkpPolicySimulation',
      targetId: saved.id,
      metadata: {
        auctionsAnalyzed: preview.totals.auctionsAnalyzed,
        currentSpent: preview.totals.currentSpent,
        proposedSpent: preview.totals.proposedSpent,
        delta: preview.totals.delta,
      },
    });

    return {
      ...preview,
      persisted: true,
      simulationId: saved.id,
      name: saved.name,
    };
  }

  async promotePolicySimulation(actorId: string, simulationId: string, data: PromoteDkpPolicySimulationDto): Promise<PromotedDkpPolicySimulation> {
    if (!data.confirm) {
      throw new BadRequestException('Promotion requires explicit confirmation.');
    }

    const simulation = await this.repository.client.dkpPolicySimulation.findUnique({
      where: { id: simulationId },
    });

    if (!simulation) {
      throw new NotFoundException('Policy simulation not found.');
    }
    if (simulation.type !== DkpPolicySimulationType.BID_POLICY) {
      throw new BadRequestException('Only bid policy simulations can be promoted into dkpBidPolicy.');
    }
    if (simulation.status !== DkpPolicySimulationStatus.DRAFT) {
      throw new BadRequestException('Only draft simulations can be promoted.');
    }

    const promotedAt = new Date();
    const config = this.asJsonRecord(simulation.config);
    const businessRule = await this.businessRules.updateRule('dkpBidPolicy', {
      enabled: true,
      ...config,
      sourceSimulationId: simulation.id,
      sourceSimulationName: simulation.name,
      promotedAt: promotedAt.toISOString(),
      promotedById: actorId,
      reason: data.reason.trim(),
    }, actorId);
    const updated = await this.repository.client.dkpPolicySimulation.update({
      where: { id: simulation.id },
      data: {
        status: DkpPolicySimulationStatus.PROMOTED,
        promotedAt,
        promotedById: actorId,
        promotionReason: data.reason.trim(),
      },
    });

    await this.auditService.log({
      actorId,
      action: 'DKP_POLICY_SIMULATION_PROMOTED',
      targetType: 'DkpPolicySimulation',
      targetId: simulation.id,
      metadata: {
        businessRuleKey: 'dkpBidPolicy',
        simulationType: simulation.type,
        reason: data.reason.trim(),
      },
    });

    return { simulation: updated, businessRule };
  }

  async calculateAvailableDKPWithinTransaction(
    playerId: string,
    client: Prisma.TransactionClient,
  ): Promise<number> {
    const snapshot = await this.getSnapshot(playerId, client);

    return snapshot.available;
  }

  async createTransaction(data: CreateDkpTransactionDto): Promise<DKPTransaction> {
    this.assertValidTransaction(data);

    const transaction = await this.repository.client.$transaction(async (tx) => {
      return this.createTransactionWithinTransaction(data, tx);
    });

    await this.auditDkpChange(data.createdById, this.getTransactionAuditAction(data.type), 'DKPTransaction', transaction.id, {
      playerId: data.playerId,
      amount: data.amount,
      type: data.type,
      referenceId: data.referenceId,
    });

    return transaction;
  }

  async createTransactionWithinTransaction(
    data: CreateDkpTransactionDto,
    client: Prisma.TransactionClient,
  ): Promise<DKPTransaction> {
    this.assertValidTransaction(data);

    const snapshot = await this.getSnapshot(data.playerId, client);
    const projectedAvailable = snapshot.available + data.amount;

    if (projectedAvailable < 0) {
      throw new InsufficientDkpException(data.playerId);
    }

    const transaction = await this.repository.createTransaction(
      {
        player: { connect: { id: data.playerId } },
        amount: data.amount,
        type: data.type,
        referenceId: data.referenceId,
        createdBy: { connect: { id: data.createdById } },
      },
      client,
    );

    if (data.amount > 0) {
      await this.syncOpenAllInLocksWithinTransaction(data.playerId, client, transaction.id);
    }

    return transaction;
  }

  async lockDKP(playerId: string, auctionId: string, amount: number): Promise<DKPLock> {
    this.assertPositiveAmount(amount, 'Lock amount must be greater than zero.');

    const lock = await this.repository.client.$transaction(
      async (tx) => this.lockDKPWithinTransaction(playerId, auctionId, amount, tx),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await this.auditDkpChange(undefined, 'DKP_LOCK_CREATED', 'DKPLock', lock.id, {
      playerId,
      auctionId,
      amount,
    });

    return lock;
  }

  async lockDKPWithinTransaction(
    playerId: string,
    auctionId: string,
    amount: number,
    client: Prisma.TransactionClient,
  ): Promise<DKPLock> {
    this.assertPositiveAmount(amount, 'Lock amount must be greater than zero.');

    const existingLock = await this.repository.findLockByPlayerAndAuction(playerId, auctionId, client);

    if (existingLock) {
      throw new DuplicateDkpLockException(playerId, auctionId);
    }

    const snapshot = await this.getSnapshot(playerId, client);

    if (snapshot.available < amount) {
      throw new InsufficientDkpException(playerId);
    }

    return this.repository.createLock(
      {
        player: { connect: { id: playerId } },
        auction: { connect: { id: auctionId } },
        amount,
      },
      client,
    );
  }

  async lockOrReactivateDKPWithinTransaction(
    playerId: string,
    auctionId: string,
    amount: number,
    client: Prisma.TransactionClient,
  ): Promise<DKPLock> {
    this.assertPositiveAmount(amount, 'Lock amount must be greater than zero.');

    const existingLock = await this.repository.findLockByPlayerAndAuction(playerId, auctionId, client);

    if (existingLock && !existingLock.released) {
      throw new DuplicateDkpLockException(playerId, auctionId);
    }

    const snapshot = await this.getSnapshot(playerId, client);

    if (snapshot.available < amount) {
      throw new InsufficientDkpException(playerId);
    }

    if (existingLock) {
      return this.repository.reactivateLock(existingLock.id, amount, client);
    }

    return this.repository.createLock(
      {
        player: { connect: { id: playerId } },
        auction: { connect: { id: auctionId } },
        amount,
      },
      client,
    );
  }

  async increaseAuctionLockWithinTransaction(
    playerId: string,
    auctionId: string,
    amount: number,
    client: Prisma.TransactionClient,
  ): Promise<DKPLock> {
    this.assertPositiveAmount(amount, 'Lock amount must be greater than zero.');

    const existingLock = await this.repository.findLockByPlayerAndAuction(playerId, auctionId, client);

    if (!existingLock) {
      throw new InvalidDkpLockException(`No DKP lock exists for player ${playerId} and auction ${auctionId}.`);
    }

    if (existingLock.released) {
      throw new InvalidDkpLockException(`DKP lock ${existingLock.id} has already been released.`);
    }

    if (amount <= existingLock.amount) {
      throw new InvalidDkpLockException('New lock amount must be greater than the current locked amount.');
    }

    const snapshot = await this.getSnapshot(playerId, client);
    const availableForThisAuction = snapshot.available + existingLock.amount;

    if (availableForThisAuction < amount) {
      throw new InsufficientDkpException(playerId);
    }

    return this.repository.updateLockAmount(existingLock.id, amount, client);
  }

  async unlockDKP(lockId: string): Promise<DKPLock> {
    const lock = await this.repository.client.$transaction(async (tx) => {
      const existingLock = await this.repository.findLockById(lockId, tx);

      if (!existingLock) {
        throw new DkpLockNotFoundException(lockId);
      }

      if (existingLock.released) {
        throw new InvalidDkpLockException(`DKP lock ${lockId} has already been released.`);
      }

      return this.repository.releaseLock(lockId, tx);
    });

    await this.auditDkpChange(undefined, 'DKP_LOCK_RELEASED', 'DKPLock', lock.id, {
      playerId: lock.playerId,
      auctionId: lock.auctionId,
      amount: lock.amount,
    });

    return lock;
  }

  async unlockAllAuctionLocks(auctionId: string): Promise<DKPLock[]> {
    const releasedLocks = await this.releaseAuctionLocks(auctionId);

    await this.auditDkpChange(undefined, 'DKP_AUCTION_LOCKS_RELEASED', 'Auction', auctionId, {
      releasedLockIds: releasedLocks.map((lock) => lock.id),
    });

    return releasedLocks;
  }

  async consumeLockedDKP(playerId: string, auctionId: string): Promise<DKPTransaction> {
    const result = await this.repository.client.$transaction(
      async (tx) => this.consumeLockedDKPWithinTransaction(playerId, auctionId, tx),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await this.auditDkpChange(undefined, 'DKP_LOCK_CONSUMED', 'DKPTransaction', result.transaction.id, {
      playerId,
      auctionId,
      lockId: result.releasedLock.id,
      amount: result.releasedLock.amount,
    });

    return result.transaction;
  }

  async consumeLockedDKPWithinTransaction(
    playerId: string,
    auctionId: string,
    client: Prisma.TransactionClient,
  ): Promise<ConsumedDkpLockResult> {
    const lock = await this.repository.findLockByPlayerAndAuction(playerId, auctionId, client);

    if (!lock) {
      throw new InvalidDkpLockException(`No DKP lock exists for player ${playerId} and auction ${auctionId}.`);
    }

    if (lock.released) {
      throw new InvalidDkpLockException(`DKP lock ${lock.id} has already been released.`);
    }

    const snapshot = await this.getSnapshot(playerId, client);

    if (snapshot.total - lock.amount < 0) {
      throw new InsufficientDkpException(playerId);
    }

    const auction = await client.auction.findUnique({
      where: { id: auctionId },
      select: { createdById: true },
    });

    if (!auction) {
      throw new InvalidDkpLockException(`Auction ${auctionId} was not found.`);
    }

    const transaction = await this.repository.createTransaction(
      {
        player: { connect: { id: playerId } },
        amount: -lock.amount,
        type: DKPTransactionType.AUCTION_WIN,
        referenceId: auctionId,
        createdBy: { connect: { id: auction.createdById } },
      },
      client,
    );

    const releasedLock = await this.repository.releaseLock(lock.id, client);

    return { transaction, releasedLock };
  }

  async refundAuctionLocks(auctionId: string): Promise<DKPLock[]> {
    const releasedLocks = await this.releaseAuctionLocks(auctionId);

    await this.auditDkpChange(undefined, 'DKP_AUCTION_LOCKS_REFUNDED', 'Auction', auctionId, {
      releasedLockIds: releasedLocks.map((lock) => lock.id),
    });

    return releasedLocks;
  }

  private async releaseAuctionLocks(auctionId: string): Promise<DKPLock[]> {
    return this.repository.client.$transaction(
      async (tx) => this.releaseAuctionLocksWithinTransaction(auctionId, tx),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async releaseAuctionLocksWithinTransaction(
    auctionId: string,
    client: Prisma.TransactionClient,
    excludedPlayerId?: string,
  ): Promise<DKPLock[]> {
    const locks = await this.repository.findActiveAuctionLocks(auctionId, client);
    const releasedLocks: DKPLock[] = [];

    for (const lock of locks) {
      if (lock.playerId !== excludedPlayerId) {
        releasedLocks.push(await this.repository.releaseLock(lock.id, client));
      }
    }

    return releasedLocks;
  }

  private async getSnapshot(playerId: string, client: Prisma.TransactionClient): Promise<DkpSnapshot> {
    const [total, locked] = await Promise.all([
      this.repository.sumTransactions(playerId, client),
      this.repository.sumActiveLocks(playerId, client),
    ]);

    return {
      total,
      locked,
      available: total - locked,
    };
  }

  private async syncOpenAllInLocksWithinTransaction(
    playerId: string,
    client: Prisma.TransactionClient,
    transactionId: string,
  ): Promise<void> {
    const locks = await client.dKPLock.findMany({
      where: {
        playerId,
        released: false,
        auction: {
          auctionMode: AuctionMode.ALL_IN,
          status: AuctionStatus.OPEN,
        },
      },
      include: {
        auction: {
          select: {
            id: true,
            itemName: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    for (const lock of locks) {
      const snapshot = await this.getSnapshot(playerId, client);

      if (snapshot.available <= 0) {
        return;
      }

      const nextAmount = lock.amount + snapshot.available;
      await this.repository.updateLockAmount(lock.id, nextAmount, client);
      await client.auctionBid.updateMany({
        where: {
          auctionId: lock.auctionId,
          playerId,
          isValid: true,
        },
        data: {
          bidAmount: nextAmount,
        },
      });

      await this.auditService.logWithinTransaction({
        action: 'DKP_ALL_IN_BID_AUTO_INCREASED',
        targetType: 'DKPLock',
        targetId: lock.id,
        metadata: {
          playerId,
          auctionId: lock.auctionId,
          auctionName: lock.auction.itemName,
          transactionId,
          previousAmount: lock.amount,
          nextAmount,
        },
      }, client);
    }
  }

  private assertValidTransaction(data: CreateDkpTransactionDto): void {
    if (!data.playerId || !data.createdById) {
      throw new InvalidDkpTransactionException('A DKP transaction requires playerId and createdById.');
    }

    if (!Number.isInteger(data.amount) || data.amount === 0) {
      throw new InvalidDkpTransactionException('DKP transaction amount must be a non-zero integer.');
    }

    if (!Object.values(DKPTransactionType).includes(data.type)) {
      throw new InvalidDkpTransactionException('DKP transaction type is invalid.');
    }
  }

  private async buildDecaySimulation(data: PreviewDkpDecaySimulationDto, persisted: boolean): Promise<DkpDecaySimulationSummary> {
    const percent = Math.max(1, Math.min(100, Math.trunc(data.percent)));
    const minimumDkp = Math.max(0, Math.trunc(data.minimumDkp ?? 0));
    const rows = await this.getActiveDkpRows();
    const projected = rows.map((row) => {
      const eligibleAmount = Math.max(0, row.total - minimumDkp);
      const reduced = Math.floor((eligibleAmount * percent) / 100);
      return {
        ...row,
        after: row.total - reduced,
        reduced,
      };
    });
    const totalBefore = rows.reduce((sum, row) => sum + row.total, 0);
    const totalAfter = projected.reduce((sum, row) => sum + row.after, 0);
    const topImpacted = projected
      .filter((row) => row.reduced > 0)
      .sort((a, b) => b.reduced - a.reduced || b.total - a.total || a.nickname.localeCompare(b.nickname))
      .slice(0, 15)
      .map((row) => ({
        playerId: row.playerId,
        nickname: row.nickname,
        before: row.total,
        after: row.after,
        reduced: row.reduced,
      }));
    const summary: DkpDecaySimulationSummary = {
      generatedAt: new Date(),
      persisted,
      config: { percent, minimumDkp },
      totals: {
        players: rows.length,
        affectedPlayers: projected.filter((row) => row.reduced > 0).length,
        totalBefore,
        totalAfter,
        totalReduced: totalBefore - totalAfter,
      },
      distributionBefore: this.buildDkpDistribution(rows),
      distributionAfter: this.buildDkpDistribution(projected.map((row) => ({ total: row.after }))),
      topImpacted,
      markdown: '',
    };

    return {
      ...summary,
      markdown: this.buildDecayMarkdown(summary),
    };
  }

  private async buildBidPolicySimulation(data: PreviewDkpBidPolicySimulationDto, persisted: boolean): Promise<DkpBidPolicySimulationSummary> {
    const config = {
      minimumCost: Math.max(0, Math.trunc(data.minimumCost ?? 0)),
      winTaxPercent: Math.max(0, Math.min(100, Math.trunc(data.winTaxPercent ?? 0))),
      tierCaps: this.sanitizeCapMap(data.tierCaps, Object.values(ItemTier)),
      itemTypeCaps: this.sanitizeCapMap(data.itemTypeCaps, Object.values(ItemType)),
      layerCaps: this.sanitizeCapMap(data.layerCaps, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']),
      fixedCostByTier: this.sanitizeCapMap(data.fixedCostByTier, Object.values(ItemTier)),
      modeMultiplierPercent: this.sanitizeCapMap(data.modeMultiplierPercent, Object.values(AuctionMode), 100),
    };
    const auctions = await this.repository.client.auction.findMany({
      where: {
        status: AuctionStatus.FINISHED,
      },
      orderBy: { endsAt: 'desc' },
      take: 200,
    });
    const auctionIds = auctions.map((auction) => auction.id);
    const winTransactions = await this.repository.client.dKPTransaction.findMany({
      where: {
        type: DKPTransactionType.AUCTION_WIN,
        referenceId: { in: auctionIds },
      },
      include: {
        player: {
          select: {
            id: true,
            nickname: true,
            dimensionalLayer: true,
          },
        },
      },
    });
    const winByAuction = new Map(winTransactions.map((transaction) => [transaction.referenceId, transaction]));
    const rows: DkpBidPolicySimulationSummary['rows'] = [];

    for (const auction of auctions) {
      if (!auction.itemTier || !auction.itemType) continue;
      const win = winByAuction.get(auction.id);
      if (!win?.player) continue;
      const currentCost = Math.abs(win.amount);
      const winnerLayer = win.player.dimensionalLayer;
      const caps = [
        config.tierCaps[auction.itemTier],
        config.itemTypeCaps[auction.itemType],
        config.layerCaps[String(winnerLayer)],
      ].filter((value): value is number => Number.isInteger(value) && value > 0);
      const capApplied = caps.length > 0 ? Math.min(...caps) : null;
      const cappedBase = capApplied ? Math.min(currentCost, capApplied) : currentCost;
      const fixedCost = config.fixedCostByTier[auction.itemTier] ?? 0;
      const modeMultiplier = config.modeMultiplierPercent[auction.auctionMode] ?? 100;
      const taxAmount = Math.floor((cappedBase * config.winTaxPercent) / 100);
      const multiplied = Math.floor(((cappedBase + fixedCost + taxAmount) * modeMultiplier) / 100);
      const proposedCost = Math.max(config.minimumCost, multiplied);
      rows.push({
        auctionId: auction.id,
        itemName: auction.itemName,
        itemTier: auction.itemTier,
        itemType: auction.itemType,
        auctionMode: auction.auctionMode,
        winnerPlayerId: win.player.id,
        winnerNickname: win.player.nickname,
        winnerLayer,
        currentCost,
        proposedCost,
        delta: proposedCost - currentCost,
        capApplied,
        floorApplied: proposedCost === config.minimumCost && config.minimumCost > multiplied,
        taxAmount,
      });
    }

    const totals = {
      auctionsAnalyzed: rows.length,
      changedAuctions: rows.filter((row) => row.delta !== 0).length,
      currentSpent: rows.reduce((sum, row) => sum + row.currentCost, 0),
      proposedSpent: rows.reduce((sum, row) => sum + row.proposedCost, 0),
      delta: rows.reduce((sum, row) => sum + row.delta, 0),
      cappedAuctions: rows.filter((row) => row.capApplied !== null && row.currentCost > (row.capApplied ?? 0)).length,
      raisedByFloorAuctions: rows.filter((row) => row.floorApplied).length,
    };
    const risks = this.buildBidPolicyRisks(totals, rows);
    const summary: DkpBidPolicySimulationSummary = {
      generatedAt: new Date(),
      persisted,
      config,
      totals,
      rows: rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
      risks,
      markdown: '',
    };

    return {
      ...summary,
      markdown: this.buildBidPolicyMarkdown(summary),
    };
  }

  private sanitizeCapMap(input: Record<string, number> | undefined, allowedKeys: string[], defaultValue?: number): Record<string, number> {
    const output: Record<string, number> = {};
    for (const key of allowedKeys) {
      const value = input?.[key] ?? defaultValue;
      if (value === undefined) continue;
      const normalized = Math.max(0, Math.trunc(Number(value) || 0));
      if (normalized > 0) {
        output[key] = normalized;
      }
    }
    return output;
  }

  private buildBidPolicyRisks(
    totals: DkpBidPolicySimulationSummary['totals'],
    rows: DkpBidPolicySimulationSummary['rows'],
  ): DkpBidPolicySimulationSummary['risks'] {
    const reductionPercent = totals.currentSpent > 0 ? Math.round((Math.abs(Math.min(0, totals.delta)) / totals.currentSpent) * 100) : 0;
    const increasePercent = totals.currentSpent > 0 ? Math.round((Math.max(0, totals.delta) / totals.currentSpent) * 100) : 0;
    const allInChanged = rows.filter((row) => row.auctionMode === AuctionMode.ALL_IN && row.delta !== 0).length;
    return [
      {
        key: 'spend-delta',
        label: 'Mudanca de gasto historico',
        detail: totals.delta >= 0
          ? `A regra aumentaria gasto historico em ${increasePercent}%.`
          : `A regra reduziria gasto historico em ${reductionPercent}%.`,
        severity: reductionPercent >= 40 || increasePercent >= 40 ? 'danger' : reductionPercent >= 20 || increasePercent >= 20 ? 'warning' : 'info',
      },
      {
        key: 'caps',
        label: 'Leiloes capados',
        detail: `${totals.cappedAuctions}/${totals.auctionsAnalyzed} leiloes ficariam abaixo do custo real por teto.`,
        severity: totals.auctionsAnalyzed > 0 && totals.cappedAuctions / totals.auctionsAnalyzed > 0.4 ? 'warning' : 'info',
      },
      {
        key: 'floors',
        label: 'Floor elevando custo',
        detail: `${totals.raisedByFloorAuctions} leiloes subiriam por custo minimo.`,
        severity: totals.raisedByFloorAuctions > 5 ? 'warning' : 'info',
      },
      {
        key: 'all-in',
        label: 'Impacto em ALL IN',
        detail: `${allInChanged} leiloes ALL IN teriam custo diferente.`,
        severity: allInChanged > 0 ? 'warning' : 'info',
      },
    ];
  }

  private buildBidPolicyMarkdown(summary: Omit<DkpBidPolicySimulationSummary, 'markdown'>): string {
    const lines = [
      '# Simulacao de politica de bid',
      '',
      `- Leiloes analisados: ${summary.totals.auctionsAnalyzed}`,
      `- Gasto atual/proposto: ${summary.totals.currentSpent}/${summary.totals.proposedSpent}`,
      `- Delta: ${summary.totals.delta}`,
      `- Capados/floor: ${summary.totals.cappedAuctions}/${summary.totals.raisedByFloorAuctions}`,
      '',
      '## Riscos e trade-offs',
      '',
      ...summary.risks.map((risk) => `- ${risk.label}: ${risk.detail} (${risk.severity})`),
      '',
      '## Maiores impactos',
      '',
      ...(summary.rows.length
        ? summary.rows.slice(0, 15).map((row, index) => `${index + 1}. ${row.itemName} (${row.winnerNickname}): ${row.currentCost} -> ${row.proposedCost} (${row.delta >= 0 ? '+' : ''}${row.delta})`)
        : ['- Nenhum leilao historico analisavel.']),
    ];

    return lines.join('\n');
  }

  private asJsonRecord(value: Prisma.JsonValue): Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  }

  private async getActiveDkpRows(): Promise<Array<{ playerId: string; nickname: string; total: number; locked: number; available: number }>> {
    const [players, transactions, locks] = await Promise.all([
      this.repository.client.player.findMany({
        where: { isActive: true },
        select: {
          id: true,
          nickname: true,
        },
        orderBy: { nickname: 'asc' },
        take: 500,
      }),
      this.repository.client.dKPTransaction.findMany({
        select: {
          playerId: true,
          amount: true,
        },
        take: 20000,
      }),
      this.repository.client.dKPLock.findMany({
        where: { released: false },
        select: {
          playerId: true,
          amount: true,
        },
      }),
    ]);
    const totalByPlayer = new Map<string, number>();
    for (const transaction of transactions) {
      totalByPlayer.set(transaction.playerId, (totalByPlayer.get(transaction.playerId) ?? 0) + transaction.amount);
    }
    const lockedByPlayer = new Map<string, number>();
    for (const lock of locks) {
      lockedByPlayer.set(lock.playerId, (lockedByPlayer.get(lock.playerId) ?? 0) + lock.amount);
    }

    return players.map((player) => {
      const total = totalByPlayer.get(player.id) ?? 0;
      const locked = lockedByPlayer.get(player.id) ?? 0;
      return {
        playerId: player.id,
        nickname: player.nickname,
        total,
        locked,
        available: total - locked,
      };
    });
  }

  private buildDecayMarkdown(summary: Omit<DkpDecaySimulationSummary, 'markdown'>): string {
    const lines = [
      '# Simulacao de decay DKP',
      '',
      `- Percentual: ${summary.config.percent}%`,
      `- Piso protegido: ${summary.config.minimumDkp} DKP`,
      `- Players afetados: ${summary.totals.affectedPlayers}/${summary.totals.players}`,
      `- DKP antes/depois: ${summary.totals.totalBefore}/${summary.totals.totalAfter}`,
      `- DKP removido: ${summary.totals.totalReduced}`,
      '',
      '## Mais impactados',
      '',
      ...(summary.topImpacted.length
        ? summary.topImpacted.map((row, index) => `${index + 1}. ${row.nickname}: -${row.reduced} DKP (${row.before} -> ${row.after})`)
        : ['- Nenhum player seria impactado.']),
    ];

    return lines.join('\n');
  }

  private median(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }

    const middle = Math.floor(values.length / 2);
    if (values.length % 2 === 1) {
      return values[middle];
    }

    return Math.round((values[middle - 1] + values[middle]) / 2);
  }

  private buildDkpDistribution(rows: Array<{ total: number }>): DkpEconomySummary['distribution'] {
    const buckets: DkpEconomySummary['distribution'] = [
      { bucket: '<0', min: Number.NEGATIVE_INFINITY, max: -1, players: 0, totalDkp: 0 },
      { bucket: '0-99', min: 0, max: 99, players: 0, totalDkp: 0 },
      { bucket: '100-249', min: 100, max: 249, players: 0, totalDkp: 0 },
      { bucket: '250-499', min: 250, max: 499, players: 0, totalDkp: 0 },
      { bucket: '500-999', min: 500, max: 999, players: 0, totalDkp: 0 },
      { bucket: '1000+', min: 1000, max: null, players: 0, totalDkp: 0 },
    ];

    for (const row of rows) {
      const bucket = buckets.find((candidate) => row.total >= candidate.min && (candidate.max === null || row.total <= candidate.max)) ?? buckets[buckets.length - 1];
      bucket.players += 1;
      bucket.totalDkp += row.total;
    }

    return buckets.map((bucket) => ({
      ...bucket,
      min: bucket.min === Number.NEGATIVE_INFINITY ? -999999 : bucket.min,
    }));
  }

  private buildEconomySignals(data: {
    activePlayers: number;
    averageDkp: number;
    medianDkp: number;
    top10DkpSharePercent: number;
    recentActivePlayers: number;
    inactiveHighDkpPlayersCount: number;
    auctionWinnerDiversity: number;
    auctionSpentDkp: number;
    netDkp: number;
  }): DkpEconomySummary['signals'] {
    return [
      {
        key: 'concentration',
        label: 'Concentracao nos top 10',
        detail: `${data.top10DkpSharePercent}% do DKP positivo esta nos 10 maiores saldos.`,
        severity: data.top10DkpSharePercent >= 70 ? 'danger' : data.top10DkpSharePercent >= 50 ? 'warning' : 'info',
      },
      {
        key: 'inflation',
        label: 'Pressao inflacionaria',
        detail: `Media ${data.averageDkp} DKP, mediana ${data.medianDkp} DKP, liquido ${data.netDkp} DKP.`,
        severity: data.averageDkp > data.medianDkp * 2 && data.averageDkp > 100 ? 'warning' : 'info',
      },
      {
        key: 'inactive-hoarders',
        label: 'DKP alto com baixa atividade',
        detail: `${data.inactiveHighDkpPlayersCount} player(s) com saldo alto e sem atividade recente detectada.`,
        severity: data.inactiveHighDkpPlayersCount > 3 ? 'danger' : data.inactiveHighDkpPlayersCount > 0 ? 'warning' : 'info',
      },
      {
        key: 'winner-rotation',
        label: 'Rotatividade de vencedores',
        detail: `${data.auctionWinnerDiversity} vencedor(es) unico(s) consumiram DKP nos ultimos 30 dias.`,
        severity: data.auctionSpentDkp > 0 && data.auctionWinnerDiversity <= 2 ? 'warning' : 'info',
      },
      {
        key: 'recent-activity',
        label: 'Atividade recente',
        detail: `${data.recentActivePlayers}/${data.activePlayers} players ativos tiveram presenca ou DKP nos ultimos 30 dias.`,
        severity: data.activePlayers > 0 && data.recentActivePlayers / data.activePlayers < 0.4 ? 'warning' : 'info',
      },
    ];
  }

  private buildEconomyMarkdown(summary: Omit<DkpEconomySummary, 'markdown'>): string {
    const lines = [
      '# Snapshot economico de DKP',
      '',
      `- Gerado em: ${summary.generatedAt.toISOString()}`,
      `- Players ativos: ${summary.activePlayers}`,
      `- DKP liquido: ${summary.netDkp}`,
      `- DKP travado: ${summary.totalLockedDkp}`,
      `- Media/mediana: ${summary.averageDkp}/${summary.medianDkp}`,
      `- Top 10 concentram: ${summary.top10DkpSharePercent}%`,
      '',
      '## Sinais',
      '',
      ...summary.signals.map((signal) => `- ${signal.label}: ${signal.detail} (${signal.severity})`),
      '',
      '## Distribuicao',
      '',
      ...summary.distribution.map((row) => `- ${row.bucket}: ${row.players} player(s), ${row.totalDkp} DKP`),
      '',
      '## Maiores saldos',
      '',
      ...summary.topBalances.map((row, index) => `${index + 1}. ${row.nickname}: ${row.total} DKP (${row.locked} travado)`),
      '',
      '## Saldo alto com baixa atividade',
      '',
      ...(summary.inactiveHighDkpPlayers.length
        ? summary.inactiveHighDkpPlayers.map((row) => `- ${row.nickname}: ${row.total} DKP, ultima atividade ${row.lastActivityAt?.toISOString() ?? 'desconhecida'}`)
        : ['- Nenhum caso detectado.']),
    ];

    return lines.join('\n');
  }

  private assertPositiveAmount(amount: number, message: string): void {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new InvalidDkpLockException(message);
    }
  }

  private getTransactionAuditAction(type: DKPTransactionType): string {
    if (type === DKPTransactionType.ADMIN_ADJUSTMENT) {
      return 'DKP_ADMIN_ADJUSTMENT_CREATED';
    }

    return 'DKP_TRANSACTION_CREATED';
  }

  private async auditDkpChange(
    actorId: string | undefined,
    action: string,
    targetType: string,
    targetId: string,
    metadata: Prisma.InputJsonObject,
  ): Promise<void> {
    await this.auditService.log({
      actorId,
      action,
      targetType,
      targetId,
      metadata,
    });
  }
}
