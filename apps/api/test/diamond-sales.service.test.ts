import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { DiamondSalesService } from '../src/modules/diamond-sales/diamond-sales.service';

describe('DiamondSalesService', () => {
  it('freezes active players, excludes the guild buyer and rounds shares down', async () => {
    let createData: Record<string, unknown> | undefined;
    const players = [
      { id: '11111111-1111-4111-8111-111111111111', nickname: 'Aiko' },
      { id: '22222222-2222-4222-8222-222222222222', nickname: 'Brann' },
      { id: '33333333-3333-4333-8333-333333333333', nickname: 'Ciri' },
      { id: '44444444-4444-4444-8444-444444444444', nickname: 'Dante' },
    ];
    const tx = {
      itemCatalog: { findUnique: mock.fn(async () => ({ id: 'item-1', isActive: true, diamondSaleEnabled: true, namePt: 'Espada', nameEn: 'Sword' })) },
      player: {
        findMany: mock.fn(async () => players),
        findUnique: mock.fn(async ({ where }: { where: { id: string } }) => players.find((player) => player.id === where.id)),
      },
      diamondSale: {
        create: mock.fn(async ({ data }: { data: Record<string, unknown> }) => {
          createData = data;
          const nested = data.recipients as { create: Array<{ playerId: string; playerNickname: string; diamondAmount: number }> };
          return { id: 'sale-1', ...data, recipients: nested.create };
        }),
      },
      auditLog: { create: mock.fn(async () => ({})) },
    };
    const prisma = { $transaction: mock.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) };
    const service = new DiamondSalesService(prisma as never, {} as never, {} as never);

    const sale = await service.createSale({
      itemCatalogId: 'item-1',
      buyerType: 'GUILD_MEMBER',
      buyerPlayerId: players[0]!.id,
      diamondCustodian: 'Cofre G3X',
      diamondTotal: 1001,
      itemProofImageUrl: '/uploads/item.webp',
      saleProofImageUrl: '/uploads/sale.webp',
      recipientMode: 'EXCLUDE_SELECTED',
      excludedPlayerIds: [players[3]!.id],
    }, 'staff-1');

    assert.equal(createData?.activePlayerCount, 4);
    assert.equal(createData?.recipientCount, 2);
    assert.equal(createData?.shareAmount, 500);
    assert.equal(createData?.remainderAmount, 1);
    assert.deepEqual(sale.recipients.map((recipient: { playerId: string }) => recipient.playerId), [players[1]!.id, players[2]!.id]);
  });

  it('persists the integer remainder and rejects an empty recipient list', async () => {
    const player = { id: '11111111-1111-4111-8111-111111111111', nickname: 'Aiko' };
    const tx = {
      itemCatalog: { findUnique: mock.fn(async () => ({ id: 'item-1', isActive: true, diamondSaleEnabled: true, namePt: 'Anel', nameEn: 'Ring' })) },
      player: { findMany: mock.fn(async () => [player]), findUnique: mock.fn(async () => player) },
    };
    const prisma = { $transaction: mock.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) };
    const service = new DiamondSalesService(prisma as never, {} as never, {} as never);

    await assert.rejects(() => service.createSale({
      itemCatalogId: 'item-1',
      buyerType: 'GUILD_MEMBER',
      buyerPlayerId: player.id,
      diamondCustodian: 'Aiko',
      diamondTotal: 333,
      itemProofImageUrl: '/uploads/item.webp',
      saleProofImageUrl: '/uploads/sale.webp',
      recipientMode: 'ALL_ACTIVE',
      excludedPlayerIds: [],
    }, 'staff-1'), BadRequestException);
  });

  it('completes and publishes automatically after the last proven delivery', async () => {
    const completedSale = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      itemName: 'Espada / Sword',
      diamondTotal: 999,
      shareAmount: 333,
      remainderAmount: 0,
      recipientCount: 3,
      status: 'COMPLETED',
      recipients: [
        { playerNickname: 'Aiko', diamondAmount: 333, proofImageUrl: '/uploads/aiko.webp' },
        { playerNickname: 'Brann', diamondAmount: 333, proofImageUrl: '/uploads/brann.webp' },
        { playerNickname: 'Ciri', diamondAmount: 333, proofImageUrl: '/uploads/ciri.webp' },
      ],
    };
    const tx = {
      diamondSaleRecipient: {
        findFirst: mock.fn(async () => ({
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          playerId: 'player-3',
          diamondAmount: 333,
          deliveredAt: null,
          sale: { status: 'OPEN' },
        })),
        update: mock.fn(async () => ({})),
        count: mock.fn(async () => 0),
      },
      diamondSale: {
        update: mock.fn(async () => ({})),
        findUniqueOrThrow: mock.fn(async () => completedSale),
      },
      auditLog: { create: mock.fn(async () => ({})) },
    };
    const prisma = {
      $transaction: mock.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
      diamondSale: {
        update: mock.fn(async () => ({})),
        findUnique: mock.fn(async () => ({ ...completedSale, discordPublishedAt: new Date() })),
      },
    };
    const audit = { log: mock.fn(async () => ({})) };
    const notifications = { notifyDiamondSaleCompleted: mock.fn(async () => undefined) };
    const service = new DiamondSalesService(prisma as never, audit as never, notifications as never);

    const result = await service.deliverShare(
      completedSale.id,
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      '/uploads/ciri.webp',
      'staff-1',
    );

    assert.equal(result.status, 'COMPLETED');
    assert.equal(notifications.notifyDiamondSaleCompleted.mock.calls.length, 1);
    assert.equal(prisma.diamondSale.update.mock.calls.length, 1);
    assert.equal(audit.log.mock.calls[0]?.arguments[0]?.action, 'DIAMOND_SALE_PUBLISHED');
  });
});
