import { Injectable } from '@nestjs/common';
import { Auction } from '@prisma/client';
import { AuctionsRepository } from '../repositories/auctions.repository';
import { AuctionsService } from '../services/auctions.service';

@Injectable()
export class AuctionAutomationService {
  constructor(
    private readonly repository: AuctionsRepository,
    private readonly auctionsService: AuctionsService,
  ) {}

  async getAuctionsReadyForFinalization(now = new Date()): Promise<Auction[]> {
    return this.repository.findReadyToFinalize(now);
  }

  async finalizeReadyAuctions(now = new Date()): Promise<void> {
    const auctions = await this.getAuctionsReadyForFinalization(now);

    for (const auction of auctions) {
      await this.auctionsService.finalizeAuction(auction.id);
    }
  }

  async getRelistedAuctionsReadyToReopen(now = new Date()): Promise<Auction[]> {
    return this.repository.findReadyToReopen(now);
  }

  async reopenReadyRelistedAuctions(now = new Date()): Promise<void> {
    const auctions = await this.getRelistedAuctionsReadyToReopen(now);

    for (const auction of auctions) {
      await this.auctionsService.reopenRelistedAuction(auction.id);
    }
  }
}
