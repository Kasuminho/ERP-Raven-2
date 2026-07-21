import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import type { MessageCreateOptions } from 'discord.js';
import { AuditService } from '../../audit/services/audit.service';
import { buildAttendanceStartedEmbed, buildEventFinalizedEmbed } from '../bot/embeds/attendance.embeds';
import { buildAuctionCreatedEmbed, buildAuctionDeliveryEmbed, buildAuctionWinnerEmbed } from '../bot/embeds/auction.embeds';
import { buildDkpNotificationEmbed } from '../bot/embeds/dkp.embeds';
import { buildAnnouncementEmbed, buildEventReminderEmbed, buildItemInterestCreatedEmbed, buildItemInterestDeliveredEmbed, buildItemInterestSkillBatchEmbed, buildPlayerDailyReminderEmbed, buildRequestReminderEmbed } from '../bot/embeds/notification.embeds';
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
            `**${data.itemName}** entrou nos minutos finais. Bid agora; depois o "foi mal" chega sem legenda.`,
            `**${data.itemName}** esta no clutch. Piscou, vira print educativo no mural do timing ruim.`,
            `**${data.itemName}** ja esta fechando a janela. Se quer lance, clica; monologo nao arremata loot.`,
            `**${data.itemName}** chegou no ultimo round. Vontade sem bid continua zerada no placar.`,
          ],
          en: [
            `**${data.itemName}** is in the final minutes. Bid now; "my bad" arrives without subtitles later.`,
            `**${data.itemName}** is in clutch. Blink and become an educational screenshot about bad timing.`,
            `**${data.itemName}** is already closing the window. If you want a bid, click; monologues do not win loot.`,
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
              `Passaram seu bid em **${data.itemName}**. Reage agora ou compra ingresso pro proprio quase.`,
              `Tomaram a frente em **${data.itemName}**. Se ainda quer jogo, responde antes do placar baixar a porta.`,
              `Seu bid em **${data.itemName}** caiu pra segundo. Decide rapido antes que a aba fossilize.`,
              `Superaram voce em **${data.itemName}**. Ou clica agora, ou o VOD vira tutorial de hesitacao.`,
            ],
            en: [
              `Your bid on **${data.itemName}** got passed. React now or buy tickets to your own almost-win.`,
              `Someone took the lead on **${data.itemName}**. If you still want in, answer before the board shuts down.`,
              `Your bid on **${data.itemName}** dropped to second. Decide fast before the tab fossilizes.`,
              `Someone moved ahead on **${data.itemName}**. Either click now or let the VOD become a hesitation tutorial.`,
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
    const resultUrl = this.dashboardUrl('/dashboard/drops');
    const payload = { embeds: [buildAuctionDeliveryEmbed(data.itemName, data.playerName, this.publicImageUrl(data.proofImageUrl), locale, resultUrl)] };
    await this.sendChannel('drops', payload, 'DISCORD_NOTIFY_AUCTION_DROP_DELIVERED', data.auctionId);

    if (data.discordId) {
      await this.sendDirectMessage(data.discordId, payload, 'DISCORD_NOTIFY_AUCTION_DROP_DELIVERED_DM', data.auctionId);
    }
  }

  async notifyPlayerDailyReminder(data: {
    playerId: string;
    playerName: string;
    discordId: string;
    reasonsPt: string[];
    reasonsEn: string[];
    hasProfileSignals: boolean;
    hasCodex: boolean;
  }): Promise<boolean> {
    return this.sendDirectMessage(data.discordId, {
      embeds: [buildPlayerDailyReminderEmbed({
        playerName: data.playerName,
        reasonsPt: data.reasonsPt,
        reasonsEn: data.reasonsEn,
        profileUrl: data.hasProfileSignals ? this.dashboardUrl('/dashboard/profile') : undefined,
        codexUrl: data.hasCodex ? this.dashboardUrl('/dashboard/codex') : undefined,
        hasCodex: data.hasCodex,
      })],
    }, 'DISCORD_NOTIFY_PLAYER_DAILY_REMINDER_DM', data.playerId);
  }

  async notifyEventReminder(data: {
    eventId: string;
    playerId: string;
    playerName: string;
    discordId: string;
    eventName: string;
    startsAt: Date;
    timezone: string;
    requiresRsvp: boolean;
  }): Promise<boolean> {
    return this.sendDirectMessage(data.discordId, {
      embeds: [buildEventReminderEmbed({ ...data, url: this.dashboardUrl('/dashboard/attendance') })],
    }, 'DISCORD_NOTIFY_EVENT_REMINDER_DM', `${data.eventId}:${data.playerId}`);
  }

  async notifyDiamondSaleCompleted(data: {
    saleId: string;
    itemName: string;
    diamondTotal: number;
    shareAmount: number;
    remainderAmount: number;
    recipients: Array<{ playerName: string; diamondAmount: number; proofImageUrl: string }>;
  }): Promise<void> {
    const recipientNames = data.recipients.map((recipient) => recipient.playerName).join(', ');
    const safeRecipientNames = recipientNames.length > 1400
      ? `${recipientNames.slice(0, 1397)}...`
      : recipientNames;
    const summary = {
      title: 'Partilha de diamantes concluida / Diamond distribution completed',
      description: bilingualBlocks({
        'pt-BR': [
          `**Item:** ${data.itemName}`,
          `**Total:** ${data.diamondTotal} diamantes`,
          `**Por jogador:** ${data.shareAmount} diamantes`,
          `**Saldo remanescente:** ${data.remainderAmount} diamante(s)`,
          `**Receberam:** ${safeRecipientNames}`,
          '',
          'Partilha fechada com todas as provas. A planilha finalmente dropou loot.',
        ].join('\n'),
        en: [
          `**Item:** ${data.itemName}`,
          `**Total:** ${data.diamondTotal} diamonds`,
          `**Per player:** ${data.shareAmount} diamonds`,
          `**Remaining balance:** ${data.remainderAmount} diamond(s)`,
          `**Recipients:** ${safeRecipientNames}`,
          '',
          'Distribution closed with every proof attached. The spreadsheet finally dropped loot.',
        ].join('\n'),
      }),
      color: 0x22d3ee,
      timestamp: new Date().toISOString(),
    };

    const proofEmbeds = data.recipients.map((recipient) => ({
      title: `${recipient.playerName} - ${recipient.diamondAmount} diamantes`.slice(0, 256),
      image: { url: this.publicImageUrl(recipient.proofImageUrl) ?? recipient.proofImageUrl },
      color: 0xd4af37,
    }));

    const firstBatch = proofEmbeds.splice(0, 9);
    await this.sendChannelStrict('drops', { embeds: [summary, ...firstBatch] }, 'DISCORD_NOTIFY_DIAMOND_SALE_COMPLETED', data.saleId);

    while (proofEmbeds.length > 0) {
      await this.sendChannelStrict('drops', { embeds: proofEmbeds.splice(0, 10) }, 'DISCORD_NOTIFY_DIAMOND_SALE_PROOFS', data.saleId);
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
        'Rank ajustado no automatico. Agora avisa antes que o player descubra pelo susto em 1080p.',
        'A fila aplicou o debuff sozinha. Vale alinhar antes que o drama peca palco e iluminacao.',
        'O cron derrubou uma posicao. Melhor explicar antes que a contestacao venha com trilha sonora.',
        'A queda ja entrou no log. Falta avisar o player antes que o chat lance fanfic capa dura.',
      ], data.requestId, data.itemName, data.playerName, data.stage)
      : pickStaffVoice([
        'Cobrar print novo no site; request parado nao desbloqueia cidadania permanente.',
        'Puxar o player para atualizar o request antes que a desculpa tente virar modalidade olimpica.',
        'Lembrar o player de subir prova nova antes que o cron volte com chinelo administrativo.',
        'Cutucar o player hoje; amanha esse lembrete aparece vendendo season pass.',
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

  private async sendChannelStrict(
    channelKey: 'auctions' | 'drops' | 'attendance' | 'staffReview' | 'dkp',
    payload: DiscordNotificationPayload,
    action: string,
    targetId: string,
  ): Promise<void> {
    const webhookUrl = this.config.get<string>(`discord.webhooks.${channelKey}`) ?? '';
    if (webhookUrl) {
      await this.sendWebhook(webhookUrl, payload, {
        webhookKey: channelKey,
        channelLabel: this.webhookChannelLabel(channelKey),
        action,
        targetId,
      });
      await this.audit(action, targetId, { webhook: channelKey });
      return;
    }

    const channelId = this.config.get<string>(`discord.channels.${channelKey}`) ?? '';
    await this.bot.sendChannelMessage(channelId, payload);
    await this.audit(action, targetId, { channelId });
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
  ): Promise<boolean> {
    try {
      await this.bot.sendDirectMessage(discordId, payload);
      await this.audit(action, targetId, { discordId });
      return true;
    } catch (error) {
      await this.auditFailure(`${action}_FAILED`, targetId, error, { discordId });
      return false;
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
