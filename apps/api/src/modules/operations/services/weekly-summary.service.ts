import { Injectable } from '@nestjs/common';
import { EventStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { bilingualBlocks, pickVoiceLine } from '../../discord/bot/embeds/webhook-voice';
import { NotificationService } from '../../discord/services/notification.service';
import { SeasonMonthlySummary, WeeklyGuildSummary } from '../operations.types';
import { StaffSummaryService } from './staff-summary.service';

type PlayerSummaryRow = {
  playerId: string;
  nickname: string;
  dkpDelta: number;
  attendanceCount: number;
  dropsCount: number;
  daoshiApprovedCents: number;
};

@Injectable()
export class WeeklySummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly discordNotifications: NotificationService,
    private readonly staffSummary: StaffSummaryService,
  ) {}

  async getSeasonSummary(month = new Date().toISOString().slice(0, 7)): Promise<SeasonMonthlySummary> {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      month = new Date().toISOString().slice(0, 7);
    }

    const [year, monthIndex] = month.split('-').map(Number);
    const start = new Date(Date.UTC(year, monthIndex - 1, 1));
    const end = new Date(Date.UTC(year, monthIndex, 1));
    const summary = await this.getPeriodSummary(start, end);

    return {
      month,
      ...summary,
    };
  }

  async getWeeklySummary(): Promise<WeeklyGuildSummary> {
    const now = new Date();
    const day = now.getUTCDay();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day, 0, 0, 0, 0));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    const summary = await this.getPeriodSummary(start, end);

    return {
      weekStart: start.toISOString(),
      weekEnd: end.toISOString(),
      ...summary,
    };
  }

  async postWeeklySummary(): Promise<{ posted: boolean; summary: WeeklyGuildSummary }> {
    const summary = await this.getWeeklySummary();
    const topPlayersPt = summary.topPlayers.slice(0, 5).map((player, index) => {
      const score = this.getPlayerScore(player);
      return `${index + 1}. ${player.nickname} - score ${Math.round(score)} | DKP ${player.dkpDelta} | presencas ${player.attendanceCount} | drops ${player.dropsCount}`;
    });
    const topPlayersEn = summary.topPlayers.slice(0, 5).map((player, index) => {
      const score = this.getPlayerScore(player);
      return `${index + 1}. ${player.nickname} - score ${Math.round(score)} | DKP ${player.dkpDelta} | attendance ${player.attendanceCount} | drops ${player.dropsCount}`;
    });
    const staff = await this.staffSummary.getStaffSummary();
    const message = [
      '**PT-BR - Resumo semanal da guild**',
      '',
      `Periodo: ${new Date(summary.weekStart).toLocaleDateString('pt-BR')} ate ${new Date(summary.weekEnd).toLocaleDateString('pt-BR')}`,
      `DKP distribuido: ${summary.dkpEarned}`,
      `DKP gasto em leiloes/ajustes negativos: ${summary.dkpSpent}`,
      `Eventos com presenca: ${summary.attendanceEvents}`,
      `Drops entregues: ${summary.dropsDelivered}`,
      `Pedidos finalizados: ${summary.itemRequestsDelivered}`,
      `Daoshi aprovado: R$ ${(summary.daoshiApprovedCents / 100).toFixed(2)}`,
      '',
      '**Top da semana**',
      topPlayersPt.length > 0 ? topPlayersPt.join('\n') : 'Sem movimentacao suficiente ainda.',
      '',
      '**Pendencias da Staff**',
      `Reviews: ${staff.counts.reviews} | Entregas: ${staff.counts.deliveries} | Codex: ${staff.counts.codex} | Interesses: ${staff.counts.interests}`,
      '',
      '**EN - Guild weekly summary**',
      '',
      `Period: ${new Date(summary.weekStart).toLocaleDateString('en-US')} to ${new Date(summary.weekEnd).toLocaleDateString('en-US')}`,
      `DKP distributed: ${summary.dkpEarned}`,
      `DKP spent on auctions/negative adjustments: ${summary.dkpSpent}`,
      `Attendance events: ${summary.attendanceEvents}`,
      `Drops delivered: ${summary.dropsDelivered}`,
      `Requests completed: ${summary.itemRequestsDelivered}`,
      `Daoshi approved: BRL ${(summary.daoshiApprovedCents / 100).toFixed(2)}`,
      '',
      '**Top of the week**',
      topPlayersEn.length > 0 ? topPlayersEn.join('\n') : 'Not enough activity yet.',
      '',
      '**Staff backlog**',
      `Reviews: ${staff.counts.reviews} | Deliveries: ${staff.counts.deliveries} | Codex: ${staff.counts.codex} | Interests: ${staff.counts.interests}`,
      '',
      bilingualBlocks({
        'pt-BR': pickVoiceLine([
          'Aristolfo fechou a semana no extrato. Se a planilha chiar, ganha mute pedagogico.',
          'Resumo semanal carimbado. Numero bateu antes do chat montar VAR de sofa.',
          'Aristolfo nao passou pano; passou raio-x. O saldo saiu sem filtro de publi.',
          'Semana quitada no registro. Duvida nova pega senha e para de fazer parkour no dashboard.',
        ], summary.weekStart, summary.weekEnd, summary.dkpEarned, summary.dropsDelivered),
        en: pickVoiceLine([
          'Aristolfo closed the week on the ledger. If the spreadsheet squeaks, it gets pedagogical mute.',
          'Weekly summary stamped. The numbers matched before chat built couch VAR.',
          'Aristolfo did not gloss over it; he ran an x-ray. The balance left without ad filters.',
          'Week settled in the record. Any new doubt gets a number and stops doing dashboard parkour.',
        ], summary.weekStart, summary.weekEnd, summary.dkpEarned, summary.dropsDelivered),
      }),
    ].join('\n');

    await this.discordNotifications.sendOperationalNotification('', message, 'weekly-guild-summary');
    return { posted: true, summary };
  }

  private async getPeriodSummary(start: Date, end: Date): Promise<Omit<SeasonMonthlySummary, 'month'>> {
    const [transactions, attendances, drops, daoshiReceipts, itemRequestsDelivered] = await Promise.all([
      this.prisma.dKPTransaction.findMany({
        where: { createdAt: { gte: start, lt: end } },
        include: { player: { select: { id: true, nickname: true } } },
      }),
      this.prisma.eventAttendance.findMany({
        where: { attended: true, event: { status: EventStatus.FINALIZED, finalizedAt: { gte: start, lt: end } } },
        include: { player: { select: { id: true, nickname: true } } },
      }),
      this.prisma.dropHistory.findMany({
        where: { deliveredAt: { gte: start, lt: end } },
        include: { player: { select: { id: true, nickname: true } } },
      }),
      this.prisma.daoshiCashReceipt.findMany({
        where: { status: 'APPROVED', purchaseDate: { gte: start, lt: end } },
        include: { player: { select: { id: true, nickname: true } } },
      }),
      this.prisma.itemRequest.count({
        where: { remainingQuantity: 0, updatedAt: { gte: start, lt: end } },
      }),
    ]);

    return this.composePeriodSummary(transactions, attendances, drops, daoshiReceipts, itemRequestsDelivered);
  }

  private composePeriodSummary(
    transactions: Array<{ amount: number; player?: { id: string; nickname: string } | null }>,
    attendances: Array<{ eventId: string; player?: { id: string; nickname: string } | null }>,
    drops: Array<{ player?: { id: string; nickname: string } | null }>,
    daoshiReceipts: Array<{ approvedCents?: number | null; player?: { id: string; nickname: string } | null }>,
    itemRequestsDelivered: number,
  ): Omit<SeasonMonthlySummary, 'month'> {
    const byPlayer = new Map<string, PlayerSummaryRow>();
    const ensure = (player?: { id: string; nickname: string } | null) => {
      if (!player) return null;
      const current = byPlayer.get(player.id) ?? {
        playerId: player.id,
        nickname: player.nickname,
        dkpDelta: 0,
        attendanceCount: 0,
        dropsCount: 0,
        daoshiApprovedCents: 0,
      };
      byPlayer.set(player.id, current);
      return current;
    };

    for (const transaction of transactions) {
      const row = ensure(transaction.player);
      if (row) row.dkpDelta += transaction.amount;
    }
    for (const attendance of attendances) {
      const row = ensure(attendance.player);
      if (row) row.attendanceCount += 1;
    }
    for (const drop of drops) {
      const row = ensure(drop.player);
      if (row) row.dropsCount += 1;
    }
    for (const receipt of daoshiReceipts) {
      const row = ensure(receipt.player);
      if (row) row.daoshiApprovedCents += receipt.approvedCents ?? 0;
    }

    return {
      dkpEarned: transactions.filter((row) => row.amount > 0).reduce((sum, row) => sum + row.amount, 0),
      dkpSpent: Math.abs(transactions.filter((row) => row.amount < 0).reduce((sum, row) => sum + row.amount, 0)),
      attendanceEvents: new Set(attendances.map((row) => row.eventId)).size,
      dropsDelivered: drops.length,
      daoshiApprovedCents: daoshiReceipts.reduce((sum, row) => sum + (row.approvedCents ?? 0), 0),
      itemRequestsDelivered,
      topPlayers: [...byPlayer.values()]
        .sort((a, b) => this.getPlayerScore(b) - this.getPlayerScore(a))
        .slice(0, 15),
    };
  }

  private getPlayerScore(player: PlayerSummaryRow): number {
    return player.dkpDelta + player.attendanceCount * 50 + player.dropsCount * 25 + player.daoshiApprovedCents / 1000;
  }
}
