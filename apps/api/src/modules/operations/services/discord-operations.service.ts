import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buildAttendanceStartedEmbed, buildEventFinalizedEmbed } from '../../discord/bot/embeds/attendance.embeds';
import { buildAuctionCreatedEmbed, buildAuctionDeliveryEmbed } from '../../discord/bot/embeds/auction.embeds';
import { buildAnnouncementEmbed, buildItemInterestCreatedEmbed, buildRequestReminderEmbed } from '../../discord/bot/embeds/notification.embeds';
import { buildStaffReviewRequiredEmbed } from '../../discord/bot/embeds/staff-review.embeds';
import { DiscordWebhookDeliverySummary as QueueDeliverySummary, DiscordWebhookQueueService } from '../../discord/services/discord-webhook-queue.service';
import {
  DiscordTemplateSummary,
  DiscordWebhookDeliveryStatus,
  DiscordWebhookQueueSummary,
} from '../operations.types';

type DiscordPreviewPayload = NonNullable<DiscordTemplateSummary['templates'][number]['previews'][number]['payload']>;

@Injectable()
export class DiscordOperationsService {
  constructor(
    private readonly config: ConfigService,
    private readonly discordWebhookQueue: DiscordWebhookQueueService,
  ) {}

  getDiscordTemplates(): DiscordTemplateSummary {
    const now = new Date();
    const closesAt = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const eventTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const publicUrl = this.config.get<string>('discord.publicUrl')?.replace(/\/$/, '') || 'https://app.guild-g3x.com.br';
    const makePreviews = (
      playerFacing: boolean,
      build: (locale: 'pt-BR' | 'en') => DiscordPreviewPayload,
    ) => (playerFacing
      ? [
          { locale: 'pt-BR' as const, label: 'PT-BR', payload: build('pt-BR') },
          { locale: 'en' as const, label: 'EN', payload: build('en') },
        ]
      : [{ locale: 'pt-BR' as const, label: 'Staff PT-BR', payload: build('pt-BR') }]);

    return {
      templates: [
        {
          key: 'announcement_created',
          channel: 'anuncios',
          title: 'Anuncio criado',
          preview: 'Tipo, titulo, descricao opcional, horario em Hammertime e mencao de cargo quando existir.',
          playerFacing: true,
          previews: makePreviews(true, (locale) => this.discordPreviewPayload({
            content: '<@&123456789012345678>',
            embeds: [buildAnnouncementEmbed({
              stageLabel: 'Novo anuncio cadastrado',
              type: 'Boss',
              title: 'BOSSES T4 - LUNOS - RIGRETO',
              description: null,
              eventTime,
            }, locale)],
            allowedMentions: { roles: ['123456789012345678'] },
          })),
        },
        {
          key: 'auction_created',
          channel: 'leiloes',
          title: 'Leilao criado',
          preview: 'Item, tier, lance minimo, horario de fechamento e link do dashboard.',
          playerFacing: true,
          previews: makePreviews(true, (locale) => this.discordPreviewPayload({
            embeds: [buildAuctionCreatedEmbed({
              itemName: 'Espada T4 do Exemplo',
              itemTier: 'T4',
              minimumBid: 450,
              endsAt: closesAt,
              url: `${publicUrl}/dashboard/auctions/preview`,
            }, locale)],
          })),
        },
        {
          key: 'interest_created',
          channel: 'interesses',
          title: 'Interesse aberto',
          preview: 'Item, modo, criterio PT-BR/EN, fechamento, imagem e link do dashboard.',
          playerFacing: true,
          previews: makePreviews(true, (locale) => this.discordPreviewPayload({
            embeds: [buildItemInterestCreatedEmbed({
              title: 'Skill T4 - Corte Dimensional',
              itemName: 'Corte Dimensional',
              mode: 'PvE',
              criteriaPt: 'Declare interesse com print do personagem principal.',
              criteriaEn: 'Declare interest with a screenshot from your main character.',
              closesAt,
              url: `${publicUrl}/dashboard/interests`,
              imageUrl: `${publicUrl}/aristolfo-webhooks.png`,
            }, locale)],
          })),
        },
        {
          key: 'drop_delivered',
          channel: 'drops-entregues',
          title: 'Drop entregue',
          preview: 'Item entregue, recebedor e imagem de prova quando existir.',
          playerFacing: true,
          previews: makePreviews(true, (locale) => this.discordPreviewPayload({
            embeds: [buildAuctionDeliveryEmbed('Espada T4 do Exemplo', 'PlayerDemo', `${publicUrl}/aristolfo-webhooks.png`, locale)],
          })),
        },
        {
          key: 'event_finalized',
          channel: 'presenca',
          title: 'Evento finalizado',
          preview: 'DKP por pessoa, total distribuido, presentes e faltantes.',
          playerFacing: true,
          previews: makePreviews(true, (locale) => this.discordPreviewPayload({
            embeds: [buildEventFinalizedEmbed({
              eventName: 'BOSSES T4 - LUNOS',
              rewardPerPlayer: 10,
              totalDkp: 180,
              presentCount: 18,
              absentCount: 4,
            }, locale)],
          })),
        },
        {
          key: 'attendance_started',
          channel: 'presenca',
          title: 'Presenca aberta',
          preview: 'Nome do evento, horario e chamada para registrar presenca no site.',
          playerFacing: true,
          previews: makePreviews(true, (locale) => this.discordPreviewPayload({
            embeds: [buildAttendanceStartedEmbed('BOSSES T4 - LUNOS', eventTime, locale)],
          })),
        },
        {
          key: 'request_update',
          channel: 'item-requests',
          title: 'Update de request',
          preview: 'Player, item, dias sem atualizar, rank e acao esperada.',
          playerFacing: true,
          previews: makePreviews(true, (locale) => this.discordPreviewPayload({
            content: '<@123456789012345678>\n' + (locale === 'pt-BR' ? 'Seu request precisa de print atualizado.' : 'Your request needs an updated screenshot.'),
            embeds: [buildRequestReminderEmbed({
              title: locale === 'pt-BR' ? 'Atualizacao de Item Request' : 'Item Request Update',
              playerName: 'PlayerDemo',
              itemName: 'Quintessencia T3',
              daysIdle: 3,
              rankPosition: 2,
              actionText: locale === 'pt-BR' ? `Atualize pelo site: ${publicUrl}/dashboard/item-requests` : `Update on the website: ${publicUrl}/dashboard/item-requests`,
            }, locale)],
          })),
        },
        {
          key: 'staff_review',
          channel: 'staff-review',
          title: 'Review pendente',
          preview: 'Leilao que precisa de voto/aprovacao da Staff. Staff-only em PT-BR.',
          playerFacing: false,
          previews: makePreviews(false, () => this.discordPreviewPayload({
            embeds: [buildStaffReviewRequiredEmbed('Espada T4 do Exemplo', 'auction-preview')],
          })),
        },
      ],
    };
  }

