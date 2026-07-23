import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { AuctionDisputeStatus, AuctionMode, AuctionStatus, DKPTransactionType, ItemTier, ItemType } from '@prisma/client';
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
    deleteAuctionReviewVotes: mock.fn(async () => 2),
    deleteAuctionBidInvalidationVotes: mock.fn(async () => 1),
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
    assert.equal(repository.deleteAuctionReviewVotes.mock.callCount(), 1);
    assert.equal(repository.deleteAuctionBidInvalidationVotes.mock.callCount(), 1);
    assert.equal(audit.logWithinTransaction.mock.calls.at(-1)?.arguments[0].metadata.advancedToNextLayer, true);
    assert.equal(audit.logWithinTransaction.mock.calls.at(-1)?.arguments[0].metadata.clearedReviewVotes, 2);
    assert.equal(audit.logWithinTransaction.mock.calls.at(-1)?.arguments[0].metadata.relistedAfterLayerOne, false);
  });

  it('relists T4 from layer 1 back to layer 4 after the original cycle week', async () => {
    const { service, repository, audit } = makeRelistService(1);

    const result = await service.relistAuction('a1');

    assert.equal(result.status, AuctionStatus.RELISTED);
    assert.equal(result.minimumLayer, 4);
    assert.equal(result.reopensAt?.toISOString(), '2026-07-04T05:00:00.000Z');
    assert.equal(repository.invalidateAuctionBids.mock.callCount(), 1);
    assert.equal(repository.deleteAuctionReviewVotes.mock.callCount(), 1);
    assert.equal(repository.deleteAuctionBidInvalidationVotes.mock.callCount(), 1);
    assert.equal(audit.logWithinTransaction.mock.calls.at(-1)?.arguments[0].metadata.advancedToNextLayer, false);
    assert.equal(audit.logWithinTransaction.mock.calls.at(-1)?.arguments[0].metadata.relistedAfterLayerOne, true);
  });
});

describe('AuctionsService review round lifecycle', () => {
  it('clears votes from an earlier round before opening a fresh pending review', async () => {
    const auction = {
      id: 'a1',
      itemName: 'Fresh review spear',
      itemTier: ItemTier.T2,
      itemType: ItemType.WEAPON,
      minimumBid: 650,
      auctionMode: AuctionMode.STANDARD,
      requiresStaffReview: true,
      status: AuctionStatus.OPEN,
      minimumLayer: 1,
      reopensAt: null,
      endsAt: new Date('2026-07-22T02:00:00.000Z'),
      createdAt: new Date('2026-07-20T02:00:00.000Z'),
      updatedAt: new Date('2026-07-22T02:00:00.000Z'),
      createdById: 'staff-1',
      itemCatalogId: null,
    };
    const tx = {};
    const repository = {
      client: { $transaction: mock.fn(async (callback: any) => callback(tx)) },
      findById: mock.fn(async () => auction),
      findValidBidsWithPlayers: mock.fn(async () => [{
        id: 'bid-1',
        auctionId: 'a1',
        playerId: 'player-1',
        bidAmount: 900,
        isValid: true,
        createdAt: new Date(),
        player: { dimensionalLayer: 1 },
      }]),
      deleteAuctionReviewVotes: mock.fn(async () => 3),
      updateStatus: mock.fn(async (_auctionId: string, status: AuctionStatus) => ({ ...auction, status })),
    };
    const audit = { log: mock.fn(async () => undefined) };
    const notifications = { notifyStaffReviewRequired: mock.fn(async () => undefined) };
    const eligibility = { rankAuctionCandidatesWithinTransaction: mock.fn(async () => [{ playerId: 'player-1' }]) };
    const service = new AuctionsService(
      repository as never,
      {} as never,
      audit as never,
      notifications as never,
      eligibility as never,
      {} as never,
    );

    const result = await service.finalizeAuction('a1');

    assert.equal(result.auction.status, AuctionStatus.PENDING_REVIEW);
    assert.equal(repository.deleteAuctionReviewVotes.mock.callCount(), 1);
    assert.equal(repository.deleteAuctionReviewVotes.mock.calls[0].arguments[0], 'a1');
    assert.equal(notifications.notifyStaffReviewRequired.mock.callCount(), 1);
  });
});

