import { Injectable } from '@nestjs/common';
import { Auction, AuctionStatus, DKPLock, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';

type AutomationClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class AutomationRepository {
  constructor(private readonly prisma: PrismaService) {}

  get client(): PrismaService {
    return this.prisma;
  }

  async findExpiredOpenAuctions(now = new Date(), client: AutomationClient = this.prisma): Promise<Auction[]> {
    return client.auction.findMany({
      where: {
        status: AuctionStatus.OPEN,
        endsAt: { lte: now },
      },
      orderBy: { endsAt: 'asc' },
    });
  }

  async findOpenAuctionsEndingSoon(until: Date, now = new Date(), client: AutomationClient = this.prisma): Promise<Auction[]> {
    return client.auction.findMany({
      where: {
        status: AuctionStatus.OPEN,
        endsAt: {
          gt: now,
          lte: until,
        },
      },
      orderBy: { endsAt: 'asc' },
    });
  }

  async findRelistedAuctionsReadyToReopen(now = new Date(), client: AutomationClient = this.prisma): Promise<Auction[]> {
    return client.auction.findMany({
      where: {
        status: AuctionStatus.RELISTED,
        reopensAt: { lte: now },
      },
      orderBy: { reopensAt: 'asc' },
    });
  }

  async findInvalidOpenAuctions(client: AutomationClient = this.prisma): Promise<Auction[]> {
    return client.auction.findMany({
      where: {
        status: AuctionStatus.OPEN,
        OR: [
          { endsAt: { lt: new Date('2000-01-01T00:00:00.000Z') } },
          { minimumBid: { lt: 0 } },
        ],
      },
    });
  }

  async findActiveLocksForTerminalAuctions(client: AutomationClient = this.prisma): Promise<DKPLock[]> {
    return client.dKPLock.findMany({
      where: {
        released: false,
        auction: {
          status: {
            in: [AuctionStatus.CANCELLED, AuctionStatus.FINISHED, AuctionStatus.RELISTED],
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async releaseLock(lockId: string, client: AutomationClient = this.prisma): Promise<DKPLock> {
    return client.dKPLock.update({
      where: { id: lockId },
      data: { released: true },
    });
  }

  async countValidBids(auctionId: string, client: AutomationClient = this.prisma): Promise<number> {
    return client.auctionBid.count({
      where: {
        auctionId,
        isValid: true,
      },
    });
  }

  async countActiveLocks(auctionId: string, client: AutomationClient = this.prisma): Promise<number> {
    return client.dKPLock.count({
      where: {
        auctionId,
        released: false,
      },
    });
  }

  async findFinishedAuctionsWithActiveLocks(client: AutomationClient = this.prisma): Promise<Auction[]> {
    return client.auction.findMany({
      where: {
        status: AuctionStatus.FINISHED,
        dkpLocks: {
          some: { released: false },
        },
      },
    });
  }

  async findPendingReviews(client: AutomationClient = this.prisma): Promise<Auction[]> {
    return client.auction.findMany({
      where: { status: AuctionStatus.PENDING_REVIEW },
      orderBy: { endsAt: 'asc' },
    });
  }
}