  async getDiscordWebhookQueue(limit = 50): Promise<DiscordWebhookQueueSummary> {
    const deliveries = await this.discordWebhookQueue.listDeliveries(limit);
    const counts: Record<DiscordWebhookDeliveryStatus, number> = {
      PENDING: 0,
      SENDING: 0,
      SENT: 0,
      FAILED: 0,
      RETRYING: 0,
    };

    for (const delivery of deliveries) {
      counts[delivery.status] += 1;
    }

    return {
      generatedAt: new Date().toISOString(),
      counts,
      deliveries: deliveries.map((delivery) => this.mapDiscordWebhookDelivery(delivery)),
    };
  }

  async retryDiscordWebhookDelivery(deliveryId: string): Promise<DiscordWebhookQueueSummary> {
    await this.discordWebhookQueue.retryDelivery(deliveryId);
    return this.getDiscordWebhookQueue(50);
  }

  private discordPreviewPayload(payload: {
    content?: string;
    embeds?: Array<{ toJSON?: () => unknown } | Record<string, unknown>>;
    allowedMentions?: unknown;
  }): DiscordPreviewPayload {
    return {
      username: this.config.get<string>('discord.webhookUsername') ?? 'Aristolfo, 570 anos de webhook',
      avatar_url: this.config.get<string>('discord.webhookAvatarUrl') || undefined,
      content: payload.content,
      embeds: payload.embeds?.map((embed) => {
        const json = 'toJSON' in embed && typeof embed.toJSON === 'function' ? embed.toJSON() : embed;
        return json as NonNullable<DiscordPreviewPayload['embeds']>[number];
      }),
      allowed_mentions: payload.allowedMentions,
    };
  }

  private mapDiscordWebhookDelivery(delivery: QueueDeliverySummary): DiscordWebhookQueueSummary['deliveries'][number] {
    return {
      id: delivery.id,
      webhookKey: delivery.webhookKey,
      channelLabel: delivery.channelLabel,
      action: delivery.action,
      targetId: delivery.targetId,
      status: delivery.status,
      attempts: delivery.attempts,
      maxAttempts: delivery.maxAttempts,
      retryable: delivery.retryable,
      payloadPreview: delivery.payloadPreview,
      payloadSummary: this.summarizeDiscordPayload(delivery.payloadPreview),
      lastError: delivery.lastError,
      queuedAt: delivery.queuedAt.toISOString(),
      startedAt: delivery.startedAt?.toISOString(),
      sentAt: delivery.sentAt?.toISOString(),
      failedAt: delivery.failedAt?.toISOString(),
      retriedAt: delivery.retriedAt?.toISOString(),
    };
  }

  private summarizeDiscordPayload(payload: unknown): string {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return 'Payload sem resumo disponivel.';
    }

    const data = payload as {
      content?: string;
      embeds?: Array<{ title?: string; description?: string; fields?: unknown[] }>;
    };
    const parts: string[] = [];

    if (data.content) {
      parts.push(`content: ${data.content.replace(/\s+/g, ' ').slice(0, 80)}`);
    }

    const embedTitles = (data.embeds ?? [])
      .map((embed) => embed.title)
      .filter(Boolean)
      .slice(0, 2);
    if (embedTitles.length > 0) {
      parts.push(`embed: ${embedTitles.join(' | ')}`);
    }

    if ((data.embeds ?? []).length > 0) {
      const fieldCount = (data.embeds ?? []).reduce((sum, embed) => sum + (Array.isArray(embed.fields) ? embed.fields.length : 0), 0);
      parts.push(`${data.embeds?.length ?? 0} embed(s), ${fieldCount} campo(s)`);
    }

    return parts.length > 0 ? parts.join(' • ') : 'Payload sem texto visivel.';
  }
}
