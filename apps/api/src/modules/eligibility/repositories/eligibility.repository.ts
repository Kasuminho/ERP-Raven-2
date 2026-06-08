import { Injectable } from '@nestjs/common';
import { Auction, AuctionBid, Player, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';

type EligibilityClient = PrismaService | Prisma.TransactionClient;

export type AuctionBidWithPlayer = AuctionBid & {
  player: Pick<Player, 'id' | 'nickname' | 'dimensionalLayer' | 'attendancePercentage' | 'class' | 'isActive'>;
};

@Injectable()
export class EligibilityRepository {
  constructor(private readonly prisma: PrismaService) {}

  health(): { module: string; ready: boolean } {
    return { module: 'eligibility', ready: true };
  }

  get client(): PrismaService {
    return this.prisma;
  }

  async findAuction(auctionId: string, client: EligibilityClient = this.prisma): Promise<Auction | null> {
    return client.auction.findUnique({
      where: { id: auctionId },
    });
  }

  async findPlayer(playerId: string, client: EligibilityClient = this.prisma): Promise<Player | null> {
    return client.player.findUnique({
      where: { id: playerId },
    });
  }

  async findActivePlayers(client: EligibilityClient = this.prisma): Promise<Player[]> {
    return client.player.findMany({
      where: { isActive: true },
      orderBy: [{ dimensionalLayer: 'desc' }, { attendancePercentage: 'desc' }, { nickname: 'asc' }],
    });
  }

  async findValidAuctionBids(
    auctionId: string,
    client: EligibilityClient = this.prisma,
  ): Promise<AuctionBidWithPlayer[]> {
    return client.auctionBid.findMany({
      where: {
        auctionId,
        isValid: true,
      },
      include: {
        player: {
          select: {
            id: true,
            nickname: true,
            dimensionalLayer: true,
            attendancePercentage: true,
            class: true,
            isActive: true,
          },
        },
      },
      orderBy: [{ bidAmount: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async findValidBidByPlayerAndAuction(
    playerId: string,
    auctionId: string,
    client: EligibilityClient = this.prisma,
  ): Promise<AuctionBid | null> {
    return client.auctionBid.findFirst({
      where: {
        playerId,
        auctionId,
        isValid: true,
      },
    });
  }

  async findInterestedLayers(auctionId: string, client: EligibilityClient = this.prisma): Promise<number[]> {
    const bids = await client.auctionBid.findMany({
      where: {
        auctionId,
        isValid: true,
      },
      select: {
        player: {
          select: {
            dimensionalLayer: true,
          },
        },
      },
    });

    return bids.map((bid) => bid.player.dimensionalLayer);
  }
}
