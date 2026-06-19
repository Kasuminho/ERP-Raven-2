import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import type { MessageCreateOptions } from 'discord.js';
import { AuditService } from '../../audit/services/audit.service';
import { buildAttendanceStartedEmbed, buildEventFinalizedEmbed } from '../bot/embeds/attendance.embeds';
import { buildAuctionCreatedEmbed, buildAuctionDeliveryEmbed, buildAuctionWinnerEmbed } from '../bot/embeds/auction.embeds';
import { buildDkpNotificationEmbed } from '../bot/embeds/dkp.embeds';
import { buildAnnouncementEmbed, buildItemInterestCreatedEmbed, buildItemInterestDeliveredEmbed, buildItemInterestSkillBatchEmbed, buildRequestReminderEmbed } from '../bot/embeds/notification.embeds';
import { buildStaffReviewRequiredEmbed } from '../bot/embeds/staff-review.embeds';
import { DiscordLocale, localeCopy, resolveDiscordLocale } from '../bot/embeds/discord-locale';
import { DiscordBotService } from '../bot/services/discord-bot.service';
import { DiscordWebhookQueueService } from './discord-webhook-queue.service';

type DiscordNotificationPayload = MessageCreateOptions;

@Injectable()
export class NotificationService {
  constructor(
    private readonly config: ConfigService,
    private readonly bot: DiscordBotService,
    private readonly webhookQueue: DiscordWebhookQueueService,
    private readonly auditService: AuditService,
  ) {}

  async notifyAuctionCreated(data: {
    auctionId: string;
    itemName: string;
    itemTier: string;
    minimumBid: number;
    endsAt: Date;
  }): Promise<void> {
    const url = this.dashboardUrl(`/auctions/${data.auctionId}`);
    await this.sendChannel('auctions', {
      embeds: [buildAuctionCreatedEmbed({ ...data, url }, this.localeFor('auctions', data.itemName))],
    }, 'DISCORD_NOTIFY_AUCTION_CREATED', data.auctionId);
  }

  async notifyAuctionEndingSoon(data: { auctionId: string; itemName: string }): Promise<void> {
    const locale = this.localeFor('auctions', data.itemName);
    await this.sendChannel('auctions', {
      embeds: [buildDkpNotificationEmbed(
        localeCopy(locale, { 'pt-BR': 'Leilao acabando', en: 'Auction ending soon', es: 'Subasta por terminar' }),
        localeCopy(locale, {
          'pt-BR': `**${data.itemName}** esta nos minutos finais. Bid agora ou contemple o classico "eu ia participar".`,
          en: `**${data.itemName}** is in its final minutes. Bid now or deploy the classic "I was about to".`,
          es: `**${data.itemName}** esta en los ultimos minutos. Puja ahora o prepara el clasico "ya iba".`,
        }),
      )],
    }, 'DISCORD_NOTIFY_AUCTION_ENDING_SOON', data.auctionId);
  }

  async notifyBidOutbid(data: { auctionId: string; discordId: string; itemName: string }): Promise<void> {
    try {
      await this.bot.sendDirectMessage(data.discordId, {
        embeds: [buildDkpNotificationEmbed(
          'Bid superado / Bid outbid',
          `**PT-BR**\nSuperaram seu bid em **${data.itemName}**. Reaja ou abrace o desenvolvimento de personagem.\n\n**EN**\nYour bid on **${data.itemName}** was outbid. React or embrace the character development.`,
        )],
      });
      await this.audit('DISCORD_NOTIFY_BID_OUTBID', data.auctionId, { discordId: data.discordId });
    } catch (error) {
      await this.auditFailure('DISCORD_NOTIFY_BID_OUTBID_FAILED', data.auctionId, error, { discordId: data.discordId });
    }
  }

  async notifyAuctionWinner(data: { auctionId: string; itemName: string; playerName: string; discordId?: string; proofImageUrl?: string }): Promise<void> {
    const locale = this.localeFor('auctions', data.itemName);
    const payload = { embeds: [buildAuctionWinnerEmbed(data.itemName, data.playerName, this.publicImageUrl(data.proofImageUrl), locale)] };
    await this.sendChannel('auctions', payload, 'DISCORD_NOTIFY_AUCTION_WINNER', data.auctionId);

    if (data.discordId) {
      await this.sendDirectMessage(data.discordId, payload, 'DISCORD_NOTIFY_AUCTION_WINNER_DM', data.auctionId);
    }
  }

