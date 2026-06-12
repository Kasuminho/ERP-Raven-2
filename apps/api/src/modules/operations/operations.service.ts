import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AnnouncementStatus,
  AuctionStatus,
  CodexRequestStatus,
  EventStatus,
  ItemInterestStatus,
  ProgressReviewStatus,
} from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { PlayerOperationsSummary, StaffHealthSummary, StaffOperationsSummary, OperationPriority, OperationTask } from './operations.types';
import { SeasonMonthlySummary, StaffDayViewSummary } from './operations.types';

type PriorityThreshold = {
  mediumAfterMs: number;
  highAfterMs: number;
};

const HOURS = 60 * 60 * 1000;
const DAYS = 24 * HOURS;

const STAFF_PENDING_THRESHOLDS = {
  auctionReview: { mediumAfterMs: 3 * DAYS, highAfterMs: 5 * DAYS },
  auctionDropDelivery: { mediumAfterMs: 10 * HOURS, highAfterMs: 1 * DAYS },
  codexPending: { mediumAfterMs: 15 * DAYS, highAfterMs: 25 * DAYS },
  codexRetry: { mediumAfterMs: 20 * DAYS, highAfterMs: 30 * DAYS },
  interestDelivery: { mediumAfterMs: 10 * HOURS, highAfterMs: 1 * DAYS },
  progressReview: { mediumAfterMs: 2 * DAYS, highAfterMs: 3 * DAYS },
  eventFinalization: { mediumAfterMs: 10 * HOURS, highAfterMs: 20 * HOURS },
  itemRequest: { mediumAfterMs: 2 * DAYS, highAfterMs: 5 * DAYS },
} satisfies Record<string, PriorityThreshold>;

@Injectable()
export class OperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getPlayerSummary(userId: string): Promise<PlayerOperationsSummary> {
    const player = await this.prisma.player.findFirst({
      where: { userId, isActive: true },
      orderBy: { joinedAt: 'asc' },
    });

    if (!player) {
      return { tasks: [], counts: { urgent: 0, bids: 0, requests: 0, codex: 0, interests: 0, progress: 0 } };
    }

