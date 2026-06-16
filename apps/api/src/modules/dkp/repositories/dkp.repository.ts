import { Injectable } from '@nestjs/common';
import { DKPLock, DKPTransaction, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';

type DkpClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class DkpRepository {
  constructor(private readonly prisma: PrismaService) {}

  health(): { module: string; ready: boolean } {
    return { module: 'dkp', ready: true };
  }

  get client(): PrismaService {
    return this.prisma;
  }

  async sumTransactions(playerId: string, client: DkpClient = this.prisma): Promise<number> {
    const aggregate = await client.dKPTransaction.aggregate({
      where: { playerId },
      _sum: { amount: true },
    });

    return aggregate._sum.amount ?? 0;
  }

  async sumActiveLocks(playerId: string, client: DkpClient = this.prisma): Promise<number> {
    const aggregate = await client.dKPLock.aggregate({
      where: {
        playerId,
        released: false,
      },
      _sum: { amount: true },
    });

    return aggregate._sum.amount ?? 0;
  }

  async findLockByPlayerAndAuction(
    playerId: string,
    auctionId: string,
    client: DkpClient = this.prisma,
  ): Promise<DKPLock | null> {
    return client.dKPLock.findUnique({
      where: {
        playerId_auctionId: {
          playerId,
          auctionId,
        },
      },
    });
  }

  async findLockById(lockId: string, client: DkpClient = this.prisma): Promise<DKPLock | null> {
    return client.dKPLock.findUnique({
      where: { id: lockId },
    });
  }

  async findActiveAuctionLocks(auctionId: string, client: DkpClient = this.prisma): Promise<DKPLock[]> {
    return client.dKPLock.findMany({
      where: {
        auctionId,
        released: false,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createTransaction(
    data: Prisma.DKPTransactionCreateInput,
    client: DkpClient = this.prisma,
  ): Promise<DKPTransaction> {
    return client.dKPTransaction.create({ data });
  }

  async createLock(data: Prisma.DKPLockCreateInput, client: DkpClient = this.prisma): Promise<DKPLock> {
    return client.dKPLock.create({ data });
  }

  async releaseLock(lockId: string, client: DkpClient = this.prisma): Promise<DKPLock> {
    return client.dKPLock.update({
      where: { id: lockId },
      data: { released: true },
    });
  }

  async updateLockAmount(lockId: string, amount: number, client: DkpClient = this.prisma): Promise<DKPLock> {
    return client.dKPLock.update({
      where: { id: lockId },
      data: { amount },
    });
  }

  async reactivateLock(lockId: string, amount: number, client: DkpClient = this.prisma): Promise<DKPLock> {
    return client.dKPLock.update({
      where: { id: lockId },
      data: {
        amount,
        released: false,
      },
    });
  }
}
