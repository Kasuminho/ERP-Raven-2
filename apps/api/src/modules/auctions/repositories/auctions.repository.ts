import { Injectable } from '@nestjs/common';
import { Auction, AuctionBid, AuctionStatus, ItemCatalog, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';

type AuctionClient = PrismaService | Prisma.TransactionClient;

export type AuctionDetails = Prisma.AuctionGetPayload<{
  include: {
    itemCatalog: true;
    bids: {
      include: {
        player: true;
      };
    };
    dkpLocks: true;
  };
}>;

export type PublicAuctionDetails = Prisma.AuctionGetPayload<{
  include: {
    itemCatalog: true;
  };
}>;

@Injectable()
export class AuctionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  health(): { module: string; ready: boolean } {
    return { module: 'auctions', ready: true };
  }

  get client(): PrismaService {
    return this.prisma;
  }

  async create(data: Prisma.AuctionCreateInput, client: AuctionClient = this.prisma): Promise<Auction> {
    return client.auction.create({ data });
  }

  async findById(auctionId: string, client: AuctionClient = this.prisma): Promise<Auction | null> {
    return client.auction.findUnique({
      where: { id: auctionId },
    });
  }

  async findDetailsById(auctionId: string, client: AuctionClient = this.prisma): Promise<AuctionDetails | null> {
    return client.auction.findUnique({
      where: { id: auctionId },
      include: {
        itemCatalog: true,
        bids: {
          include: {
            player: true,
          },
          orderBy: [{ bidAmount: 'desc' }, { createdAt: 'asc' }],
        },
        dkpLocks: true,
      },
    });
  }

  async findPublicDetailsById(auctionId: string, client: AuctionClient = this.prisma): Promise<PublicAuctionDetails | null> {
    return client.auction.findUnique({
      where: { id: auctionId },
      include: { itemCatalog: true },
    });
  }

  async findActive(now = new Date(), client: AuctionClient = this.prisma): Promise<Array<Auction & { itemCatalog: ItemCatalog | null }>> {
    return client.auction.findMany({
      where: {
        status: AuctionStatus.OPEN,
        endsAt: { gt: now },
      },
      include: { itemCatalog: true },
      orderBy: { endsAt: 'asc' },
    });
  }

  async findReadyToFinalize(now = new Date(), client: AuctionClient = this.prisma): Promise<Auction[]> {
    return client.auction.findMany({
      where: {
        status: AuctionStatus.OPEN,
        endsAt: { lte: now },
      },
      orderBy: { endsAt: 'asc' },
    });
  }

  async findReadyToReopen(now = new Date(), client: AuctionClient = this.prisma): Promise<Auction[]> {
    return client.auction.findMany({
      where: {
        status: AuctionStatus.RELISTED,
        reopensAt: { lte: now },
      },
      orderBy: { reopensAt: 'asc' },
    });
  }

  async findBidByPlayerAndAuction(
    playerId: string,
    auctionId: string,
    client: AuctionClient = this.prisma,
  ): Promise<AuctionBid | null> {
    return client.auctionBid.findUnique({
      where: {
        auctionId_playerId: {
          auctionId,
          playerId,
        },
      },
    });
  }

  async findBids(auctionId: string, client: AuctionClient = this.prisma): Promise<AuctionBid[]> {
    return client.auctionBid.findMany({
      where: { auctionId },
      orderBy: [{ bidAmount: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async findValidBidsWithPlayers(
    auctionId: string,
    client: AuctionClient = this.prisma,
  ): Promise<Array<AuctionBid & { player: { dimensionalLayer: number } }>> {
    return client.auctionBid.findMany({
      where: {
        auctionId,
        isValid: true,
      },
      include: {
        player: {
          select: {
            dimensionalLayer: true,
          },
        },
      },
      orderBy: [{ bidAmount: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async createBid(data: Prisma.AuctionBidCreateInput, client: AuctionClient = this.prisma): Promise<AuctionBid> {
    return client.auctionBid.create({ data });
  }

  async updateBidAmount(
    bidId: string,
    bidAmount: number,
    client: AuctionClient = this.prisma,
  ): Promise<AuctionBid> {
    return client.auctionBid.update({
      where: { id: bidId },
      data: { bidAmount },
    });
  }

  async reactivateBid(
    bidId: string,
    bidAmount: number,
    client: AuctionClient = this.prisma,
  ): Promise<AuctionBid> {
    return client.auctionBid.update({
      where: { id: bidId },
      data: {
        bidAmount,
        isValid: true,
      },
    });
  }

  async updateStatus(
    auctionId: string,
    status: AuctionStatus,
    client: AuctionClient = this.prisma,
  ): Promise<Auction> {
    return client.auction.update({
      where: { id: auctionId },
      data: { status },
    });
  }

  async update(auctionId: string, data: Prisma.AuctionUpdateInput, client: AuctionClient = this.prisma): Promise<Auction> {
    return client.auction.update({
      where: { id: auctionId },
      data,
    });
  }
}