    const [requests, codexRequests, bids, openInterests, myInterestEntries, progress] = await Promise.all([
      this.prisma.itemRequest.findMany({
        where: { playerId: player.id, remainingQuantity: { gt: 0 } },
        orderBy: [{ rankPosition: 'asc' }, { updatedAt: 'asc' }],
        take: 8,
      }),
      this.prisma.codexRequest.findMany({
        where: {
          playerId: player.id,
          status: { in: [CodexRequestStatus.PENDING, CodexRequestStatus.NEEDS_RETRY, CodexRequestStatus.SENT] },
        },
        orderBy: [{ queuedAt: 'asc' }, { createdAt: 'asc' }],
        take: 8,
      }),
      this.prisma.auctionBid.findMany({
        where: {
          playerId: player.id,
          isValid: true,
          auction: { status: { in: [AuctionStatus.OPEN, AuctionStatus.PENDING_REVIEW] } },
        },
        include: { auction: true },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.itemInterestPost.findMany({
        where: { status: ItemInterestStatus.OPEN, closesAt: { gt: new Date() } },
        include: { itemCatalog: true },
        orderBy: { closesAt: 'asc' },
        take: 12,
      }),
      this.prisma.itemInterestEntry.findMany({
        where: { playerId: player.id, post: { status: ItemInterestStatus.OPEN } },
        select: { postId: true },
      }),
      this.prisma.playerProgress.findMany({
        where: { playerId: player.id, reviewStatus: ProgressReviewStatus.PENDING },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const declaredInterestIds = new Set(myInterestEntries.map((entry) => entry.postId));
    const tasks: OperationTask[] = [];

    for (const request of requests) {
      if (request.rankPosition === 1 && (request.warned3d || request.warned4d)) {
        tasks.push({
          id: request.id,
          type: 'ITEM_REQUEST_UPDATE',
          title: 'Atualizar Item Request',
          description: `${request.itemName} precisa de um print novo para manter sua posicao no ranking.`,
          href: '/dashboard/item-requests',
          priority: request.warned4d ? 'high' : 'medium',
          createdAt: request.updatedAt,
        });
      }
    }

    for (const request of codexRequests) {
      if (request.status === CodexRequestStatus.SENT) {
        tasks.push({
          id: request.id,
          type: 'CODEX_CONFIRMATION',
          title: 'Confirmar Codex',
          description: 'A Staff marcou o codex como enviado. Confirme se deu certo ou peça retry se quebrou.',
          href: '/dashboard/codex',
          priority: 'high',
          createdAt: request.sentAt ?? request.updatedAt,
        });
      }
    }

    for (const bid of bids) {
      tasks.push({
        id: bid.id,
        type: 'AUCTION_BID',
        title: 'Bid em andamento',
        description: `${bid.auction.itemName} esta ${bid.auction.status}. Seu bid atual: ${bid.bidAmount} DKP.`,
        href: `/dashboard/auctions/${bid.auctionId}`,
        priority: bid.auction.status === AuctionStatus.PENDING_REVIEW ? 'medium' : 'low',
        createdAt: bid.createdAt,
        metadata: {
          itemName: bid.auction.itemName,
          status: bid.auction.status,
          bidAmount: bid.bidAmount,
        },
      });
    }

    for (const post of openInterests.filter((post) => !declaredInterestIds.has(post.id)).slice(0, 5)) {
      tasks.push({
        id: post.id,
        type: 'OPEN_INTEREST',
        title: 'Interesse aberto',
        description: `${post.title} fecha em ${post.closesAt.toLocaleString('pt-BR')}.`,
        href: '/dashboard/interests',
        priority: post.closesAt.getTime() - Date.now() < 6 * 60 * 60 * 1000 ? 'medium' : 'low',
        createdAt: post.createdAt,
        metadata: {
          title: post.title,
          closesAt: post.closesAt.toISOString(),
        },
      });
    }

    for (const row of progress) {
      tasks.push({
        id: row.id,
        type: 'PROGRESS_REVIEW',
        title: 'Progresso aguardando review',
        description: `${row.category} esta pendente de validacao da Staff.`,
        href: '/dashboard/profile',
        priority: 'low',
        createdAt: row.createdAt,
        metadata: {
          category: row.category,
        },
      });
    }

    return {
      tasks: this.sortTasks(tasks).slice(0, 12),
      counts: {
        urgent: tasks.filter((task) => task.priority === 'high').length,
        bids: bids.length,
        requests: requests.length,
        codex: codexRequests.length,
        interests: openInterests.filter((post) => !declaredInterestIds.has(post.id)).length,
        progress: progress.length,
      },
    };
  }

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
        where: { status: { in: [CodexRequestStatus.PENDING, CodexRequestStatus.NEEDS_RETRY, CodexRequestStatus.SENT] } },
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
        where: { type: 'AUCTION_WIN', referenceId: { not: null }, player: { isActive: true } },
        include: {
          player: true,
        },
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

    const tasks: OperationTask[] = [
      ...reviews.map((auction) => ({
        id: auction.id,
        type: 'STAFF_REVIEW',
        title: 'Review de leilao',
        description: `${auction.itemName} precisa de aprovacao da Staff.`,
        href: '/dashboard/staff/reviews',
        priority: this.priorityByAge(auction.updatedAt, STAFF_PENDING_THRESHOLDS.auctionReview),
        createdAt: auction.updatedAt,
      })),
      ...codex.slice(0, 5).map((request) => ({
        id: request.id,
        type: 'CODEX_QUEUE',
        title: 'Codex na fila',
        description: `${request.player.nickname} aguarda envio/confirmacao de codex.`,
        href: '/dashboard/staff/codex',
        priority: request.status === CodexRequestStatus.NEEDS_RETRY
          ? this.priorityByAge(request.retryRequestedAt ?? request.updatedAt, STAFF_PENDING_THRESHOLDS.codexRetry)
          : this.priorityByAge(request.queuedAt, STAFF_PENDING_THRESHOLDS.codexPending),
        createdAt: request.status === CodexRequestStatus.NEEDS_RETRY ? request.retryRequestedAt ?? request.updatedAt : request.queuedAt,
      })),
      ...itemRequests.slice(0, 5).map((request) => ({
        id: request.id,
        type: 'ITEM_REQUEST_QUEUE',
        title: 'Item Request ativo',
        description: `${request.playerName} esta na fila de ${request.itemName}. Falta ${request.remainingQuantity}/${request.totalQuantity}.`,
        href: '/dashboard/staff/deliveries',
        priority: this.priorityByAge(request.updatedAt, STAFF_PENDING_THRESHOLDS.itemRequest),
        createdAt: request.updatedAt,
      })),
      ...closedInterests.map((post) => ({
        id: post.id,
        type: 'INTEREST_DELIVERY',
        title: post.status === ItemInterestStatus.READY_FOR_DELIVERY ? 'Interesse pronto para entrega' : 'Interesse aguardando voto',
        description: `${post.title} tem ${post.entries.length} interessado(s). Status: ${post.status}.`,
        href: '/dashboard/staff/interests',
        priority: this.priorityByAge(post.closedAt ?? post.updatedAt, STAFF_PENDING_THRESHOLDS.interestDelivery),
        createdAt: post.closedAt ?? post.updatedAt,
      })),
      ...pendingAuctionDeliveries.slice(0, 5).map((transaction) => ({
        id: transaction.id,
        type: 'DROP_DELIVERY',
        title: 'Entrega de leilao pendente',
        description: `${transaction.player.nickname} tem drop de leilao para registrar com prova.`,
        href: '/dashboard/staff/deliveries',
        priority: this.priorityByAge(transaction.createdAt, STAFF_PENDING_THRESHOLDS.auctionDropDelivery),
        createdAt: transaction.createdAt,
      })),
      ...progress.map((row) => ({
        id: row.id,
        type: 'PROGRESS_REVIEW',
        title: 'Validar progresso',
        description: `${row.player.nickname} enviou ${row.category} para aprovacao.`,
        href: '/dashboard/staff/progress',
        priority: this.priorityByAge(row.createdAt, STAFF_PENDING_THRESHOLDS.progressReview),
        createdAt: row.createdAt,
      })),
      ...events.map((event) => ({
        id: event.id,
        type: 'EVENT_ATTENDANCE',
        title: 'Evento aberto',
        description: `${event.name} precisa de presenca/finalizacao.`,
        href: '/dashboard/admin/events',
        priority: this.priorityByAge(event.startsAt, STAFF_PENDING_THRESHOLDS.eventFinalization),
        createdAt: event.startsAt,
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

  async getStaffHealth(): Promise<StaffHealthSummary> {
    let dbReady = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbReady = true;
    } catch {
      dbReady = false;
    }

    const webhookKeys = [
      'announcements',
      'auctions',
      'drops',
      'attendance',
      'staffReview',
      'dkp',
      'interests',
      'itemRequests',
      'staffRequests',
    ];
    const configuredWebhooks = webhookKeys.filter((key) => Boolean(this.config.get<string>(`discord.webhooks.${key}`)?.trim()));
    const driveProvider = this.config.get<string>('IMAGE_STORAGE_PROVIDER') ?? 'local';
    const driveReady = driveProvider !== 'google_drive'
      || Boolean(this.config.get<string>('GOOGLE_DRIVE_FOLDER_ID')?.trim() && this.config.get<string>('GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON')?.trim());

    return {
      generatedAt: new Date(),
      checks: [
        { key: 'database', label: 'PostgreSQL', ready: dbReady, detail: dbReady ? 'Conexao respondendo.' : 'Falha ao consultar o banco.' },
        {
          key: 'google-drive',
          label: 'Google Drive',
          ready: driveReady,
          detail: driveProvider === 'google_drive' ? 'Provider Google Drive configurado.' : 'Provider local ativo.',
        },
        {
          key: 'discord-webhooks',
          label: 'Discord Webhooks',
          ready: configuredWebhooks.length >= 6,
          detail: `${configuredWebhooks.length}/${webhookKeys.length} webhooks configurados.`,
        },
        {
          key: 'automation',
          label: 'Automacao',
          ready: true,
          detail: 'Cron interno do Nest habilitado no modulo Automation.',
        },
      ],
    };
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

  async getSeasonSummary(month = new Date().toISOString().slice(0, 7)): Promise<SeasonMonthlySummary> {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      month = new Date().toISOString().slice(0, 7);
    }

    const [year, monthIndex] = month.split('-').map(Number);
    const start = new Date(Date.UTC(year, monthIndex - 1, 1));
    const end = new Date(Date.UTC(year, monthIndex, 1));

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

    const byPlayer = new Map<string, { playerId: string; nickname: string; dkpDelta: number; attendanceCount: number; dropsCount: number; daoshiApprovedCents: number }>();
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
      month,
      dkpEarned: transactions.filter((row) => row.amount > 0).reduce((sum, row) => sum + row.amount, 0),
      dkpSpent: Math.abs(transactions.filter((row) => row.amount < 0).reduce((sum, row) => sum + row.amount, 0)),
      attendanceEvents: new Set(attendances.map((row) => row.eventId)).size,
      dropsDelivered: drops.length,
      daoshiApprovedCents: daoshiReceipts.reduce((sum, row) => sum + (row.approvedCents ?? 0), 0),
      itemRequestsDelivered,
      topPlayers: [...byPlayer.values()]
        .sort((a, b) => (b.dkpDelta + b.attendanceCount * 50 + b.dropsCount * 25 + b.daoshiApprovedCents / 1000) - (a.dkpDelta + a.attendanceCount * 50 + a.dropsCount * 25 + a.daoshiApprovedCents / 1000))
        .slice(0, 15),
    };
  }

  async getRecentAudit(limit = 25) {
    return this.prisma.auditLog.findMany({
      include: {
        actor: {
          select: {
            id: true,
            discordUsername: true,
            discordNickname: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });
  }

  private sortTasks(tasks: OperationTask[]): OperationTask[] {
    const weight = { high: 0, medium: 1, low: 2 };
    return [...tasks].sort((left, right) => {
      const priority = weight[left.priority] - weight[right.priority];
      if (priority !== 0) return priority;
      return new Date(left.createdAt ?? 0).getTime() - new Date(right.createdAt ?? 0).getTime();
    });
  }

  private priorityByAge(date: Date, threshold: PriorityThreshold): OperationPriority {
    const ageMs = Date.now() - date.getTime();
    if (ageMs >= threshold.highAfterMs) return 'high';
    if (ageMs >= threshold.mediumAfterMs) return 'medium';
    return 'low';
  }
}