  async notifyAuctionDropDelivered(data: {
    auctionId: string;
    itemName: string;
    playerName: string;
    discordId?: string;
    proofImageUrl?: string;
  }): Promise<void> {
    const locale = this.localeFor('drops', data.itemName);
    const payload = { embeds: [buildAuctionDeliveryEmbed(data.itemName, data.playerName, this.publicImageUrl(data.proofImageUrl), locale)] };
    await this.sendChannel('drops', payload, 'DISCORD_NOTIFY_AUCTION_DROP_DELIVERED', data.auctionId);

    if (data.discordId) {
      await this.sendDirectMessage(data.discordId, payload, 'DISCORD_NOTIFY_AUCTION_DROP_DELIVERED_DM', data.auctionId);
    }
  }

  async notifyAttendanceStarted(data: { eventId: string; eventName: string; startsAt: Date }): Promise<void> {
    await this.sendChannel('attendance', {
      embeds: [buildAttendanceStartedEmbed(data.eventName, data.startsAt, this.localeFor('attendance', data.eventName))],
    }, 'DISCORD_NOTIFY_ATTENDANCE_STARTED', data.eventId);
  }

  async notifyEventFinalized(data: {
    eventId: string;
    eventName: string;
    rewardPerPlayer: number;
    totalDkp: number;
    presentCount: number;
    absentCount: number;
  }): Promise<void> {
    await this.sendChannel('attendance', {
      embeds: [buildEventFinalizedEmbed(data, this.localeFor('attendance', data.eventName))],
    }, 'DISCORD_NOTIFY_EVENT_FINALIZED', data.eventId);
  }

  async notifyStaffReviewRequired(data: { auctionId: string; itemName: string }): Promise<void> {
    await this.sendChannel('staffReview', {
      embeds: [buildStaffReviewRequiredEmbed(data.itemName, data.auctionId)],
    }, 'DISCORD_NOTIFY_STAFF_REVIEW_REQUIRED', data.auctionId);
  }

  async notifyItemInterestCreated(data: {
    postId: string;
    title: string;
    itemName: string;
    mode: string;
    criteriaPt: string;
    criteriaEn: string;
    closesAt: Date;
    imageUrl?: string | null;
  }): Promise<void> {
    await this.sendWebhookChannel('interests', {
      embeds: [buildItemInterestCreatedEmbed({
        ...data,
        url: this.dashboardUrl('/dashboard/interests'),
        imageUrl: this.publicImageUrl(data.imageUrl ?? undefined),
      }, this.localeFor('interests', data.title, data.criteriaPt, data.criteriaEn))],
    }, 'DISCORD_NOTIFY_ITEM_INTEREST_CREATED', data.postId, {
      itemName: data.itemName,
      mode: data.mode,
      closesAt: data.closesAt.toISOString(),
    });
  }

  async notifyItemInterestDelivered(data: {
    postId: string;
    title: string;
    itemName: string;
    playerNames: string[];
    proofImageUrl?: string | null;
  }): Promise<void> {
    await this.sendChannel('drops', {
      embeds: [buildItemInterestDeliveredEmbed({
        title: data.title,
        itemName: data.itemName,
        playerNames: data.playerNames,
        proofImageUrl: this.publicImageUrl(data.proofImageUrl ?? undefined),
      }, this.localeFor('drops', data.title, data.itemName))],
    }, 'DISCORD_NOTIFY_ITEM_INTEREST_DELIVERED', data.postId);
  }

  async notifyItemInterestSkillBatchCreated(data: {
    batchId: string;
    count: number;
    mode: string;
    closesAt: Date;
    sampleTitles: string[];
  }): Promise<void> {
    await this.sendWebhookChannel('interests', {
      embeds: [buildItemInterestSkillBatchEmbed({
        ...data,
        url: this.dashboardUrl('/dashboard/interests'),
      }, this.localeFor('interests', ...data.sampleTitles))],
    }, 'DISCORD_NOTIFY_ITEM_INTEREST_SKILL_BATCH_CREATED', data.batchId, {
      count: data.count,
      mode: data.mode,
      closesAt: data.closesAt.toISOString(),
    });
  }

