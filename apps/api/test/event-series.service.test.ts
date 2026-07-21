import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventOperationalCategory, EventStatus, EventType, WarRoomOperationPriority } from '@prisma/client';
import { EventSeriesService } from '../src/modules/events/services/event-series.service';

test('recurring series materialization is idempotent and respects exception dates', async () => {
  const events = new Map<number, { id: string; status: EventStatus; seriesExceptionSkipped: boolean }>();
  const series = {
    id: 'series-1',
    name: 'Clash semanal',
    type: EventType.SATURDAY_EVENT,
    operationalCategory: EventOperationalCategory.CLASH,
    priority: WarRoomOperationPriority.HIGH,
    dkpReward: 10,
    timezone: 'UTC',
    firstStartsAt: new Date('2099-01-02T20:00:00.000Z'),
    durationMinutes: 120,
    intervalWeeks: 1,
    horizonDays: 16,
    exceptionDates: ['2099-01-09'],
    compositionTargets: [{ role: 'FRONTLINE', minimum: 2 }],
    pausedAt: null,
    materializedThrough: null as Date | null,
    createdById: 'staff-1',
  };
  const prisma = {
    eventSeries: {
      findUnique: async () => series,
      update: async ({ data }: { data: { materializedThrough?: Date } }) => {
        if (data.materializedThrough) series.materializedThrough = data.materializedThrough;
        return series;
      },
    },
    event: {
      findUnique: async ({ where }: { where: { eventSeriesId_seriesOccurrence: { seriesOccurrence: number } } }) =>
        events.get(where.eventSeriesId_seriesOccurrence.seriesOccurrence) ?? null,
      create: async ({ data }: { data: { seriesOccurrence: number } }) => {
        const event = { id: `event-${data.seriesOccurrence}`, status: EventStatus.ATTENDANCE_REGISTRATION, seriesExceptionSkipped: false };
        events.set(data.seriesOccurrence, event);
        return event;
      },
      update: async () => undefined,
    },
  };
  const service = new EventSeriesService(prisma as never, {} as never, {} as never);
  const now = new Date('2099-01-01T12:00:00.000Z');

  const first = await service.materializeSeries(series.id, now);
  const second = await service.materializeSeries(series.id, now);
  series.exceptionDates = [];
  const restoredException = await service.materializeSeries(series.id, now);
  series.pausedAt = new Date();
  const whilePaused = await service.materializeSeries(series.id, now);

  assert.equal(first, 2);
  assert.equal(second, 0);
  assert.equal(restoredException, 1);
  assert.equal(whilePaused, 0);
  assert.deepEqual([...events.keys()].sort(), [0, 1, 2]);
  assert.equal(series.materializedThrough?.toISOString(), '2099-01-17T12:00:00.000Z');
});
