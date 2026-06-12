import { Injectable } from '@nestjs/common';
import { AuctionMode, AuctionStatus, DKPLock, DKPTransaction, DKPTransactionType, Prisma } from '@prisma/client';
import { AuditService } from '../../audit/services/audit.service';
import { CreateDkpTransactionDto } from '../dto';
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
  topBalances: DkpLeaderboardRow[];
  topEarners: Array<{ playerId: string; nickname: string; amount: number }>;
  topSpenders: Array<{ playerId: string; nickname: string; amount: number }>;
};

@Injectable()
export class DkpService {
  constructor(
    private readonly repository: DkpRepository,
    private readonly auditService: AuditService,
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
    const [activePlayers, positive, negative, locks, eventRewards, auctionWins, adminAdjustments, transactions, topBalances] = await Promise.all([
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

    return {
      generatedAt: new Date(),
      activePlayers,
      totalPositiveDkp: positive._sum.amount ?? 0,
      totalNegativeDkp: Math.abs(negative._sum.amount ?? 0),
      netDkp: (positive._sum.amount ?? 0) + (negative._sum.amount ?? 0),
      totalLockedDkp: locks._sum.amount ?? 0,
      eventRewardDkp: eventRewards._sum.amount ?? 0,
      auctionSpentDkp: Math.abs(auctionWins._sum.amount ?? 0),
      adminAdjustmentDkp: adminAdjustments._sum.amount ?? 0,
      topBalances,
      topEarners: [...earned.values()].sort((a, b) => b.amount - a.amount).slice(0, 10),
      topSpenders: [...spent.values()].sort((a, b) => b.amount - a.amount).slice(0, 10),
    };
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
