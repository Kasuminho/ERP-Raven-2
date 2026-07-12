import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { AuctionMode, EventStatus, ItemTier, ItemType, PlayerClass } from '@prisma/client';
import { EligibilityService } from '../src/modules/eligibility/services/eligibility.service';
import { AttendanceService } from '../src/modules/events/services/attendance.service';
import { ItemInterestsService } from '../src/modules/item-interests/services/item-interests.service';
import { ItemRequestsService } from '../src/modules/item-requests/services/item-requests.service';

describe('attendance eligibility rules', () => {
  it('calculates player attendance with a D-30 event window', async () => {
    let finalizedSince: Date | undefined;
    let attendedSince: Date | undefined;
    const repository = {
      client: { $transaction: mock.fn(async (callback: any) => callback({})) },
      findPlayer: mock.fn(async () => ({ id: 'p1' })),
      countPlayerFinalizedAttendance: mock.fn(async (_playerId: string, _tx: any, since: Date) => {
        attendedSince = since;
        return 3;
      }),
      countFinalizedEvents: mock.fn(async (_tx: any, since: Date) => {
        finalizedSince = since;
        return 4;
      }),
    };
    const service = new AttendanceService(repository as never, {} as never, {} as never, {} as never, {} as never);

    const result = await service.getPlayerAttendanceStats('p1');
    const expectedWindowStart = Date.now() - 30 * 86_400_000;

    assert.equal(result.attendancePercentage, 75);
    assert.ok(finalizedSince);
    assert.ok(attendedSince);
    assert.ok(Math.abs(finalizedSince.getTime() - expectedWindowStart) < 5_000);
    assert.ok(Math.abs(attendedSince.getTime() - expectedWindowStart) < 5_000);
  });

  it('blocks auction bids below the configured D-30 attendance cut', async () => {
    const tx = {};
    const repository = {
      client: { $transaction: mock.fn(async (callback: any) => callback(tx)) },
      health: mock.fn(),
      findAuction: mock.fn(async () => ({
        id: 'a1',
        itemTier: ItemTier.T3,
        itemType: ItemType.ARMOR,
        minimumBid: 800,
        minimumLayer: null,
        requiresStaffReview: false,
        auctionMode: AuctionMode.STANDARD,
      })),
      findPlayer: mock.fn(async () => ({
        id: 'p1',
        nickname: 'Low Presence',
        dimensionalLayer: 5,
        attendancePercentage: 64.99,
        class: PlayerClass.BERSERKER,
        isActive: true,
      })),
    };
    const dkp = { calculateAvailableDKPWithinTransaction: mock.fn(async () => 1_000) };
    const businessRules = {
      getAuctionTierRule: mock.fn(async () => ({
        minimumBid: 800,
        minimumLayer: 1,
        requiresStaffReview: false,
        auctionMode: AuctionMode.STANDARD,
      })),
      getAttendanceEligibilityRules: mock.fn(async () => ({
        bidMinimumPercent: 65,
        participationMinimumPercent: 50,
      })),
    };
    const service = new EligibilityService(repository as never, dkp as never, { log: mock.fn() } as never, businessRules as never);

    const result = await service.canPlayerBidWithinTransaction('p1', 'a1', tx as never);

    assert.equal(result.canBid, false);
    assert.equal(result.eligibilityStatus, 'INELIGIBLE');
    assert.match(result.eligibilityReason, /65% attendance in the last 30 days/);
  });

  it('blocks interest declarations below the configured participation attendance cut', async () => {
    const tx = {
      itemInterestPost: { findUnique: mock.fn(async () => ({ id: 'post-1', status: 'OPEN', closesAt: new Date(Date.now() + 86_400_000) })) },
      player: { findFirst: mock.fn(async () => ({ id: 'p1', attendancePercentage: 49.99 })) },
      itemInterestEntry: { create: mock.fn() },
    };
    const prisma = { $transaction: mock.fn(async (callback: any) => callback(tx)) };
    const businessRules = { getAttendanceEligibilityRules: mock.fn(async () => ({ bidMinimumPercent: 65, participationMinimumPercent: 50 })) };
    const service = new ItemInterestsService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      businessRules as never,
    );

    await assert.rejects(
      () => service.declareInterest('post-1', 'u1', { imageUrl: '/proof.png' }),
      /Minimum attendance to declare interest is 50%/,
    );
    assert.equal(tx.itemInterestEntry.create.mock.callCount(), 0);
  });

  it('blocks item requests below the configured participation attendance cut', async () => {
    const tx = {
      player: {
        findUnique: mock.fn(async () => ({
          id: 'p1',
          isActive: true,
          attendancePercentage: 49.99,
          user: { discordId: 'discord-1' },
        })),
      },
    };
    const repository = {
      client: { $transaction: mock.fn(async (callback: any) => callback(tx)) },
      findItemCatalog: mock.fn(),
    };
    const businessRules = { getAttendanceEligibilityRules: mock.fn(async () => ({ bidMinimumPercent: 65, participationMinimumPercent: 50 })) };
    const service = new ItemRequestsService(
      repository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      businessRules as never,
    );

    await assert.rejects(
      () => service.createRequest({ playerId: 'p1', itemCatalogId: 'item-1', quantity: 1, imageUrl: '/proof.png' }),
      /Minimum attendance to create an item request is 50%/,
    );
    assert.equal(repository.findItemCatalog.mock.callCount(), 0);
  });
});
