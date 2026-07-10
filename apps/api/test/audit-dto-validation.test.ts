import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { AuditTimelineParamDto, AuditTimelineQueryDto } from '../src/modules/audit/dto';

const strictPipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });

describe('Audit DTO validation', () => {
  it('accepts valid timeline params and query pagination', async () => {
    const params = await strictPipe.transform(
      { targetType: 'Auction', targetId: '11111111-1111-4111-8111-111111111111' },
      { type: 'param', metatype: AuditTimelineParamDto },
    );

    assert.ok(params instanceof AuditTimelineParamDto);
    assert.equal(params.targetType, 'Auction');

    const query = await strictPipe.transform(
      { page: '2', limit: '25' },
      { type: 'query', metatype: AuditTimelineQueryDto },
    );

    assert.ok(query instanceof AuditTimelineQueryDto);
    assert.equal(query.page, 2);
    assert.equal(query.limit, 25);
  });

  it('keeps query pagination optional for the default timeline view', async () => {
    const query = await strictPipe.transform(
      {},
      { type: 'query', metatype: AuditTimelineQueryDto },
    );

    assert.ok(query instanceof AuditTimelineQueryDto);
    assert.equal(query.page, undefined);
    assert.equal(query.limit, undefined);
  });

  it('rejects invalid params and unknown fields before the service sees them', async () => {
    await assert.rejects(
      () => strictPipe.transform(
        { targetType: '', targetId: 'target-1' },
        { type: 'param', metatype: AuditTimelineParamDto },
      ),
      BadRequestException,
    );

    await assert.rejects(
      () => strictPipe.transform(
        { targetType: 'Auction', targetId: 'target-1', actorId: 'secret' },
        { type: 'param', metatype: AuditTimelineParamDto },
      ),
      BadRequestException,
    );
  });

  it('rejects invalid timeline pagination', async () => {
    await assert.rejects(
      () => strictPipe.transform(
        { page: '0', limit: '25' },
        { type: 'query', metatype: AuditTimelineQueryDto },
      ),
      BadRequestException,
    );

    await assert.rejects(
      () => strictPipe.transform(
        { page: '1', limit: '201' },
        { type: 'query', metatype: AuditTimelineQueryDto },
      ),
      BadRequestException,
    );

    await assert.rejects(
      () => strictPipe.transform(
        { page: '1', limit: '25', includePrivate: 'true' },
        { type: 'query', metatype: AuditTimelineQueryDto },
      ),
      BadRequestException,
    );
  });
});