function makeResultReceiptService(options: { userId: string; playerId: string; ownBid?: Record<string, unknown> | null; winnerPlayerId: string; dropDeliveredAt?: Date | null }) {
  const auction = {
    id: 'a1',
    itemName: 'Espada limpa',
    itemTier: ItemTier.T4,
    itemType: ItemType.WEAPON,
    minimumBid: 900,
    auctionMode: AuctionMode.ALL_IN,
    requiresStaffReview: true,
    status: AuctionStatus.FINISHED,
    minimumLayer: 4,
    endsAt: new Date('2026-07-10T05:00:00.000Z'),
    createdAt: new Date('2026-07-09T05:00:00.000Z'),
    updatedAt: new Date('2026-07-10T06:00:00.000Z'),
  };
  const repository = {
    findPublicDetailsById: mock.fn(async () => auction),
    findBidByPlayerAndAuction: mock.fn(async () => options.ownBid ?? null),
    client: {
      player: {
        findFirst: mock.fn(async () => ({ id: options.playerId })),
      },
      dKPTransaction: {
        findFirst: mock.fn(async () => ({
          playerId: options.winnerPlayerId,
          amount: -1234,
          type: DKPTransactionType.AUCTION_WIN,
          createdAt: new Date('2026-07-10T06:10:00.000Z'),
        })),
      },
      dropHistory: {
        findUnique: mock.fn(async () => ({ createdAt: new Date('2026-07-10T06:30:00.000Z'), deliveredAt: options.dropDeliveredAt ?? null })),
      },
    },
  };
  const service = new AuctionsService(repository as never, {} as never, { log: mock.fn(async () => undefined) } as never, {} as never, {} as never, {} as never);
  return { service, repository };
}

describe('AuctionsService player result receipt', () => {
  it('shows the winner cost and delivery status only to the winner', async () => {
    const deliveredAt = new Date('2026-07-11T12:00:00.000Z');
    const { service } = makeResultReceiptService({
      userId: 'u1',
      playerId: 'p1',
      winnerPlayerId: 'p1',
      ownBid: { id: 'b1', bidAmount: 1234, isValid: true },
      dropDeliveredAt: deliveredAt,
    });

    const receipt = await service.getPlayerResultReceipt('u1', 'a1');

    assert.equal(receipt.role, 'WINNER');
    assert.equal(receipt.finalStatus, 'WON');
    assert.equal(receipt.ownBidAmount, 1234);
    assert.equal(receipt.winnerCost, 1234);
    assert.equal(receipt.deliveryStatus, 'DELIVERED');
    assert.equal(receipt.deliveredAt?.toISOString(), deliveredAt.toISOString());
  });

  it('keeps third-party result data out of participant receipts', async () => {
    const { service } = makeResultReceiptService({
      userId: 'u2',
      playerId: 'p2',
      winnerPlayerId: 'p1',
      ownBid: { id: 'b2', bidAmount: 900, isValid: true },
    });

    const receipt = await service.getPlayerResultReceipt('u2', 'a1');
    const serialized = JSON.stringify(receipt);

    assert.equal(receipt.role, 'PARTICIPANT');
    assert.equal(receipt.finalStatus, 'NOT_SELECTED');
    assert.equal(receipt.ownBidAmount, 900);
    assert.equal(receipt.winnerCost, null);
    assert.equal(receipt.deliveryStatus, 'NOT_APPLICABLE');
    assert.ok(!serialized.includes('p1'));
    assert.ok(!serialized.includes('1234'));
    assert.ok(receipt.safeReason.pt.includes('sigilosos') || receipt.safeReason.pt.includes('recibo'));
  });

  it('builds a sanitized player timeline without winner, bid or lock data', async () => {
    const { service } = makeResultReceiptService({
      userId: 'u2',
      playerId: 'p2',
      winnerPlayerId: 'p1',
      ownBid: { id: 'b2', bidAmount: 900, isValid: true },
    });

    const timeline = await service.getPlayerSafeTimeline('a1');
    const serialized = JSON.stringify(timeline);

    assert.ok(timeline.some((event) => event.key === 'AUCTION_OPENED'));
    assert.ok(timeline.some((event) => event.key === 'RESULT_PUBLISHED'));
    assert.ok(timeline.some((event) => event.key === 'DELIVERY_PENDING'));
    assert.ok(!serialized.includes('p1'));
    assert.ok(!serialized.includes('1234'));
    assert.ok(!serialized.includes('b2'));
    assert.ok(!serialized.includes('lock'));
  });
});

