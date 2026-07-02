import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { AuditService } from '../../audit/services/audit.service';
import { pickStaffVoice } from '../../discord/bot/embeds/webhook-voice';
import { DiscordWebhookQueueService } from '../../discord/services/discord-webhook-queue.service';
import { HealthReport, HealthState } from '../health.types';
import { HealthService } from './health.service';

@Injectable()
export class HealthMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HealthMonitorService.name);
  private timer?: NodeJS.Timeout;
  private lastStatus?: HealthState;
  private running = false;

  constructor(
    private readonly healthService: HealthService,
    private readonly webhookQueue: DiscordWebhookQueueService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  onModuleInit(): void {
    const intervalMs = Number(process.env.HEALTHCHECK_INTERVAL_MS ?? 300000);

    this.timer = setInterval(() => void this.checkAndNotify(), intervalMs);
    setTimeout(() => void this.checkAndNotify(), 30000);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async checkAndNotify(): Promise<void> {
    if (this.running) return;

    this.running = true;

    try {
      const report = await this.healthService.getReport();
      const shouldNotify = this.shouldNotify(report.status);

      if (shouldNotify) {
        await this.notify(report);
      }

      this.lastStatus = report.status;
    } catch (error) {
      this.logger.error('health_monitor_failed', error instanceof Error ? error.stack : undefined);
    } finally {
      this.running = false;
    }
  }

  private shouldNotify(status: HealthState): boolean {
    if (!this.lastStatus) return status !== 'ok';
    return status !== this.lastStatus;
  }

  private async notify(report: HealthReport): Promise<void> {
    const webhookUrl = this.config.get<string>('discord.webhooks.staffUpdates') ?? process.env.DISCORD_STAFF_UPDATES_WEBHOOK_URL ?? '';

    if (!webhookUrl) {
      await this.auditService.log({
        action: 'HEALTHCHECK_ALERT_SKIPPED',
        targetType: 'health',
        metadata: { reason: 'missing_staff_updates_webhook', status: report.status },
      });
      return;
    }

    const failedChecks = report.checks.filter((check) => check.status !== 'ok');
    const color = report.status === 'ok' ? 0x2ecc71 : report.status === 'degraded' ? 0xf1c40f : 0xe74c3c;
    const title = report.status === 'ok'
      ? pickStaffVoice([
        'Healthcheck voltou pro verde. Aristolfo guardou o extintor e a cara feia.',
        'Healthcheck normalizado. O servidor parou de performar susto em tempo integral.',
        'Healthcheck no eixo de novo. A stack largou o drama e bateu ponto.',
        'Healthcheck estabilizado. O F5 saiu da esteira por enquanto.',
      ], report.status, report.checkedAt)
      : report.status === 'degraded'
        ? pickStaffVoice([
          'Healthcheck amarelo, sem direito a tapete vermelho',
          'Healthcheck rangendo no painel igual porta de call antiga',
          'Healthcheck pediu cautela, nao thread de panico',
          'Healthcheck amarelou e levantou plaquinha de "olha isso"',
        ], report.status, report.checkedAt, failedChecks.map((check) => check.name).join('|'))
        : pickStaffVoice([
          'Healthcheck critico. Plantao ganhou boss surpresa sem loot garantido.',
          'Healthcheck vermelho. A paciencia entrou em modo bateria fraca.',
          'Healthcheck em caos premium. Assinatura cara, beneficio nenhum.',
          'Healthcheck abriu chamado com cheiro de segunda-feira molhada.',
        ], report.status, report.checkedAt, failedChecks.map((check) => check.name).join('|'));

    await this.webhookQueue.send(webhookUrl, {
      embeds: [{
        title,
        color,
        description: report.status === 'ok'
          ? pickStaffVoice([
            '**Servico voltou.** A infra respirou e o plantao pode largar o F5 sem fazer cena.',
            '**Tudo recuperado.** A stack saiu do survival e lembrou onde ficava a porta.',
            '**Recuperacao confirmada.** O susto deslogou e a infra ficou em pe.',
            '**Plataforma normalizada.** O drama perdeu MMR e o servidor lembrou do contrato.',
          ], report.status, report.checkedAt)
          : failedChecks.map((check) => `**${check.name}**: ${check.message ?? check.status}`).join('\n'),
        fields: [
          { name: 'Status', value: report.status.toUpperCase(), inline: true },
          { name: 'Uptime', value: `${report.uptimeSeconds}s`, inline: true },
          { name: 'Verificado em', value: report.checkedAt, inline: false },
        ],
      }],
    }, {
      webhookKey: 'staffUpdates',
      channelLabel: 'Updates Staff',
      action: 'HEALTHCHECK_ALERT_SENT',
      targetId: 'health',
    });

    await this.auditService.log({
      action: 'HEALTHCHECK_ALERT_SENT',
      targetType: 'health',
      metadata: {
        status: report.status,
        failedChecks: failedChecks.map((check) => check.name),
      } as Prisma.InputJsonObject,
    });
  }
}
