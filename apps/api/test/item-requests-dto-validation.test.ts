import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import {
  ApproveItemRequestUpdateDto,
  CreateItemRequestDto,
  CreateSelfItemRequestDto,
  DeliverItemRequestDto,
  UpdateItemRequestProofDto,
} from '../src/modules/item-requests/dto';

const strictPipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });

describe('Item requests DTO validation', () => {
  it('accepts valid staff and player creation payloads', async () => {
    const staff = await strictPipe.transform(
      {
        itemCatalogId: '11111111-1111-4111-8111-111111111111',
        playerId: '22222222-2222-4222-8222-222222222222',
        quantity: '2',
        imageUrl: '/uploads/request.png',
        threadId: '1234567890',
        threadChannelId: '0987654321',
      },
      { type: 'body', metatype: CreateItemRequestDto },
    );

    assert.ok(staff instanceof CreateItemRequestDto);
    assert.equal(staff.quantity, 2);

    const mine = await strictPipe.transform(
      {
        itemCatalogId: '11111111-1111-4111-8111-111111111111',
        quantity: 1,
        imageUrl: '/uploads/request.png',
      },
      { type: 'body', metatype: CreateSelfItemRequestDto },
    );

    assert.ok(mine instanceof CreateSelfItemRequestDto);
  });

  it('rejects unknown fields under the local strict pipe', async () => {
    await assert.rejects(
      () => strictPipe.transform(
        {
          itemCatalogId: '11111111-1111-4111-8111-111111111111',
          playerId: '22222222-2222-4222-8222-222222222222',
          quantity: 1,
          imageUrl: '/uploads/request.png',
          rankPosition: 1,
        },
        { type: 'body', metatype: CreateItemRequestDto },
      ),
      BadRequestException,
    );
  });

  it('rejects invalid ids, quantities and oversized notes before the service sees them', async () => {
    await assert.rejects(
      () => strictPipe.transform(
        { itemCatalogId: 'not-a-uuid', playerId: '22222222-2222-4222-8222-222222222222', quantity: 1, imageUrl: '/uploads/request.png' },
        { type: 'body', metatype: CreateItemRequestDto },
      ),
      BadRequestException,
    );

    await assert.rejects(
      () => strictPipe.transform(
        { itemCatalogId: '11111111-1111-4111-8111-111111111111', quantity: 0, imageUrl: '/uploads/request.png' },
        { type: 'body', metatype: CreateSelfItemRequestDto },
      ),
      BadRequestException,
    );

    await assert.rejects(
      () => strictPipe.transform(
        { quantity: -1 },
        { type: 'body', metatype: DeliverItemRequestDto },
      ),
      BadRequestException,
    );

    await assert.rejects(
      () => strictPipe.transform(
        { remainingQuantity: 1, note: 'x'.repeat(501) },
        { type: 'body', metatype: ApproveItemRequestUpdateDto },
      ),
      BadRequestException,
    );
  });

  it('validates proof updates and delivery payloads', async () => {
    const proof = await strictPipe.transform(
      { imageUrl: '/uploads/proof.webp', note: 'Print atualizado.' },
      { type: 'body', metatype: UpdateItemRequestProofDto },
    );
    assert.ok(proof instanceof UpdateItemRequestProofDto);

    await assert.rejects(
      () => strictPipe.transform(
        { imageUrl: '' },
        { type: 'body', metatype: UpdateItemRequestProofDto },
      ),
      BadRequestException,
    );

    const delivery = await strictPipe.transform(
      { quantity: '3', reason: 'Entrega manual pela Staff.' },
      { type: 'body', metatype: DeliverItemRequestDto },
    );
    assert.ok(delivery instanceof DeliverItemRequestDto);
    assert.equal(delivery.quantity, 3);
  });
});
