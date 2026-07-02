import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ApproveWinnerDto, RejectWinnerDto } from '../src/modules/staff-review/dto';

const strictPipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });

describe('StaffReview DTO validation', () => {
  it('accepts valid winner approval payloads', async () => {
    const result = await strictPipe.transform(
      { playerId: '11111111-1111-4111-8111-111111111111' },
      { type: 'body', metatype: ApproveWinnerDto },
    );

    assert.ok(result instanceof ApproveWinnerDto);
    assert.equal(result.playerId, '11111111-1111-4111-8111-111111111111');
  });

  it('rejects unknown fields under the local strict pipe', async () => {
    await assert.rejects(
      () => strictPipe.transform(
        { playerId: '11111111-1111-4111-8111-111111111111', surprise: 'nope' },
        { type: 'body', metatype: ApproveWinnerDto },
      ),
      BadRequestException,
    );
  });

  it('rejects too-short rejection reasons', async () => {
    await assert.rejects(
      () => strictPipe.transform(
        { reason: 'no' },
        { type: 'body', metatype: RejectWinnerDto },
      ),
      BadRequestException,
    );
  });
});
