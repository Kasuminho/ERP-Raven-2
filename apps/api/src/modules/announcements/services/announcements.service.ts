import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Announcement, AnnouncementStatus, Prisma } from '@prisma/client';
import { AuditService } from '../../audit/services/audit.service';
import { NotificationService } from '../../discord/services/notification.service';
import { CreateAnnouncementDto } from '../dto/create-announcement.dto';
import { AnnouncementsRepository } from '../repositories/announcements.repository';

type AnnouncementStage = 'daily' | '4h' | '1h' | '30m' | 'now';

@Injectable()
export class AnnouncementsService {
  private readonly brtTimeZone = 'America/Sao_Paulo';

  constructor(
    private readonly repository: AnnouncementsRepository,
    private readonly notifications: NotificationService,
    private readonly auditService: AuditService,
    private readonly config: ConfigService,
  ) {}

  async createAnnouncement(data: CreateAnnouncementDto, createdById?: string): Promise<Announcement> {
    const eventTime = new Date(data.eventTime);

    if (Number.isNaN(eventTime.getTime()) || eventTime <= new Date()) {
      throw new BadRequestException('eventTime must be a future ISO date.');
    }

    const webhookUrl = this.config.get<string>('discord.webhooks.announcements') || '';
    const channelId = data.channelId?.trim() || this.config.get<string>('discord.channels.announcements') || (webhookUrl ? 'webhook:announcements' : '');

    if (!channelId) {
      throw new BadRequestException('Announcement channel is required.');
    }

    const now = new Date();
    const timezone = data.timezone?.trim() || this.brtTimeZone;
    const announcement = await this.repository.create({
      type: data.type.trim(),
      title: data.title.trim(),
      description: data.description?.trim() || undefined,
      eventTime,
      timezone,
      channelId,
      mentionRoleId: data.mentionRoleId?.trim() || undefined,
      ...this.getInitialReminderState(eventTime, now, timezone),
      createdBy: createdById ? { connect: { id: createdById } } : undefined,
    });

    await this.sendAnnouncement(announcement, 'created');
    await this.audit('ANNOUNCEMENT_CREATED', announcement.id, createdById, {
      type: announcement.type,
      title: announcement.title,
      eventTime: announcement.eventTime.toISOString(),
      channelId: announcement.channelId,
    });

    return announcement;
  }

  async getAnnouncements(): Promise<Announcement[]> {
    return this.repository.findMany();
  }

  async cancelAnnouncement(id: string, actorId?: string): Promise<Announcement> {
    const announcement = await this.requireAnnouncement(id);

    if (announcement.status !== AnnouncementStatus.ACTIVE) {
      return announcement;
    }

    const cancelled = await this.repository.update(id, { status: AnnouncementStatus.CANCELLED });
    await this.audit('ANNOUNCEMENT_CANCELLED', id, actorId, { title: cancelled.title });

    return cancelled;
  }

  async processDueAnnouncements(now = new Date()): Promise<{ sent: number }> {
    const announcements = await this.repository.findActive();
    let sent = 0;

    for (const announcement of announcements) {
      const stages = this.getDueStages(announcement, now);

      for (const stage of stages) {
        await this.sendAnnouncement(announcement, stage);
        await this.markStageSent(announcement, stage, now);
        sent += 1;
      }
    }

    return { sent };
  }

  private getDueStages(announcement: Announcement, now: Date): AnnouncementStage[] {
    const eventMs = announcement.eventTime.getTime();
    const nowMs = now.getTime();
    const todayKey = this.getDayKey(now, announcement.timezone || this.brtTimeZone);

    if (!announcement.warnedNow && nowMs >= eventMs) {
      return ['now'];
    }

    if (!announcement.warned30m && nowMs >= eventMs - 30 * 60 * 1000 && nowMs < eventMs) {
      return ['30m'];
    }

    if (!announcement.warned1h && nowMs >= eventMs - 60 * 60 * 1000 && nowMs < eventMs) {
      return ['1h'];
    }

    if (!announcement.warned4h && nowMs >= eventMs - 4 * 60 * 60 * 1000 && nowMs < eventMs) {
      return ['4h'];
    }

    if (nowMs < eventMs && this.isPastLocalNoon(now, announcement.timezone || this.brtTimeZone) && announcement.warnedDailyDay !== todayKey) {
      return ['daily'];
    }

    return [];
  }

  private async markStageSent(announcement: Announcement, stage: AnnouncementStage, now: Date): Promise<void> {
    const data: Prisma.AnnouncementUpdateInput = {};

    if (stage === 'daily') {
      data.warnedDailyDay = this.getDayKey(now, announcement.timezone || this.brtTimeZone);
    }

    if (stage === '4h') data.warned4h = true;
    if (stage === '1h') data.warned1h = true;
    if (stage === '30m') data.warned30m = true;
    if (stage === 'now') {
      data.warnedNow = true;
      data.status = AnnouncementStatus.SENT;
    }

    await this.repository.update(announcement.id, data);
    await this.audit('ANNOUNCEMENT_SENT', announcement.id, undefined, { stage });
  }

  private async sendAnnouncement(announcement: Announcement, stage: AnnouncementStage | 'created'): Promise<void> {
    await this.notifications.sendAnnouncementNotification(
      announcement.channelId,
      {
        mentionRoleId: announcement.mentionRoleId,
        stageLabel: this.stageLabel(stage),
        type: announcement.type,
        title: announcement.title,
        description: announcement.description,
        eventTime: announcement.eventTime,
      },
      announcement.id,
    );
  }

  private stageLabel(stage: AnnouncementStage | 'created'): string {
    const labels: Record<AnnouncementStage | 'created', string> = {
      created: 'Novo anuncio cadastrado',
      daily: 'Lembrete diario',
      '4h': 'Faltam 4 horas',
      '1h': 'Falta 1 hora',
      '30m': 'Faltam 30 minutos',
      now: 'Agora',
    };
    return labels[stage];
  }

  private getInitialReminderState(
    eventTime: Date,
    now: Date,
    timeZone: string,
  ): Pick<Prisma.AnnouncementCreateInput, 'warnedDailyDay' | 'warned4h' | 'warned1h' | 'warned30m'> {
    const eventMs = eventTime.getTime();
    const nowMs = now.getTime();
    const sameLocalDay = this.getDayKey(eventTime, timeZone) === this.getDayKey(now, timeZone);

    return {
      warnedDailyDay: sameLocalDay ? this.getDayKey(now, timeZone) : undefined,
      warned4h: nowMs >= eventMs - 4 * 60 * 60 * 1000,
      warned1h: nowMs >= eventMs - 60 * 60 * 1000,
      warned30m: nowMs >= eventMs - 30 * 60 * 1000,
    };
  }

  private getDayKey(date: Date, timeZone: string): number {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';

    return Number(`${get('year')}${get('month')}${get('day')}`);
  }

  private isPastLocalNoon(date: Date, timeZone: string): boolean {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);

    return hour >= 12;
  }

  private async requireAnnouncement(id: string): Promise<Announcement> {
    const announcement = await this.repository.findById(id);

    if (!announcement) {
      throw new NotFoundException(`Announcement ${id} was not found.`);
    }

    return announcement;
  }

  private async audit(action: string, targetId: string, actorId: string | undefined, metadata: Prisma.InputJsonObject): Promise<void> {
    await this.auditService.log({
      actorId,
      action,
      targetType: 'Announcement',
      targetId,
      metadata,
    });
  }
}
