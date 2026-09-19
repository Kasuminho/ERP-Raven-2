import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { ItemTier, ItemType } from '@prisma/client';
import { ItemsService } from '../src/modules/items/services/items.service';

describe('ItemsService - Bulk & Batch Operations', () => {
  it('validates a batch of names against the repository and returns existing items and names', async () => {
    const repository = {
      health: mock.fn(),
      findByNames: mock.fn(async (names: string[]) => [
        {
          id: 'item-1',
          namePt: 'Espada Longa',
          nameEn: 'Long Sword',
          nameEs: 'Espada Larga',
          category: 'common',
          itemTier: null,
          itemType: ItemType.WEAPON,
          kind: 'equipment',
          isActive: true,
        },
      ]),
    };
    const auctionsService = {};
    const auditService = { log: mock.fn() };

    const service = new ItemsService(repository as never, auctionsService as never, auditService as never);

    const result = await service.validateItemsBatch({ names: ['Espada Longa', 'Item Inexistente'] });

    assert.equal(result.existing.length, 1);
    assert.equal(result.existing[0].namePt, 'Espada Longa');
    assert.ok(result.existingNames.includes('espada longa'));
    assert.ok(result.existingNames.includes('long sword'));
  });

  it('creates bulk items, skips existing items in database and duplicates in batch, and audits the result', async () => {
    const repository = {
      health: mock.fn(),
      findByNames: mock.fn(async (names: string[]) => [
        {
          id: 'item-existing',
          namePt: 'Pocao de Vida',
          nameEn: 'Health Potion',
          nameEs: null,
          category: 'common',
          itemTier: null,
          itemType: null,
          kind: 'material',
          isActive: true,
        },
      ]),
      createInTransaction: mock.fn(async (items: any[]) =>
        items.map((i, idx) => ({ id: `created-${idx}`, ...i })),
      ),
    };
    const auctionsService = {};
    const auditService = { log: mock.fn() };

    const service = new ItemsService(repository as never, auctionsService as never, auditService as never);

    const result = await service.createBulkItems(
      {
        items: [
          {
            namePt: 'Pocao de Vida', // exists in DB -> should skip
            category: 'common',
          },
          {
            namePt: 'Lanca de Ferro', // new -> should create
            category: 'common',
            itemType: ItemType.WEAPON,
          },
          {
            namePt: 'Lanca de Ferro', // duplicate in same batch -> should skip
            category: 'common',
          },
          {
            namePt: 'Fragmento Mistico', // new material without tier/type -> should create
            category: 'material',
            kind: 'material',
          },
        ],
      },
      'admin-user-123',
    );

    assert.equal(result.createdCount, 2);
    assert.equal(result.skippedCount, 2);
    assert.equal(result.created[0].namePt, 'Lanca de Ferro');
    assert.equal(result.created[1].namePt, 'Fragmento Mistico');
    assert.equal(result.skipped[0].name, 'Pocao de Vida');
    assert.equal(result.skipped[1].name, 'Lanca de Ferro');

    assert.equal(auditService.log.mock.calls.length, 1);
    assert.equal(auditService.log.mock.calls[0].arguments[0].action, 'ITEM_CATALOG_BULK_CREATED');
    assert.equal(auditService.log.mock.calls[0].arguments[0].actorId, 'admin-user-123');
  });
});
