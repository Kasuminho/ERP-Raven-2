import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { PlayerClass, PlayerCombatRole, WarRoomOperationPriority, WarRoomOperationStatus, WarRoomOperationType, WarRoomRosterSlotStatus, WarRoomTimelineEventType } from '@prisma/client';
import { CloseWarRoomOperationDto, CreateWarRoomOperationDto, CreateWarRoomRosterSlotDto, CreateWarRoomTimelineEventDto, MarkWarRoomAttendanceDto, PlayerWarRoomConfirmationDto, UpdateWarRoomOperationDto } from '../src/modules/war-room/dto';

const strictPipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });

describe('War Room DTO validation', () => {
  it('accepts valid operation creation payloads', async () => {
    const result = await strictPipe.transform(
      {
        name: 'Clash domingo',
        type: WarRoomOperationType.CLASH,
        startsAt: '2026-07-12T23:00:00.000Z',
        endsAt: '2026-07-13T00:00:00.000Z',
        priority: WarRoomOperationPriority.HIGH,
        status: WarRoomOperationStatus.SCHEDULED,
        mapRegion: 'Ancient Fortress',
        objective: 'Controle de objetivo central.',
        internalLinks: [{ label: 'Evento', href: '/dashboard/admin/events' }],
      },
      { type: 'body', metatype: CreateWarRoomOperationDto },
    );

    assert.ok(result instanceof CreateWarRoomOperationDto);
    assert.equal(result.type, WarRoomOperationType.CLASH);
    assert.equal(result.internalLinks?.[0].label, 'Evento');
  });

  it('rejects unknown fields and invalid operation types', async () => {
    await assert.rejects(
      () => strictPipe.transform(
        {
          name: 'Clash domingo',
          type: 'ARENA_SOLO',
          startsAt: '2026-07-12T23:00:00.000Z',
          endsAt: '2026-07-13T00:00:00.000Z',
          leak: true,
        },
        { type: 'body', metatype: CreateWarRoomOperationDto },
      ),
      BadRequestException,
    );
  });

  it('validates update and close payloads', async () => {
    const update = await strictPipe.transform(
      { status: WarRoomOperationStatus.ACTIVE, staffNotes: 'Caller definido.' },
      { type: 'body', metatype: UpdateWarRoomOperationDto },
    );

    assert.ok(update instanceof UpdateWarRoomOperationDto);

    const close = await strictPipe.transform(
      { result: 'Objetivo capturado, defesa ok.', score: '2-1', improvementNotes: 'Rotacao do grupo reserva precisa ser mais rapida.' },
      { type: 'body', metatype: CloseWarRoomOperationDto },
    );

    assert.ok(close instanceof CloseWarRoomOperationDto);
  });

  it('accepts valid roster slot and player confirmation payloads', async () => {
    const slot = await strictPipe.transform(
      {
        playerId: '8d2b8e60-8454-4dd5-a0c1-583fd1fa3ed9',
        role: PlayerCombatRole.FRONTLINE,
        requiredClass: PlayerClass.VANGUARD,
        requiredLayer: 6,
        publicInstructionsPt: 'Segure choke e escute caller.',
        publicInstructionsEn: 'Hold choke and listen to caller.',
        staffNote: 'Starter.',
      },
      { type: 'body', metatype: CreateWarRoomRosterSlotDto },
    );

    assert.ok(slot instanceof CreateWarRoomRosterSlotDto);
    assert.equal(slot.role, PlayerCombatRole.FRONTLINE);

    const attendance = await strictPipe.transform(
      { status: WarRoomRosterSlotStatus.PRESENT, staffNote: 'Entrou na call.' },
      { type: 'body', metatype: MarkWarRoomAttendanceDto },
    );

    assert.ok(attendance instanceof MarkWarRoomAttendanceDto);

    const confirmation = await strictPipe.transform(
      { playerNote: 'Chego 5 min antes.' },
      { type: 'body', metatype: PlayerWarRoomConfirmationDto },
    );

    assert.ok(confirmation instanceof PlayerWarRoomConfirmationDto);
  });

  it('rejects roster slot payloads with invalid layer or leaked fields', async () => {
    await assert.rejects(
      () => strictPipe.transform(
        {
          playerId: '8d2b8e60-8454-4dd5-a0c1-583fd1fa3ed9',
          role: PlayerCombatRole.SUPPORT,
          requiredLayer: 99,
          hiddenComp: true,
        },
        { type: 'body', metatype: CreateWarRoomRosterSlotDto },
      ),
      BadRequestException,
    );
  });

  it('validates live timeline event payloads', async () => {
    const event = await strictPipe.transform(
      {
        type: WarRoomTimelineEventType.ENGAGE,
        title: 'Engage no choke norte',
        note: 'Caller puxou foco no backline.',
        occurredAt: '2026-07-12T23:10:00.000Z',
        metadata: { wave: 1 },
      },
      { type: 'body', metatype: CreateWarRoomTimelineEventDto },
    );

    assert.ok(event instanceof CreateWarRoomTimelineEventDto);
    assert.equal(event.type, WarRoomTimelineEventType.ENGAGE);

    await assert.rejects(
      () => strictPipe.transform(
        {
          type: WarRoomTimelineEventType.CALL,
          title: 'Trocar alvo',
          secret: 'nao entra',
        },
        { type: 'body', metatype: CreateWarRoomTimelineEventDto },
      ),
      BadRequestException,
    );
  });
});