  async notifyItemRequestReminder(data: {
    requestId: string;
    discordId: string;
    playerName: string;
    itemName: string;
    stage: '3d' | '4d' | 'dropped';
    daysIdle: number;
    rankPosition: number;
  }): Promise<void> {
    const locale = this.localeFor('itemRequests', data.itemName);
    const stageText = {
      '3d': localeCopy(locale, { 'pt-BR': 'precisa atualizar o print do request.', en: 'needs to update the request screenshot.', es: 'necesita actualizar la captura del request.' }),
      '4d': localeCopy(locale, { 'pt-BR': 'ultimo aviso para atualizar o print do request.', en: 'final warning to update the request screenshot.', es: 'ultimo aviso para actualizar la captura del request.' }),
      dropped: localeCopy(locale, { 'pt-BR': 'caiu uma posicao na fila por falta de atualizacao.', en: 'dropped one queue position due to no update.', es: 'bajo una posicion por falta de actualizacion.' }),
    }[data.stage];
    const url = this.dashboardUrl('/item-requests');
    const actionText = data.stage === 'dropped'
      ? localeCopy(locale, { 'pt-BR': 'Voce caiu uma posicao na fila.', en: 'You dropped one queue position.', es: 'Bajaste una posicion en la cola.' })
      : `${localeCopy(locale, { 'pt-BR': 'Atualize pelo site', en: 'Update on the website', es: 'Actualiza en el sitio' })}: ${url}`;

    await this.sendWebhookChannel('itemRequests', {
      content: `<@${data.discordId}> ${stageText}`,
      embeds: [buildRequestReminderEmbed({
        title: localeCopy(locale, { 'pt-BR': 'Atualizacao de Item Request', en: 'Item Request Update', es: 'Actualizacion de Item Request' }),
        playerName: data.playerName,
        itemName: data.itemName,
        daysIdle: data.daysIdle,
        rankPosition: data.rankPosition,
        actionText,
      }, locale)],
    }, 'DISCORD_NOTIFY_ITEM_REQUEST_REMINDER', data.requestId, {
      stage: data.stage,
      discordId: data.discordId,
      itemName: data.itemName,
    });
  }

  async notifyStaffItemRequestReminder(data: {
    requestId: string;
    discordId: string;
    playerName: string;
    itemName: string;
    stage: '3d' | '4d' | 'dropped';
    daysIdle: number;
    rankPosition: number;
  }): Promise<void> {
    const stageText = {
      '3d': 'Cobrar atualizacao / Request update',
      '4d': 'Ultimo aviso / Final warning',
      dropped: 'Queda automatica de rank / Automatic rank drop',
    }[data.stage];
    await this.sendWebhookChannel('staffRequests', {
      content: `<@${data.discordId}>`,
      embeds: [buildRequestReminderEmbed({
        title: `${stageText} - Item Request`,
        playerName: data.playerName,
        itemName: data.itemName,
        daysIdle: data.daysIdle,
        rankPosition: data.rankPosition,
        actionText: data.stage === 'dropped'
          ? 'Rank ajustado automaticamente. / Rank adjusted automatically.'
          : 'Cobrar update do player. / Request an update from the player.',
      }, 'pt-BR')],
    }, 'DISCORD_NOTIFY_STAFF_ITEM_REQUEST_REMINDER', data.requestId, {
      stage: data.stage,
      discordId: data.discordId,
      itemName: data.itemName,
    });
  }

  async sendAnnouncementNotification(
    channelId: string,
    data: {
      mentionRoleId?: string | null;
      stageLabel: string;
      type: string;
      title: string;
      description?: string | null;
      eventTime: Date;
    },
    targetId = channelId,
  ): Promise<void> {
    const locale = this.localeFor('announcements', data.title, data.description);
    const payload = {
      content: data.mentionRoleId ? `<@&${data.mentionRoleId}>` : undefined,
      embeds: [buildAnnouncementEmbed(data, locale)],
      allowedMentions: { roles: data.mentionRoleId ? [data.mentionRoleId] : [] },
    };
    const webhookUrl = this.config.get<string>('discord.webhooks.announcements') ?? '';

    if (webhookUrl) {
      try {
        await this.sendWebhook(webhookUrl, payload);
        await this.audit('DISCORD_NOTIFY_OPERATIONAL_WEBHOOK', targetId, { webhook: 'announcements', title: data.title });
      } catch (error) {
        await this.auditFailure('DISCORD_NOTIFY_OPERATIONAL_WEBHOOK_FAILED', targetId, error, { webhook: 'announcements', title: data.title });
      }
      return;
    }

    try {
      await this.bot.sendChannelMessage(channelId, payload);
      await this.audit('DISCORD_NOTIFY_OPERATIONAL', targetId, { channelId, title: data.title });
    } catch (error) {
      await this.auditFailure('DISCORD_NOTIFY_OPERATIONAL_FAILED', targetId, error, { channelId, title: data.title });
    }
  }

