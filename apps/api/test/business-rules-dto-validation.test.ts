import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { BusinessRuleKeyParamDto, UpdateBusinessRuleDto } from '../src/modules/business-rules/dto';

const strictPipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });

describe('Business rules DTO validation', () => {
  it('accepts known business rule keys and flexible values', async () => {
    const params = await strictPipe.transform(
      { key: 'maintenanceMode' },
      { type: 'param', metatype: BusinessRuleKeyParamDto },
    );

    assert.ok(params instanceof BusinessRuleKeyParamDto);
    assert.equal(params.key, 'maintenanceMode');

    const body = await strictPipe.transform(
      { value: { enabled: true, message: 'Pausa operacional.' } },
      { type: 'body', metatype: UpdateBusinessRuleDto },
    );

    assert.ok(body instanceof UpdateBusinessRuleDto);
    assert.deepEqual(body.value, { enabled: true, message: 'Pausa operacional.' });
  });

  it('rejects unknown rule keys before the service sees them', async () => {
    await assert.rejects(
      () => strictPipe.transform(
        { key: 'unknownRule' },
        { type: 'param', metatype: BusinessRuleKeyParamDto },
      ),
      BadRequestException,
    );
  });

  it('rejects missing value and unknown body fields under the local strict pipe', async () => {
    await assert.rejects(
      () => strictPipe.transform(
        {},
        { type: 'body', metatype: UpdateBusinessRuleDto },
      ),
      BadRequestException,
    );

    await assert.rejects(
      () => strictPipe.transform(
        { value: { enabled: false }, actorId: 'secret' },
        { type: 'body', metatype: UpdateBusinessRuleDto },
      ),
      BadRequestException,
    );
  });
});
