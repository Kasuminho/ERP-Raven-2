import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { AuctionsController } from '../src/modules/auctions/controllers/auctions.controller';
import { CreateAuctionDto, PlaceBidDto, RequestBidCancellationDto } from '../src/modules/auctions/dto';
import { DkpController } from '../src/modules/dkp/controllers/dkp.controller';
import { CreateDkpTransactionDto, LockDkpDto, UnlockDkpDto } from '../src/modules/dkp/dto';
import { DeliverAuctionDropDto } from '../src/modules/drops/dto/deliver-auction-drop.dto';
import { DiscordController } from '../src/modules/discord/controllers/discord.controller';
import { DiscordNotifyDto } from '../src/modules/discord/dto';
import {
  BulkCreateItemInterestPostDto,
  CancelItemInterestDto,
  DeclareItemInterestDto,
  DeliverItemInterestDto,
  VoteItemInterestDto,
} from '../src/modules/item-interests/dto';
import { ItemsController } from '../src/modules/items/controllers/items.controller';
import { CreateItemAuctionsDto, CreateItemDto, UpdateItemDto } from '../src/modules/items/dto';

const strictPipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
const transform = <T>(payload: unknown, metatype: new () => T) => strictPipe.transform(payload, { type: 'body', metatype });
const uuid = '11111111-1111-4111-8111-111111111111';

describe('Legacy sensitive DTO validation', () => {
  it('accepts current catalog payloads and transforms auction quantity', async () => {
    const item = await transform({
      kind: 'equipment',
      category: 'T4',
      itemTier: 'T4',
      itemType: 'WEAPON',
      namePt: '  Espada  ',
      nameEn: 'Sword',
      nameEs: '',
      typePt: 'Arma',
      typeEn: 'Weapon',
      typeEs: '',
      preferredClasses: ['BERSERKER'],
      image1Url: '/uploads/sword.webp',
      diamondSaleEnabled: false,
    }, CreateItemDto);
    const auctions = await transform({ quantity: '3' }, CreateItemAuctionsDto);

    assert.equal(item.namePt, 'Espada');
    assert.equal(auctions.quantity, 3);
  });

  it('rejects spoofed audit actors, unknown fields and invalid item values', async () => {
    await assert.rejects(() => transform({ quantity: 1, createdById: uuid }, CreateItemAuctionsDto), BadRequestException);
    await assert.rejects(() => transform({ isActive: true, updatedById: uuid }, UpdateItemDto), BadRequestException);
    await assert.rejects(() => transform({ quantity: 0 }, CreateItemAuctionsDto), BadRequestException);
  });

  it('validates interest identifiers, dates, proofs and cancellation reasons', async () => {
    const bulk = await transform({ itemCatalogIds: [uuid], mode: 'PvE', closesAt: '2026-08-01T12:00:00.000Z' }, BulkCreateItemInterestPostDto);
    const declaration = await transform({ imageUrl: '/transmutar.png', isTransmuteRequest: true }, DeclareItemInterestDto);
    const delivery = await transform({ entryIds: [uuid], proofImageUrl: '/uploads/proof.webp' }, DeliverItemInterestDto);

    assert.equal(bulk.itemCatalogIds[0], uuid);
    assert.equal(declaration.imageUrl, '/transmutar.png');
    assert.equal(delivery.entryIds?.[0], uuid);

    await assert.rejects(() => transform({ entryId: 'not-an-id' }, VoteItemInterestDto), BadRequestException);
    await assert.rejects(() => transform({ reason: ' ' }, CancelItemInterestDto), BadRequestException);
    await assert.rejects(() => transform({ imageUrl: 'C:\\private\\proof.png' }, DeclareItemInterestDto), BadRequestException);
  });

  it('validates delivery and Discord notification envelopes', async () => {
    await transform({ proofImageUrl: 'https://cdn.example/proof.png' }, DeliverAuctionDropDto);
    await transform({ type: 'EVENT_FINALIZED', targetId: uuid, metadata: { presentCount: 20 } }, DiscordNotifyDto);
    await transform({ type: 'CUSTOM_OPERATION', channelId: '123456', message: 'Aviso operacional.' }, DiscordNotifyDto);

    await assert.rejects(() => transform({ proofImageUrl: '/uploads/proof.png', deliveredById: uuid }, DeliverAuctionDropDto), BadRequestException);
    await assert.rejects(() => transform({ type: 'ARBITRARY_MESSAGE', message: 'x' }, DiscordNotifyDto), BadRequestException);
  });

  it('validates auction and DKP mutations without client-owned actor identities', async () => {
    const auction = await transform({
      itemCatalogId: uuid,
      itemName: 'Espada T4',
      itemType: 'WEAPON',
      itemTier: 'T4',
    }, CreateAuctionDto);
    const bid = await transform({ amount: '250' }, PlaceBidDto);
    const transaction = await transform({ playerId: uuid, amount: '-10', type: 'ADMIN_ADJUSTMENT', referenceId: 'correcao' }, CreateDkpTransactionDto);

    assert.equal(auction.itemName, 'Espada T4');
    assert.equal(bid.amount, 250);
    assert.equal(transaction.amount, -10);

    await assert.rejects(() => transform({ amount: 50, playerId: uuid }, PlaceBidDto), BadRequestException);
    await assert.rejects(() => transform({ reason: ' ' }, RequestBidCancellationDto), BadRequestException);
    await assert.rejects(() => transform({ playerId: uuid, amount: 10, type: 'ADMIN_ADJUSTMENT', createdById: uuid }, CreateDkpTransactionDto), BadRequestException);
    await assert.rejects(() => transform({ playerId: uuid, auctionId: 'bad', amount: 10 }, LockDkpDto), BadRequestException);
    await assert.rejects(() => transform({ lockId: 'bad' }, UnlockDkpDto), BadRequestException);
  });
});

