import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { AuctionStatus } from '@prisma/client';
import { StaffReviewService } from '../src/modules/staff-review/services/staff-review.service';

describe('StaffReviewService auction rejection', () => {
  it('invalidates existing bids when rejection quorum relists an auction', async () => {
    const relistedAuction = {
      id: 'auction-1',
      status: AuctionStatus.RELISTED,
      reopensAt: new Date('2026-07-05T05:20:58.151Z'),
    };
    const tx = {
      auctionReviewVote: {
        upsert: mock.fn(async () => undefined),
        count: mock.fn(async () => 3),
      },
    };
    const repository = {
      client: { $transaction: mock.fn(async (callback: any) => callback(tx)) },
      findAuction: mock.fn(async () => ({ id: 'auction-1', status: AuctionStatus.PENDING_REVIEW })),
      invalidateAuctionBids: mock.fn(async () => ({ count: 2 })),
      updateAuction: mock.fn(async () => relistedAuction),
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

    const result = await service.rejectAuctionWinner('auction-1', 'winner already has the item', 'reviewer-1');

    assert.equal(result.status, AuctionStatus.RELISTED);
    assert.equal(repository.invalidateAuctionBids.mock.callCount(), 1);
    assert.equal(repository.invalidateAuctionBids.mock.calls[0].arguments[0], 'auction-1');
    assert.equal(dkpService.releaseAuctionLocksWithinTransaction.mock.callCount(), 1);
    assert.equal(auditService.logWithinTransaction.mock.calls.at(-1)?.arguments[0].metadata.invalidatedBidCount, 2);
  });
});
