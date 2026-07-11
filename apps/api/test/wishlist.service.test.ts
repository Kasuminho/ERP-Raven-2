import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { WishlistPriority, WishlistStatus } from '@prisma/client';
import { WishlistService } from '../src/modules/wishlist/services/wishlist.service';

describe('WishlistService', () => {
  it('creates player wishlist items and lets Staff fulfill them with audit only', async () => {
    const player = { id: 'player-1', userId: 'user-1', isActive: true };
    const item = { id: 'item-1', namePt: 'Armadura', nameEn: 'Armor', isActive: true };
    const created = {
      id: 'wishlist-1',
      playerId: player.id,
      itemCatalogId: item.id,
      priority: WishlistPriority.HIGH,
      status: WishlistStatus.ACTIVE,
      reason: 'build frontline',
      itemCatalog: item,
    };
    const prisma = {
      player: { findFirst: mock.fn(async () => player) },
      itemCatalog: { findUnique: mock.fn(async () => item) },
      playerWishlistItem: {
        findFirst: mock.fn(async () => null),
        create: mock.fn(async () => created),
        findMany: mock.fn(async () => []),
        findUnique: mock.fn(async () => created),
        update: mock.fn(async (_args: unknown) => ({ ...created, status: WishlistStatus.FULFILLED, fulfilledById: 'staff-1' })),
      },
    };
    const audit = { log: mock.fn(async () => undefined) };
    const service = new WishlistService(prisma as never, audit as never);

    const wishlistItem = await service.createMine('user-1', {
      itemCatalogId: item.id,
      priority: WishlistPriority.HIGH,
      reason: 'build frontline',
    });
    const fulfilled = await service.fulfillByStaff('wishlist-1', 'staff-1', 'entregue por leilao');

    assert.equal(wishlistItem.id, 'wishlist-1');
    assert.equal(fulfilled.status, WishlistStatus.FULFILLED);
    assert.equal(prisma.playerWishlistItem.create.mock.callCount(), 1);
    assert.equal(prisma.playerWishlistItem.update.mock.callCount(), 1);
    assert.equal(audit.log.mock.calls[0].arguments[0].action, 'WISHLIST_ITEM_CREATED');
    assert.equal(audit.log.mock.calls[1].arguments[0].action, 'WISHLIST_ITEM_FULFILLED_BY_STAFF');
  });
});