describe('Authenticated actor ownership', () => {
  it('overwrites catalog audit actor fields with the authenticated user', async () => {
    const received: Array<Record<string, unknown>> = [];
    const service = {
      createItem: async (data: Record<string, unknown>) => { received.push(data); return data; },
      updateItem: async (_id: string, data: Record<string, unknown>) => { received.push(data); return data; },
      createAuctionsFromItem: async (_id: string, data: Record<string, unknown>) => { received.push(data); return []; },
    };
    const controller = new ItemsController(service as never);
    const req = { user: { userId: 'session-user' } };

    await controller.create({ createdById: 'spoofed' } as CreateItemDto, req);
    await controller.update(uuid, { updatedById: 'spoofed' } as UpdateItemDto, req);
    await controller.createAuctions(uuid, { quantity: 1, createdById: 'spoofed' }, req);

    assert.deepEqual(received.map((value) => value.createdById ?? value.updatedById), ['session-user', 'session-user', 'session-user']);
  });

  it('syncs only the Discord identity linked to the authenticated user', async () => {
    let received: unknown;
    const syncService = { syncUser: async (params: unknown) => { received = params; return {}; } };
    const controller = new DiscordController(syncService as never, {} as never);

    await controller.sync({ user: { userId: 'session-user' } });

    assert.deepEqual(received, { userId: 'session-user' });
  });

  it('overwrites auction and DKP audit actors with the authenticated user', async () => {
    let auctionActor: unknown;
    let dkpActor: unknown;
    const auctions = new AuctionsController({
      createAuction: async (data: Record<string, unknown>) => { auctionActor = data.createdById; return data; },
    } as never);
    const dkp = new DkpController({
      createTransaction: async (data: Record<string, unknown>) => { dkpActor = data.createdById; return data; },
    } as never);
    const req = { user: { userId: 'session-user' } };

    await auctions.create({ createdById: 'spoofed' } as CreateAuctionDto, req);
    await dkp.createTransaction({ createdById: 'spoofed' } as CreateDkpTransactionDto, req);

    assert.equal(auctionActor, 'session-user');
    assert.equal(dkpActor, 'session-user');
  });
});
