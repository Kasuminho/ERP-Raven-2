import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DKPTransactionType } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { AuditService } from '../../audit/services/audit.service';
import { pickStaffVoice } from '../bot/embeds/webhook-voice';
import { DiscordWebhookQueueService } from './discord-webhook-queue.service';

type DkpLogRow = {
  id: string;
  amount: number;
  type: DKPTransactionType;
  referenceId: string | null;
  createdAt: Date;
  player: { nickname: string };
  createdBy: { discordNickname: string | null; discordUsername: string };
};

@Injectable()
export class DkpLogPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DkpLogPublisherService.name);
  private readonly stateId = 'staff-dkp-log';
  private readonly backfillDays = 3;
  private readonly descriptionLimit = 3600;
  private readonly batchSize = 500;
  private timer?: NodeJS.Timeout;
  private startupTimer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly webhookQueue: DiscordWebhookQueueService,
    private readonly auditService: AuditService,
  ) {}

  onModuleInit(): void {
    if (!this.webhookUrl()) {
      this.logger.warn('discord_dkp_log_disabled=missing_webhook');
      return;
    }

    const intervalMs = Math.max(15_000, Number(process.env.DKP_LOG_POLL_INTERVAL_MS ?? 30_000));
    this.startupTimer = setTimeout(() => void this.publishPending(), 15_000);
    this.timer = setInterval(() => void this.publishPending(), intervalMs);
  }

  onModuleDestroy(): void {
    if (this.startupTimer) clearTimeout(this.startupTimer);
    if (this.timer) clearInterval(this.timer);
  }

  async publishPending(): Promise<{ sent: number; messages: number }> {
    if (this.running || !this.webhookUrl()) return { sent: 0, messages: 0 };
    this.running = true;

    try {
      const { startedAt, initialBackfill } = await this.ensureState();
      const rows = await this.prisma.dKPTransaction.findMany({
        where: {
          createdAt: { gte: startedAt },
          discordLogDelivery: null,
        },
        include: {
          player: { select: { nickname: true } },
          createdBy: { select: { discordNickname: true, discordUsername: true } },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: this.batchSize,
      });

      if (rows.length === 0) {
        if (initialBackfill) await this.completeBackfill();
        return { sent: 0, messages: 0 };
      }

      const contexts = await this.loadReferenceContexts(rows);
      const chunks = this.chunkRows(rows, contexts);

      for (const [index, chunk] of chunks.entries()) {
        const title = initialBackfill
          ? `DKP-LOG | Ultimos ${this.backfillDays} dias${chunks.length > 1 ? ` (${index + 1}/${chunks.length})` : ''}`
          : `DKP-LOG | Novas movimentacoes${chunks.length > 1 ? ` (${index + 1}/${chunks.length})` : ''}`;
        await this.webhookQueue.send(this.webhookUrl(), {
          embeds: [{
            title,
            color: 0x9b51e0,
            description: `${initialBackfill
              ? `${pickStaffVoice([
                '**Aristolfo puxou 3 dias de extrato.** Confere antes que o saldo vire novela com narrador suspeito.',
                '**Backfill entregue.** Tres dias em ordem, sem contabilidade freestyle no after.',
                '**Historico saiu do arquivo.** O extrato chegou antes do "mas eu lembro diferente".',
                '**Retroativo na mesa.** O log trouxe tudo antes que o achismo abrisse live.',
              ], this.stateId, index, 'backfill')}\n\n`
              : `${pickStaffVoice([
                '**Movimentacao nova no log.** Chegou antes que a memoria coletiva editasse o roteiro.',
                '**DKP mexeu e Aristolfo carimbou.** Timeline salva, fofoca sem permissao de escrita.',
                '**Extrato atualizado.** O contador passou por cima do chutometro sem usar ultimate.',
                '**Saldo mudou.** Registro saiu cedo, antes do voice lancar remake dos fatos.',
              ], this.stateId, index, 'live')}\n\n`}${chunk.lines.join('\n')}`,
            footer: { text: `${chunk.rows.length} movimentacao(oes) | Ordem cronologica` },
            timestamp: new Date().toISOString(),
          }],
          allowedMentions: { parse: [] },
        }, {
          webhookKey: 'dkp',
          channelLabel: 'DKP-LOG',
          action: 'DISCORD_DKP_LOG_SENT',
          targetId: this.stateId,
        });

        await this.prisma.discordDkpLogDelivery.createMany({
          data: chunk.rows.map((row) => ({ transactionId: row.id })),
          skipDuplicates: true,
        });
      }

      if (initialBackfill && rows.length < this.batchSize) await this.completeBackfill();

      await this.auditService.log({
        action: 'DISCORD_DKP_LOG_PUBLISHED',
        targetType: 'DiscordDkpLog',
        targetId: this.stateId,
        metadata: { transactions: rows.length, messages: chunks.length, initialBackfill },
      });

      return { sent: rows.length, messages: chunks.length };
    } catch (error) {
      this.logger.error('discord_dkp_log_publish_failed', error instanceof Error ? error.stack : undefined);
      return { sent: 0, messages: 0 };
    } finally {
      this.running = false;
    }
  }

  private async ensureState(): Promise<{ startedAt: Date; initialBackfill: boolean }> {
    const existing = await this.prisma.discordDkpLogState.findUnique({ where: { id: this.stateId } });
    if (existing) return { startedAt: existing.startedAt, initialBackfill: !existing.backfillCompletedAt };

    const startedAt = new Date(Date.now() - this.backfillDays * 86_400_000);
    const state = await this.prisma.discordDkpLogState.create({
      data: { id: this.stateId, startedAt },
    }).catch(() => this.prisma.discordDkpLogState.findUniqueOrThrow({ where: { id: this.stateId } }));
    return { startedAt: state.startedAt, initialBackfill: true };
  }

  private async completeBackfill(): Promise<void> {
    await this.prisma.discordDkpLogState.update({
      where: { id: this.stateId },
      data: { backfillCompletedAt: new Date() },
    });
  }

  private async loadReferenceContexts(rows: DkpLogRow[]): Promise<Map<string, string>> {
    const eventIds = new Set<string>();
    const auctionIds = new Set<string>();

    for (const row of rows) {
      if (!row.referenceId) continue;
      if (row.type === DKPTransactionType.EVENT_REWARD) eventIds.add(row.referenceId);
      if (row.type === DKPTransactionType.AUCTION_WIN) auctionIds.add(row.referenceId);
      const eventMatch = row.referenceId.match(/^(?:attendance-(?:add|remove)|event-cancel):([^:]+)/);
      if (eventMatch) eventIds.add(eventMatch[1]);
    }

    const [events, auctions] = await Promise.all([
      this.prisma.event.findMany({ where: { id: { in: [...eventIds] } }, select: { id: true, name: true } }),
      this.prisma.auction.findMany({ where: { id: { in: [...auctionIds] } }, select: { id: true, itemName: true } }),
    ]);
    return new Map([
      ...events.map((event) => [event.id, event.name] as const),
      ...auctions.map((auction) => [auction.id, auction.itemName] as const),
    ]);
  }

  private chunkRows(rows: DkpLogRow[], contexts: Map<string, string>): Array<{ rows: DkpLogRow[]; lines: string[] }> {
    const chunks: Array<{ rows: DkpLogRow[]; lines: string[] }> = [];
    let current = { rows: [] as DkpLogRow[], lines: [] as string[] };

    for (const row of rows) {
      const line = this.formatRow(row, contexts);
      const projectedLength = current.lines.join('\n').length + line.length + 1;
      if (current.rows.length > 0 && projectedLength > this.descriptionLimit) {
        chunks.push(current);
        current = { rows: [], lines: [] };
      }
      current.rows.push(row);
      current.lines.push(line);
    }

    if (current.rows.length > 0) chunks.push(current);
    return chunks;
  }

  private formatRow(row: DkpLogRow, contexts: Map<string, string>): string {
    const amount = `${row.amount > 0 ? '+' : ''}${row.amount}`;
    const actor = row.createdBy.discordNickname ?? row.createdBy.discordUsername;
    const timestamp = `<t:${Math.floor(row.createdAt.getTime() / 1000)}:f>`;
    return `**${amount} DKP** | ${this.clean(row.player.nickname)} | ${this.reason(row, contexts)} | por ${this.clean(actor)} | ${timestamp}`;
  }

  private reason(row: DkpLogRow, contexts: Map<string, string>): string {
    const reference = row.referenceId ?? '';
    if (row.type === DKPTransactionType.EVENT_REWARD) return `Recompensa de evento: ${this.clean(contexts.get(reference) ?? 'evento')}`;
    if (row.type === DKPTransactionType.AUCTION_WIN) return `Leilao vencido: ${this.clean(contexts.get(reference) ?? 'item')}`;
    if (reference.startsWith('attendance-add:')) return `Correcao de presenca (+): ${this.eventNameFromReference(reference, contexts)}`;
    if (reference.startsWith('attendance-remove:')) return `Correcao de presenca (-): ${this.eventNameFromReference(reference, contexts)}`;
    if (reference.startsWith('event-cancel:')) return `Estorno de evento: ${this.eventNameFromReference(reference, contexts)}`;
    if (row.type === DKPTransactionType.AUCTION_LOCK) return 'Lock de leilao';
    if (row.type === DKPTransactionType.AUCTION_REFUND) return 'Devolucao de lock';
    return reference ? `Ajuste administrativo | ref: ${this.clean(reference).slice(0, 48)}` : 'Ajuste administrativo';
  }

  private eventNameFromReference(reference: string, contexts: Map<string, string>): string {
    const eventId = reference.split(':')[1] ?? '';
    return this.clean(contexts.get(eventId) ?? 'evento');
  }

  private clean(value: string): string {
    return value.replace(/[*_`~|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
  }

  private webhookUrl(): string {
    return this.config.get<string>('discord.webhooks.dkp')?.trim() ?? '';
  }
}
