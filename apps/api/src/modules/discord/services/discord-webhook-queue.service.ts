import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiscordWebhookDeliveryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import type { MessageCreateOptions } from 'discord.js';

type DiscordWebhookPayload = MessageCreateOptions;
type DiscordWebhookContext = {
  webhookKey?: string;
  channelLabel?: string;
  action?: string;
  targetId?: string;
  retryable?: boolean;
};

export type DiscordWebhookDeliverySummary = {
  id: string;
  webhookKey: string;
  channelLabel: string;
  action?: string;
  targetId?: string;
  status: DiscordWebhookDeliveryStatus;
  attempts: number;
  maxAttempts: number;
  retryable: boolean;
  payloadPreview: Prisma.JsonValue;
  lastError?: string;
  queuedAt: Date;
  startedAt?: Date;
  sentAt?: Date;
  failedAt?: Date;
  retriedAt?: Date;
};

@Injectable()
export class DiscordWebhookQueueService {
  private readonly logger = new Logger(DiscordWebhookQueueService.name);
  private readonly minimumDelayMs = 1500;
  private readonly maxAttempts = 5;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async send(webhookUrl: string, payload: DiscordWebhookPayload, context: DiscordWebhookContext = {}): Promise<void> {
    const normalizedPayload = this.normalizePayload(payload);
    const delivery = await this.prisma.discordWebhookDelivery.create({
      data: {
        webhookKey: context.webhookKey ?? 'unknown',
        channelLabel: context.channelLabel ?? context.webhookKey ?? 'Webhook',
        action: context.action,
        targetId: context.targetId,
        retryable: context.retryable ?? true,
        maxAttempts: this.maxAttempts,
        payloadPreview: normalizedPayload as Prisma.InputJsonValue,
      },
    });

    const job = this.queue.then(() => this.sendWithRetry(webhookUrl, normalizedPayload, delivery.id));
    this.queue = job.then(() => undefined, () => undefined);
    return job;
  }

  async listDeliveries(limit = 50): Promise<DiscordWebhookDeliverySummary[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const deliveries = await this.prisma.discordWebhookDelivery.findMany({
      orderBy: { queuedAt: 'desc' },
      take: safeLimit,
    });

    return deliveries.map((delivery) => this.toSummary(delivery));
  }

  async retryDelivery(deliveryId: string): Promise<DiscordWebhookDeliverySummary> {
    const delivery = await this.prisma.discordWebhookDelivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) {
      throw new NotFoundException('Entrega de webhook nao encontrada.');
    }

    if (delivery.status !== DiscordWebhookDeliveryStatus.FAILED || !delivery.retryable) {
      throw new BadRequestException('Esta entrega nao pode ser reenviada com seguranca.');
    }

    const webhookUrl = this.config.get<string>(`discord.webhooks.${delivery.webhookKey}`)?.trim();
    if (!webhookUrl) {
      throw new BadRequestException('Webhook nao configurado para este alvo logico.');
    }

