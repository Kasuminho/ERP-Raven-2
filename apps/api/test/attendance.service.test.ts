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
    const source: any = { id: 'e1', name: 'Boss 1', status: EventStatus.OPEN, dkpReward: 50, dkpDistributedAt: null, createdById: 'staff', attendanceBatchId: 'batch', batchOrder: 1 };
    const next: any = { ...source, id: 'e3', name: 'Boss 3', batchOrder: 3 };
    let eventState = source;
    const attendances = [{ playerId: 'p1' }, { playerId: 'p2' }];
    const tx = {
      event: { findFirst: mock.fn(async () => next) },
      eventAttendance: { count: mock.fn(async () => 0), createMany: mock.fn(async ({ data }: any) => ({ count: data.length })) },
      player: { update: mock.fn(async () => undefined) },
    };
    const repository = {
      client: { $transaction: mock.fn(async (callback: any) => callback(tx)) },
      findById: mock.fn(async () => eventState),
      updateEvent: mock.fn(async (_id: string, data: any) => { eventState = { ...eventState, ...data }; return eventState; }),
      findAttendedPlayers: mock.fn(async () => attendances), countActivePlayers: mock.fn(async () => 3),
      findPlayers: mock.fn(async () => [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }]),
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
  });

  it('does not overwrite attendance already registered in the next event', async () => {
    const source: any = { id: 'e1', name: 'Boss 1', status: EventStatus.OPEN, dkpReward: 50, dkpDistributedAt: null, createdById: 'staff', attendanceBatchId: 'batch', batchOrder: 1 };
    let eventState = source;
    const tx = { event: { findFirst: mock.fn(async () => ({ ...source, id: 'e2', batchOrder: 2 })) }, eventAttendance: { count: mock.fn(async () => 1), createMany: mock.fn() }, player: { update: mock.fn() } };
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
});
