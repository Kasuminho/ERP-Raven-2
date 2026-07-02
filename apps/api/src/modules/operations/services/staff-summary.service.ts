import { Injectable } from '@nestjs/common';
import {
  AnnouncementStatus,
  AuctionStatus,
  CodexRequestStatus,
  DKPTransactionType,
  EventStatus,
  ItemInterestStatus,
  ProgressReviewStatus,
} from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { BusinessRulesService } from '../../business-rules/business-rules.service';
import { OperationsService } from '../operations.service';
import {
  DeploymentPanelSummary,
  OperationPriority,
  OperationTask,
  OperationalHealthSummary,
  StaffDayViewSummary,
  StaffHealthSummary,
  StaffOperationsSummary,
} from '../operations.types';

@Injectable()
export class StaffSummaryService {
  constructor(
    private readonly operations: OperationsService,
    private readonly prisma: PrismaService,
    private readonly businessRules: BusinessRulesService,
  ) {}

  async getStaffSummary(): Promise<StaffOperationsSummary> {
    const [
      reviews,
      codex,
      itemRequests,
      closedInterests,
      pendingDeliveries,
      progress,
      events,
      announcements,
    ] = await Promise.all([
      this.prisma.auction.findMany({ where: { status: AuctionStatus.PENDING_REVIEW }, orderBy: { updatedAt: 'asc' }, take: 8 }),
      this.prisma.codexRequest.findMany({
        where: { status: { in: [CodexRequestStatus.PENDING, CodexRequestStatus.NEEDS_RETRY] } },
        include: { player: true },
        orderBy: [{ queuedAt: 'asc' }, { createdAt: 'asc' }],
        take: 10,
      }),
      this.prisma.itemRequest.findMany({
        where: { remainingQuantity: { gt: 0 } },
        orderBy: [{ rankPosition: 'asc' }, { updatedAt: 'asc' }],
        take: 10,
      }),
      this.prisma.itemInterestPost.findMany({
        where: { status: { in: [ItemInterestStatus.CLOSED, ItemInterestStatus.VOTING, ItemInterestStatus.READY_FOR_DELIVERY] } },
        include: { entries: true },
        orderBy: { closedAt: 'asc' },
        take: 8,
      }),
      this.prisma.dKPTransaction.findMany({
        where: { type: DKPTransactionType.AUCTION_WIN, referenceId: { not: null }, player: { isActive: true } },
        include: { player: true },
        orderBy: { createdAt: 'asc' },
        take: 20,
      }),
      this.prisma.playerProgress.findMany({
        where: { reviewStatus: ProgressReviewStatus.PENDING },
        include: { player: true },
        orderBy: { createdAt: 'asc' },
        take: 8,
      }),
      this.prisma.event.findMany({
        where: { status: { in: [EventStatus.OPEN, EventStatus.ATTENDANCE_REGISTRATION] } },
        orderBy: { startsAt: 'asc' },
        take: 8,
      }),
      this.prisma.announcement.findMany({
        where: { status: AnnouncementStatus.ACTIVE },
        orderBy: { eventTime: 'asc' },
        take: 8,
      }),
    ]);

    const deliveredAuctionIds = new Set((await this.prisma.dropHistory.findMany({
      where: { auctionId: { not: null } },
      select: { auctionId: true },
    })).map((drop) => drop.auctionId).filter(Boolean));
    const pendingAuctionDeliveries = pendingDeliveries.filter((transaction) => transaction.referenceId && !deliveredAuctionIds.has(transaction.referenceId));
    const thresholds = await this.businessRules.getStaffPendingThresholds();

    const tasks: OperationTask[] = [
      ...reviews.map((auction) => ({
        id: auction.id,
        type: 'STAFF_REVIEW',
        title: 'Review de leilao',
        description: `${auction.itemName} precisa de aprovacao da Staff.`,
        href: '/dashboard/staff/reviews',
        priority: this.priorityByAge(auction.updatedAt, thresholds.auctionReview),
        createdAt: auction.updatedAt,
        metadata: { dueAt: new Date(auction.updatedAt.getTime() + thresholds.auctionReview.highAfterMs).toISOString() },
      })),
      ...codex.slice(0, 5).map((request) => {
        const baseDate = request.status === CodexRequestStatus.NEEDS_RETRY ? request.retryRequestedAt ?? request.updatedAt : request.queuedAt;
        const threshold = request.status === CodexRequestStatus.NEEDS_RETRY ? thresholds.codexRetry : thresholds.codexPending;
        return {
          id: request.id,
          type: 'CODEX_QUEUE',
          title: 'Codex na fila',
          description: `${request.player.nickname} aguarda envio/confirmacao de codex.`,
          href: '/dashboard/staff/codex',
          priority: this.priorityByAge(baseDate, threshold),
          createdAt: baseDate,
          metadata: { dueAt: new Date(baseDate.getTime() + threshold.highAfterMs).toISOString() },
        };
      }),
      ...itemRequests.slice(0, 5).map((request) => ({
        id: request.id,
        type: 'ITEM_REQUEST_QUEUE',
        title: 'Item Request ativo',
        description: `${request.playerName} esta na fila de ${request.itemName}. Falta ${request.remainingQuantity}/${request.totalQuantity}.`,
        href: '/dashboard/staff/deliveries',
        priority: this.priorityByAge(request.updatedAt, thresholds.itemRequest),
        createdAt: request.updatedAt,
        metadata: { dueAt: new Date(request.updatedAt.getTime() + thresholds.itemRequest.highAfterMs).toISOString() },
      })),
      ...closedInterests.map((post) => {
        const baseDate = post.closedAt ?? post.updatedAt;
        return {
          id: post.id,
          type: 'INTEREST_DELIVERY',
          title: post.status === ItemInterestStatus.READY_FOR_DELIVERY ? 'Interesse pronto para entrega' : 'Interesse aguardando voto',
          description: `${post.title} tem ${post.entries.length} interessado(s). Status: ${post.status}.`,
          href: '/dashboard/staff/interests',
          priority: this.priorityByAge(baseDate, thresholds.interestDelivery),
          createdAt: baseDate,
          metadata: { dueAt: new Date(baseDate.getTime() + thresholds.interestDelivery.highAfterMs).toISOString() },
        };
      }),
      ...pendingAuctionDeliveries.slice(0, 5).map((transaction) => ({
        id: transaction.id,
        type: 'DROP_DELIVERY',
        title: 'Entrega de leilao pendente',
        description: `${transaction.player.nickname} tem drop de leilao para registrar com prova.`,
        href: '/dashboard/staff/deliveries',
        priority: this.priorityByAge(transaction.createdAt, thresholds.auctionDropDelivery),
        createdAt: transaction.createdAt,
        metadata: { dueAt: new Date(transaction.createdAt.getTime() + thresholds.auctionDropDelivery.highAfterMs).toISOString() },
      })),
      ...progress.map((row) => ({
        id: row.id,
        type: 'PROGRESS_REVIEW',
        title: 'Validar progresso',
        description: `${row.player.nickname} enviou ${row.category} para aprovacao.`,
        href: '/dashboard/staff/progress',
        priority: this.priorityByAge(row.createdAt, thresholds.progressReview),
        createdAt: row.createdAt,
        metadata: { dueAt: new Date(row.createdAt.getTime() + thresholds.progressReview.highAfterMs).toISOString() },
      })),
      ...events.map((event) => ({
        id: event.id,
        type: 'EVENT_ATTENDANCE',
        title: 'Evento aberto',
        description: `${event.name} precisa de presenca/finalizacao.`,
        href: '/dashboard/admin/events',
        priority: this.priorityByAge(event.startsAt, thresholds.eventFinalization),
        createdAt: event.startsAt,
        metadata: { dueAt: new Date(event.startsAt.getTime() + thresholds.eventFinalization.highAfterMs).toISOString() },
      })),
    ];

    return {
      tasks: this.sortTasks(tasks).slice(0, 16),
      counts: {
        reviews: reviews.length,
        codex: codex.length,
        itemRequests: itemRequests.length,
        interests: closedInterests.length,
        deliveries: pendingAuctionDeliveries.length,
        progress: progress.length,
        events: events.length,
        announcements: announcements.length,
      },
    };
  }

