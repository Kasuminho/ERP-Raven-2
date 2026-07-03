import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { EventType } from '@prisma/client';
import { CreateAnnouncementDto } from '../src/modules/announcements/dto/create-announcement.dto';

const strictPipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });

describe('Announcements DTO validation', () => {
  it('accepts valid announcement payloads', async () => {
    const result = await strictPipe.transform(
      {
        type: 'BOSS',
        title: 'BOSSES T4',
        description: 'Chamada de bosses em lote.',
        eventTime: '2026-07-04T23:00:00.000Z',
        timezone: 'America/Sao_Paulo',
        channelId: '123456789012345678',
        mentionRoleId: '987654321098765432',
        attendanceEventTypes: [EventType.LUNOS, EventType.RIGRETO],
      },
      { type: 'body', metatype: CreateAnnouncementDto },
    );

    assert.ok(result instanceof CreateAnnouncementDto);
    assert.equal(result.title, 'BOSSES T4');
    assert.deepEqual(result.attendanceEventTypes, [EventType.LUNOS, EventType.RIGRETO]);
  });

  it('rejects unknown fields under the local strict pipe', async () => {
    await assert.rejects(
      () => strictPipe.transform(
        {
          type: 'BOSS',
          title: 'BOSSES T4',
          eventTime: '2026-07-04T23:00:00.000Z',
          unexpected: 'nope',
        },
        { type: 'body', metatype: CreateAnnouncementDto },
      ),
      BadRequestException,
    );
  });

  it('rejects invalid or duplicate attendance event types', async () => {
    await assert.rejects(
      () => strictPipe.transform(
        {
          type: 'BOSS',
          title: 'BOSSES T4',
          eventTime: '2026-07-04T23:00:00.000Z',
          attendanceEventTypes: [EventType.LUNOS, EventType.LUNOS],
        },
        { type: 'body', metatype: CreateAnnouncementDto },
      ),
      BadRequestException,
    );

    await assert.rejects(
      () => strictPipe.transform(
        {
          type: 'BOSS',
          title: 'BOSSES T4',
          eventTime: '2026-07-04T23:00:00.000Z',
          attendanceEventTypes: ['NOT_A_BOSS'],
        },
        { type: 'body', metatype: CreateAnnouncementDto },
      ),
      BadRequestException,
    );
  });

  it('rejects non-ISO event times before the service sees them', async () => {
    await assert.rejects(
      () => strictPipe.transform(
        {
          type: 'BOSS',
          title: 'BOSSES T4',
          eventTime: 'amanha depois do cafe',
        },
        { type: 'body', metatype: CreateAnnouncementDto },
      ),
      BadRequestException,
    );
  });
});
