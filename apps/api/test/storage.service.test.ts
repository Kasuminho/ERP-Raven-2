import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { StorageService } from '../src/modules/storage/services/storage.service';

describe('StorageService - Baú da Guilda', () => {
  it('lists storage items and attaches queue waiters sorted by attendance rate descending', async () => {
    const repository = {
      findMany: mock.fn(async () => [
        {
          id: 'storage-1',
          itemName: 'Espada Heroica',
          quantity: 2,
          category: 'heroic',
          itemType: 'WEAPON',
          kind: 'equipment',
          source: 'Boss Floud',
          itemCatalogId: 'cat-1',
          lastImportAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    };

    const prisma = {
      itemRequest: {
        findMany: mock.fn(async () => [
          {
            id: 'req-low-att',
            itemName: 'Espada Heroica',
            itemCatalogId: 'cat-1',
            playerName: 'Player B',
            rankPosition: 1,
            remainingQuantity: 1,
            totalQuantity: 1,
            createdAt: new Date('2026-09-01'),
            player: {
              id: 'p-2',
              nickname: 'Player B',
              class: 'BERSERKER',
              attendancePercentage: 65,
              isActive: true,
            },
          },
          {
            id: 'req-high-att',
            itemName: 'Espada Heroica',
            itemCatalogId: 'cat-1',
            playerName: 'Player A',
            rankPosition: 2,
            remainingQuantity: 1,
            totalQuantity: 1,
            createdAt: new Date('2026-09-02'),
            player: {
              id: 'p-1',
              nickname: 'Player A',
              class: 'GUNSLINGER',
              attendancePercentage: 92,
              isActive: true,
            },
          },
        ]),
      },
    };

    const geminiOcrService = {};
    const itemRequestsService = {};
    const itemsService = {};
    const auditService = { log: mock.fn() };

    const service = new StorageService(
      repository as never,
      geminiOcrService as never,
      itemRequestsService as never,
      itemsService as never,
      auditService as never,
      prisma as never,
    );

    const result = await service.getStorageItems();

    assert.equal(result.totalUnits, 2);
    assert.equal(result.totalUniqueItems, 1);
    assert.equal(result.totalQueueAlerts, 1);

    const item = result.items[0];
    assert.equal(item.queueCount, 2);
    // Player A has 92% attendance, so should be first even though rankPosition is 2
    assert.equal(item.queueWaiters[0].playerName, 'Player A');
    assert.equal(item.queueWaiters[0].attendancePercentage, 92);
    // Player B has 65% attendance
    assert.equal(item.queueWaiters[1].playerName, 'Player B');
    assert.equal(item.queueWaiters[1].attendancePercentage, 65);
  });

  it('dispatches item from storage, deducts stock and delivers to player', async () => {
    const repository = {
      findById: mock.fn(async (id: string) => ({
        id,
        itemName: 'Elmo de Mithril',
        quantity: 3,
      })),
      update: mock.fn(async (id: string, data: any) => ({
        id,
        quantity: data.quantity,
      })),
      delete: mock.fn(),
    };

    const prisma = {
      itemRequest: {
        findUnique: mock.fn(async () => ({
          id: 'req-123',
          itemName: 'Elmo de Mithril',
          remainingQuantity: 1,
          playerId: 'p-1',
          playerName: 'GuerreiroX',
          player: {
            id: 'p-1',
            nickname: 'GuerreiroX',
            attendancePercentage: 88,
          },
        })),
      },
    };

    const itemRequestsService = {
      deliver: mock.fn(async () => ({ completed: true })),
    };
    const auditService = { log: mock.fn() };

    const service = new StorageService(
      repository as never,
      {} as never,
      itemRequestsService as never,
      {} as never,
      auditService as never,
      prisma as never,
    );

    const dispatchResult = await service.dispatchItem(
      {
        storageItemId: 'storage-item-1',
        requestId: 'req-123',
        quantity: 1,
        reason: 'Entrega manual priorizada por assiduidade',
      },
      'staff-actor-1',
    );

    assert.equal(dispatchResult.deliveredQuantity, 1);
    assert.equal(dispatchResult.remainingStock, 2);
    assert.equal(dispatchResult.requestCompleted, true);

    // Verify repository update
    assert.equal(repository.update.mock.calls.length, 1);
    assert.equal(repository.update.mock.calls[0].arguments[1].quantity, 2);

    // Verify item deliver was called
    assert.equal(itemRequestsService.deliver.mock.calls.length, 1);
    assert.equal(itemRequestsService.deliver.mock.calls[0].arguments[0], 'req-123');

    // Verify audit log
    assert.equal(auditService.log.mock.calls.length, 1);
    assert.equal(auditService.log.mock.calls[0].arguments[0].action, 'GUILD_STORAGE_DISPATCHED');
  });
});