  async sendOperationalNotification(channelId: string, message: string, targetId = channelId): Promise<void> {
    const webhookUrl = this.config.get<string>('discord.webhooks.announcements') ?? '';

    if (webhookUrl) {
      try {
        await this.sendWebhook(webhookUrl, { content: message });
        await this.audit('DISCORD_NOTIFY_OPERATIONAL_WEBHOOK', targetId, { webhook: 'announcements', message });
      } catch (error) {
        await this.auditFailure('DISCORD_NOTIFY_OPERATIONAL_WEBHOOK_FAILED', targetId, error, { webhook: 'announcements', message });
      }
      return;
    }

    try {
      await this.bot.sendChannelMessage(channelId, { content: message });
      await this.audit('DISCORD_NOTIFY_OPERATIONAL', targetId, { channelId, message });
    } catch (error) {
      await this.auditFailure('DISCORD_NOTIFY_OPERATIONAL_FAILED', targetId, error, { channelId, message });
    }
  }

  private async sendWebhook(webhookUrl: string, payload: DiscordNotificationPayload): Promise<void> {
    await this.webhookQueue.send(webhookUrl, payload);
  }

  private async sendChannel(
    channelKey: 'auctions' | 'drops' | 'attendance' | 'staffReview' | 'dkp',
    payload: DiscordNotificationPayload,
    action: string,
    targetId: string,
  ): Promise<void> {
    const webhookUrl = this.config.get<string>(`discord.webhooks.${channelKey}`) ?? '';
    if (webhookUrl) {
      try {
        await this.sendWebhook(webhookUrl, payload);
        await this.audit(action, targetId, { webhook: channelKey });
      } catch (error) {
        await this.auditFailure(`${action}_FAILED`, targetId, error, { webhook: channelKey });
      }
      return;
    }

    const channelId = this.config.get<string>(`discord.channels.${channelKey}`) ?? '';
    try {
      await this.bot.sendChannelMessage(channelId, payload);
      await this.audit(action, targetId, { channelId });
    } catch (error) {
      await this.auditFailure(`${action}_FAILED`, targetId, error, { channelId });
    }
  }

  private async sendWebhookChannel(
    webhookKey: 'interests' | 'itemRequests' | 'staffRequests',
    payload: DiscordNotificationPayload,
    action: string,
    targetId: string,
    metadata: Prisma.InputJsonObject,
  ): Promise<void> {
    const webhookUrl = this.config.get<string>(`discord.webhooks.${webhookKey}`) ?? '';

    if (!webhookUrl) {
      await this.audit(`${action}_SKIPPED`, targetId, { ...metadata, reason: 'missing_webhook', webhook: webhookKey });
      return;
    }

    try {
      await this.sendWebhook(webhookUrl, payload);
      await this.audit(action, targetId, { ...metadata, webhook: webhookKey });
    } catch (error) {
      await this.auditFailure(`${action}_FAILED`, targetId, error, { ...metadata, webhook: webhookKey });
    }
  }

  private dashboardUrl(path: string): string {
    const baseUrl = this.config.get<string>('discord.publicUrl') ?? '';
    return baseUrl ? `${baseUrl.replace(/\/$/, '')}${path}` : '';
  }

  private localeFor(channelKey: string, ...context: Array<string | null | undefined>): DiscordLocale {
    const configured = this.config.get<string>(`discord.locales.${channelKey}`)
      ?? this.config.get<string>('discord.locales.default');
    return resolveDiscordLocale(configured, ...context);
  }

  private publicImageUrl(url?: string): string | undefined {
    if (!url) {
      return undefined;
    }

    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    if (!url.startsWith('/uploads/')) {
      return undefined;
    }

    const baseUrl = this.config.get<string>('discord.publicUrl') ?? '';
    return baseUrl ? `${baseUrl.replace(/\/$/, '')}${url}` : undefined;
  }

  private async audit(action: string, targetId: string, metadata: Prisma.InputJsonObject): Promise<void> {
    await this.auditService.log({
      action,
      targetType: 'DiscordNotification',
      targetId,
      metadata,
    });
  }

  private async sendDirectMessage(
    discordId: string,
    payload: DiscordNotificationPayload,
    action: string,
    targetId: string,
  ): Promise<void> {
    try {
      await this.bot.sendDirectMessage(discordId, payload);
      await this.audit(action, targetId, { discordId });
    } catch (error) {
      await this.auditFailure(`${action}_FAILED`, targetId, error, { discordId });
    }
  }

  private async auditFailure(
    action: string,
    targetId: string,
    error: unknown,
    metadata: Prisma.InputJsonObject,
  ): Promise<void> {
    const message = error instanceof Error ? error.message : 'Unknown Discord notification failure.';
    await this.audit(action, targetId, { ...metadata, error: message });
  }
}
