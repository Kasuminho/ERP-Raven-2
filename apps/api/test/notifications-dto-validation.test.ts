import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NotificationIdParamDto } from '../src/modules/notifications/dto';

const strictPipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });

describe('Notifications DTO validation', () => {
  it('accepts a valid notification id param', async () => {
    const result = await strictPipe.transform(
      { id: '11111111-1111-4111-8111-111111111111' },
      { type: 'param', metatype: NotificationIdParamDto },
    );

    assert.ok(result instanceof NotificationIdParamDto);
    assert.equal(result.id, '11111111-1111-4111-8111-111111111111');
  });

  it('rejects invalid notification ids before the service sees them', async () => {
    await assert.rejects(
      () => strictPipe.transform(
        { id: 'not-a-uuid' },
        { type: 'param', metatype: NotificationIdParamDto },
      ),
      BadRequestException,
    );
  });

  it('rejects unknown param fields under the local strict pipe', async () => {
    await assert.rejects(
      () => strictPipe.transform(
        { id: '11111111-1111-4111-8111-111111111111', playerId: 'secret' },
        { type: 'param', metatype: NotificationIdParamDto },
      ),
      BadRequestException,
    );
  });
});
