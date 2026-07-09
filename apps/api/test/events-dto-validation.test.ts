import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { EventType } from '@prisma/client';
import { CancelEventDto, CreateEventDto, RegisterAttendanceDto } from '../src/modules/events/dto';

const strictPipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });

describe('Events DTO validation', () => {
  it('accepts valid event creation payloads', async () => {
    const result = await strictPipe.transform(
      {
        name: 'BOSSES T4 - LUNOS',
        type: EventType.LUNOS,
        startsAt: '2026-07-09T23:00:00.000Z',
        createdById: '11111111-1111-4111-8111-111111111111',
        attendanceBatchId: '22222222-2222-4222-8222-222222222222',
        batchOrder: '2',
      },
      { type: 'body', metatype: CreateEventDto },
    );

    assert.ok(result instanceof CreateEventDto);
    assert.equal(result.name, 'BOSSES T4 - LUNOS');
    assert.equal(result.type, EventType.LUNOS);
    assert.equal(result.batchOrder, 2);
  });

  it('rejects unknown event creation fields under the local strict pipe', async () => {
    await assert.rejects(
      () => strictPipe.transform(
        {
          name: 'BOSSES T4 - LUNOS',
          type: EventType.LUNOS,
          startsAt: '2026-07-09T23:00:00.000Z',
          surprise: 'nope',
        },
        { type: 'body', metatype: CreateEventDto },
      ),
      BadRequestException,
    );
  });

  it('rejects invalid event type, date and batch order before the service sees them', async () => {
    await assert.rejects(
      () => strictPipe.transform(
        { name: 'BOSSES T4', type: 'NOT_A_BOSS', startsAt: '2026-07-09T23:00:00.000Z' },
        { type: 'body', metatype: CreateEventDto },
      ),
      BadRequestException,
    );

    await assert.rejects(
      () => strictPipe.transform(
        { name: 'BOSSES T4', type: EventType.LUNOS, startsAt: 'amanha' },
        { type: 'body', metatype: CreateEventDto },
      ),
      BadRequestException,
    );

    await assert.rejects(
      () => strictPipe.transform(
        { name: 'BOSSES T4', type: EventType.LUNOS, startsAt: '2026-07-09T23:00:00.000Z', batchOrder: -1 },
        { type: 'body', metatype: CreateEventDto },
      ),
      BadRequestException,
    );
  });

  it('validates attendance and cancel payloads', async () => {
    const attendance = await strictPipe.transform(
      { playerId: '33333333-3333-4333-8333-333333333333' },
      { type: 'body', metatype: RegisterAttendanceDto },
    );
    assert.ok(attendance instanceof RegisterAttendanceDto);

    await assert.rejects(
      () => strictPipe.transform(
        { playerId: 'not-a-uuid' },
        { type: 'body', metatype: RegisterAttendanceDto },
      ),
      BadRequestException,
    );

    const cancel = await strictPipe.transform(
      { reason: 'Boss pulado por decisao da Staff.' },
      { type: 'body', metatype: CancelEventDto },
    );
    assert.ok(cancel instanceof CancelEventDto);
    assert.equal(cancel.reason, 'Boss pulado por decisao da Staff.');

    await assert.rejects(
      () => strictPipe.transform(
        { reason: 'x'.repeat(501) },
        { type: 'body', metatype: CancelEventDto },
      ),
      BadRequestException,
    );
  });
});
