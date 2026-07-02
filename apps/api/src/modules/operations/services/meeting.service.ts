import { Injectable } from '@nestjs/common';
import { AnnouncementStatus, AuctionStatus, EventStatus, ItemInterestStatus, PlayerStaffNoteSeverity, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { AuditService } from '../../audit/services/audit.service';
import { OperationPriority, OperationTask, StaffMeetingSummary } from '../operations.types';
import { StaffSummaryService } from './staff-summary.service';

@Injectable()
export class MeetingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly staffSummary: StaffSummaryService,
  ) {}

  async getStaffMeetingSummary(): Promise<StaffMeetingSummary> {
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const meetingDay = this.getOperationalDay(new Date());
    const [day, reviewAuctions, votingInterests, openEvents, dkpTransactions, staffNotes, announcements, resolvedLogs] = await Promise.all([
      this.staffSummary.getStaffDayView(),
      this.prisma.auction.findMany({
        where: { status: AuctionStatus.PENDING_REVIEW },
        select: { id: true, itemName: true, status: true, updatedAt: true },
        orderBy: { updatedAt: 'asc' },
        take: 10,
      }),
      this.prisma.itemInterestPost.findMany({
        where: { status: { in: [ItemInterestStatus.VOTING, ItemInterestStatus.READY_FOR_DELIVERY, ItemInterestStatus.CLOSED] } },
        select: { id: true, title: true, status: true, updatedAt: true, entries: { select: { id: true } } },
        orderBy: { updatedAt: 'asc' },
        take: 10,
      }),
      this.prisma.event.findMany({
        where: { status: { in: [EventStatus.OPEN, EventStatus.ATTENDANCE_REGISTRATION] } },
        select: { id: true, name: true, type: true, startsAt: true, status: true },
        orderBy: { startsAt: 'asc' },
        take: 10,
      }),
      this.prisma.dKPTransaction.findMany({
        where: { createdAt: { gte: since7d } },
        include: { player: { select: { nickname: true } } },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.playerStaffNote.findMany({
        where: { severity: { in: [PlayerStaffNoteSeverity.WARNING, PlayerStaffNoteSeverity.STRIKE] } },
        include: { player: { select: { nickname: true } } },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.announcement.findMany({
        where: { status: AnnouncementStatus.ACTIVE },
        select: { id: true, title: true, type: true, eventTime: true, status: true },
        orderBy: { eventTime: 'asc' },
        take: 8,
      }),
      this.prisma.auditLog.findMany({
        where: {
          action: 'STAFF_MEETING_ITEM_RESOLVED',
          targetType: 'StaffMeetingItem',
          targetId: { startsWith: `${meetingDay}:` },
        },
        select: { targetId: true },
      }),
    ]);

    const resolvedItemKeys = resolvedLogs.map((log) => log.targetId).filter((targetId): targetId is string => Boolean(targetId));
    const resolvedSet = new Set(resolvedItemKeys);
    const votingInterestRows = votingInterests.map((post) => ({ ...post, entries: post.entries.length }));
    const sections = [
      this.buildSection({
        key: 'loot',
        title: 'Decisoes de loot',
        description: 'Leiloes em review e interesses que precisam virar decisao.',
        href: '/dashboard/staff/reviews',
        priority: reviewAuctions.length + votingInterestRows.length > 0 ? 'high' : 'low',
        tasks: [
          ...reviewAuctions.map((auction): OperationTask => ({
            id: auction.id,
            type: 'MEETING_AUCTION_REVIEW',
            title: `Review: ${auction.itemName}`,
            description: `Leilao em ${auction.status} desde ${auction.updatedAt.toISOString()}.`,
            href: '/dashboard/staff/reviews',
            priority: 'high',
            createdAt: auction.updatedAt,
          })),
          ...votingInterestRows.map((post): OperationTask => ({
            id: post.id,
            type: 'MEETING_INTEREST_DECISION',
            title: post.title,
            description: `${post.entries} interessado(s), status ${post.status}.`,
            href: '/dashboard/staff/interests',
            priority: post.status === ItemInterestStatus.READY_FOR_DELIVERY ? 'high' : 'medium',
            createdAt: post.updatedAt,
          })),
        ],
      }, meetingDay, resolvedSet),
      this.buildSection({
        key: 'blocked',
        title: 'Pendencias travadas',
        description: 'Filas que envelheceram e merecem decisao na call.',
        href: '/dashboard/staff/day',
        priority: day.urgentTasks.some((task) => task.priority === 'high') ? 'high' : 'medium',
        tasks: day.urgentTasks.filter((task) => task.priority !== 'low').slice(0, 10),
      }, meetingDay, resolvedSet),
      this.buildSection({
        key: 'dkp',
        title: 'Economia DKP',
        description: 'Movimentos recentes para revisar ajustes, locks, refunds e vitorias.',
        href: '/dashboard/staff/dkp',
        priority: dkpTransactions.some((transaction) => transaction.type === 'ADMIN_ADJUSTMENT') ? 'medium' : 'low',
        tasks: dkpTransactions.map((transaction): OperationTask => ({
          id: transaction.id,
          type: 'MEETING_DKP_TRANSACTION',
          title: `${transaction.type}: ${transaction.player.nickname}`,
          description: `${transaction.amount > 0 ? '+' : ''}${transaction.amount} DKP registrado nos ultimos 7 dias.`,
          href: '/dashboard/staff/dkp',
          priority: transaction.type === 'ADMIN_ADJUSTMENT' ? 'medium' : 'low',
          createdAt: transaction.createdAt,
          metadata: { transactionType: transaction.type, amount: transaction.amount },
        })),
      }, meetingDay, resolvedSet),
      this.buildSection({
        key: 'players',
        title: 'Players sensiveis',
        description: 'Notas Staff recentes com warning/strike para alinhar tratamento.',
        href: '/dashboard/staff/players',
        priority: staffNotes.some((note) => note.severity === PlayerStaffNoteSeverity.STRIKE) ? 'high' : 'medium',
        tasks: staffNotes.map((note): OperationTask => ({
          id: note.id,
          type: 'MEETING_PLAYER_NOTE',
          title: `${note.player.nickname}: ${note.severity}`,
          description: note.body,
          href: '/dashboard/staff/players',
          priority: note.severity === PlayerStaffNoteSeverity.STRIKE ? 'high' : 'medium',
          createdAt: note.createdAt,
          metadata: { playerId: note.playerId, severity: note.severity },
        })),
      }, meetingDay, resolvedSet),
      this.buildSection({
        key: 'bosses',
        title: 'Progresso de boss/lote',
        description: 'Eventos abertos e presencas que precisam fechar o ciclo.',
        href: '/dashboard/admin/events',
        priority: openEvents.length > 0 ? 'medium' : 'low',
        tasks: openEvents.map((event): OperationTask => ({
          id: event.id,
          type: 'MEETING_EVENT_PROGRESS',
          title: event.name,
          description: `${event.type} esta ${event.status} para ${event.startsAt.toISOString()}.`,
          href: '/dashboard/admin/events',
          priority: 'medium',
          createdAt: event.startsAt,
        })),
      }, meetingDay, resolvedSet),
      this.buildSection({
        key: 'comms',
        title: 'Comunicados a preparar',
        description: 'Anuncios ativos que precisam texto, horario ou follow-up.',
        href: '/dashboard/admin/announcements',
        priority: announcements.length > 0 ? 'medium' : 'low',
        tasks: announcements.map((announcement): OperationTask => ({
          id: announcement.id,
          type: 'MEETING_ANNOUNCEMENT',
          title: announcement.title,
          description: `${announcement.type} ativo para ${announcement.eventTime.toISOString()}.`,
          href: '/dashboard/admin/announcements',
          priority: 'medium',
          createdAt: announcement.eventTime,
        })),
      }, meetingDay, resolvedSet),
      this.buildSection({
        key: 'next-actions',
        title: 'Acoes ate proxima reuniao',
        description: 'Lista curta para sair da call com dono e proximo clique.',
        href: '/dashboard/staff',
        priority: day.urgentTasks.length > 0 ? 'high' : 'low',
        tasks: day.urgentTasks.slice(0, 8),
      }, meetingDay, resolvedSet),
    ];
    const markdown = this.buildMarkdown(meetingDay, sections);

    return {
      ...day,
      reviewAuctions,
      votingInterests: votingInterestRows,
      openEventRows: openEvents,
      meetingDay,
      sections,
      resolvedItemKeys,
      markdown,
    };
  }

  async resolveMeetingItem(itemKey: string, actorId: string, body: { title?: string; type?: string; href?: string }): Promise<void> {
    const metadata: Prisma.InputJsonObject = {
      title: body.title?.slice(0, 180) ?? 'Item de reuniao',
      type: body.type?.slice(0, 80) ?? 'MEETING_ITEM',
      href: body.href?.slice(0, 240) ?? '/dashboard/staff/meeting',
    };

    await this.auditService.log({
      actorId,
      action: 'STAFF_MEETING_ITEM_RESOLVED',
      targetType: 'StaffMeetingItem',
      targetId: itemKey,
      metadata,
    });
  }

  private buildSection(
    section: {
      key: string;
      title: string;
      description: string;
      href: string;
      priority: OperationPriority;
      tasks: OperationTask[];
    },
    meetingDay: string,
    resolvedSet: Set<string>,
  ): StaffMeetingSummary['sections'][number] {
    const items = section.tasks.map((task) => {
      const meetingItemKey = `${meetingDay}:${task.type}:${task.id}`;

      return {
        ...task,
        meetingItemKey,
        resolved: resolvedSet.has(meetingItemKey),
      };
    });

    return { ...section, items };
  }

  private buildMarkdown(meetingDay: string, sections: StaffMeetingSummary['sections']): string {
    const lines = [`# Pauta Staff - ${meetingDay}`, ''];

    for (const section of sections) {
      lines.push(`## ${section.title}`);
      if (section.items.length === 0) {
        lines.push('- Nada pendente.');
      } else {
        for (const item of section.items) {
          const marker = item.resolved ? 'x' : ' ';
          lines.push(`- [${marker}] ${item.title} - ${item.description}`);
        }
      }
      lines.push('');
    }

    return lines.join('\n').trim();
  }

  private getOperationalDay(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    return year && month && day ? `${year}-${month}-${day}` : date.toISOString().slice(0, 10);
  }
}
