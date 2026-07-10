import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { ItemInterestStatus, ItemType } from '@prisma/client';
import { ItemInterestTransmuteRaffleService } from '../src/modules/item-interests/services/item-interest-transmute-raffle.service';

describe('ItemInterestTransmuteRaffleService', () => {
  it('keeps the 24h hard lock when at least one interested player has not received a transmute item', async () => {
    const tx = {
      itemInterestPost: {
        findMany: mock.fn(async () => [
          {
            selectedEntryId: 'awarded-entry-2',
            deliveryEnabledAt: new Date('2026-07-01T01:00:00.000Z'),
            entries: [
              { id: 'awarded-entry-1', playerId: 'player-a' },
              { id: 'awarded-entry-2', playerId: 'player-b' },
            ],
          },
        ]),
      },
    };
    const service = new ItemInterestTransmuteRaffleService();
    const post = {
      id: 'post-current',
      entries: [
        { id: 'entry-a', playerId: 'player-a' },
        { id: 'entry-b', playerId: 'player-b' },
        { id: 'entry-c', playerId: 'player-c' },
      ],
      itemCatalog: { itemType: ItemType.WEAPON },
    };

    const result = await service.pickWinnerForDay(tx as never, post as never, new Date('2026-07-01T02:00:00.000Z'));

    assert.deepEqual(result.blockedPlayerIds, ['player-b']);
    assert.equal(result.eligibleCount, 2);
    assert.notEqual(result.entry?.playerId, 'player-b');
    assert.equal(result.weightedFallback, false);
    assert.deepEqual(tx.itemInterestPost.findMany.mock.calls[0].arguments[0].where.status.in, [
      ItemInterestStatus.READY_FOR_DELIVERY,
      ItemInterestStatus.DELIVERED,
    ]);
    assert.deepEqual(tx.itemInterestPost.findMany.mock.calls[0].arguments[0].where.itemCatalog, {
      itemType: ItemType.WEAPON,
    });
  });

  it('uses weighted 30d history only when every interested player is inside the 24h hard lock', async () => {
    const tx = {
      itemInterestPost: {
        findMany: mock.fn(async () => [
          {
            selectedEntryId: 'awarded-entry-a-1',
            deliveryEnabledAt: new Date('2026-07-01T01:00:00.000Z'),
            entries: [{ id: 'awarded-entry-a-1', playerId: 'player-a' }],
          },
          {
            selectedEntryId: 'awarded-entry-b-1',
            deliveryEnabledAt: new Date('2026-07-01T01:30:00.000Z'),
            entries: [{ id: 'awarded-entry-b-1', playerId: 'player-b' }],
          },
          {
            selectedEntryId: 'awarded-entry-b-2',
            deliveryEnabledAt: new Date('2026-06-20T12:00:00.000Z'),
            entries: [{ id: 'awarded-entry-b-2', playerId: 'player-b' }],
          },
          {
            selectedEntryId: 'awarded-entry-b-3',
            deliveryEnabledAt: new Date('2026-06-15T12:00:00.000Z'),
            entries: [{ id: 'awarded-entry-b-3', playerId: 'player-b' }],
          },
        ]),
      },
    };
    const service = new ItemInterestTransmuteRaffleService();
    const post = {
      id: 'post-current',
      entries: [
        { id: 'entry-a', playerId: 'player-a' },
        { id: 'entry-b', playerId: 'player-b' },
      ],
      itemCatalog: { itemType: ItemType.ARMOR },
    };

    const result = await service.pickWinnerForDay(tx as never, post as never, new Date('2026-07-01T02:00:00.000Z'));

    assert.deepEqual(result.blockedPlayerIds.sort(), ['player-a', 'player-b']);
    assert.equal(result.eligibleCount, 2);
    assert.equal(result.weightedFallback, true);
    assert.ok(['player-a', 'player-b'].includes(result.entry?.playerId));
    assert.deepEqual(result.raffleWeights, [
      { entryId: 'entry-a', playerId: 'player-a', recentAwards30d: 1, weight: 25 },
      { entryId: 'entry-b', playerId: 'player-b', recentAwards30d: 3, weight: 6 },
    ]);
  });
});
