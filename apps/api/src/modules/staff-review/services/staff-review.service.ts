import { Injectable } from '@nestjs/common';
import { AuditLog, Auction, AuctionBidCancellationRequest, AuctionBidCancellationStatus, AuctionStatus, ItemTier, Prisma } from '@prisma/client';
import { AuditService } from '../../audit/services/audit.service';
import { AuctionsService } from '../../auctions/services/auctions.service';
import { DkpService } from '../../dkp/services/dkp.service';
import { EligibilityService } from '../../eligibility/services/eligibility.service';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  IneligibleStaffApprovalException,
  InvalidStaffReviewActionException,
  InvalidStaffReviewStateException,
  StaffReviewAuctionNotFoundException,
  StaffReviewBidNotFoundException,
} from '../exceptions/staff-review-domain.exceptions';
import { StaffAuctionReviewDetails, StaffReviewRepository } from '../repositories/staff-review.repository';

export type StaffReviewDetails = StaffAuctionReviewDetails & {
  ranking: Awaited<ReturnType<EligibilityService['rankAuctionCandidates']>>;
  timeline: AuditLog[];
  assistedReview: {
    alerts: StaffReviewAlert[];
    overriddenAlertKeys: string[];
  };
};

export type StaffReviewAlert = {
  key: string;
  playerId?: string;
  severity: 'info' | 'warning' | 'danger';
  title: string;
  explanation: string;
  evidenceHref: string;
};

export type StaffBidCancellationRequest = AuctionBidCancellationRequest & {
  auction: Pick<Auction, 'id' | 'itemName' | 'status' | 'auctionMode' | 'endsAt'>;
  bid: {
    id: string;
    bidAmount: number;
    isValid: boolean;
    createdAt: Date;
  };
  player: {
    id: string;
    nickname: string;
    dimensionalLayer: number;
    user: {
      discordId: string;
      discordUsername: string;
      discordNickname: string | null;
    };
  };
};

@Injectable()
export class StaffReviewService {
  private readonly relistDelayDays = 7;
  private readonly reviewVoteThreshold = 3;

