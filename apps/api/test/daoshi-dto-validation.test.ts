import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateDaoshiReceiptDto, ReviewDaoshiReceiptDto } from '../src/modules/daoshi/dto';

const strictPipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });

describe('Daoshi DTO validation', () => {
  it('accepts valid receipt payloads', async () => {
    const result = await strictPipe.transform(
      {
        proofImageUrl: '/uploads/daoshi/example.webp',
        purchaseAmount: 25.5,
        purchaseDate: '2026-07-02',
        playerNote: 'Compra confirmada.',
      },
      { type: 'body', metatype: CreateDaoshiReceiptDto },
    );

    assert.ok(result instanceof CreateDaoshiReceiptDto);
    assert.equal(result.purchaseAmount, 25.5);
  });

  it('rejects unknown fields under the local strict pipe', async () => {
    await assert.rejects(
      () => strictPipe.transform(
        {
          proofImageUrl: '/uploads/daoshi/example.webp',
          purchaseAmount: 25.5,
          purchaseDate: '2026-07-02',
          surprise: 'nope',
        },
        { type: 'body', metatype: CreateDaoshiReceiptDto },
      ),
      BadRequestException,
    );
  });

  it('rejects invalid approved cents during review', async () => {
    await assert.rejects(
      () => strictPipe.transform(
        { approvedCents: -1, reviewNote: 'Valor invalido.' },
        { type: 'body', metatype: ReviewDaoshiReceiptDto },
      ),
      BadRequestException,
    );
  });
});
