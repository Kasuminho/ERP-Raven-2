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
        'Healthcheck verde. O banco ta voando e o Aristolfo guardou o extintor de incendio.',
        'Servidores 100% online. A stack parou de dar susto e voltou pro grind sossegado.',
        'Tudo operacional. Menos drama na VPS, mais uptime pra guilda.',
        'Painel no verde. A infra respirou aliviada e o terminal ta calmo.',
        'Healthcheck normalizado. Nenhuma anomalia no radar; pode focar nos bosses.',
      ], report.status, report.checkedAt)
      : report.status === 'degraded'
        ? pickStaffVoice([
          'Healthcheck em alerta amarelo. O sistema pediu atencao antes de virar ocorrencia.',
          'Latencia ou check chiando no painel. Vale checar a VPS sem panico.',
          'Alerta amarelo: algum servico ta tossindo no cantinho. Olho no log.',
          'Aviso de degradacao leve. Da pra resolver no sapatinho sem crise.',
          'Sinal amarelo no ERP. A infra pediu carinho antes do horario de pico.',
        ], report.status, report.checkedAt, failedChecks.map((check) => check.name).join('|'))
        : pickStaffVoice([
          'Healthcheck CRITICO. Algum container crashou e ta precisando de ressurreicao.',
          'Alerta vermelho no servidor. Acorda quem tiver com a chave ssh na mao.',
          'Healthcheck vermelho. O banco ou a API foram de base; hora do restart tatico.',
          'Emergencia na infra: servico fora do ar. Corre pro terminal.',
          'Alerta critico: stack caiu de joelhos pedindo um reboot com urgencia.',
        ], report.status, report.checkedAt, failedChecks.map((check) => check.name).join('|'));

    await this.webhookQueue.send(webhookUrl, {
      embeds: [{
        title,
        color,
        description: report.status === 'ok'
          ? pickStaffVoice([
            '**Servico 100% restabelecido.** A infra voltou a respirar e a lideranca pode guardar os calmantes.',
            '**Tudo recuperado.** Memoria limpa, conexoes estaveis e banco respondendo nos trincos.',
            '**Operacao normalizada.** O susto passou e o uptime voltou a pontuar bonito.',
            '**Plataforma viva e saudavel.** O sistema parou de reclamar e voltou ao dever civico de registrar DKP.',
            '**Verde total.** Uptime firme e forte; podem continuar o farm sem preocupacao.',
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
