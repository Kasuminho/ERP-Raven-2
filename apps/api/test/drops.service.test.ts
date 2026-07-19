import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { DropsService } from '../src/modules/drops/drops.service';

describe('DropsService pending auction deliveries', () => {
  it('adds urgency metadata and excludes delivered auction wins', async () => {
    const now = Date.now();
    const overdueWin = {
      id: 'tx-overdue',
      referenceId: 'auction-overdue',
      amount: -200,
      createdAt: new Date(now - 30 * 60 * 60 * 1000),
      player: { id: 'player-1', nickname: 'Aiko', user: { discordId: 'd1', discordUsername: 'aiko' } },
    };
    const deliveredWin = {
      id: 'tx-delivered',
      referenceId: 'auction-delivered',
      amount: -100,
      createdAt: new Date(now - 3 * 60 * 60 * 1000),
      player: { id: 'player-2', nickname: 'Brann', user: { discordId: 'd2', discordUsername: 'brann' } },
    };
    const prisma = {
      dKPTransaction: {
        findMany: mock.fn(async () => [overdueWin, deliveredWin]),
        findFirst: mock.fn(),
      },
      auction: {
        findMany: mock.fn(async () => [
          { id: 'auction-overdue', itemName: 'Cajado', itemTier: 'T4', itemCatalog: null },
          { id: 'auction-delivered', itemName: 'Arco', itemTier: 'T4', itemCatalog: null },
        ]),
      },
      dropHistory: {
        findMany: mock.fn(async () => [{ auctionId: 'auction-delivered' }]),
      },
    };
    const service = new DropsService(prisma as never, {} as never, {} as never);

    const deliveries = await service.getPendingAuctionDeliveries();

    assert.equal(deliveries.length, 1);
    assert.equal(deliveries[0]?.auction.id, 'auction-overdue');
    assert.equal(deliveries[0]?.urgency, 'overdue');
    assert.ok((deliveries[0]?.ageHours ?? 0) >= 29);
    assert.match(deliveries[0]?.priorityReason ?? '', /atrasada/);
    assert.ok(deliveries[0]?.deliveryDueAt instanceof Date);
    assert.equal(prisma.dKPTransaction.findMany.mock.calls.length, 1);
    assert.equal(prisma.auction.findMany.mock.calls.length, 1);
    assert.equal(prisma.dropHistory.findMany.mock.calls.length, 1);
  });

  it('publishes only delivered auction results with proof and a winner', async () => {
    const deliveredAt = new Date('2026-07-18T12:00:00.000Z');
    const prisma = {
      dropHistory: {
        findMany: mock.fn(async () => [{
          id: 'drop-1',
          auctionId: 'auction-1',
          itemName: 'Espada antiga',
          proofImageUrl: '/uploads/proof.webp',
          deliveredAt,
          player: { id: 'player-1', nickname: 'Aiko' },
          auction: {
            id: 'auction-1',
            itemName: 'Espada T4',
            itemTier: 'T4',
            itemType: 'WEAPON',
            auctionMode: 'STANDARD',
            itemCatalog: { namePt: 'Espada Solar', nameEn: 'Solar Sword', image1Url: '/uploads/item.webp', image2Url: null },
          },
        }]),
      },
    };
    const service = new DropsService(prisma as never, {} as never, {} as never);

    const results = await service.getPublishedAuctionResults();

    assert.equal(results.length, 1);
    assert.equal(results[0]?.winner.nickname, 'Aiko');
    assert.equal(results[0]?.itemNamePt, 'Espada Solar');
    assert.equal(results[0]?.itemNameEn, 'Solar Sword');
    assert.equal(results[0]?.proofImageUrl, '/uploads/proof.webp');
    assert.deepEqual(prisma.dropHistory.findMany.mock.calls[0]?.arguments[0]?.where, {
      auctionId: { not: null },
      deliveredAt: { not: null },
      proofImageUrl: { not: null },
      playerId: { not: null },
    });
  });
});
