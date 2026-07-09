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
import { bilingualBlocks, pickBilingualVoice, pickStaffVoice } from '../bot/embeds/webhook-voice';
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
        localeCopy(locale, { 'pt-BR': 'Leilao acabando', en: 'Auction ending soon' }),
        pickBilingualVoice({
          'pt-BR': [
            `**${data.itemName}** entrou nos minutos finais. Bid agora; depois o "bugou aqui" vem sem defesa.`,
            `**${data.itemName}** esta no clutch. Piscou, vira clipe didatico do proprio vacilo.`,
            `**${data.itemName}** ja esta fechando a janela. Se quer lance, clica; podcast nao arremata item.`,
            `**${data.itemName}** chegou no ultimo round. Vontade sem bid continua zerada no placar.`,
          ],
          en: [
            `**${data.itemName}** is in the final minutes. Bid now; "it bugged here" gets no defense later.`,
            `**${data.itemName}** is in clutch. Blink and become an educational clip of your own fumble.`,
            `**${data.itemName}** is already closing the window. If you want a bid, click; podcasts do not win items.`,
            `**${data.itemName}** reached the last round. Intent without a bid stays zero on the board.`,
          ],
        }, data.auctionId, data.itemName),
      )],
    }, 'DISCORD_NOTIFY_AUCTION_ENDING_SOON', data.auctionId);
  }

  async notifyBidOutbid(data: { auctionId: string; discordId: string; itemName: string }): Promise<void> {
    try {
      await this.bot.sendDirectMessage(data.discordId, {
        embeds: [buildDkpNotificationEmbed(
          'Bid superado / Bid outbid',
          pickBilingualVoice({
            'pt-BR': [
              `Passaram seu bid em **${data.itemName}**. Reage agora ou vira camarote do proprio prejuizo.`,
              `Tomaram a frente em **${data.itemName}**. Se ainda quer jogo, responde antes do placar trancar.`,
              `Seu bid em **${data.itemName}** caiu pra segundo. Decide rapido antes que a aba vire fossil.`,
              `Superaram voce em **${data.itemName}**. Ou clica agora, ou o VOD vira curso de timing triste.`,
            ],
            en: [
              `Your bid on **${data.itemName}** got passed. React now or get front-row seats to your own loss.`,
              `Someone took the lead on **${data.itemName}**. If you still want in, answer before the board locks.`,
              `Your bid on **${data.itemName}** dropped to second. Decide fast before the tab becomes a fossil.`,
              `Someone moved ahead on **${data.itemName}**. Either click now or let the VOD become a sad-timing course.`,
            ],
          }, data.auctionId, data.itemName, data.discordId),
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
      '3d': bilingualBlocks({
        'pt-BR': 'Seu request precisa de print atualizado.',
        en: 'Your request needs an updated screenshot.',
      }),
      '4d': bilingualBlocks({
        'pt-BR': 'Ultimo aviso para atualizar o print do request.',
        en: 'Final warning to update the request screenshot.',
      }),
      dropped: bilingualBlocks({
        'pt-BR': 'Seu request caiu uma posicao na fila por falta de atualizacao.',
        en: 'Your request dropped one queue position because it was not updated.',
      }),
    }[data.stage];
    const url = this.dashboardUrl('/item-requests');
    const actionText = data.stage === 'dropped'
      ? bilingualBlocks({
        'pt-BR': 'Voce caiu uma posicao na fila.',
        en: 'You dropped one queue position.',
      })
      : bilingualBlocks({
        'pt-BR': `Atualize pelo site: ${url}`,
        en: `Update on the website: ${url}`,
      });

    await this.sendWebhookChannel('itemRequests', {
      content: `<@${data.discordId}>\n${stageText}`,
      embeds: [buildRequestReminderEmbed({
        title: localeCopy(locale, { 'pt-BR': 'Atualizacao de Item Request', en: 'Item Request Update' }),
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
      '3d': 'Cobrar atualizacao',
      '4d': 'Ultimo aviso',
      dropped: 'Queda automatica de rank',
    }[data.stage];
    const actionText = data.stage === 'dropped'
      ? pickStaffVoice([
        'Rank ajustado no automatico. Agora e avisar antes que o player descubra em jumpscare 4K.',
        'A fila aplicou o debuff sozinha. Vale alinhar antes que o drama peca microfone.',
        'O cron derrubou uma posicao. Melhor explicar antes que a contestacao chegue de capacete.',
        'A queda ja entrou no log. Falta avisar o player antes que o chat escreva fanfic.',
      ], data.requestId, data.itemName, data.playerName, data.stage)
      : pickStaffVoice([
        'Cobrar print novo no site; request parado nao ganha camarote vitalicio.',
        'Puxar o player para atualizar o request antes que a desculpa vire modalidade olimpica.',
        'Lembrar o player de subir prova nova antes que o cron volte de chinelo na mao.',
        'Cutucar o player hoje; amanha esse lembrete tenta virar temporada.',
      ], data.requestId, data.itemName, data.playerName, data.stage);
    await this.sendWebhookChannel('staffRequests', {
      content: `<@${data.discordId}>`,
      embeds: [buildRequestReminderEmbed({
        title: `${stageText} - Item Request`,
        playerName: data.playerName,
        itemName: data.itemName,
        daysIdle: data.daysIdle,
        rankPosition: data.rankPosition,
        actionText,
      }, 'pt-BR', true)],
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
        await this.sendWebhook(webhookUrl, payload, {
          webhookKey: 'announcements',
          channelLabel: 'Anuncios',
          action: 'DISCORD_NOTIFY_OPERATIONAL_WEBHOOK',
          targetId,
        });
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
        await this.sendWebhook(webhookUrl, { content: message }, {
          webhookKey: 'announcements',
          channelLabel: 'Anuncios',
          action: 'DISCORD_NOTIFY_OPERATIONAL_WEBHOOK',
          targetId,
        });
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

  private async sendWebhook(
    webhookUrl: string,
    payload: DiscordNotificationPayload,
    context: { webhookKey: string; channelLabel: string; action: string; targetId: string },
  ): Promise<void> {
    await this.webhookQueue.send(webhookUrl, payload, context);
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
        await this.sendWebhook(webhookUrl, payload, {
          webhookKey: channelKey,
          channelLabel: this.webhookChannelLabel(channelKey),
          action,
          targetId,
        });
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
      await this.sendWebhook(webhookUrl, payload, {
        webhookKey,
        channelLabel: this.webhookChannelLabel(webhookKey),
        action,
        targetId,
      });
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

  private webhookChannelLabel(webhookKey: string): string {
    return {
      announcements: 'Anuncios',
      auctions: 'Leiloes',
      drops: 'Drops entregues',
      attendance: 'Presenca',
      staffReview: 'Review Staff',
      dkp: 'DKP-LOG',
      interests: 'Interesses',
      itemRequests: 'Item Requests',
      staffRequests: 'Requests Staff',
    }[webhookKey] ?? webhookKey;
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
