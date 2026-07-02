import { Injectable } from '@nestjs/common';
import { AuctionStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { OperationPriority, OperationTask, StaffMorningBriefing } from '../operations.types';
import { IntegrityService } from './integrity.service';
import { StaffSummaryService } from './staff-summary.service';

const DAYS = 24 * 60 * 60 * 1000;

@Injectable()
export class OperationalBriefingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staffSummary: StaffSummaryService,
    private readonly integrity: IntegrityService,
  ) {}

  async getStaffMorningBriefing(): Promise<StaffMorningBriefing> {
    const now = new Date();
    const next24h = new Date(now.getTime() + DAYS);
    const [staff, health, integrity, expiredOpenAuctions, endingAuctions] = await Promise.all([
      this.staffSummary.getStaffSummary(),
      this.staffSummary.getStaffHealth(),
      this.integrity.getIntegritySummary(),
      this.prisma.auction.findMany({
        where: { status: AuctionStatus.OPEN, endsAt: { lte: now } },
        orderBy: { endsAt: 'asc' },
        take: 6,
      }),
      this.prisma.auction.findMany({
        where: { status: AuctionStatus.OPEN, endsAt: { gt: now, lte: next24h } },
        orderBy: { endsAt: 'asc' },
        take: 6,
      }),
    ]);
    const healthAlerts = health.checks.filter((check) => !check.ready);
    const sectionDefinitions: Array<{
      key: string;
      title: string;
      description: string;
      href: string;
      priority: OperationPriority;
      tasks: OperationTask[];
    }> = [
      {
        key: 'urgent',
        title: 'Resolver agora',
        description: 'Pendencias em vermelho ou com alto risco operacional.',
        href: '/dashboard/staff',
        priority: 'high',
        tasks: staff.tasks.filter((task) => task.priority === 'high'),
      },
      {
        key: 'auctions',
        title: 'Leiloes e reviews',
        description: 'Leiloes vencidos, proximos de vencer ou esperando decisao Staff.',
        href: '/dashboard/staff/auction-diagnostics',
        priority: expiredOpenAuctions.length > 0 ? 'high' : 'medium',
        tasks: [
          ...expiredOpenAuctions.map((auction) => this.morningTask({
            id: auction.id,
            type: 'EXPIRED_OPEN_AUCTION',
            title: 'Leilao OPEN vencido',
            description: `${auction.itemName} venceu em ${auction.endsAt.toISOString()} e ainda esta OPEN.`,
            href: `/dashboard/staff/auction-diagnostics?auctionId=${auction.id}`,
            priority: 'high',
            createdAt: auction.endsAt,
          })),
          ...endingAuctions.map((auction) => this.morningTask({
            id: auction.id,
            type: 'ENDING_AUCTION',
            title: 'Leilao fecha em ate 24h',
            description: `${auction.itemName} fecha em ${auction.endsAt.toISOString()}.`,
            href: `/dashboard/staff/auction-diagnostics?auctionId=${auction.id}`,
            priority: 'medium',
            createdAt: auction.endsAt,
          })),
          ...staff.tasks.filter((task) => task.type === 'STAFF_REVIEW'),
        ],
      },
      {
        key: 'loot',
        title: 'Loot parado',
        description: 'Entregas, interesses fechados e requests que pedem acao.',
        href: '/dashboard/staff/deliveries',
        priority: 'medium',
        tasks: staff.tasks.filter((task) => ['DROP_DELIVERY', 'INTEREST_DELIVERY', 'ITEM_REQUEST_QUEUE'].includes(task.type)),
      },
      {
        key: 'players',
        title: 'Players bloqueados',
        description: 'Progresso, codex e rotina de crescimento aguardando Staff.',
        href: '/dashboard/staff/progress',
        priority: 'medium',
        tasks: staff.tasks.filter((task) => ['PROGRESS_REVIEW', 'CODEX_QUEUE'].includes(task.type)),
      },
      {
        key: 'events',
        title: 'Eventos e comunicados',
        description: 'Eventos abertos, presenca/finalizacao e anuncios ativos.',
        href: '/dashboard/admin/events',
        priority: 'low',
        tasks: staff.tasks.filter((task) => task.type === 'EVENT_ATTENDANCE'),
      },
      {
        key: 'integrity',
        title: 'Saude e integridade',
        description: 'Alertas tecnicos ou inconsistencias que podem virar incidente.',
        href: '/dashboard/staff/integrity',
        priority: healthAlerts.length > 0 || integrity.counts.high > 0 ? 'high' : integrity.counts.medium > 0 ? 'medium' : 'low',
        tasks: [
          ...healthAlerts.map((check) => this.morningTask({
            id: check.key,
            type: 'HEALTH_ALERT',
            title: check.label,
            description: check.detail,
            href: '/dashboard/staff/health',
            priority: 'high',
            createdAt: now,
          })),
          ...integrity.issues.slice(0, 6).map((issue) => this.morningTask({
            id: issue.id,
            type: `INTEGRITY_${issue.type}`,
            title: issue.title,
            description: issue.description,
            href: issue.href ?? '/dashboard/staff/integrity',
            priority: issue.severity === 'high' ? 'high' : issue.severity === 'medium' ? 'medium' : 'low',
            createdAt: issue.createdAt ?? now,
            metadata: issue.metadata,
          })),
        ],
      },
    ];
    const sections = sectionDefinitions.map((section) => {
      const tasks = this.sortTasks(section.tasks).slice(0, 8);
      return {
        key: section.key,
        title: section.title,
        description: section.description,
        href: section.href,
        priority: tasks.some((task) => task.priority === 'high') ? 'high' : section.priority,
        count: section.tasks.length,
        tasks,
      };
    });
    const counts = {
      urgent: staff.tasks.filter((task) => task.priority === 'high').length,
      reviews: staff.counts.reviews,
      deliveries: staff.counts.deliveries,
      codex: staff.counts.codex,
      itemRequests: staff.counts.itemRequests,
      interests: staff.counts.interests,
      progress: staff.counts.progress,
      events: staff.counts.events,
      expiredOpenAuctions: expiredOpenAuctions.length,
      endingAuctions24h: endingAuctions.length,
      integrityHigh: integrity.counts.high,
      healthAlerts: healthAlerts.length,
    };
    const summary = this.buildMorningBriefingSummary(counts);

    return {
      generatedAt: now,
      title: 'Resumo matinal Staff',
      summary,
      counts,
      sections,
      markdown: this.buildMorningBriefingMarkdown(now, summary, sections),
    };
  }

  private morningTask(task: OperationTask): OperationTask {
    return task;
  }

  private sortTasks(tasks: OperationTask[]): OperationTask[] {
    const weight = { high: 0, medium: 1, low: 2 };
    return [...tasks].sort((left, right) => {
      const priority = weight[left.priority] - weight[right.priority];
      if (priority !== 0) return priority;
      return new Date(left.createdAt ?? 0).getTime() - new Date(right.createdAt ?? 0).getTime();
    });
  }

  private buildMorningBriefingSummary(counts: StaffMorningBriefing['counts']): string {
    if (counts.expiredOpenAuctions > 0 || counts.integrityHigh > 0 || counts.healthAlerts > 0) {
      return `Tem ${counts.expiredOpenAuctions} leilao(oes) vencido(s), ${counts.integrityHigh} alerta(s) critico(s) de integridade e ${counts.healthAlerts} alerta(s) de saude. Prioridade e apagar fogo antes de mexer em rotina.`;
    }

    if (counts.urgent > 0) {
      return `Existem ${counts.urgent} pendencia(s) urgentes. Comece por reviews/entregas vencidas e depois limpe progresso, codex e requests.`;
    }

    const routineTotal = counts.reviews + counts.deliveries + counts.codex + counts.itemRequests + counts.interests + counts.progress + counts.events;
    if (routineTotal > 0) {
      return `Dia operacional com ${routineTotal} item(ns) de rotina. Nada gritando em vermelho, mas a fila ja esta fazendo cosplay de inventario lotado.`;
    }

    return 'Fila limpa no resumo matinal. Bom momento para revisar guias, eventos futuros e economia antes do jogo inventar moda.';
  }

  private buildMorningBriefingMarkdown(
    generatedAt: Date,
    summary: string,
    sections: StaffMorningBriefing['sections'],
  ): string {
    const lines = [
      '# Resumo matinal Staff',
      '',
      `Gerado em: ${generatedAt.toISOString()}`,
      '',
      summary,
      '',
    ];

    for (const section of sections) {
      lines.push(`## ${section.title}`);
      lines.push(`${section.description} Total: ${section.count}.`);
      lines.push(...this.markdownList(section.tasks.map((task) => `${task.priority.toUpperCase()} - ${task.title}: ${task.description} (${task.href})`)));
      lines.push('');
    }

    return lines.join('\n').trim();
  }

  private markdownList(items: string[]): string[] {
    if (items.length === 0) return ['- Nenhum registro.'];
    return items.map((item) => `- ${item}`);
  }
}
