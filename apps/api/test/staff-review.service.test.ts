import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { AuctionMode, AuctionStatus, ItemTier } from '@prisma/client';
import { StaffReviewService } from '../src/modules/staff-review/services/staff-review.service';

function makePendingAuction(minimumLayer: number) {
  return {
    id: 'auction-1',
    itemName: 'Ashen Dawn Society Bow',
    itemTier: ItemTier.T4,
    itemType: 'WEAPON',
    minimumBid: 900,
    auctionMode: AuctionMode.ALL_IN,
    requiresStaffReview: true,
    status: AuctionStatus.PENDING_REVIEW,
    minimumLayer,
    reopensAt: null,
    endsAt: new Date('2026-06-28T05:00:00.000Z'),
    createdAt: new Date('2026-06-27T05:00:00.000Z'),
    updatedAt: new Date('2026-06-28T05:00:00.000Z'),
    createdById: 'staff-1',
    itemCatalogId: null,
  };
}

function makeService(auction: ReturnType<typeof makePendingAuction>) {
  const tx = {
    auctionReviewVote: {
      upsert: mock.fn(async () => undefined),
      count: mock.fn(async () => 3),
    },
  };
  const repository = {
    client: { $transaction: mock.fn(async (callback: any) => callback(tx)) },
    findAuction: mock.fn(async () => auction),
    invalidateAuctionBids: mock.fn(async () => ({ count: 2 })),
    deleteAuctionReviewVotes: mock.fn(async () => 3),
    deleteAuctionBidInvalidationVotes: mock.fn(async () => 1),
    updateAuction: mock.fn(async (_auctionId: string, data: Record<string, unknown>) => ({
      ...auction,
      ...data,
    })),
  };
  const dkpService = {
    releaseAuctionLocksWithinTransaction: mock.fn(async () => [{ id: 'lock-1' }]),
  };
  const auditService = {
    logWithinTransaction: mock.fn(async () => undefined),
  };
  const service = new StaffReviewService(
    repository as never,
    {} as never,
    dkpService as never,
    {} as never,
    auditService as never,
    {} as never,
  );

  return { service, repository, dkpService, auditService };
}

describe('StaffReviewService auction rejection', () => {
  it('invalidates bids and advances T4 to the next layer when layer 1 has not run yet', async () => {
    const { service, repository, dkpService, auditService } = makeService(makePendingAuction(3));

    const result = await service.rejectAuctionWinner('auction-1', 'winner already has the item', 'reviewer-1');

    assert.equal(result.status, AuctionStatus.OPEN);
    assert.equal(result.minimumLayer, 2);
    assert.equal(result.reopensAt, null);
    assert.equal(result.endsAt.toISOString(), '2026-06-29T05:00:00.000Z');
    assert.equal(repository.invalidateAuctionBids.mock.callCount(), 1);
    assert.equal(repository.invalidateAuctionBids.mock.calls[0].arguments[0], 'auction-1');
    assert.equal(repository.deleteAuctionReviewVotes.mock.callCount(), 1);
    assert.equal(repository.deleteAuctionBidInvalidationVotes.mock.callCount(), 1);
    assert.equal(dkpService.releaseAuctionLocksWithinTransaction.mock.callCount(), 1);
    assert.equal(auditService.logWithinTransaction.mock.calls.at(-1)?.arguments[0].metadata.invalidatedBidCount, 2);
    assert.equal(auditService.logWithinTransaction.mock.calls.at(-1)?.arguments[0].metadata.clearedReviewVotes, 3);
    assert.equal(auditService.logWithinTransaction.mock.calls.at(-1)?.arguments[0].metadata.clearedBidInvalidationVotes, 1);
    assert.equal(auditService.logWithinTransaction.mock.calls.at(-1)?.arguments[0].metadata.advancedToNextLayer, true);
    assert.equal(auditService.logWithinTransaction.mock.calls.at(-1)?.arguments[0].metadata.relistedAfterLayerOne, false);
  });

  it('invalidates bids and relists T4 from layer 1 back to layer 4 after the original cycle week', async () => {
    const { service, repository, auditService } = makeService(makePendingAuction(1));

    const result = await service.rejectAuctionWinner('auction-1', 'winner already has the item', 'reviewer-1');

    assert.equal(result.status, AuctionStatus.RELISTED);
    assert.equal(result.minimumLayer, 4);
    assert.equal(result.reopensAt?.toISOString(), '2026-07-04T05:00:00.000Z');
    assert.equal(repository.invalidateAuctionBids.mock.callCount(), 1);
    assert.equal(repository.deleteAuctionReviewVotes.mock.callCount(), 1);
    assert.equal(repository.deleteAuctionBidInvalidationVotes.mock.callCount(), 1);
    assert.equal(auditService.logWithinTransaction.mock.calls.at(-1)?.arguments[0].metadata.advancedToNextLayer, false);
    assert.equal(auditService.logWithinTransaction.mock.calls.at(-1)?.arguments[0].metadata.relistedAfterLayerOne, true);
  });
});

