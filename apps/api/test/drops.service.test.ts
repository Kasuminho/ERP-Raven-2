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
});
