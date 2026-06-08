import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Auction, AuctionBid, AuctionMode, AuctionStatus, ItemTier, Prisma } from '@prisma/client';
import { AuditService } from '../../audit/services/audit.service';
import { DkpService } from '../../dkp/services/dkp.service';
import { NotificationService } from '../../discord/services/notification.service';
import { RankingResponseDto } from '../../eligibility/dto';
import { EligibilityService } from '../../eligibility/services/eligibility.service';
import { CreateAuctionDto } from '../dto';
import {
  AuctionNotFoundException,
  DuplicateBidException,
  InvalidAuctionStateException,
  InvalidBidException,
} from '../exceptions/auction-domain.exceptions';
import { AuctionDetails, AuctionsRepository } from '../repositories/auctions.repository';

type AuctionRules = {
  minimumBid: number;
  auctionMode: AuctionMode;
  requiresStaffReview: boolean;
};

export type AuctionFinalizationResult = {
  auction: Auction;
  winner?: AuctionBid;
  candidates?: RankingResponseDto[];
  refundedLockIds: string[];
};

type BidPlacementResult = {
  bid: AuctionBid;
  auditAction: 'AUCTION_BID_PLACED' | 'AUCTION_BID_INCREASED';
  previousBidAmount?: number;
};

@Injectable()
export class AuctionsService {
  private readonly relistDelayDays = 7;

  constructor(
    private readonly repository: AuctionsRepository,
    private readonly dkpService: DkpService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly eligibilityService: EligibilityService,
  ) {}

  health(): { module: string; ready: boolean } {
    return this.repository.health();
  }

  async createAuction(data: CreateAuctionDto): Promise<Auction> {
    const rules = this.getRulesForTier(data.itemTier);
    const auction = await this.repository.create({
      itemCatalog: data.itemCatalogId ? { connect: { id: data.itemCatalogId } } : undefined,
      itemName: data.itemName,
      itemType: data.itemType,
      itemTier: data.itemTier,
      minimumBid: rules.minimumBid,
      auctionMode: rules.auctionMode,
      requiresStaffReview: rules.requiresStaffReview,
      endsAt: this.getNextBrtAuctionEnd(),
      createdBy: { connect: { id: data.createdById } },
    });

    await this.audit('AUCTION_CREATED', 'Auction', auction.id, data.createdById, {
      itemName: auction.itemName,
      itemCatalogId: auction.itemCatalogId,
      itemType: auction.itemType,
      itemTier: auction.itemTier,
      minimumBid: auction.minimumBid,
      auctionMode: auction.auctionMode,
      endsAt: auction.endsAt.toISOString(),
    });
    await this.notificationService.notifyAuctionCreated({
      auctionId: auction.id,
      itemName: auction.itemName,
      itemTier: auction.itemTier,
      minimumBid: auction.minimumBid,
      endsAt: auction.endsAt,
    });

    return auction;
  }

  async placeBid(playerId: string, auctionId: string, amount?: number): Promise<AuctionBid> {
    if (!playerId) {
      throw new BadRequestException('playerId is required.');
    }

    const result = await this.createBidWithLock(playerId, auctionId, amount);

    await this.audit(result.auditAction, 'AuctionBid', result.bid.id, undefined, {
      playerId,
      auctionId,
      bidAmount: result.bid.bidAmount,
      previousBidAmount: result.previousBidAmount,
    });

    return result.bid;
  }

  async placeBidForUser(userId: string, auctionId: string, amount?: number): Promise<AuctionBid> {
    if (!userId) {
      throw new BadRequestException('Authenticated user is required to place a bid.');
    }

    const player = await this.repository.client.player.findFirst({
      where: { userId, isActive: true },
      select: { id: true },
      orderBy: { joinedAt: 'asc' },
    });

    if (!player) {
      throw new NotFoundException('Authenticated user does not have an active player profile.');
    }

    return this.placeBid(player.id, auctionId, amount);
  }

