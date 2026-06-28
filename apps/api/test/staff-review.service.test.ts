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
    assert.equal(dkpService.releaseAuctionLocksWithinTransaction.mock.callCount(), 1);
    assert.equal(auditService.logWithinTransaction.mock.calls.at(-1)?.arguments[0].metadata.invalidatedBidCount, 2);
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
    assert.equal(auditService.logWithinTransaction.mock.calls.at(-1)?.arguments[0].metadata.advancedToNextLayer, false);
    assert.equal(auditService.logWithinTransaction.mock.calls.at(-1)?.arguments[0].metadata.relistedAfterLayerOne, true);
  });
});