    await this.prisma.discordWebhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: DiscordWebhookDeliveryStatus.RETRYING,
        lastError: null,
        failedAt: null,
        retriedAt: new Date(),
      },
    });

    const payload = this.ensureJsonObject(delivery.payloadPreview);
    const job = this.queue.then(() => this.sendWithRetry(webhookUrl, payload, delivery.id));
    this.queue = job.then(() => undefined, () => undefined);
    await job;

    const updated = await this.prisma.discordWebhookDelivery.findUniqueOrThrow({ where: { id: delivery.id } });
    return this.toSummary(updated);
  }

  private async sendWithRetry(webhookUrl: string, payload: Record<string, unknown>, deliveryId: string): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        await this.prisma.discordWebhookDelivery.update({
          where: { id: deliveryId },
          data: {
            status: attempt === 1 ? DiscordWebhookDeliveryStatus.SENDING : DiscordWebhookDeliveryStatus.RETRYING,
            attempts: { increment: 1 },
            startedAt: new Date(),
          },
        });

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          await this.prisma.discordWebhookDelivery.update({
            where: { id: deliveryId },
            data: {
              status: DiscordWebhookDeliveryStatus.SENT,
              sentAt: new Date(),
              failedAt: null,
              lastError: null,
            },
          });
          await this.sleep(this.minimumDelayMs);
          return;
        }

        if (response.status === 429) {
          const retryAfterMs = await this.getRetryAfterMs(response);
          this.logger.warn(`discord_webhook_rate_limited attempt=${attempt} retry_after_ms=${retryAfterMs}`);
          await this.sleep(retryAfterMs);
          continue;
        }

        const body = await response.text().catch(() => '');
        lastError = new Error(`Discord webhook failed with status ${response.status}. ${body}`.trim());

        if (response.status >= 500) {
          await this.sleep(this.minimumDelayMs * attempt);
          continue;
        }

        throw lastError;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Discord webhook failed.');

        if (attempt >= this.maxAttempts) {
          break;
        }

        await this.sleep(this.minimumDelayMs * attempt);
      }
    }

    await this.prisma.discordWebhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: DiscordWebhookDeliveryStatus.FAILED,
        failedAt: new Date(),
        lastError: this.safeErrorMessage(lastError),
      },
    });
    throw lastError ?? new Error('Discord webhook failed.');
  }

  private normalizePayload(payload: DiscordWebhookPayload): Record<string, unknown> {
    const raw = payload as DiscordWebhookPayload & { allowedMentions?: unknown };

    return this.toJsonObject({
      ...raw,
      username: this.config.get<string>('discord.webhookUsername') ?? 'Aristolfo, 570 anos de webhook',
      avatar_url: this.config.get<string>('discord.webhookAvatarUrl') || undefined,
      allowed_mentions: raw.allowedMentions,
      allowedMentions: undefined,
    });
  }

  private toJsonObject(payload: Record<string, unknown>): Record<string, unknown> {
    return JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
  }

  private ensureJsonObject(payload: Prisma.JsonValue): Record<string, unknown> {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      return payload as Record<string, unknown>;
    }

    throw new BadRequestException('Payload gravado nao pode ser reenviado.');
  }

  private toSummary(delivery: {
    id: string;
    webhookKey: string;
    channelLabel: string;
    action: string | null;
    targetId: string | null;
    status: DiscordWebhookDeliveryStatus;
    attempts: number;
    maxAttempts: number;
    retryable: boolean;
    payloadPreview: Prisma.JsonValue;
    lastError: string | null;
    queuedAt: Date;
    startedAt: Date | null;
    sentAt: Date | null;
    failedAt: Date | null;
    retriedAt: Date | null;
  }): DiscordWebhookDeliverySummary {
    return {
      id: delivery.id,
      webhookKey: delivery.webhookKey,
      channelLabel: delivery.channelLabel,
      action: delivery.action ?? undefined,
      targetId: delivery.targetId ?? undefined,
      status: delivery.status,
      attempts: delivery.attempts,
      maxAttempts: delivery.maxAttempts,
      retryable: delivery.retryable,
      payloadPreview: delivery.payloadPreview,
      lastError: delivery.lastError ?? undefined,
      queuedAt: delivery.queuedAt,
      startedAt: delivery.startedAt ?? undefined,
      sentAt: delivery.sentAt ?? undefined,
      failedAt: delivery.failedAt ?? undefined,
      retriedAt: delivery.retriedAt ?? undefined,
    };
  }

  private safeErrorMessage(error?: Error): string {
    if (!error?.message) {
      return 'Discord webhook failed.';
    }

    return error.message.replace(/https:\/\/discord(?:app)?\.com\/api\/webhooks\/\S+/gi, '[discord-webhook-url]').slice(0, 500);
  }

  private async getRetryAfterMs(response: Response): Promise<number> {
    const header = response.headers.get('retry-after');
    const headerSeconds = header ? Number(header) : Number.NaN;

    if (Number.isFinite(headerSeconds) && headerSeconds > 0) {
      return Math.ceil(headerSeconds * 1000) + 500;
    }

    const body = await response.json().catch(() => undefined) as { retry_after?: number } | undefined;
    const bodySeconds = Number(body?.retry_after);

    if (Number.isFinite(bodySeconds) && bodySeconds > 0) {
      return Math.ceil(bodySeconds * 1000) + 500;
    }

    return 5000;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
