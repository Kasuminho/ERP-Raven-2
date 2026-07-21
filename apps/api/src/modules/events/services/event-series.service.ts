import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventOperationalCategory, EventStatus, EventType, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import type { EventCompositionTarget } from '@shared/types/events';
import { AuditService } from '../../audit/services/audit.service';
import { BusinessRulesService } from '../../business-rules/business-rules.service';
import { CreateEventSeriesDto, EventCompositionTargetDto } from '../dto';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

@Injectable()
export class EventSeriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessRules: BusinessRulesService,
    private readonly auditService: AuditService,
  ) {}

  async listSeries() {
    return this.prisma.eventSeries.findMany({
      include: { _count: { select: { events: true } } },
      orderBy: [{ pausedAt: 'asc' }, { firstStartsAt: 'asc' }],
    });
  }

  async create(dto: CreateEventSeriesDto, actorId: string) {
    const timezone = dto.timezone?.trim() || 'America/Sao_Paulo';
    this.assertTimezone(timezone);
    const firstStartsAt = new Date(dto.firstStartsAt);
    const targets = this.normalizeTargets(dto.compositionTargets ?? []);
    const exceptionDates = this.normalizeExceptionDates(dto.exceptionDates ?? []);
    const dkpReward = await this.businessRules.getEventReward(dto.type);
    const series = await this.prisma.eventSeries.create({
      data: {
        name: dto.name.trim(),
        type: dto.type,
        operationalCategory: dto.operationalCategory ?? this.inferCategory(dto.type),
        priority: dto.priority,
        dkpReward,
        timezone,
        firstStartsAt,
        durationMinutes: dto.durationMinutes,
        intervalWeeks: dto.intervalWeeks ?? 1,
        horizonDays: dto.horizonDays ?? 56,
        exceptionDates,
        compositionTargets: targets as unknown as Prisma.InputJsonValue,
        createdById: actorId,
      },
    });
    const materialized = await this.materializeSeries(series.id);
    await this.auditService.log({
      actorId,
      action: 'EVENT_SERIES_CREATED',
      targetType: 'EventSeries',
      targetId: series.id,
      metadata: { type: series.type, timezone, firstStartsAt: firstStartsAt.toISOString(), intervalWeeks: series.intervalWeeks, materialized },
    });
    return this.prisma.eventSeries.findUnique({ where: { id: series.id }, include: { _count: { select: { events: true } } } });
  }

  async setPaused(seriesId: string, paused: boolean, actorId: string) {
    await this.requireSeries(seriesId);
    const series = await this.prisma.eventSeries.update({
      where: { id: seriesId },
      data: { pausedAt: paused ? new Date() : null },
    });
    let materialized = 0;
    let affected = 0;
    if (paused) {
      const result = await this.prisma.event.updateMany({
        where: {
          eventSeriesId: seriesId,
          startsAt: { gt: new Date() },
          status: { in: [EventStatus.OPEN, EventStatus.ATTENDANCE_REGISTRATION] },
        },
        data: { status: EventStatus.CANCELLED, seriesExceptionSkipped: true },
      });
      affected = result.count;
    } else {
      materialized = await this.materializeSeries(seriesId);
      affected = materialized;
    }
    await this.auditService.log({
      actorId,
      action: paused ? 'EVENT_SERIES_PAUSED' : 'EVENT_SERIES_RESUMED',
      targetType: 'EventSeries',
      targetId: seriesId,
      metadata: { materialized, affected },
    });
    return series;
  }

  async updateExceptions(seriesId: string, exceptionDates: string[], actorId: string) {
    await this.requireSeries(seriesId);
    const normalized = this.normalizeExceptionDates(exceptionDates);
    await this.prisma.eventSeries.update({
      where: { id: seriesId },
      data: { exceptionDates: normalized },
    });
    const materialized = await this.materializeSeries(seriesId);
    await this.auditService.log({
      actorId,
      action: 'EVENT_SERIES_EXCEPTIONS_UPDATED',
      targetType: 'EventSeries',
      targetId: seriesId,
      metadata: { exceptionDates: normalized, materialized },
    });
    return this.requireSeries(seriesId);
  }

  async updateEventTargets(eventId: string, targets: EventCompositionTargetDto[], actorId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!event) throw new NotFoundException(`Event ${eventId} was not found.`);
    const normalized = this.normalizeTargets(targets);
    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: { compositionTargets: normalized as unknown as Prisma.InputJsonValue },
    });
    await this.auditService.log({
      actorId,
      action: 'EVENT_COMPOSITION_TARGETS_UPDATED',
      targetType: 'Event',
      targetId: eventId,
      metadata: { targets: normalized },
    });
    return updated;
  }

  async materializeAll(now = new Date()): Promise<{ series: number; events: number }> {
    const series = await this.prisma.eventSeries.findMany({ where: { pausedAt: null }, select: { id: true } });
    let events = 0;
    for (const item of series) events += await this.materializeSeries(item.id, now);
    return { series: series.length, events };
  }

  async materializeSeries(seriesId: string, now = new Date()): Promise<number> {
    const series = await this.requireSeries(seriesId);
    if (series.pausedAt) return 0;
    const intervalMs = series.intervalWeeks * WEEK_MS;
    const through = new Date(now.getTime() + series.horizonDays * DAY_MS);
    const exceptions = new Set(this.readStringArray(series.exceptionDates));
    const earliestOccurrence = Math.max(0, Math.floor((now.getTime() - series.firstStartsAt.getTime()) / intervalMs) - 1);
    let createdOrRestored = 0;

    for (let occurrence = earliestOccurrence; occurrence < earliestOccurrence + 520; occurrence += 1) {
      const startsAt = new Date(series.firstStartsAt.getTime() + occurrence * intervalMs);
      if (startsAt > through) break;
      const unique = { eventSeriesId_seriesOccurrence: { eventSeriesId: series.id, seriesOccurrence: occurrence } };
      const existing = await this.prisma.event.findUnique({ where: unique, select: { id: true, status: true, seriesExceptionSkipped: true } });
      const isException = exceptions.has(this.dateKey(startsAt, series.timezone));

      if (isException) {
        if (existing && !existing.seriesExceptionSkipped && existing.status !== EventStatus.FINALIZED) {
          await this.prisma.event.update({ where: { id: existing.id }, data: { status: EventStatus.CANCELLED, seriesExceptionSkipped: true } });
        }
        continue;
      }
      if (existing) {
        if (existing.seriesExceptionSkipped) {
          await this.prisma.event.update({ where: { id: existing.id }, data: { status: EventStatus.ATTENDANCE_REGISTRATION, seriesExceptionSkipped: false } });
          createdOrRestored += 1;
        }
        continue;
      }

      try {
        await this.prisma.event.create({
          data: {
            name: `${series.name} · #${occurrence + 1}`,
            type: series.type,
            status: EventStatus.ATTENDANCE_REGISTRATION,
            operationalCategory: series.operationalCategory,
            priority: series.priority,
            dkpReward: series.dkpReward,
            startsAt,
            endsAt: new Date(startsAt.getTime() + series.durationMinutes * 60 * 1000),
            createdById: series.createdById,
            eventSeriesId: series.id,
            seriesOccurrence: occurrence,
            compositionTargets: series.compositionTargets as Prisma.InputJsonValue,
          },
        });
        createdOrRestored += 1;
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
      }
    }

    await this.prisma.eventSeries.update({ where: { id: series.id }, data: { materializedThrough: through } });
    return createdOrRestored;
  }

  private normalizeTargets(targets: EventCompositionTargetDto[]): EventCompositionTarget[] {
    return targets.map((target) => {
      if (!target.role && !target.playerClass) throw new BadRequestException('Each composition target requires a role or class.');
      return {
        role: target.role ?? null,
        playerClass: target.playerClass ?? null,
        minimum: target.minimum,
        label: target.label?.trim() || null,
      };
    });
  }

  private normalizeExceptionDates(values: string[]): string[] {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
  }

  private readStringArray(value: Prisma.JsonValue): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }

  private assertTimezone(timezone: string): void {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    } catch {
      throw new BadRequestException('Invalid IANA timezone.');
    }
  }

  private dateKey(date: Date, timezone: string): string {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')}`;
  }

  private inferCategory(type: EventType): EventOperationalCategory {
    if (type === EventType.ABYSS_1 || type === EventType.ABYSS_1_2) return EventOperationalCategory.ABYSS;
    if (type === EventType.GUILD_DUNGEON) return EventOperationalCategory.GUILD_RAID;
    return EventOperationalCategory.BOSS;
  }

  private async requireSeries(seriesId: string) {
    const series = await this.prisma.eventSeries.findUnique({ where: { id: seriesId } });
    if (!series) throw new NotFoundException(`Event series ${seriesId} was not found.`);
    return series;
  }
}
