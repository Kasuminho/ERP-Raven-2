import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { EventRsvpNoteVisibility, EventRsvpStatus, EventType, PlayerAbsenceReasonVisibility } from '@prisma/client';
import { CancelEventDto, CreateEventDto, CreateEventSeriesDto, JustifyEventNoShowDto, RegisterAttendanceDto, RespondEventReservePromotionDto, RespondEventRsvpDto, UpdateEventCompositionTargetsDto, UpsertEventReserveDto, UpsertPlayerAbsenceDto } from '../src/modules/events/dto';

const strictPipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });

describe('Events DTO validation', () => {
  it('accepts valid event creation payloads', async () => {
    const result = await strictPipe.transform(
      {
        name: 'BOSSES T4 - LUNOS',
        type: EventType.LUNOS,
        startsAt: '2026-07-09T23:00:00.000Z',
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

  it('rejects a client-supplied event author', async () => {
    await assert.rejects(
      () => strictPipe.transform(
        {
          name: 'Rigreto',
          type: 'RIGRETO',
          startsAt: '2026-07-22T22:00:00.000Z',
          createdById: '11111111-1111-4111-8111-111111111111',
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

  it('validates RSVP status, private-by-default visibility fields and note limits', async () => {
    const rsvp = await strictPipe.transform(
      { status: EventRsvpStatus.TENTATIVE, note: ' Talvez chegue depois. ', noteVisibility: EventRsvpNoteVisibility.STAFF_ONLY },
      { type: 'body', metatype: RespondEventRsvpDto },
    );
    assert.ok(rsvp instanceof RespondEventRsvpDto);
    assert.equal(rsvp.note, 'Talvez chegue depois.');

    await assert.rejects(
      () => strictPipe.transform(
        { status: 'PRESENT', noteVisibility: 'EVERYONE', leaked: true },
        { type: 'body', metatype: RespondEventRsvpDto },
      ),
      BadRequestException,
    );
  });

  it('validates absence periods and reason visibility', async () => {
    const absence = await strictPipe.transform(
      {
        startsAt: '2026-08-01T10:00:00.000Z',
        endsAt: '2026-08-05T10:00:00.000Z',
        reason: ' Viagem ',
        reasonVisibility: PlayerAbsenceReasonVisibility.STAFF_ONLY,
      },
      { type: 'body', metatype: UpsertPlayerAbsenceDto },
    );
    assert.ok(absence instanceof UpsertPlayerAbsenceDto);
    assert.equal(absence.reason, 'Viagem');

    await assert.rejects(
      () => strictPipe.transform(
        { startsAt: 'amanha', endsAt: 'depois', reasonVisibility: 'GUILD' },
        { type: 'body', metatype: UpsertPlayerAbsenceDto },
      ),
      BadRequestException,
    );
  });

  it('validates recurring series, composition targets and reserve contracts', async () => {
    const series = await strictPipe.transform(
      {
        name: 'Clash semanal',
        type: EventType.SATURDAY_EVENT,
        firstStartsAt: '2026-08-01T22:00:00.000Z',
        durationMinutes: '120',
        intervalWeeks: '1',
        timezone: 'America/Sao_Paulo',
        exceptionDates: ['2026-08-15'],
        compositionTargets: [{ role: 'FRONTLINE', minimum: 2 }],
      },
      { type: 'body', metatype: CreateEventSeriesDto },
    );
    assert.ok(series instanceof CreateEventSeriesDto);
    assert.equal(series.durationMinutes, 120);

    const targets = await strictPipe.transform(
      { targets: [{ playerClass: 'VANGUARD', minimum: 1 }] },
      { type: 'body', metatype: UpdateEventCompositionTargetsDto },
    );
    assert.ok(targets instanceof UpdateEventCompositionTargetsDto);

    const reserve = await strictPipe.transform(
      { position: '2', reason: ' Cobertura de frontline ' },
      { type: 'body', metatype: UpsertEventReserveDto },
    );
    assert.equal(reserve.position, 2);
    assert.equal(reserve.reason, 'Cobertura de frontline');

    const response = await strictPipe.transform(
      { accept: true, note: ' Confirmo ' },
      { type: 'body', metatype: RespondEventReservePromotionDto },
    );
    assert.equal(response.accept, true);

    await assert.rejects(
      () => strictPipe.transform(
        { name: 'Serie', type: EventType.LUNOS, firstStartsAt: '2026-08-01T22:00:00.000Z', durationMinutes: 2, exceptionDates: ['15/08/2026'] },
        { type: 'body', metatype: CreateEventSeriesDto },
      ),
      BadRequestException,
    );
  });

  it('validates a bounded no-show justification', async () => {
    const result = await strictPipe.transform(
      { justification: 'Minha internet caiu durante a chamada.' },
      { type: 'body', metatype: JustifyEventNoShowDto },
    );
    assert.ok(result instanceof JustifyEventNoShowDto);
    await assert.rejects(
      () => strictPipe.transform({ justification: 'x', leaked: true }, { type: 'body', metatype: JustifyEventNoShowDto }),
      BadRequestException,
    );
  });
});
