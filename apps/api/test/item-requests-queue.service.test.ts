import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { ItemTier } from '@prisma/client';
import { ItemRequestQueueService } from '../src/modules/item-requests/services/item-request-queue.service';

const date = (value: string) => new Date(value);

function catalog(overrides: Record<string, unknown> = {}) {
  return {
    id: 'catalog-a',
    namePt: 'Espada T3',
    nameEn: 'T3 Sword',
    nameEs: null,
    typePt: 'ferro',
    typeEn: 'iron',
    typeEs: null,
    category: 'weapon',
    itemTier: ItemTier.T3,
    itemType: 'WEAPON',
    kind: 'request',
    isActive: true,
    ...overrides,
  };
}

function request(overrides: Record<string, unknown> = {}) {
  return {
    id: 'request-a',
    itemCatalogId: 'catalog-a',
    playerId: 'player-a',
    discordId: 'discord-a',
    playerName: 'Player A',
    itemName: 'espada t3',
    totalQuantity: 1,
    remainingQuantity: 1,
    rankPosition: 1,
    warned3d: false,
    warned4d: false,
    updateProofStatus: null,
    legacyUpdatedAt: date('2026-07-06T00:00:00.000Z'),
    updatedAt: date('2026-07-06T00:00:00.000Z'),
    createdAt: date('2026-07-01T00:00:00.000Z'),
    itemCatalog: catalog(),
    player: null,
    ...overrides,
  };
}

describe('ItemRequestQueueService', () => {
  it('enriches requests with queue forecast, last delivery and swap suggestions', async () => {
    const currentCatalog = catalog();
    const suggestedCatalog = catalog({
      id: 'catalog-b',
      namePt: 'Machado T3',
      nameEn: 'T3 Axe',
    });
    const rows = [
      request({
        id: 'request-a',
        playerName: 'Player A',
        remainingQuantity: 2,
        rankPosition: 1,
        itemCatalog: currentCatalog,
      }),
      request({
        id: 'request-b',
        playerName: 'Player B',
        remainingQuantity: 1,
        rankPosition: 2,
        warned3d: true,
        itemCatalog: currentCatalog,
      }),
    ];
    const repository = {
      findMany: mock.fn(async () => rows),
      client: {
        itemCatalog: {
          findMany: mock.fn(async () => [currentCatalog, suggestedCatalog]),
        },
        dropHistory: {
          findMany: mock.fn(async () => [
            {
              itemName: 'espada t3',
              itemCatalogId: 'catalog-a',
              deliveredAt: date('2026-07-07T00:00:00.000Z'),
              createdAt: date('2026-07-07T00:00:00.000Z'),
              nicknameIngame: 'Entregue',
            },
          ]),
        },
      },
    };
    const service = new ItemRequestQueueService(repository as never);

    const [enriched] = await service.enrichWithQueueContext([rows[1] as never]);

    assert.equal(enriched.queueForecast.position, 2);
    assert.equal(enriched.queueForecast.requestsAhead, 1);
    assert.equal(enriched.queueForecast.unitsAhead, 2);
    assert.equal(enriched.queueForecast.updateStage, 'warned_3d');
    assert.equal(enriched.queueForecast.needsUpdate, true);
    assert.equal(enriched.queueForecast.lastDeliveryPlayerName, 'Entregue');
    assert.equal(enriched.swapSuggestions[0]?.itemCatalogId, 'catalog-b');
    assert.equal(enriched.swapSuggestions[0]?.queueSize, 0);
    assert.equal(enriched.materialPriority.reason, 'T3_CRAFT_PRIORITY');
  });

  it('blocks quintessence behind T3 craft requests for the same material', () => {
    const rows = [
      request({
        id: 'craft-request',
        playerName: 'Crafter',
        itemName: 'craft t3 ferro',
        itemCatalog: catalog({ id: 'craft-catalog', typePt: 'Ferro', itemTier: ItemTier.T3 }),
      }),
      request({
        id: 'quintessence-request',
        playerName: 'Quint',
        itemName: 'quintessencia de ferro',
        itemCatalog: catalog({ id: 'quint-catalog', namePt: 'Quintessencia de Ferro', typePt: 'Ferro', itemTier: null }),
      }),
    ];
    const service = new ItemRequestQueueService({} as never);

    const priority = service.materialPrioritiesForRows(rows as never).get('quintessence-request');

    assert.equal(priority?.affected, true);
    assert.equal(priority?.reason, 'T3_CRAFT_OVER_QUINTESSENCE');
    assert.deepEqual(priority?.blockingRequestIds, ['craft-request']);
    assert.match(priority?.staffSummaryPt ?? '', /Crafter|craft T3/i);
  });
});