  constructor(
    private readonly repository: StaffReviewRepository,
    private readonly auctionsService: AuctionsService,
    private readonly dkpService: DkpService,
    private readonly eligibilityService: EligibilityService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async approveAuctionWinner(auctionId: string, playerId: string, reviewerId: string): Promise<StaffReviewDetails | Auction> {
    return this.repository.client.$transaction(
      async (tx) => {
        const auction = await this.requireAuction(auctionId, tx);
        this.assertReviewable(auction);

        await this.assertWinnerCandidateCanBeApproved(auctionId, playerId, tx);

        await tx.auctionReviewVote.upsert({
          where: { auctionId_voterId: { auctionId, voterId: reviewerId } },
          create: {
            auctionId,
            voterId: reviewerId,
            action: 'APPROVE',
            playerId,
          },
          update: {
            action: 'APPROVE',
            playerId,
            reason: null,
          },
        });

        const approvalVotes = await tx.auctionReviewVote.count({
          where: { auctionId, action: 'APPROVE', playerId },
        });

        await this.auditWithinTransaction(tx, reviewerId, 'AUCTION_REVIEW_APPROVAL_VOTE', 'Auction', auctionId, {
          auctionId,
          playerId,
          approvalVotes,
          requiredVotes: this.reviewVoteThreshold,
        });

        if (approvalVotes >= this.reviewVoteThreshold) {
          return this.approveWinnerWithinTransaction(auctionId, playerId, reviewerId, 'APPROVE_WINNER', undefined, tx);
        }

        return this.getAuctionReviewDetailsWithinTransaction(auctionId, tx);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async rejectAuctionWinner(auctionId: string, reason: string, reviewerId: string): Promise<StaffReviewDetails | Auction> {
    this.assertReason(reason);

    return this.repository.client.$transaction(
      async (tx) => {
        const auction = await this.requireAuction(auctionId, tx);
        this.assertReviewable(auction);

        await tx.auctionReviewVote.upsert({
          where: { auctionId_voterId: { auctionId, voterId: reviewerId } },
          create: {
            auctionId,
            voterId: reviewerId,
            action: 'REJECT',
            reason,
          },
          update: {
            action: 'REJECT',
            playerId: null,
            reason,
          },
        });

        const rejectionVotes = await tx.auctionReviewVote.count({
          where: { auctionId, action: 'REJECT' },
        });

        await this.auditWithinTransaction(tx, reviewerId, 'AUCTION_REVIEW_REJECTION_VOTE', 'Auction', auctionId, {
          auctionId,
          reason,
          rejectionVotes,
          requiredVotes: this.reviewVoteThreshold,
        });

        if (rejectionVotes >= this.reviewVoteThreshold) {
          return this.rejectWinnerWithinTransaction(auctionId, reason, reviewerId, tx);
        }

        return this.getAuctionReviewDetailsWithinTransaction(auctionId, tx);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async overrideAuctionPriority(
    auctionId: string,
    targetPlayerId: string,
    reviewerId: string,
    reason: string,
  ): Promise<Auction> {
    this.assertReason(reason);

    return this.approveWinner(auctionId, targetPlayerId, reviewerId, 'OVERRIDE_PRIORITY', reason);
  }

  async removeBid(auctionId: string, bidId: string, reviewerId: string, reason: string): Promise<StaffReviewDetails | void> {
    this.assertReason(reason);

    return this.repository.client.$transaction(
      async (tx) => {
        const auction = await this.requireAuction(auctionId, tx);

        if (auction.status !== AuctionStatus.OPEN && auction.status !== AuctionStatus.PENDING_REVIEW) {
          throw new InvalidStaffReviewStateException(`Bid cannot be removed from auction status ${auction.status}.`);
        }

        const bid = await this.repository.findBid(bidId, tx);

        if (!bid || bid.auctionId !== auctionId) {
          throw new StaffReviewBidNotFoundException(bidId);
        }

        if (!bid.isValid) {
          throw new InvalidStaffReviewActionException(`Bid ${bidId} has already been invalidated.`);
        }

        await tx.auctionReviewVote.deleteMany({
          where: {
            auctionId,
            voterId: reviewerId,
            action: 'APPROVE',
            playerId: bid.playerId,
          },
        });

        await tx.auctionBidInvalidationVote.upsert({
          where: { bidId_voterId: { bidId, voterId: reviewerId } },
          create: {
            auctionId,
            bidId,
            voterId: reviewerId,
            reason,
          },
          update: {
            reason,
          },
        });

        const invalidationVotes = await tx.auctionBidInvalidationVote.count({
          where: {
            bidId,
          },
        });

        await this.auditWithinTransaction(tx, reviewerId, 'AUCTION_BID_INVALIDATION_VOTE', 'AuctionBid', bidId, {
          auctionId,
          bidId,
          playerId: bid.playerId,
          reason,
          invalidationVotes,
          requiredVotes: this.reviewVoteThreshold,
        });

        if (invalidationVotes < this.reviewVoteThreshold) {
          return this.getAuctionReviewDetailsWithinTransaction(auctionId, tx);
        }

        const lock = await this.repository.findActiveLock(auctionId, bid.playerId, tx);

        if (lock) {
          await tx.dKPLock.update({
            where: { id: lock.id },
            data: { released: true },
          });
        }

        await this.repository.invalidateBid(bidId, tx);
        await this.repository.deleteBidInvalidationVotes(bidId, tx);

        const remainingValidBids = await tx.auctionBid.count({
          where: {
            auctionId,
            isValid: true,
          },
        });

        if (remainingValidBids === 0) {
          await this.auctionsService.expandLayerOrRelistAfterEmptyBidsWithinTransaction(
            auctionId,
            tx,
            reviewerId,
            reason,
          );
        }

        await this.auditWithinTransaction(tx, reviewerId, 'REMOVE_BID', 'AuctionBid', bidId, {
          auctionId,
          bidId,
          playerId: bid.playerId,
          reason,
          invalidationThreshold: this.reviewVoteThreshold,
          releasedLockId: lock?.id,
        });

        return this.getAuctionReviewDetailsWithinTransaction(auctionId, tx);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async reopenAuction(auctionId: string, reviewerId: string, reason: string): Promise<Auction> {
    this.assertReason(reason);

    return this.repository.client.$transaction(
      async (tx) => {
        const auction = await this.requireAuction(auctionId, tx);

        if (auction.status === AuctionStatus.FINISHED) {
          throw new InvalidStaffReviewStateException('Finished auctions cannot be reopened without a dispute workflow.');
        }

        const reopened = await this.repository.updateAuction(
          auctionId,
          {
            status: AuctionStatus.OPEN,
            reopensAt: null,
            endsAt: this.getNextBrtAuctionEnd(),
          },
          tx,
        );

        await this.auditWithinTransaction(tx, reviewerId, 'REOPEN_AUCTION', 'Auction', auctionId, {
          auctionId,
          reason,
          previousStatus: auction.status,
          endsAt: reopened.endsAt.toISOString(),
        });

        return reopened;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async cancelAuction(auctionId: string, reviewerId: string, reason: string): Promise<Auction> {
    this.assertReason(reason);

    return this.repository.client.$transaction(
      async (tx) => {
        const auction = await this.requireAuction(auctionId, tx);

        if (auction.status === AuctionStatus.FINISHED) {
          throw new InvalidStaffReviewStateException('Finished auctions cannot be cancelled.');
        }

        const refundedLocks = await this.dkpService.releaseAuctionLocksWithinTransaction(auctionId, tx);
        const cancelled = await this.repository.updateAuctionStatus(auctionId, AuctionStatus.CANCELLED, tx);

        await this.auditWithinTransaction(tx, reviewerId, 'CANCEL_AUCTION', 'Auction', auctionId, {
          auctionId,
          reason,
          previousStatus: auction.status,
          refundedLockIds: refundedLocks.map((lock) => lock.id),
        });

        return cancelled;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async forceReview(auctionId: string, reviewerId: string, reason: string): Promise<Auction> {
    this.assertReason(reason);

    return this.repository.client.$transaction(
      async (tx) => {
        const auction = await this.requireAuction(auctionId, tx);

        if (auction.status !== AuctionStatus.OPEN) {
          throw new InvalidStaffReviewStateException(`Only OPEN auctions can be forced into review.`);
        }

        const pendingReview = await this.repository.updateAuctionStatus(auctionId, AuctionStatus.PENDING_REVIEW, tx);

        await this.auditWithinTransaction(tx, reviewerId, 'FORCE_REVIEW', 'Auction', auctionId, {
          auctionId,
          reason,
          previousStatus: auction.status,
        });

        return pendingReview;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async logManualAdjustment(
    targetType: string,
    targetId: string,
    reviewerId: string,
    reason: string,
    metadata: Prisma.InputJsonObject = {},
  ): Promise<void> {
    this.assertReason(reason);

    await this.auditService.log({
      actorId: reviewerId,
      action: 'MANUAL_ADJUSTMENT',
      targetType,
      targetId,
      metadata: {
        reason,
        ...metadata,
      },
    });
  }

  async getPendingReviews(): Promise<Auction[]> {
    return this.repository.findPendingReviews();
  }

  async getPendingBidCancellations(): Promise<StaffBidCancellationRequest[]> {
    return this.getBidCancellations(AuctionBidCancellationStatus.PENDING);
  }

  async getBidCancellationHistory(): Promise<StaffBidCancellationRequest[]> {
    return this.getBidCancellations();
  }

  private async getBidCancellations(status?: AuctionBidCancellationStatus): Promise<StaffBidCancellationRequest[]> {
    return this.repository.client.auctionBidCancellationRequest.findMany({
      where: status ? { status } : undefined,
      include: {
        auction: {
          select: {
            id: true,
            itemName: true,
            status: true,
            auctionMode: true,
            endsAt: true,
          },
        },
        bid: {
          select: {
            id: true,
            bidAmount: true,
            isValid: true,
            createdAt: true,
          },
        },
        player: {
          select: {
            id: true,
            nickname: true,
            dimensionalLayer: true,
            user: {
              select: {
                discordId: true,
                discordUsername: true,
                discordNickname: true,
              },
            },
          },
        },
      },
      orderBy: status ? { createdAt: 'asc' } : { createdAt: 'desc' },
      take: status ? undefined : 50,
    });
  }

  async approveBidCancellation(requestId: string, reviewerId: string, note?: string): Promise<AuctionBidCancellationRequest> {
    const approved = await this.repository.client.$transaction(
      async (tx) => {
        const request = await tx.auctionBidCancellationRequest.findUnique({
          where: { id: requestId },
          include: {
            auction: true,
            bid: true,
          },
        });

        if (!request) {
          throw new InvalidStaffReviewActionException(`Bid cancellation request ${requestId} was not found.`);
        }

        if (request.status !== AuctionBidCancellationStatus.PENDING) {
          throw new InvalidStaffReviewActionException(`Bid cancellation request ${requestId} is already ${request.status}.`);
        }

        if (request.auction.status !== AuctionStatus.OPEN && request.auction.status !== AuctionStatus.PENDING_REVIEW) {
          throw new InvalidStaffReviewStateException(`Bid cannot be cancelled from auction status ${request.auction.status}.`);
        }

        if (!request.bid.isValid) {
          throw new InvalidStaffReviewActionException(`Bid ${request.bidId} has already been invalidated.`);
        }

        const lock = await this.repository.findActiveLock(request.auctionId, request.playerId, tx);

        if (lock) {
          await tx.dKPLock.update({
            where: { id: lock.id },
            data: { released: true },
          });
        }

        await this.repository.invalidateBid(request.bidId, tx);

        const approved = await tx.auctionBidCancellationRequest.update({
          where: { id: requestId },
          data: {
            status: AuctionBidCancellationStatus.APPROVED,
            reviewedById: reviewerId,
            reviewNote: note?.trim() || undefined,
            reviewedAt: new Date(),
          },
        });

        const remainingValidBids = await tx.auctionBid.count({
          where: {
            auctionId: request.auctionId,
            isValid: true,
          },
        });

        await this.auditWithinTransaction(tx, reviewerId, 'AUCTION_BID_CANCELLATION_APPROVED', 'AuctionBidCancellationRequest', requestId, {
          auctionId: request.auctionId,
          bidId: request.bidId,
          playerId: request.playerId,
          reason: request.reason,
          note: note?.trim() || undefined,
          releasedLockId: lock?.id,
          remainingValidBids,
        });

        return approved;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await this.notificationsService.createForPlayer({
      playerId: approved.playerId,
      type: 'AUCTION_BID_CANCELLATION_APPROVED',
      title: 'Cancelamento de bid aprovado',
      body: 'A Staff aprovou seu pedido de cancelamento. O DKP travado foi liberado.',
      href: `/dashboard/auctions/${approved.auctionId}`,
      metadata: {
        requestId,
        bidId: approved.bidId,
        auctionId: approved.auctionId,
        reviewNote: approved.reviewNote,
      },
    });

    return approved;
  }

  async rejectBidCancellation(requestId: string, reviewerId: string, note?: string): Promise<AuctionBidCancellationRequest> {
    const rejected = await this.repository.client.$transaction(async (tx) => {
      const request = await tx.auctionBidCancellationRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw new InvalidStaffReviewActionException(`Bid cancellation request ${requestId} was not found.`);
      }

      if (request.status !== AuctionBidCancellationStatus.PENDING) {
        throw new InvalidStaffReviewActionException(`Bid cancellation request ${requestId} is already ${request.status}.`);
      }

      const rejected = await tx.auctionBidCancellationRequest.update({
        where: { id: requestId },
        data: {
          status: AuctionBidCancellationStatus.REJECTED,
          reviewedById: reviewerId,
          reviewNote: note?.trim() || undefined,
          reviewedAt: new Date(),
        },
      });

      await this.auditWithinTransaction(tx, reviewerId, 'AUCTION_BID_CANCELLATION_REJECTED', 'AuctionBidCancellationRequest', requestId, {
        auctionId: request.auctionId,
        bidId: request.bidId,
        playerId: request.playerId,
        reason: request.reason,
        note: note?.trim() || undefined,
      });

      return rejected;
    });

    await this.notificationsService.createForPlayer({
      playerId: rejected.playerId,
      type: 'AUCTION_BID_CANCELLATION_REJECTED',
      title: 'Cancelamento de bid recusado',
      body: 'A Staff recusou seu pedido de cancelamento. Seu bid continua ativo.',
      href: `/dashboard/auctions/${rejected.auctionId}`,
      metadata: {
        requestId,
        bidId: rejected.bidId,
        auctionId: rejected.auctionId,
        reviewNote: rejected.reviewNote,
      },
    });

    return rejected;
  }

  async getAuctionReviewDetails(auctionId: string): Promise<StaffReviewDetails> {
    return this.getAuctionReviewDetailsWithinTransaction(auctionId);
  }

  async overrideReviewAlert(
    auctionId: string,
    reviewerId: string,
    alertKey: string,
    reason: string,
    playerId?: string,
  ): Promise<StaffReviewDetails> {
    this.assertReason(reason);

    return this.repository.client.$transaction(async (tx) => {
      const auction = await this.requireAuction(auctionId, tx);
      this.assertReviewable(auction);

      await this.auditWithinTransaction(tx, reviewerId, 'AUCTION_REVIEW_ALERT_OVERRIDDEN', 'Auction', auctionId, {
        auctionId,
        alertKey,
        playerId,
        reason,
      });

      return this.getAuctionReviewDetailsWithinTransaction(auctionId, tx);
    });
  }

  private async getAuctionReviewDetailsWithinTransaction(
    auctionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<StaffReviewDetails> {
    const [details, ranking, timeline] = await Promise.all([
      this.repository.findAuctionReviewDetails(auctionId, tx),
      tx
        ? this.eligibilityService.rankAuctionCandidatesWithinTransaction(auctionId, tx)
        : this.eligibilityService.rankAuctionCandidates(auctionId),
      this.repository.findReviewTimeline(auctionId, tx),
    ]);

    if (!details) {
      throw new StaffReviewAuctionNotFoundException(auctionId);
    }

    return {
      ...details,
      ranking,
      timeline,
      assistedReview: this.buildAssistedReview(auctionId, ranking, timeline),
    };
  }

  private buildAssistedReview(
    auctionId: string,
    ranking: Awaited<ReturnType<EligibilityService['rankAuctionCandidates']>>,
    timeline: AuditLog[],
  ): StaffReviewDetails['assistedReview'] {
    const overriddenAlertKeys = timeline
      .filter((log) => log.action === 'AUCTION_REVIEW_ALERT_OVERRIDDEN')
      .map((log) => {
        const metadata = log.metadata as Prisma.JsonObject | null;
        const alertKey = metadata?.alertKey;
        const playerId = metadata?.playerId;
        return typeof alertKey === 'string'
          ? this.alertInstanceKey(alertKey, typeof playerId === 'string' ? playerId : undefined)
          : undefined;
      })
      .filter((key): key is string => Boolean(key));
    const alerts: StaffReviewAlert[] = [];
    const topCandidate = ranking[0];

    if (!topCandidate) {
      alerts.push({
        key: 'no-candidates',
        severity: 'danger',
        title: 'Sem candidato rankeado',
        explanation: 'A review nao possui candidato valido no ranking de elegibilidade.',
        evidenceHref: `/dashboard/staff/auction-diagnostics?auctionId=${auctionId}`,
      });
    }

    for (const [index, candidate] of ranking.entries()) {
      const evidenceHref = `/dashboard/staff/item-audit?playerId=${candidate.playerId}`;

      if (candidate.eligibilityStatus === 'INELIGIBLE') {
        alerts.push({
          key: 'candidate-ineligible',
          playerId: candidate.playerId,
          severity: 'danger',
          title: `${candidate.nickname} inelegivel`,
          explanation: candidate.eligibilityReason,
          evidenceHref,
        });
      } else if (candidate.eligibilityStatus === 'NEEDS_STAFF_REVIEW') {
        alerts.push({
          key: 'needs-staff-review',
          playerId: candidate.playerId,
          severity: 'warning',
          title: `${candidate.nickname} exige review`,
          explanation: candidate.eligibilityReason,
          evidenceHref,
        });
      }

      if (candidate.lockMatchesBid === false) {
        alerts.push({
          key: 'lock-mismatch',
          playerId: candidate.playerId,
          severity: 'danger',
          title: `${candidate.nickname} com lock divergente`,
          explanation: `Bid ${candidate.bidAmount ?? 0} DKP e lock ${candidate.lockAmount ?? 0} DKP nao batem.`,
          evidenceHref,
        });
      }

      if (candidate.attendancePercentage < 60) {
        alerts.push({
          key: 'low-attendance',
          playerId: candidate.playerId,
          severity: candidate.attendancePercentage < 40 ? 'danger' : 'warning',
          title: `${candidate.nickname} com presenca baixa`,
          explanation: `Presenca atual ${candidate.attendancePercentage.toFixed(2)}%.`,
          evidenceHref,
        });
      }

      if (index === 0 && candidate.priorityScore < 1) {
        alerts.push({
          key: 'low-priority-score',
          playerId: candidate.playerId,
          severity: 'warning',
          title: `${candidate.nickname} com score baixo`,
          explanation: `Score de prioridade ${candidate.priorityScore.toFixed(2)}; conferir contexto antes do voto.`,
          evidenceHref,
        });
      }
    }

    const splitApprovals = timeline.some((log) => {
      const metadata = log.metadata as Prisma.JsonObject | null;
      return log.action === 'AUCTION_REVIEW_APPROVAL_VOTE' && metadata?.playerId && metadata.playerId !== topCandidate?.playerId;
    });

    if (splitApprovals) {
      alerts.push({
        key: 'split-approval',
        severity: 'info',
        title: 'Votos divididos',
        explanation: 'Existe voto de aprovacao para candidato diferente do topo atual.',
        evidenceHref: `/dashboard/staff/auction-diagnostics?auctionId=${auctionId}`,
      });
    }

    return {
      alerts,
      overriddenAlertKeys,
    };
  }

  private alertInstanceKey(alertKey: string, playerId?: string): string {
    return playerId ? `${alertKey}:${playerId}` : alertKey;
  }

  private async approveWinner(
    auctionId: string,
    playerId: string,
    reviewerId: string,
    action: 'APPROVE_WINNER' | 'OVERRIDE_PRIORITY',
    reason?: string,
  ): Promise<Auction> {
    if (action === 'OVERRIDE_PRIORITY') {
      this.assertReason(reason);
    }

    return this.repository.client.$transaction(
      async (tx) => {
        const auction = await this.requireAuction(auctionId, tx);
        this.assertReviewable(auction);

        return this.approveWinnerWithinTransaction(auctionId, playerId, reviewerId, action, reason, tx);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async assertWinnerCandidateCanBeApproved(
    auctionId: string,
    playerId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const eligibility = await this.eligibilityService.canApproveExistingBidWithinTransaction(playerId, auctionId, tx);

    if (!eligibility.canBid) {
      throw new IneligibleStaffApprovalException(playerId, auctionId);
    }

    const bid = await this.repository.findValidBid(auctionId, playerId, tx);

    if (!bid) {
      throw new InvalidStaffReviewActionException('Winner must have a valid bid.');
    }

    const lock = await this.repository.findActiveLock(auctionId, playerId, tx);

    if (!lock) {
      throw new InvalidStaffReviewActionException('Winner must have a valid active DKP lock.');
    }

    if (lock.amount !== bid.bidAmount) {
      throw new InvalidStaffReviewActionException(
        `Winner bid and DKP lock are inconsistent. Bid: ${bid.bidAmount} DKP. Lock: ${lock.amount} DKP.`,
      );
    }
  }

  private async approveWinnerWithinTransaction(
    auctionId: string,
    playerId: string,
    reviewerId: string,
    action: 'APPROVE_WINNER' | 'OVERRIDE_PRIORITY',
    reason: string | undefined,
    tx: Prisma.TransactionClient,
  ): Promise<Auction> {
    await this.assertWinnerCandidateCanBeApproved(auctionId, playerId, tx);

    const bid = await this.repository.findValidBid(auctionId, playerId, tx);
    const consumed = await this.dkpService.consumeLockedDKPWithinTransaction(playerId, auctionId, tx);
    const refundedLocks = await this.dkpService.releaseAuctionLocksWithinTransaction(auctionId, tx, playerId);
    const finished = await this.repository.updateAuctionStatus(auctionId, AuctionStatus.FINISHED, tx);

    await this.auditWithinTransaction(tx, reviewerId, action, 'Auction', auctionId, {
      auctionId,
      playerId,
      bidId: bid?.id,
      reason,
      approvalThreshold: this.reviewVoteThreshold,
      consumedTransactionId: consumed.transaction.id,
      consumedLockId: consumed.releasedLock.id,
      refundedLockIds: refundedLocks.map((refundedLock) => refundedLock.id),
    });

    return finished;
  }

  private async rejectWinnerWithinTransaction(
    auctionId: string,
    reason: string,
    reviewerId: string,
    tx: Prisma.TransactionClient,
  ): Promise<Auction> {
    const auction = await this.requireAuction(auctionId, tx);
    const refundedLocks = await this.dkpService.releaseAuctionLocksWithinTransaction(auctionId, tx);
    const invalidatedBids = await this.repository.invalidateAuctionBids(auctionId, tx);
    const clearedBidState = this.getStateAfterClearedBids(auction);
    const relisted = await this.repository.updateAuction(
      auctionId,
      clearedBidState.data,
      tx,
    );

    await this.auditWithinTransaction(tx, reviewerId, 'REJECT_WINNER', 'Auction', auctionId, {
      auctionId,
      reason,
      rejectionThreshold: this.reviewVoteThreshold,
      refundedLockIds: refundedLocks.map((lock) => lock.id),
      invalidatedBidCount: invalidatedBids.count,
      previousMinimumLayer: auction.minimumLayer,
      nextMinimumLayer: relisted.minimumLayer,
      advancedToNextLayer: clearedBidState.advancedToNextLayer,
      relistedAfterLayerOne: clearedBidState.relistedAfterLayerOne,
      reopensAt: relisted.reopensAt?.toISOString(),
      endsAt: relisted.endsAt.toISOString(),
    });

    return relisted;
  }

  private async requireAuction(auctionId: string, tx: Prisma.TransactionClient): Promise<Auction> {
    const auction = await this.repository.findAuction(auctionId, tx);

    if (!auction) {
      throw new StaffReviewAuctionNotFoundException(auctionId);
    }

    return auction;
  }

  private assertReviewable(auction: Auction): void {
    if (auction.status !== AuctionStatus.PENDING_REVIEW) {
      throw new InvalidStaffReviewStateException(`Auction must be PENDING_REVIEW, received ${auction.status}.`);
    }
  }

  private assertReason(reason?: string): void {
    if (!reason || reason.trim().length === 0) {
      throw new InvalidStaffReviewActionException('A reason is required for this staff action.');
    }
  }

  private async auditWithinTransaction(
    tx: Prisma.TransactionClient,
    actorId: string,
    action: string,
    targetType: string,
    targetId: string,
    metadata: Prisma.InputJsonObject,
  ): Promise<void> {
    await this.auditService.logWithinTransaction({
      actorId,
      action,
      targetType,
      targetId,
      metadata,
    }, tx);
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

  private getStateAfterClearedBids(auction: Auction, now = new Date()): {
    data: Prisma.AuctionUpdateInput;
    advancedToNextLayer: boolean;
    relistedAfterLayerOne: boolean;
  } {
    const currentMinimumLayer = auction.minimumLayer ?? (auction.itemTier === ItemTier.T4 ? 4 : 1);

    if (auction.itemTier === ItemTier.T4 && currentMinimumLayer > 1) {
      return {
        data: {
          status: AuctionStatus.OPEN,
          minimumLayer: currentMinimumLayer - 1,
          reopensAt: null,
          endsAt: this.addDays(auction.endsAt, 1),
        },
        advancedToNextLayer: true,
        relistedAfterLayerOne: false,
      };
    }

    if (auction.itemTier === ItemTier.T4 && currentMinimumLayer <= 1) {
      return {
        data: {
          status: AuctionStatus.RELISTED,
          minimumLayer: 4,
          reopensAt: this.addDays(auction.createdAt, this.relistDelayDays),
        },
        advancedToNextLayer: false,
        relistedAfterLayerOne: true,
      };
    }

    return {
      data: {
        status: AuctionStatus.RELISTED,
        reopensAt: this.addDays(now, this.relistDelayDays),
      },
      advancedToNextLayer: false,
      relistedAfterLayerOne: false,
    };
  }
}
