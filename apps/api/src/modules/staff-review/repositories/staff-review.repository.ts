import { Injectable } from '@nestjs/common';
import { AuditLog, Auction, AuctionBid, AuctionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';

type StaffReviewClient = PrismaService | Prisma.TransactionClient;

export type StaffAuctionReviewDetails = Prisma.AuctionGetPayload<{
  include: {
    bids: {
      include: {
        player: true;
      };
    };
    dkpLocks: true;
    createdBy: true;
    reviewVotes: {
      include: {
        voter: {
          select: {
            id: true;
            discordUsername: true;
            discordNickname: true;
          };
        };
      };
    };
  };
}>;

export type StaffAuctionReviewTimelineItem = AuditLog;

@Injectable()
export class StaffReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  get client(): PrismaService {
    return this.prisma;
  }

  async findPendingReviews(client: StaffReviewClient = this.prisma): Promise<Auction[]> {
    return client.auction.findMany({
      where: { status: AuctionStatus.PENDING_REVIEW },
      orderBy: { endsAt: 'asc' },
    });
  }

  async findAuction(auctionId: string, client: StaffReviewClient = this.prisma): Promise<Auction | null> {
    return client.auction.findUnique({
      where: { id: auctionId },
    });
  }

  async findAuctionReviewDetails(
    auctionId: string,
    client: StaffReviewClient = this.prisma,
  ): Promise<StaffAuctionReviewDetails | null> {
    return client.auction.findUnique({
      where: { id: auctionId },
      include: {
        bids: {
          include: { player: true },
          orderBy: [{ isValid: 'desc' }, { bidAmount: 'desc' }, { createdAt: 'asc' }],
        },
        dkpLocks: true,
        createdBy: true,
        reviewVotes: {
          include: {
            voter: {
              select: {
                id: true,
                discordUsername: true,
                discordNickname: true,
              },
            },
          },
          orderBy: { updatedAt: 'asc' },
        },
      },
    });
  }

  async findBid(bidId: string, client: StaffReviewClient = this.prisma): Promise<AuctionBid | null> {
    return client.auctionBid.findUnique({
      where: { id: bidId },
    });
  }

  async findValidBid(
    auctionId: string,
    playerId: string,
    client: StaffReviewClient = this.prisma,
  ): Promise<AuctionBid | null> {
    return client.auctionBid.findFirst({
      where: {
        auctionId,
        playerId,
        isValid: true,
      },
    });
  }

  async updateAuctionStatus(
    auctionId: string,
    status: AuctionStatus,
    client: StaffReviewClient = this.prisma,
  ): Promise<Auction> {
    return client.auction.update({
      where: { id: auctionId },
      data: { status },
    });
  }

  async updateAuction(
    auctionId: string,
    data: Prisma.AuctionUpdateInput,
    client: StaffReviewClient = this.prisma,
  ): Promise<Auction> {
    return client.auction.update({
      where: { id: auctionId },
      data,
    });
  }

  async invalidateBid(bidId: string, client: StaffReviewClient = this.prisma): Promise<AuctionBid> {
    return client.auctionBid.update({
      where: { id: bidId },
      data: { isValid: false },
    });
  }

  async findActiveLock(
    auctionId: string,
    playerId: string,
    client: StaffReviewClient = this.prisma,
  ) {
    return client.dKPLock.findFirst({
      where: {
        auctionId,
        playerId,
        released: false,
      },
    });
  }

  async findReviewTimeline(auctionId: string, client: StaffReviewClient = this.prisma): Promise<AuditLog[]> {
    return client.auditLog.findMany({
      where: {
        targetType: 'Auction',
        targetId: auctionId,
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