describe('AuctionsService auction disputes', () => {
  it('creates a dispute only for a participant inside the configured window', async () => {
    const now = new Date();
    const audit = { log: mock.fn(async () => undefined) };
    const repository = {
      findPublicDetailsById: mock.fn(async () => ({
        id: 'a1',
        itemName: 'Espada',
        status: AuctionStatus.FINISHED,
        updatedAt: now,
      })),
      findBidByPlayerAndAuction: mock.fn(async () => ({ id: 'b1', playerId: 'p1', bidAmount: 900 })),
      client: {
        player: {
          findFirst: mock.fn(async () => ({ id: 'p1' })),
        },
        dKPTransaction: {
          findFirst: mock.fn(async () => ({ createdAt: now })),
        },
        auctionDispute: {
          create: mock.fn(async ({ data }: any) => ({
            id: 'dispute-1',
            auctionId: data.auction.connect.id,
            playerId: data.player.connect.id,
            reason: data.reason,
            proofImageUrl: data.proofImageUrl,
            status: AuctionDisputeStatus.PENDING,
          })),
        },
      },
    };
    const service = new AuctionsService(
      repository as never,
      {} as never,
      audit as never,
      {} as never,
      {} as never,
      { getAuctionDisputeRules: mock.fn(async () => ({ enabled: true, windowHours: 48 })) } as never,
    );

    const dispute = await service.createDisputeForUser('u1', 'a1', {
      reason: 'Quero revisar o resultado porque minha camada estava correta.',
      proofImageUrl: 'https://example.com/proof.png',
    });

    assert.equal(dispute.id, 'dispute-1');
    assert.equal(dispute.status, AuctionDisputeStatus.PENDING);
    assert.equal(repository.client.auctionDispute.create.mock.callCount(), 1);
    assert.equal(audit.log.mock.callCount(), 1);
  });

  it('reviews a pending dispute without reopening the auction automatically', async () => {
    const audit = { log: mock.fn(async () => undefined) };
    const repository = {
      client: {
        auctionDispute: {
          findUnique: mock.fn(async () => ({
            id: 'dispute-1',
            auctionId: 'a1',
            playerId: 'p1',
            status: AuctionDisputeStatus.PENDING,
          })),
          update: mock.fn(async ({ data }: any) => ({
            id: 'dispute-1',
            auctionId: 'a1',
            playerId: 'p1',
            ...data,
          })),
        },
        auction: {
          update: mock.fn(async () => {
            throw new Error('auction should not be updated by dispute review');
          }),
        },
      },
    };
    const service = new AuctionsService(repository as never, {} as never, audit as never, {} as never, {} as never, {} as never);

    const reviewed = await service.reviewDispute('dispute-1', 'staff-1', {
      status: 'ACCEPTED',
      reviewNote: 'Ajuste aceito para analise manual posterior.',
      externalNotePt: 'Contestacao aceita para revisao operacional.',
      externalNoteEn: 'Dispute accepted for operational review.',
    });

    assert.equal(reviewed.status, AuctionDisputeStatus.ACCEPTED);
    assert.equal(repository.client.auctionDispute.update.mock.callCount(), 1);
    assert.equal(repository.client.auction.update.mock.callCount(), 0);
    assert.equal(audit.log.mock.callCount(), 1);
  });
});