  getStaffHealth(): Promise<StaffHealthSummary> {
    return this.operations.getStaffHealth();
  }

  getOperationalHealth(): Promise<OperationalHealthSummary> {
    return this.operations.getOperationalHealth();
  }

  getDeploymentPanel(): Promise<DeploymentPanelSummary> {
    return this.operations.getDeploymentPanel();
  }

  async getStaffDayView(): Promise<StaffDayViewSummary> {
    const staff = await this.getStaffSummary();
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const [todaysAnnouncements, openEvents, pendingProgressReviews] = await Promise.all([
      this.prisma.announcement.count({
        where: { status: AnnouncementStatus.ACTIVE, eventTime: { gte: start, lt: end } },
      }),
      this.prisma.event.count({
        where: { status: { in: [EventStatus.OPEN, EventStatus.ATTENDANCE_REGISTRATION] }, startsAt: { gte: start, lt: end } },
      }),
      this.prisma.playerProgress.count({ where: { reviewStatus: ProgressReviewStatus.PENDING } }),
    ]);

    return {
      generatedAt: now,
      todaysAnnouncements,
      openEvents,
      pendingStaffVotes: staff.counts.reviews + staff.counts.interests,
      pendingDeliveries: staff.counts.deliveries,
      pendingProgressReviews,
      urgentTasks: staff.tasks.filter((task) => task.priority !== 'low').slice(0, 10),
    };
  }

  private sortTasks(tasks: OperationTask[]): OperationTask[] {
    const weight = { high: 0, medium: 1, low: 2 };
    return [...tasks].sort((left, right) => {
      const priority = weight[left.priority] - weight[right.priority];
      if (priority !== 0) return priority;
      return new Date(left.createdAt ?? 0).getTime() - new Date(right.createdAt ?? 0).getTime();
    });
  }

  private priorityByAge(date: Date, threshold: { mediumAfterMs: number; highAfterMs: number }): OperationPriority {
    const ageMs = Date.now() - date.getTime();
    if (ageMs >= threshold.highAfterMs) return 'high';
    if (ageMs >= threshold.mediumAfterMs) return 'medium';
    return 'low';
  }
}
