import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { EventStatus, EventType } from '@prisma/client';
import { AttendanceService } from '../src/modules/events/services/attendance.service';

describe('AttendanceService event batches', () => {
  it('preserves batch identity and order when creating an event', async () => {
    const repository = { create: mock.fn(async (data: any) => ({ id: 'e1', ...data })) };
    const rules = { getEventReward: mock.fn(async () => 50) };
    const service = new AttendanceService(repository as never, {} as never, { log: mock.fn() } as never, { notifyAttendanceStarted: mock.fn() } as never, rules as never);
    const created = await service.createEvent({
      name: 'BOSSES T4 - LUNOS', type: EventType.LUNOS, startsAt: new Date().toISOString(),
      createdById: 'staff', attendanceBatchId: 'announcement-1', batchOrder: 2,
    });
    assert.equal(created.attendanceBatchId, 'announcement-1');
    assert.equal(created.batchOrder, 2);
  });

  it('copies attendance only to the next active empty event', async () => {
    const source: any = { id: 'e1', name: 'Boss 1', status: EventStatus.OPEN, dkpReward: 50, dkpDistributedAt: null, createdById: 'staff', attendanceBatchId: 'batch', batchOrder: 1, startsAt: new Date('2099-01-01T20:00:00.000Z') };
    const next: any = { ...source, id: 'e3', name: 'Boss 3', batchOrder: 3 };
    let eventState = source;
    const attendances = [{ playerId: 'p1' }, { playerId: 'p2' }];
    const tx = {
      event: { findFirst: mock.fn(async () => next) },
      eventAttendance: { count: mock.fn(async () => 0), createMany: mock.fn(async ({ data }: any) => ({ count: data.length })) },
      eventRsvp: {
        findMany: mock.fn(async () => [{ id: 'rsvp-p1', playerId: 'p1' }, { id: 'rsvp-p3', playerId: 'p3' }, { id: 'rsvp-p4', playerId: 'p4' }]),
        updateMany: mock.fn(async () => ({ count: 1 })),
      },
      playerAbsence: { findMany: mock.fn(async () => [{ playerId: 'p3' }]) },
      player: { update: mock.fn(async () => undefined) },
    };
    const repository = {
      client: { $transaction: mock.fn(async (callback: any) => callback(tx)) },
      findById: mock.fn(async () => eventState),
      updateEvent: mock.fn(async (_id: string, data: any) => { eventState = { ...eventState, ...data }; return eventState; }),
      findAttendedPlayers: mock.fn(async () => attendances), countActivePlayers: mock.fn(async () => 4),
      findPlayers: mock.fn(async () => [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }]),
      countPlayerFinalizedAttendance: mock.fn(async () => 1), countFinalizedEvents: mock.fn(async () => 1),
    };
    const dkp = { createTransactionWithinTransaction: mock.fn(async (data: any) => ({ id: `tx-${data.playerId}` })) };
    const audit = { logWithinTransaction: mock.fn(async () => undefined) };
    const notification = { notifyEventFinalized: mock.fn(async () => undefined) };
    const service = new AttendanceService(repository as never, dkp as never, audit as never, notification as never, {} as never);

    const result = await service.finalizeEvent('e1');
    assert.equal(result.nextEvent?.id, 'e3');
    assert.equal(result.copiedAttendanceCount, 2);
    assert.equal(result.attendanceCopyStatus, 'COPIED');
    assert.deepEqual(tx.event.findFirst.mock.calls[0].arguments[0].where.status.in, [EventStatus.OPEN, EventStatus.ATTENDANCE_REGISTRATION]);
    assert.equal(dkp.createTransactionWithinTransaction.mock.callCount(), 2);
    assert.deepEqual(tx.eventRsvp.updateMany.mock.calls[0].arguments[0].where.id.in, ['rsvp-p4']);
  });

  it('does not overwrite attendance already registered in the next event', async () => {
    const source: any = { id: 'e1', name: 'Boss 1', status: EventStatus.OPEN, dkpReward: 50, dkpDistributedAt: null, createdById: 'staff', attendanceBatchId: 'batch', batchOrder: 1, startsAt: new Date('2099-01-01T20:00:00.000Z') };
    let eventState = source;
    const tx = {
      event: { findFirst: mock.fn(async () => ({ ...source, id: 'e2', batchOrder: 2 })) },
      eventAttendance: { count: mock.fn(async () => 1), createMany: mock.fn() },
      eventRsvp: { findMany: mock.fn(async () => []), updateMany: mock.fn() },
      playerAbsence: { findMany: mock.fn(async () => []) },
      player: { update: mock.fn() },
    };
    const repository = {
      client: { $transaction: mock.fn(async (callback: any) => callback(tx)) }, findById: mock.fn(async () => eventState),
      updateEvent: mock.fn(async (_id: string, data: any) => { eventState = { ...eventState, ...data }; return eventState; }),
      findAttendedPlayers: mock.fn(async () => [{ playerId: 'p1' }]), countActivePlayers: mock.fn(async () => 1), findPlayers: mock.fn(async () => []),
    };
    const service = new AttendanceService(repository as never, { createTransactionWithinTransaction: mock.fn(async () => ({ id: 'tx' })) } as never, { logWithinTransaction: mock.fn() } as never, { notifyEventFinalized: mock.fn() } as never, {} as never);
    const result = await service.finalizeEvent('e1');
    assert.equal(result.attendanceCopyStatus, 'NEXT_EVENT_NOT_EMPTY');
    assert.equal(tx.eventAttendance.createMany.mock.callCount(), 0);
  });

  it('marks event checklist items and audits the change', async () => {
    const event: any = {
      id: 'e1',
      name: 'Abyss',
      status: EventStatus.ATTENDANCE_REGISTRATION,
      checklist: [
        { key: 'route', label: 'Rota definida', detail: 'Rota Abyss', checked: false },
      ],
    };
    const repository = {
      findById: mock.fn(async () => event),
      updateEvent: mock.fn(async (_id: string, data: any) => ({ ...event, ...data })),
    };
    const audit = { log: mock.fn(async () => undefined) };
    const service = new AttendanceService(repository as never, {} as never, audit as never, {} as never, {} as never);

    const updated = await service.markChecklistItem('e1', 'route', { checked: true, note: 'caller confirmou' }, 'staff-1');
    const checklist = updated.checklist as any[];

    assert.equal(checklist[0].checked, true);
    assert.equal(checklist[0].checkedById, 'staff-1');
    assert.equal(repository.updateEvent.mock.calls[0].arguments[1].checklist[0].note, 'caller confirmou');
    assert.equal(audit.log.mock.calls[0].arguments[0].action, 'EVENT_CHECKLIST_ITEM_UPDATED');
  });
});
