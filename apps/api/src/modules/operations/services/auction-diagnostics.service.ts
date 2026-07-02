import { Injectable } from '@nestjs/common';
import { DKPTransactionType } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { OperationsService } from '../operations.service';
import {
  AuctionDiagnosticOption,
  AuctionDiagnosticSummary,
  AuctionDossier,
  AuctionFinalizationPreview,
  AuctionTimelineEvent,
  UniversalDossier,
  UniversalDossierType,
} from '../operations.types';

@Injectable()
export class AuctionDiagnosticsService {
  constructor(
    private readonly operations: OperationsService,
    private readonly prisma: PrismaService,
  ) {}

  async getAuctionDiagnosticOptions(): Promise<AuctionDiagnosticOption[]> {
    const auctions = await this.prisma.auction.findMany({
      select: {
        id: true,
        itemName: true,
        endsAt: true,
      },
      orderBy: { endsAt: 'desc' },
      take: 100,
    });

    const auctionIds = auctions.map((auction) => auction.id);
    const wins = auctionIds.length
      ? await this.prisma.dKPTransaction.findMany({
          where: {
            type: DKPTransactionType.AUCTION_WIN,
            referenceId: { in: auctionIds },
          },
          include: {
            player: {
              select: {
                nickname: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];
    const winnerByAuctionId = new Map(wins.map((win) => [win.referenceId, win.player.nickname]));

    return auctions.map((auction) => ({
      id: auction.id,
      itemName: auction.itemName,
      winnerName: winnerByAuctionId.get(auction.id) ?? null,
      endedAt: auction.endsAt,
    }));
  }

  getAuctionDiagnostics(auctionId: string): Promise<AuctionDiagnosticSummary> {
    return this.operations.getAuctionDiagnostics(auctionId);
  }

  getAuctionFinalizationPreview(auctionId: string): Promise<AuctionFinalizationPreview> {
    return this.operations.getAuctionFinalizationPreview(auctionId);
  }

  getAuctionDossier(auctionId: string): Promise<AuctionDossier> {
    return this.operations.getAuctionDossier(auctionId);
  }

  getUniversalDossier(type: UniversalDossierType, id: string): Promise<UniversalDossier> {
    return this.operations.getUniversalDossier(type, id);
  }

  getAuctionTimeline(auctionId: string): Promise<AuctionTimelineEvent[]> {
    return this.operations.getAuctionTimeline(auctionId);
  }
}