  async validateBid(playerId: string, auctionId: string, amount?: number): Promise<{ bidAmount: number }> {
    const validation = await this.repository.client.$transaction((tx) =>
      this.validateBidWithinTransaction(playerId, auctionId, amount, tx),
    );

    return { bidAmount: validation.bidAmount };
  }

  async finalizeAuction(auctionId: string): Promise<AuctionFinalizationResult> {
    const result = await this.repository.client.$transaction(
      async (tx) => {
        const auction = await this.requireAuction(auctionId, tx);

        if (auction.status !== AuctionStatus.OPEN) {
          throw new InvalidAuctionStateException(`Auction ${auctionId} is not open.`);
        }

        const validBids = await this.repository.findValidBidsWithPlayers(auctionId, tx);

        if (validBids.length === 0) {
          const refundedLocks = await this.dkpService.releaseAuctionLocksWithinTransaction(auctionId, tx);
          const relisted = await this.repository.update(
            auctionId,
            {
              status: AuctionStatus.RELISTED,
              reopensAt: this.addDays(new Date(), this.relistDelayDays),
            },
            tx,
          );

          return {
            auction: relisted,
            refundedLockIds: refundedLocks.map((lock) => lock.id),
          };
        }

        const pendingReview = await this.repository.updateStatus(auctionId, AuctionStatus.PENDING_REVIEW, tx);

        return {
          auction: pendingReview,
          candidates: await this.eligibilityService.rankAuctionCandidatesWithinTransaction(auctionId, tx),
          refundedLockIds: [],
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await this.audit('AUCTION_FINALIZED', 'Auction', auctionId, undefined, {
      status: result.auction.status,
      refundedLockIds: result.refundedLockIds,
      candidatePlayerIds: result.candidates?.map((candidate) => candidate.playerId),
    });

    if (result.refundedLockIds.length > 0) {
      await this.audit('AUCTION_LOCKS_REFUNDED', 'Auction', auctionId, undefined, {
        refundedLockIds: result.refundedLockIds,
      });
    }

    if (result.auction.status === AuctionStatus.PENDING_REVIEW) {
      await this.notificationService.notifyStaffReviewRequired({
        auctionId,
        itemName: result.auction.itemName,
      });
    }

    return result;
  }

  async determineWinner(auctionId: string): Promise<AuctionBid | null> {
    return this.repository.client.$transaction((tx) => this.determineWinnerWithinTransaction(auctionId, tx));
  }

  async refundLosers(auctionId: string): Promise<string[]> {
    const winner = await this.determineWinner(auctionId);
    const refundedLocks = await this.repository.client.$transaction(
      (tx) => this.dkpService.releaseAuctionLocksWithinTransaction(auctionId, tx, winner?.playerId),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    const refundedLockIds = refundedLocks.map((lock) => lock.id);

    await this.audit('AUCTION_LOCKS_REFUNDED', 'Auction', auctionId, undefined, { refundedLockIds });

    return refundedLockIds;
  }

  async relistAuction(auctionId: string): Promise<Auction> {
    const auction = await this.repository.client.$transaction(
      async (tx) => {
        const existing = await this.requireAuction(auctionId, tx);

        if (existing.status !== AuctionStatus.OPEN && existing.status !== AuctionStatus.RELISTED) {
          throw new InvalidAuctionStateException(`Auction ${auctionId} cannot be relisted from ${existing.status}.`);
        }

        await this.dkpService.releaseAuctionLocksWithinTransaction(auctionId, tx);

        return this.repository.update(
          auctionId,
          {
            status: AuctionStatus.RELISTED,
            reopensAt: this.addDays(new Date(), this.relistDelayDays),
          },
          tx,
        );
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await this.audit('AUCTION_RELISTED', 'Auction', auction.id, undefined, {
      reopensAt: auction.reopensAt?.toISOString(),
    });

    return auction;
  }

  async cancelAuction(auctionId: string): Promise<Auction> {
    const auction = await this.repository.client.$transaction(
      async (tx) => {
        const existing = await this.requireAuction(auctionId, tx);

        if (existing.status !== AuctionStatus.OPEN && existing.status !== AuctionStatus.PENDING_REVIEW) {
          throw new InvalidAuctionStateException(`Auction ${auctionId} cannot be cancelled from ${existing.status}.`);
        }

        await this.dkpService.releaseAuctionLocksWithinTransaction(auctionId, tx);

        return this.repository.updateStatus(auctionId, AuctionStatus.CANCELLED, tx);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await this.audit('AUCTION_CANCELLED', 'Auction', auction.id, undefined, {
      status: auction.status,
    });

    return auction;
  }

  async reopenRelistedAuction(auctionId: string): Promise<Auction> {
    const auction = await this.repository.client.$transaction(async (tx) => {
      const existing = await this.requireAuction(auctionId, tx);

      if (existing.status !== AuctionStatus.RELISTED) {
        throw new InvalidAuctionStateException(`Auction ${auctionId} is not relisted.`);
      }

      if (existing.reopensAt && existing.reopensAt > new Date()) {
        throw new InvalidAuctionStateException(`Auction ${auctionId} is not ready to reopen.`);
      }

      return this.repository.update(
        auctionId,
        {
          status: AuctionStatus.OPEN,
          reopensAt: null,
          endsAt: this.getNextBrtAuctionEnd(),
        },
        tx,
      );
    });

    await this.audit('AUCTION_REOPENED', 'Auction', auction.id, undefined, {
      endsAt: auction.endsAt.toISOString(),
    });

    return auction;
  }

  async getAuctionDetails(auctionId: string): Promise<AuctionDetails> {
    const auction = await this.repository.findDetailsById(auctionId);

    if (!auction) {
      throw new AuctionNotFoundException(auctionId);
    }

    return auction;
  }

  async getActiveAuctions(): Promise<Auction[]> {
    return this.repository.findActive();
  }

  async getAuctionBids(auctionId: string): Promise<AuctionBid[]> {
    await this.requireAuction(auctionId);

    return this.repository.findBids(auctionId);
  }

  private async validateBidWithinTransaction(
    playerId: string,
    auctionId: string,
    amount: number | undefined,
    tx: Prisma.TransactionClient,
  ): Promise<{ auction: Auction; bidAmount: number; existingBid: AuctionBid | null }> {
    const auction = await this.requireAuction(auctionId, tx);

    if (auction.status !== AuctionStatus.OPEN) {
      throw new InvalidAuctionStateException(`Auction ${auctionId} is not open.`);
    }

    if (auction.endsAt <= new Date()) {
      throw new InvalidAuctionStateException(`Auction ${auctionId} has already ended.`);
    }

    const existingBid = await this.repository.findBidByPlayerAndAuction(playerId, auctionId, tx);

    if (existingBid && auction.auctionMode !== AuctionMode.STANDARD) {
      throw new DuplicateBidException(playerId, auctionId);
    }

    const eligibility = await this.eligibilityService.canPlayerBidWithinTransaction(playerId, auctionId, tx);

    if (!eligibility.canBid) {
      throw new InvalidBidException(eligibility.eligibilityReason);
    }

    const availableDkp = await this.dkpService.calculateAvailableDKPWithinTransaction(playerId, tx);
    const bidAmount = auction.auctionMode === AuctionMode.ALL_IN ? availableDkp : amount;

    if (typeof bidAmount !== 'number' || !Number.isInteger(bidAmount) || bidAmount <= 0) {
      throw new InvalidBidException('Bid amount must be a positive integer.');
    }

    const validBidAmount = bidAmount;

    if (auction.auctionMode === AuctionMode.ALL_IN && amount !== undefined) {
      throw new InvalidBidException('ALL_IN auctions calculate the bid amount automatically.');
    }

    if (validBidAmount < auction.minimumBid) {
      throw new InvalidBidException(`Bid amount must be at least ${auction.minimumBid}.`);
    }

    const existingLock = existingBid
      ? await tx.dKPLock.findUnique({
          where: {
            playerId_auctionId: {
              playerId,
              auctionId,
            },
          },
        })
      : null;
    const availableForThisAuction = existingLock && !existingLock.released
      ? availableDkp + existingLock.amount
      : availableDkp;

    if (existingBid && validBidAmount <= existingBid.bidAmount) {
      throw new InvalidBidException(`Bid amount must be greater than your current bid of ${existingBid.bidAmount}.`);
    }

    if (validBidAmount > availableForThisAuction) {
      throw new InvalidBidException('Bid amount cannot exceed available DKP.');
    }

    return { auction, bidAmount: validBidAmount, existingBid };
  }

  private async createBidWithLock(playerId: string, auctionId: string, amount?: number): Promise<BidPlacementResult> {
    try {
      return await this.repository.client.$transaction(
        async (tx) => {
          const validation = await this.validateBidWithinTransaction(playerId, auctionId, amount, tx);

          if (validation.existingBid) {
            const updatedBid = await this.repository.updateBidAmount(
              validation.existingBid.id,
              validation.bidAmount,
              tx,
            );

            await this.dkpService.increaseAuctionLockWithinTransaction(playerId, auctionId, validation.bidAmount, tx);

            return {
              bid: updatedBid,
              auditAction: 'AUCTION_BID_INCREASED',
              previousBidAmount: validation.existingBid.bidAmount,
            };
          }

          const createdBid = await this.repository.createBid(
            {
              auction: { connect: { id: auctionId } },
              player: { connect: { id: playerId } },
              bidAmount: validation.bidAmount,
              isValid: true,
            },
            tx,
          );

          await this.dkpService.lockDKPWithinTransaction(playerId, auctionId, validation.bidAmount, tx);

          return {
            bid: createdBid,
            auditAction: 'AUCTION_BID_PLACED',
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new DuplicateBidException(playerId, auctionId);
      }

      throw error;
    }
  }

  private async determineWinnerWithinTransaction(
    auctionId: string,
    tx: Prisma.TransactionClient,
  ): Promise<AuctionBid | null> {
    const validBids = await this.repository.findBids(auctionId, tx);
    const validBidRows = validBids.filter((bid) => bid.isValid);

    if (validBidRows.length === 0) {
      return null;
    }

    const highestBidAmount = Math.max(...validBidRows.map((bid) => bid.bidAmount));
    const rankedCandidates = await this.eligibilityService.rankAuctionCandidatesWithinTransaction(auctionId, tx);
    const winner = rankedCandidates.find((candidate) => candidate.bidAmount === highestBidAmount);

    return validBidRows.find((bid) => bid.playerId === winner?.playerId) ?? null;
  }

  private async requireAuction(auctionId: string, tx?: Prisma.TransactionClient): Promise<Auction> {
    const auction = await this.repository.findById(auctionId, tx);

    if (!auction) {
      throw new AuctionNotFoundException(auctionId);
    }

    return auction;
  }

  private getRulesForTier(itemTier: ItemTier): AuctionRules {
    const rules: Record<ItemTier, AuctionRules> = {
      [ItemTier.T2]: {
        minimumBid: 650,
        auctionMode: AuctionMode.STANDARD,
        requiresStaffReview: false,
      },
      [ItemTier.T3]: {
        minimumBid: 800,
        auctionMode: AuctionMode.STANDARD,
        requiresStaffReview: false,
      },
      [ItemTier.T4]: {
        minimumBid: 900,
        auctionMode: AuctionMode.ALL_IN,
        requiresStaffReview: true,
      },
      [ItemTier.LEGENDARY]: {
        minimumBid: 0,
        auctionMode: AuctionMode.ALL_IN,
        requiresStaffReview: true,
      },
    };

    return rules[itemTier];
  }

  private getNextBrtAuctionEnd(now = new Date()): Date {
    const brtOffsetMs = 3 * 60 * 60 * 1000;
    const brtNow = new Date(now.getTime() - brtOffsetMs);

    return new Date(
      Date.UTC(
        brtNow.getUTCFullYear(),
        brtNow.getUTCMonth(),
        brtNow.getUTCDate() + 2,
        2,
        0,
        0,
        0,
      ),
    );
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private async audit(
    action: string,
    targetType: string,
    targetId: string,
    actorId: string | undefined,
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

  private isUniqueConstraintError(error: unknown): error is { code: string } {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
