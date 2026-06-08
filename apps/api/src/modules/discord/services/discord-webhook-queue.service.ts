import { Injectable, Logger } from '@nestjs/common';
import type { MessageCreateOptions } from 'discord.js';

type DiscordWebhookPayload = MessageCreateOptions;

@Injectable()
export class DiscordWebhookQueueService {
  private readonly logger = new Logger(DiscordWebhookQueueService.name);
  private readonly minimumDelayMs = 1500;
  private readonly maxAttempts = 5;
  private queue: Promise<void> = Promise.resolve();

  async send(webhookUrl: string, payload: DiscordWebhookPayload): Promise<void> {
    const job = this.queue.then(() => this.sendWithRetry(webhookUrl, payload));
    this.queue = job.then(() => undefined, () => undefined);
    return job;
  }

  private async sendWithRetry(webhookUrl: string, payload: DiscordWebhookPayload): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.normalizePayload(payload)),
        });

        if (response.ok) {
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

    throw lastError ?? new Error('Discord webhook failed.');
  }

  private normalizePayload(payload: DiscordWebhookPayload): Record<string, unknown> {
    const raw = payload as DiscordWebhookPayload & { allowedMentions?: unknown };

    return {
      username: 'Aristolfo, o grande',
      ...raw,
      allowed_mentions: raw.allowedMentions,
      allowedMentions: undefined,
    };
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
