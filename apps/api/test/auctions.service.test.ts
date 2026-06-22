import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { AuctionMode, AuctionStatus, ItemTier } from '@prisma/client';
import { AuctionsService } from '../src/modules/auctions/services/auctions.service';
import { DuplicateBidException, InvalidBidException } from '../src/modules/auctions/exceptions/auction-domain.exceptions';

function makeService(mode: AuctionMode, options: { available?: number; existingBid?: Record<string, unknown> | null } = {}) {
  const tx = { auctionBidCancellationRequest: { findFirst: mock.fn(async () => null) }, dKPLock: { findUnique: mock.fn(async () => null) } };
  const repository = {
    client: { $transaction: mock.fn(async (callback: any) => callback(tx)) },
    findById: mock.fn(async () => ({ id: 'a1', status: AuctionStatus.OPEN, auctionMode: mode, minimumBid: 650, endsAt: new Date(Date.now() + 60_000), itemTier: ItemTier.T2 })),
    findBidByPlayerAndAuction: mock.fn(async () => options.existingBid ?? null),
    createBid: mock.fn(async (data: any) => ({ id: 'b1', playerId: data.player.connect.id, auctionId: data.auction.connect.id, bidAmount: data.bidAmount, isValid: true })),
  };
  const dkp = {
    calculateAvailableDKPWithinTransaction: mock.fn(async () => options.available ?? 1000),
    lockDKPWithinTransaction: mock.fn(async () => ({ id: 'l1' })), lockOrReactivateDKPWithinTransaction: mock.fn(async () => ({ id: 'l1' })),
    increaseAuctionLockWithinTransaction: mock.fn(async () => ({ id: 'l1' })),
  };
  const service = new AuctionsService(repository as never, dkp as never, { log: mock.fn(async () => undefined) } as never, {} as never, { canPlayerBidWithinTransaction: mock.fn(async () => ({ canBid: true })) } as never, {} as never);
  return { service, repository, dkp };
}

describe('AuctionsService bid rules', () => {
  it('places a standard bid and locks the same amount', async () => {
    const { service, repository, dkp } = makeService(AuctionMode.STANDARD);
    assert.equal((await service.placeBid('p1', 'a1', 700)).bidAmount, 700);
    assert.equal(repository.createBid.mock.callCount(), 1);
    assert.equal(dkp.lockDKPWithinTransaction.mock.calls[0].arguments[2], 700);
  });

  it('rejects a standard bid below the tier minimum', async () => {
    await assert.rejects(makeService(AuctionMode.STANDARD).service.placeBid('p1', 'a1', 649), InvalidBidException);
  });

  it('calculates ALL_IN from available DKP and rejects a client amount', async () => {
    assert.equal((await makeService(AuctionMode.ALL_IN, { available: 875 }).service.placeBid('p1', 'a1')).bidAmount, 875);
    await assert.rejects(makeService(AuctionMode.ALL_IN, { available: 875 }).service.placeBid('p1', 'a1', 875), InvalidBidException);
  });

  it('does not permit a second active ALL_IN bid', async () => {
    const { service } = makeService(AuctionMode.ALL_IN, { existingBid: { id: 'b0', isValid: true, bidAmount: 800 } });
    await assert.rejects(service.placeBid('p1', 'a1'), DuplicateBidException);
  });
});