describe('StaffReviewService assisted review', () => {
  it('builds review alerts and audits alert overrides without deciding the auction', async () => {
    const auction = makePendingAuction(4);
    const timeline: any[] = [];
    const tx = {};
    const repository = {
      client: { $transaction: mock.fn(async (callback: any) => callback(tx)) },
      findAuction: mock.fn(async () => auction),
      findAuctionReviewDetails: mock.fn(async () => ({
        ...auction,
        bids: [],
        dkpLocks: [],
        createdBy: { id: 'staff-1' },
        reviewVotes: [],
        bidInvalidationVotes: [],
      })),
      findReviewTimeline: mock.fn(async () => timeline),
    };
    const eligibilityService = {
      rankAuctionCandidates: mock.fn(async () => [
        {
          playerId: 'player-1',
          nickname: 'Aiko',
          dimensionalLayer: 4,
          attendancePercentage: 35,
          availableDKP: 1000,
          bidId: 'bid-1',
          bidAmount: 900,
          lockAmount: 800,
          lockMatchesBid: false,
          priorityScore: 0.5,
          eligibilityStatus: 'INELIGIBLE',
          eligibilityReason: 'Player bid and DKP lock are inconsistent.',
        },
      ]),
      rankAuctionCandidatesWithinTransaction: mock.fn(async () => eligibilityService.rankAuctionCandidates()),
    };
    const auditService = {
      logWithinTransaction: mock.fn(async (entry: any) => {
        timeline.push({
          id: `audit-${timeline.length + 1}`,
          action: entry.action,
          targetType: entry.targetType,
          targetId: entry.targetId,
          metadata: entry.metadata,
          createdAt: new Date(),
        });
      }),
    };
    const service = new StaffReviewService(
      repository as never,
      {} as never,
      {} as never,
      eligibilityService as never,
      auditService as never,
      {} as never,
    );

    const details = await service.getAuctionReviewDetails('auction-1');

    assert.ok(details.assistedReview.alerts.some((alert) => alert.key === 'lock-mismatch'));
    assert.ok(details.assistedReview.alerts.some((alert) => alert.key === 'low-attendance'));

    const afterOverride = await service.overrideReviewAlert(
      'auction-1',
      'reviewer-1',
      'low-attendance',
      'Player is still the right frontline for this drop',
      'player-1',
    );

    assert.equal(auditService.logWithinTransaction.mock.calls[0].arguments[0].action, 'AUCTION_REVIEW_ALERT_OVERRIDDEN');
    assert.equal(auditService.logWithinTransaction.mock.calls[0].arguments[0].metadata.alertKey, 'low-attendance');
    assert.ok(afterOverride.assistedReview.overriddenAlertKeys.includes('low-attendance:player-1'));
  });
});
