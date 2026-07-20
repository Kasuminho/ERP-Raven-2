import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateDiamondSaleDto, DeliverDiamondShareDto } from '../src/modules/diamond-sales/dto';

const strictPipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });

describe('Diamond sales DTO validation', () => {
  it('accepts a complete external sale and converts the diamond total', async () => {
    const dto = await strictPipe.transform({
      itemCatalogId: '11111111-1111-4111-8111-111111111111',
      buyerType: 'EXTERNAL',
      buyerName: 'Mercador Azul',
      diamondCustodian: 'Guilda G3X',
      diamondTotal: '1000',
      itemProofImageUrl: '/uploads/item.webp',
      saleProofImageUrl: '/uploads/sale.webp',
      recipientMode: 'EXCLUDE_SELECTED',
      excludedPlayerIds: ['22222222-2222-4222-8222-222222222222'],
    }, { type: 'body', metatype: CreateDiamondSaleDto });

    assert.ok(dto instanceof CreateDiamondSaleDto);
    assert.equal(dto.diamondTotal, 1000);
  });

  it('requires the linked guild buyer and both valid proof URLs', async () => {
    await assert.rejects(() => strictPipe.transform({
      itemCatalogId: '11111111-1111-4111-8111-111111111111',
      buyerType: 'GUILD_MEMBER',
      diamondCustodian: 'Aiko',
      diamondTotal: 500,
      itemProofImageUrl: 'arquivo-local',
      saleProofImageUrl: '',
      recipientMode: 'ALL_ACTIVE',
    }, { type: 'body', metatype: CreateDiamondSaleDto }), BadRequestException);
  });

  it('rejects unknown fields and invalid individual delivery proofs', async () => {
    await assert.rejects(() => strictPipe.transform({ proofImageUrl: '/uploads/proof.png', diamondAmount: 999 }, {
      type: 'body', metatype: DeliverDiamondShareDto,
    }), BadRequestException);

    await assert.rejects(() => strictPipe.transform({ proofImageUrl: 'C:\\private\\proof.png' }, {
      type: 'body', metatype: DeliverDiamondShareDto,
    }), BadRequestException);
  });
});
