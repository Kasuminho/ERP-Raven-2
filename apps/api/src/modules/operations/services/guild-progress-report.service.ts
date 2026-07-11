import { Injectable } from '@nestjs/common';
import { AuctionStatus, EventStatus, ProgressReviewStatus, WishlistStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { GuildProgressReport, PlayerWeeklySafeSummary } from '../operations.types';

@Injectable()
export class GuildProgressReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getStaffReport(period: 'week' | 'month' = 'week'): Promise<GuildProgressReport> {
    const { start, end } = this.periodRange(period);
    const [
      finalizedEvents,
      attendances,
      dropsDelivered,
      auctionsFinished,
      requestsDelivered,
      progressApproved,
      warRoomOperations,
      activeWishlistItems,
      pendingDisputes,
      staleProgress,
      players,
    ] = await Promise.all([
      this.prisma.event.count({ where: { status: EventStatus.FINALIZED, finalizedAt: { gte: start, lt: end } } }),
      this.prisma.eventAttendance.count({ where: { attended: true, event: { finalizedAt: { gte: start, lt: end } } } }),
      this.prisma.dropHistory.count({ where: { deliveredAt: { gte: start, lt: end } } }),
      this.prisma.auction.count({ where: { status: AuctionStatus.FINISHED, updatedAt: { gte: start, lt: end } } }),
      this.prisma.itemRequest.count({ where: { remainingQuantity: 0, updatedAt: { gte: start, lt: end } } }),
      this.prisma.playerProgress.count({ where: { reviewStatus: ProgressReviewStatus.APPROVED, reviewedAt: { gte: start, lt: end } } }),
      this.prisma.warRoomOperation.count({ where: { startsAt: { gte: start, lt: end } } }),
      this.prisma.playerWishlistItem.count({ where: { status: WishlistStatus.ACTIVE } }),
      this.prisma.auctionDispute.count({ where: { status: 'PENDING' } }),
      this.prisma.playerProgress.count({ where: { reviewStatus: ProgressReviewStatus.PENDING } }),
      this.prisma.player.findMany({
        where: { isActive: true },
        select: { class: true, dimensionalLayer: true, attendancePercentage: true },
      }),
    ]);
    const classDistribution = Object.values(players.reduce<Record<string, { class: string; active: number; layer4Plus: number; lowAttendance: number }>>((acc, player) => {
      const row = acc[player.class] ?? { class: player.class, active: 0, layer4Plus: 0, lowAttendance: 0 };
      row.active += 1;
      if (player.dimensionalLayer >= 4) row.layer4Plus += 1;
      if (player.attendancePercentage < 60) row.lowAttendance += 1;
      acc[player.class] = row;
      return acc;
    }, {})).sort((left, right) => right.active - left.active || left.class.localeCompare(right.class));
    const risks = [
      ...(pendingDisputes > 0 ? [{ key: 'pending-disputes', label: 'Contestacoes pendentes', severity: 'warning' as const, detail: `${pendingDisputes} contestacao(oes) aguardando Staff.`, href: '/dashboard/staff/reviews' }] : []),
      ...(staleProgress > 0 ? [{ key: 'pending-progress', label: 'Progresso pendente', severity: 'warning' as const, detail: `${staleProgress} STATUS/progresso pendente.`, href: '/dashboard/staff/progress' }] : []),
      ...(activeWishlistItems > 20 ? [{ key: 'wishlist-pressure', label: 'Pressao de wishlist', severity: 'info' as const, detail: `${activeWishlistItems} desejos ativos para planejar loot.`, href: '/dashboard/staff/wishlist' }] : []),
    ];
    const counts = { finalizedEvents, attendances, dropsDelivered, auctionsFinished, requestsDelivered, progressApproved, warRoomOperations, activeWishlistItems, pendingRisks: risks.length };
    const nextActions = [
      { label: 'Revisar riscos', href: '/dashboard/staff/reviews', reason: 'Contestacoes e alertas precisam de decisao humana.', priority: pendingDisputes > 0 ? 'high' as const : 'medium' as const },
      { label: 'Planejar loot', href: '/dashboard/staff/wishlist', reason: 'Wishlist indica demanda real antes de drop/leilao.', priority: activeWishlistItems > 0 ? 'medium' as const : 'low' as const },
      { label: 'Atualizar progresso', href: '/dashboard/staff/progress', reason: 'STATUS pendente distorce leitura de CP e prontidao.', priority: staleProgress > 0 ? 'high' as const : 'low' as const },
    ];

    return {
      period,
      start,
      end,
      generatedAt: new Date(),
      counts,
      classDistribution,
      risks,
      nextActions,
      markdown: this.markdown(period, start, end, counts, risks, nextActions),
    };
  }

  async getPlayerSafeSummary(period: 'week' | 'month' = 'week'): Promise<PlayerWeeklySafeSummary> {
    const report = await this.getStaffReport(period);
    const collective = {
      finalizedEvents: report.counts.finalizedEvents,
      dropsDelivered: report.counts.dropsDelivered,
      auctionsFinished: report.counts.auctionsFinished,
      requestsDelivered: report.counts.requestsDelivered,
      warRoomOperations: report.counts.warRoomOperations,
    };

    return {
      period,
      start: report.start,
      end: report.end,
      generatedAt: new Date(),
      titlePt: 'Resumo seguro da semana',
      titleEn: 'Safe weekly summary',
      summaryPt: `A guilda fechou ${collective.finalizedEvents} evento(s), ${collective.dropsDelivered} drop(s) e ${collective.auctionsFinished} leilao(oes) no periodo. So numeros coletivos, sem fofoca numerica.`,
      summaryEn: `The guild completed ${collective.finalizedEvents} event(s), ${collective.dropsDelivered} drop(s), and ${collective.auctionsFinished} auction(s) in this period. Collective numbers only, no spicy private stats.`,
      collective,
      actionLinks: [
        { labelPt: 'Ver eventos', labelEn: 'View events', href: '/dashboard/attendance' },
        { labelPt: 'Atualizar progresso', labelEn: 'Update progress', href: '/dashboard/profile' },
        { labelPt: 'Wishlist', labelEn: 'Wishlist', href: '/dashboard/wishlist' },
      ],
    };
  }

  private periodRange(period: 'week' | 'month') {
    const end = new Date();
    const start = new Date(end);
    start.setHours(0, 0, 0, 0);
    if (period === 'month') {
      start.setDate(1);
    } else {
      start.setDate(start.getDate() - 6);
    }
    return { start, end };
  }

  private markdown(
    period: string,
    start: Date,
    end: Date,
    counts: GuildProgressReport['counts'],
    risks: GuildProgressReport['risks'],
    nextActions: GuildProgressReport['nextActions'],
  ) {
    return [
      `# Relatorio de progresso da guilda - ${period}`,
      `Periodo: ${start.toISOString()} - ${end.toISOString()}`,
      '',
      `Eventos finalizados: ${counts.finalizedEvents}`,
      `Drops entregues: ${counts.dropsDelivered}`,
      `Leiloes finalizados: ${counts.auctionsFinished}`,
      `Requests entregues: ${counts.requestsDelivered}`,
      `Wishlist ativa: ${counts.activeWishlistItems}`,
      '',
      '## Riscos',
      ...(risks.length ? risks.map((risk) => `- [${risk.severity}] ${risk.label}: ${risk.detail}`) : ['- Sem risco critico obvio.']),
      '',
      '## Proximas acoes',
      ...nextActions.map((action) => `- ${action.label}: ${action.reason} (${action.href})`),
    ].join('\n');
  }
}
