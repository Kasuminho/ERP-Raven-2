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

  it('importItems skips duplicate entries with same acquisitionDate and acquisitionInfo', async () => {
    const prisma = {
      $transaction: mock.fn(async (cb: any) => {
        const tx = {
          guildStorageItem: {
            findFirst: mock.fn(async () => ({
              id: 'item-1',
              itemName: 'Livro Ancestral',
              quantity: 5,
              source: 'Boss Floud',
            })),
            update: mock.fn(async () => ({})),
            create: mock.fn(async () => ({ id: 'item-new' })),
          },
          guildStorageEntry: {
            findFirst: mock.fn(async (query: any) => {
              // Return existing entry if acquisitionInfo is 'Floud Drop 1'
              if (query.where.acquisitionInfo === 'Floud Drop 1') {
                return { id: 'entry-1', storageItemId: 'item-1' };
              }
              return null;
            }),
            create: mock.fn(async () => ({})),
          },
          itemCatalog: {
            findFirst: mock.fn(async () => null),
          },
        };
        return cb(tx);
      }),
    };

    const auditService = { log: mock.fn() };
    const service = new StorageService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      auditService as never,
      prisma as never,
      {} as never,
      {} as never,
    );

    const result = await service.importItems({
      items: [
        {
          itemName: 'Livro Ancestral',
          quantity: 1,
          acquisitionDate: '2026-09-20T10:00:00.000Z',
          acquisitionInfo: 'Floud Drop 1', // duplicate
        },
        {
          itemName: 'Livro Ancestral',
          quantity: 2,
          acquisitionDate: '2026-09-20T11:00:00.000Z',
          acquisitionInfo: 'Floud Drop 2', // not duplicate
        },
      ],
    });

    assert.equal(result.importedCount, 2);
    assert.equal(result.skippedDuplicatesCount, 1);
    assert.equal(result.updatedCount, 1);
  });

  it('createStorageRequest enforces max 5 pending requests limit', async () => {
    const prisma = {
      player: {
        findFirst: mock.fn(async () => ({
          id: 'player-1',
          nickname: 'SniperRaven',
          class: 'SNIPER',
          attendancePercentage: 80,
          user: { discordId: 'disc-123' },
        })),
      },
      guildStorageRequest: {
        count: mock.fn(async () => 5), // already at 5
      },
      guildStorageItem: {
        findUnique: mock.fn(async () => ({
          id: 'storage-item-1',
          itemName: 'Arco Heroico',
          quantity: 3,
        })),
      },
    };

    const service = new StorageService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      prisma as never,
      {} as never,
      {} as never,
    );

    await assert.rejects(
      async () => {
        await service.createStorageRequest('user-1', {
          storageItemId: 'storage-item-1',
          quantity: 1,
        });
      },
      {
        name: 'BadRequestException',
        message: 'Você já possui 5 solicitações ativas no Baú da Guilda. Aguarde a Staff enviar ou rejeitar para solicitar novos itens.',
      },
    );
  });

  it('createStorageRequest creates request and notifies Discord staffRequests', async () => {
    const notifyStorageItemRequested = mock.fn();
    const notificationService = { notifyStorageItemRequested };

    const prisma = {
      player: {
        findFirst: mock.fn(async () => ({
          id: 'player-1',
          nickname: 'SniperRaven',
          class: 'SNIPER',
          attendancePercentage: 85,
          user: { discordId: 'disc-123' },
        })),
      },
      guildStorageRequest: {
        count: mock.fn(async () => 2),
        create: mock.fn(async (args: any) => ({
          id: 'req-999',
          ...args.data,
        })),
      },
      guildStorageItem: {
        findUnique: mock.fn(async () => ({
          id: 'storage-item-1',
          itemName: 'Arco Heroico',
          quantity: 3,
        })),
      },
    };

    const service = new StorageService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      prisma as never,
      notificationService as never,
      {} as never,
    );

    const created = await service.createStorageRequest('user-1', {
      storageItemId: 'storage-item-1',
      quantity: 1,
      playerNote: 'Preciso para fechar o boss de hoje',
    });

    assert.equal(created.id, 'req-999');
    assert.equal(notifyStorageItemRequested.mock.calls.length, 1);
    assert.equal(notifyStorageItemRequested.mock.calls[0].arguments[0].itemName, 'Arco Heroico');
    assert.equal(notifyStorageItemRequested.mock.calls[0].arguments[0].playerName, 'SniperRaven');
  });

  it('dispatchStorageRequest deducts stock, sets DELIVERED, and creates notifications', async () => {
    const notifyStorageItemDispatched = mock.fn();
    const notificationService = { notifyStorageItemDispatched };
    const createForPlayer = mock.fn();
    const notificationsService = { createForPlayer };
    const auditService = { log: mock.fn() };

    const prisma = {
      $transaction: mock.fn(async (cb: any) => {
        const tx = {
          guildStorageRequest: {
            findUnique: mock.fn(async () => ({
              id: 'req-1',
              storageItemId: 'storage-item-1',
              playerId: 'player-1',
              quantity: 2,
              status: 'PENDING',
              storageItem: {
                id: 'storage-item-1',
                itemName: 'Elmo Divino',
                quantity: 5,
              },
              player: {
                id: 'player-1',
                userId: 'user-1',
                nickname: 'Paladino',
                user: { discordId: 'disc-456' },
              },
            })),
            update: mock.fn(async (args: any) => ({
              id: 'req-1',
              ...args.data,
              storageItem: { itemName: 'Elmo Divino' },
              player: { nickname: 'Paladino' },
            })),
          },
          guildStorageItem: {
            update: mock.fn(async () => ({})),
          },
        };
        return cb(tx);
      }),
    };

    const service = new StorageService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      auditService as never,
      prisma as never,
      notificationService as never,
      notificationsService as never,
    );

    const result = await service.dispatchStorageRequest('staff-user-1', 'req-1', 'Aprovado!');

    assert.equal(result.status, 'DELIVERED');
    assert.equal(notifyStorageItemDispatched.mock.calls.length, 1);
    assert.equal(notifyStorageItemDispatched.mock.calls[0].arguments[0].itemName, 'Elmo Divino');
    assert.equal(createForPlayer.mock.calls.length, 1);
    assert.equal(createForPlayer.mock.calls[0].arguments[0].playerId, 'player-1');
    assert.equal(createForPlayer.mock.calls[0].arguments[0].type, 'STORAGE_REQUEST_DELIVERED');
  });

  it('rejectStorageRequest sets REJECTED and creates in-app notification', async () => {
    const createForPlayer = mock.fn();
    const notificationsService = { createForPlayer };
    const auditService = { log: mock.fn() };

    const prisma = {
      guildStorageRequest: {
        findUnique: mock.fn(async () => ({
          id: 'req-2',
          storageItemId: 'storage-item-1',
          playerId: 'player-2',
          quantity: 1,
          status: 'PENDING',
          storageItem: { itemName: 'Botas Raras' },
          player: { nickname: 'Mago' },
        })),
        update: mock.fn(async (args: any) => ({
          id: 'req-2',
          ...args.data,
          storageItem: { itemName: 'Botas Raras' },
          player: { nickname: 'Mago' },
        })),
      },
    };

    const service = new StorageService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      auditService as never,
      prisma as never,
      {} as never,
      notificationsService as never,
    );

    const result = await service.rejectStorageRequest('staff-user-1', 'req-2', 'Presença insuficiente');

    assert.equal(result.status, 'REJECTED');
    assert.equal(createForPlayer.mock.calls.length, 1);
    assert.equal(createForPlayer.mock.calls[0].arguments[0].type, 'STORAGE_REQUEST_REJECTED');
  });
});
