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

function makeRelistService(minimumLayer: number) {
  const auction = {
    id: 'a1',
    itemName: 'Ashen Dawn Society Bow',
    itemTier: ItemTier.T4,
    itemType: 'WEAPON',
    minimumBid: 900,
    auctionMode: AuctionMode.ALL_IN,
    requiresStaffReview: true,
    status: AuctionStatus.OPEN,
    minimumLayer,
    reopensAt: null,
    endsAt: new Date('2026-06-28T05:00:00.000Z'),
    createdAt: new Date('2026-06-27T05:00:00.000Z'),
    updatedAt: new Date('2026-06-28T05:00:00.000Z'),
    createdById: 'staff-1',
    itemCatalogId: null,
  };
  const tx = {};
  const repository = {
    client: { $transaction: mock.fn(async (callback: any) => callback(tx)) },
    findById: mock.fn(async () => auction),
    invalidateAuctionBids: mock.fn(async () => ({ count: 1 })),
    update: mock.fn(async (_auctionId: string, data: Record<string, unknown>) => ({
      ...auction,
      ...data,
    })),
  };
  const dkp = {
    releaseAuctionLocksWithinTransaction: mock.fn(async () => [{ id: 'l1' }]),
  };
  const audit = {
    log: mock.fn(async () => undefined),
    logWithinTransaction: mock.fn(async () => undefined),
  };
  const service = new AuctionsService(repository as never, dkp as never, audit as never, {} as never, {} as never, {} as never);

  return { service, repository, audit };
}

describe('AuctionsService relist rules', () => {
  it('advances T4 to the next layer before layer 1 has run', async () => {
    const { service, repository, audit } = makeRelistService(3);

    const result = await service.relistAuction('a1');

    assert.equal(result.status, AuctionStatus.OPEN);
    assert.equal(result.minimumLayer, 2);
    assert.equal(result.reopensAt, null);
    assert.equal(result.endsAt.toISOString(), '2026-06-29T05:00:00.000Z');
    assert.equal(repository.invalidateAuctionBids.mock.callCount(), 1);
    assert.equal(audit.logWithinTransaction.mock.calls.at(-1)?.arguments[0].metadata.advancedToNextLayer, true);
    assert.equal(audit.logWithinTransaction.mock.calls.at(-1)?.arguments[0].metadata.relistedAfterLayerOne, false);
  });

  it('relists T4 from layer 1 back to layer 4 after the original cycle week', async () => {
    const { service, repository, audit } = makeRelistService(1);

    const result = await service.relistAuction('a1');

    assert.equal(result.status, AuctionStatus.RELISTED);
    assert.equal(result.minimumLayer, 4);
    assert.equal(result.reopensAt?.toISOString(), '2026-07-04T05:00:00.000Z');
    assert.equal(repository.invalidateAuctionBids.mock.callCount(), 1);
    assert.equal(audit.logWithinTransaction.mock.calls.at(-1)?.arguments[0].metadata.advancedToNextLayer, false);
    assert.equal(audit.logWithinTransaction.mock.calls.at(-1)?.arguments[0].metadata.relistedAfterLayerOne, true);
  });
});
