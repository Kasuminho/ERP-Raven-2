import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  AnnouncementStatus,
  AuctionStatus,
  AuctionMode,
  CodexRequestStatus,
  DKPTransactionType,
  EventStatus,
  ItemTier,
  ItemInterestStatus,
  ProgressReviewStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { BusinessRulesService } from '../business-rules/business-rules.service';
import { bilingualBlocks, pickVoiceLine } from '../discord/bot/embeds/webhook-voice';
import { NotificationService } from '../discord/services/notification.service';
import { StaffHealthSummary, StaffOperationsSummary, StaffMorningBriefing, OperationPriority, OperationTask } from './operations.types';
import {
  AuctionDiagnosticOption,
  AuctionDiagnosticSummary,
  AuctionDossier,
  AuctionFinalizationPreview,
  AuctionTimelineEvent,
  IntegrityIssue,
  IntegritySummary,
} from './operations.types';
import { SeasonMonthlySummary, StaffDayViewSummary, WeeklyGuildSummary } from './operations.types';
import {
  DeploymentPanelSummary,
  LegacyAuditSummary,
  OperationalHealthSummary,
  StaffMeetingSummary,
  UniversalDossier,
  UniversalDossierType,
} from './operations.types';

type PriorityThreshold = {
  mediumAfterMs: number;
  highAfterMs: number;
};

const HOURS = 60 * 60 * 1000;
const DAYS = 24 * HOURS;
const AUCTION_RELIST_DELAY_DAYS = 7;
const PUBLIC_SMOKE_PATHS = ['/health', '/auctions/health', '/items/health', '/eligibility/health', '/audit/health'];
const DEPLOYMENT_ACTIONS_URL = 'https://github.com/Kasuminho/ERP-Raven-2/actions/workflows/docker-images.yml';

@Injectable()
export class OperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly businessRules: BusinessRulesService,
    private readonly discordNotifications: NotificationService,
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
      ...codex.slice(0, 5).map((request) => ({
        id: request.id,
        type: 'CODEX_QUEUE',
        title: 'Codex na fila',
        description: `${request.player.nickname} aguarda envio/confirmacao de codex.`,
        href: '/dashboard/staff/codex',
        priority: request.status === CodexRequestStatus.NEEDS_RETRY
          ? this.priorityByAge(request.retryRequestedAt ?? request.updatedAt, thresholds.codexRetry)
          : this.priorityByAge(request.queuedAt, thresholds.codexPending),
        createdAt: request.status === CodexRequestStatus.NEEDS_RETRY ? request.retryRequestedAt ?? request.updatedAt : request.queuedAt,
        metadata: {
          dueAt: new Date((request.status === CodexRequestStatus.NEEDS_RETRY ? request.retryRequestedAt ?? request.updatedAt : request.queuedAt).getTime()
            + (request.status === CodexRequestStatus.NEEDS_RETRY ? thresholds.codexRetry.highAfterMs : thresholds.codexPending.highAfterMs)).toISOString(),
        },
      })),
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
      ...closedInterests.map((post) => ({
        id: post.id,
        type: 'INTEREST_DELIVERY',
        title: post.status === ItemInterestStatus.READY_FOR_DELIVERY ? 'Interesse pronto para entrega' : 'Interesse aguardando voto',
        description: `${post.title} tem ${post.entries.length} interessado(s). Status: ${post.status}.`,
        href: '/dashboard/staff/interests',
        priority: this.priorityByAge(post.closedAt ?? post.updatedAt, thresholds.interestDelivery),
        createdAt: post.closedAt ?? post.updatedAt,
        metadata: { dueAt: new Date((post.closedAt ?? post.updatedAt).getTime() + thresholds.interestDelivery.highAfterMs).toISOString() },
      })),
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

  async getDeploymentPanel(): Promise<DeploymentPanelSummary> {
    const generatedAt = new Date();
    const [privateHealth, publicHealth, expectedVersion, publicSmoke, latestStaffChangelog] = await Promise.all([
      this.getStaffHealth(),
      this.checkPublicApiHealth(),
      this.getExpectedDeploymentVersion(),
      this.runPublicSmoke(),
      this.getLatestStaffChangelog(),
    ]);
    const currentApiVersion = process.env.APP_VERSION ?? 'development';

    return {
      generatedAt,
      currentApiVersion,
      expectedVersion: {
        ...expectedVersion,
        matchesCurrent: expectedVersion.shortSha && currentApiVersion !== 'development'
          ? currentApiVersion.startsWith(expectedVersion.shortSha)
          : expectedVersion.sha
            ? false
            : null,
      },
      publicHealth,
      privateHealth,
      publicSmoke,
      latestStaffChangelog,
      protocol: this.buildDeploymentProtocol(currentApiVersion, expectedVersion.sha, publicHealth.status, publicSmoke.status, latestStaffChangelog.source),
      actionsUrl: DEPLOYMENT_ACTIONS_URL,
    };
  }

  async getStaffMorningBriefing(): Promise<StaffMorningBriefing> {
    const now = new Date();
    const next24h = new Date(now.getTime() + DAYS);
    const [staff, health, integrity, expiredOpenAuctions, endingAuctions] = await Promise.all([
      this.getStaffSummary(),
      this.getStaffHealth(),
      this.getIntegritySummary(),
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
    const backupCheck = await this.getStaffBackupHealthCheck();

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
        backupCheck,
      ],
    };
  }

  async getOperationalHealth(): Promise<OperationalHealthSummary> {
    const base = await this.getStaffHealth();
    const since = new Date(Date.now() - 24 * HOURS);
    const [failures, latestFailure, latestAutomation, activeAnnouncements, pendingTasks] = await Promise.all([
      this.prisma.auditLog.count({ where: { action: { contains: 'FAILED' }, createdAt: { gte: since } } }),
      this.prisma.auditLog.findFirst({ where: { action: { contains: 'FAILED' } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.auditLog.findFirst({ where: { action: { contains: 'AUTOMATION' } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.announcement.count({ where: { status: AnnouncementStatus.ACTIVE } }),
      this.getStaffSummary(),
    ]);

    return {
      ...base,
      discordFailures24h: failures,
      latestAutomationAudit: latestAutomation?.createdAt ?? null,
      latestDiscordFailure: latestFailure?.createdAt ?? null,
      activeAnnouncements,
      pendingQueueApproximation: pendingTasks.tasks.length,
    };
  }

  async getIntegritySummary(): Promise<IntegritySummary> {
    const now = new Date();
    const oldCodexDate = new Date(now.getTime() - 7 * DAYS);
    const [
      validBids,
      activeLocks,
      expiredOpenAuctions,
      staleSentCodex,
      finalizedEvents,
      eventTransactions,
      incompletePlayers,
      codexImageDeleteFailures,
    ] = await Promise.all([
      this.prisma.auctionBid.findMany({
        where: {
          isValid: true,
          auction: { status: { in: [AuctionStatus.OPEN, AuctionStatus.PENDING_REVIEW] } },
        },
        include: { auction: { select: { id: true, itemName: true, status: true } }, player: { select: { nickname: true } } },
        take: 500,
      }),
      this.prisma.dKPLock.findMany({
        where: {
          released: false,
          auction: { status: { in: [AuctionStatus.OPEN, AuctionStatus.PENDING_REVIEW] } },
        },
        include: { auction: { select: { id: true, itemName: true, status: true } }, player: { select: { nickname: true } } },
        take: 500,
      }),
      this.prisma.auction.findMany({
        where: { status: AuctionStatus.OPEN, endsAt: { lt: now } },
        orderBy: { endsAt: 'asc' },
        take: 50,
      }),
      this.prisma.codexRequest.findMany({
        where: { status: CodexRequestStatus.SENT, sentAt: { lt: oldCodexDate } },
        include: { player: { select: { nickname: true } } },
        orderBy: { sentAt: 'asc' },
        take: 50,
      }),
      this.prisma.event.findMany({
        where: { status: EventStatus.FINALIZED },
        select: { id: true, name: true, finalizedAt: true },
        orderBy: { finalizedAt: 'desc' },
        take: 200,
      }),
      this.prisma.dKPTransaction.findMany({
        where: { type: DKPTransactionType.EVENT_REWARD, referenceId: { not: null } },
        select: { referenceId: true },
        take: 1000,
      }),
      this.prisma.player.findMany({
        where: {
          isActive: true,
          OR: [
            { nickname: { equals: '' } },
            { dimensionalLayer: { lt: 1 } },
          ],
        },
        select: { id: true, nickname: true, dimensionalLayer: true, userId: true },
        take: 50,
      }),
      this.prisma.auditLog.findMany({
        where: {
          action: 'CODEX_REQUEST_IMAGE_DELETE_FAILED',
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    const lockByBidKey = new Set(activeLocks.map((lock) => `${lock.auctionId}:${lock.playerId}`));
    const bidByLockKey = new Set(validBids.map((bid) => `${bid.auctionId}:${bid.playerId}`));
    const eventIdsWithTransactions = new Set(eventTransactions.map((transaction) => transaction.referenceId).filter(Boolean));
    const issues: IntegrityIssue[] = [];

    for (const bid of validBids.filter((bid) => !lockByBidKey.has(`${bid.auctionId}:${bid.playerId}`)).slice(0, 50)) {
      issues.push({
        id: `bid-lock-${bid.id}`,
        type: 'BID_WITHOUT_LOCK',
        severity: 'high',
        title: 'Bid valido sem lock',
        description: `${bid.player.nickname} tem bid valido em ${bid.auction.itemName}, mas sem DKP travado.`,
        href: `/dashboard/auctions/${bid.auctionId}`,
        createdAt: bid.createdAt,
        metadata: { auctionId: bid.auctionId, playerId: bid.playerId, bidId: bid.id },
      });
    }

    for (const lock of activeLocks.filter((lock) => !bidByLockKey.has(`${lock.auctionId}:${lock.playerId}`)).slice(0, 50)) {
      issues.push({
        id: `lock-bid-${lock.id}`,
        type: 'LOCK_WITHOUT_BID',
        severity: 'high',
        title: 'Lock ativo sem bid valido',
        description: `${lock.player.nickname} tem ${lock.amount} DKP travado em ${lock.auction.itemName}, mas sem bid valido.`,
        href: `/dashboard/auctions/${lock.auctionId}`,
        createdAt: lock.createdAt,
        metadata: { auctionId: lock.auctionId, playerId: lock.playerId, lockId: lock.id },
      });
    }

    for (const auction of expiredOpenAuctions) {
      issues.push({
        id: `expired-auction-${auction.id}`,
        type: 'EXPIRED_OPEN_AUCTION',
        severity: 'medium',
        title: 'Leilao aberto vencido',
        description: `${auction.itemName} passou do horario de fechamento e ainda esta OPEN.`,
        href: `/dashboard/auctions/${auction.id}`,
        createdAt: auction.endsAt,
        metadata: { auctionId: auction.id, endsAt: auction.endsAt.toISOString() },
      });
    }

    for (const request of staleSentCodex) {
      issues.push({
        id: `codex-sent-${request.id}`,
        type: 'STALE_SENT_CODEX',
        severity: 'medium',
        title: 'Codex enviado sem confirmacao',
        description: `${request.player.nickname} tem codex enviado ha mais de 7 dias sem confirmar ou pedir retry.`,
        href: '/dashboard/staff/codex',
        createdAt: request.sentAt ?? request.updatedAt,
        metadata: { codexRequestId: request.id, playerId: request.playerId },
      });
    }

    for (const event of finalizedEvents.filter((event) => !eventIdsWithTransactions.has(event.id)).slice(0, 50)) {
      issues.push({
        id: `event-dkp-${event.id}`,
        type: 'FINALIZED_EVENT_WITHOUT_DKP',
        severity: 'high',
        title: 'Evento finalizado sem DKP',
        description: `${event.name} esta finalizado, mas nao encontrei transacao EVENT_REWARD vinculada.`,
        href: '/dashboard/admin/events',
        createdAt: event.finalizedAt ?? undefined,
        metadata: { eventId: event.id },
      });
    }

    for (const player of incompletePlayers) {
      issues.push({
        id: `player-incomplete-${player.id}`,
        type: 'INCOMPLETE_PLAYER_PROFILE',
        severity: 'low',
        title: 'Player com perfil incompleto',
        description: `${player.nickname || player.id} precisa revisar dados operacionais do perfil.`,
        href: `/dashboard/staff/item-audit?discordId=${player.userId ?? ''}`,
        metadata: { playerId: player.id, dimensionalLayer: player.dimensionalLayer },
      });
    }

    for (const log of codexImageDeleteFailures) {
      issues.push({
        id: `codex-image-${log.id}`,
        type: 'CONFIRMED_CODEX_IMAGE_PRESENT',
        severity: 'low',
        title: 'Falha ao limpar imagem de codex',
        description: 'Houve falha auditada ao tentar remover imagem/prova de codex no Google Drive.',
        href: '/dashboard/staff/codex',
        createdAt: log.createdAt,
        metadata: { auditLogId: log.id, targetId: log.targetId, metadata: log.metadata },
      });
    }

    const ordered = issues.sort((left, right) => {
      const weight = { high: 0, medium: 1, low: 2 };
      return weight[left.severity] - weight[right.severity]
        || new Date(left.createdAt ?? 0).getTime() - new Date(right.createdAt ?? 0).getTime();
    }).slice(0, 150);

    return {
      generatedAt: now,
      counts: {
        high: ordered.filter((issue) => issue.severity === 'high').length,
        medium: ordered.filter((issue) => issue.severity === 'medium').length,
        low: ordered.filter((issue) => issue.severity === 'low').length,
        total: ordered.length,
      },
      issues: ordered,
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
      const score = player.dkpDelta + player.attendanceCount * 50 + player.dropsCount * 25 + player.daoshiApprovedCents / 1000;
      return `${index + 1}. ${player.nickname} - score ${Math.round(score)} | DKP ${player.dkpDelta} | presencas ${player.attendanceCount} | drops ${player.dropsCount}`;
    });
    const topPlayersEn = summary.topPlayers.slice(0, 5).map((player, index) => {
      const score = player.dkpDelta + player.attendanceCount * 50 + player.dropsCount * 25 + player.daoshiApprovedCents / 1000;
      return `${index + 1}. ${player.nickname} - score ${Math.round(score)} | DKP ${player.dkpDelta} | attendance ${player.attendanceCount} | drops ${player.dropsCount}`;
    });
    const staff = await this.getStaffSummary();
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
          'Aristolfo fechou a semana no extrato. Se a planilha chiar, e ego com ping alto.',
          'Resumo semanal carimbado. Numero bateu antes do chat abrir campeonato de teoria.',
          'Aristolfo nao passou pano; passou scanner. O saldo saiu sem filtro de fanfic.',
          'Semana quitada no registro. Duvida nova pega senha e espera sem furar fila.',
        ], summary.weekStart, summary.weekEnd, summary.dkpEarned, summary.dropsDelivered),
        en: pickVoiceLine([
          'Aristolfo closed the week on the ledger. If the spreadsheet squeaks, that is ego with high ping.',
          'Weekly summary stamped. The numbers matched before chat opened the theory tournament.',
          'Aristolfo did not gloss over it; he scanned it. The balance left without fanfic filters.',
          'Week settled in the record. Any new doubt gets a number and waits its turn.',
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

  async getStaffMeetingSummary(): Promise<StaffMeetingSummary> {
    const [day, reviewAuctions, votingInterests, openEvents] = await Promise.all([
      this.getStaffDayView(),
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
    ]);

    return {
      ...day,
      reviewAuctions,
      votingInterests: votingInterests.map((post) => ({ ...post, entries: post.entries.length })),
      openEventRows: openEvents,
      meetingDay: new Date().toISOString().slice(0, 10),
      sections: [],
      resolvedItemKeys: [],
      markdown: '# Pauta Staff\n\nEndpoint legado sem secoes enriquecidas.',
    };
  }

  async getLegacyAudit(): Promise<LegacyAuditSummary> {
    const [unlinkedDrops, unlinkedRequests, itemsWithoutTier, itemsWithoutType, inactiveItems, recentUnlinkedDrops, recentUnlinkedRequests] = await Promise.all([
      this.prisma.dropHistory.count({ where: { playerId: null } }),
      this.prisma.itemRequest.count({ where: { playerId: null } }),
      this.prisma.itemCatalog.count({ where: { itemTier: null } }),
      this.prisma.itemCatalog.count({ where: { itemType: null } }),
      this.prisma.itemCatalog.count({ where: { isActive: false } }),
      this.prisma.dropHistory.findMany({
        where: { playerId: null },
        select: { id: true, discordId: true, nicknameIngame: true, itemName: true, deliveredAt: true },
        orderBy: { deliveredAt: 'desc' },
        take: 20,
      }),
      this.prisma.itemRequest.findMany({
        where: { playerId: null },
        select: { id: true, discordId: true, playerName: true, itemName: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
    ]);

    return { generatedAt: new Date(), unlinkedDrops, unlinkedRequests, itemsWithoutTier, itemsWithoutType, inactiveItems, recentUnlinkedDrops, recentUnlinkedRequests };
  }

  async getAuctionDiagnosticOptions(): Promise<AuctionDiagnosticOption[]> {
    const auctions = await this.prisma.auction.findMany({
      select: {
        id: true,
        itemName: true,
        endsAt: true,
      },
      orderBy: { endsAt: 'desc' },
      take: 100,
    });

    const auctionIds = auctions.map((auction) => auction.id);
    const wins = auctionIds.length
      ? await this.prisma.dKPTransaction.findMany({
          where: {
            type: DKPTransactionType.AUCTION_WIN,
            referenceId: { in: auctionIds },
          },
          include: {
            player: {
              select: {
                nickname: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];
    const winnerByAuctionId = new Map(wins.map((win) => [win.referenceId, win.player.nickname]));

    return auctions.map((auction) => ({
      id: auction.id,
      itemName: auction.itemName,
      winnerName: winnerByAuctionId.get(auction.id) ?? null,
      endedAt: auction.endsAt,
    }));
  }

  async getAuctionTimeline(auctionId: string): Promise<AuctionTimelineEvent[]> {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        createdBy: {
          select: {
            discordUsername: true,
            discordNickname: true,
          },
        },
        bids: {
          include: {
            player: {
              select: {
                id: true,
                nickname: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        dkpLocks: {
          include: {
            player: {
              select: {
                id: true,
                nickname: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        bidCancellationRequests: {
          include: {
            player: {
              select: {
                id: true,
                nickname: true,
              },
            },
            reviewedBy: {
              select: {
                discordUsername: true,
                discordNickname: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        reviewVotes: {
          include: {
            voter: {
              select: {
                discordUsername: true,
                discordNickname: true,
              },
            },
          },
          orderBy: { updatedAt: 'asc' },
        },
        bidInvalidationVotes: {
          include: {
            voter: {
              select: {
                discordUsername: true,
                discordNickname: true,
              },
            },
            bid: {
              include: {
                player: {
                  select: {
                    id: true,
                    nickname: true,
                  },
                },
              },
            },
          },
          orderBy: { updatedAt: 'asc' },
        },
        dropHistory: {
          include: {
            player: {
              select: {
                id: true,
                nickname: true,
              },
            },
          },
        },
      },
    });

    if (!auction) {
      throw new NotFoundException('Auction was not found.');
    }

    const bidIds = auction.bids.map((bid) => bid.id);
    const lockIds = auction.dkpLocks.map((lock) => lock.id);
    const cancellationIds = auction.bidCancellationRequests.map((request) => request.id);
    const relatedTargetIds = [auction.id, ...bidIds, ...lockIds, ...cancellationIds];
    const auditOr: Prisma.AuditLogWhereInput[] = [
      { targetId: { in: relatedTargetIds } },
      { metadata: { path: ['auctionId'], equals: auction.id } },
      ...bidIds.map((bidId) => ({ metadata: { path: ['bidId'], equals: bidId } })),
      ...lockIds.map((lockId) => ({ metadata: { path: ['releasedLockId'], equals: lockId } })),
    ];
    const [transactions, auditLogs] = await Promise.all([
      this.prisma.dKPTransaction.findMany({
        where: {
          referenceId: auction.id,
          type: { in: [DKPTransactionType.AUCTION_LOCK, DKPTransactionType.AUCTION_REFUND, DKPTransactionType.AUCTION_WIN] },
        },
        include: {
          player: {
            select: {
              id: true,
              nickname: true,
            },
          },
          createdBy: {
            select: {
              discordUsername: true,
              discordNickname: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.auditLog.findMany({
        where: { OR: auditOr },
        include: {
          actor: {
            select: {
              discordUsername: true,
              discordNickname: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: 120,
      }),
    ]);

    const events: AuctionTimelineEvent[] = [
      {
        id: `auction-created:${auction.id}`,
        type: 'AUCTION_CREATED',
        title: 'Leilao criado',
        description: `${auction.itemName} abriu com minimo de ${auction.minimumBid} DKP em modo ${auction.auctionMode}.`,
        occurredAt: auction.createdAt,
        tone: 'blue',
        actorName: this.userLabel(auction.createdBy),
        targetId: auction.id,
        metadata: {
          itemTier: auction.itemTier,
          itemType: auction.itemType,
          minimumLayer: auction.minimumLayer,
          requiresStaffReview: auction.requiresStaffReview,
        },
      },
      {
        id: `auction-ends:${auction.id}`,
        type: 'AUCTION_ENDS_AT',
        title: auction.endsAt <= new Date() ? 'Horario de encerramento passou' : 'Encerramento planejado',
        description: auction.endsAt <= new Date()
          ? 'O horario configurado para o fim do leilao ja passou.'
          : 'Horario planejado para a automacao avaliar o fechamento.',
        occurredAt: auction.endsAt,
        tone: auction.endsAt <= new Date() ? 'gold' : 'muted',
        targetId: auction.id,
      },
    ];

    if (auction.updatedAt.getTime() !== auction.createdAt.getTime()) {
      events.push({
        id: `auction-status:${auction.id}:${auction.updatedAt.toISOString()}`,
        type: 'AUCTION_STATUS_CURRENT',
        title: 'Estado atual do leilao',
        description: `Status atual: ${auction.status}.`,
        occurredAt: auction.updatedAt,
        tone: auction.status === AuctionStatus.FINISHED ? 'green' : auction.status === AuctionStatus.CANCELLED ? 'red' : 'gold',
        targetId: auction.id,
      });
    }

    for (const bid of auction.bids) {
      events.push({
        id: `bid:${bid.id}`,
        type: 'BID_CREATED',
        title: bid.isValid ? 'Bid registrado' : 'Bid registrado e invalidado',
        description: `${bid.player.nickname} registrou bid de ${bid.bidAmount} DKP.`,
        occurredAt: bid.createdAt,
        tone: bid.isValid ? 'blue' : 'red',
        actorName: bid.player.nickname,
        targetId: bid.id,
        metadata: { playerId: bid.playerId, bidAmount: bid.bidAmount, isValid: bid.isValid },
      });
    }

    for (const lock of auction.dkpLocks) {
      events.push({
        id: `lock:${lock.id}`,
        type: 'DKP_LOCK_CREATED',
        title: lock.released ? 'Lock de DKP criado e liberado' : 'Lock de DKP criado',
        description: `${lock.player.nickname} travou ${lock.amount} DKP neste leilao.`,
        occurredAt: lock.createdAt,
        tone: lock.released ? 'muted' : 'gold',
        actorName: lock.player.nickname,
        targetId: lock.id,
        metadata: { playerId: lock.playerId, amount: lock.amount, released: lock.released },
      });
    }

    for (const request of auction.bidCancellationRequests) {
      events.push({
        id: `cancel-request:${request.id}`,
        type: 'BID_CANCELLATION_REQUESTED',
        title: 'Cancelamento de bid solicitado',
        description: `${request.player.nickname} pediu cancelamento do bid.`,
        occurredAt: request.createdAt,
        tone: 'gold',
        actorName: request.player.nickname,
        targetId: request.id,
        metadata: { bidId: request.bidId, status: request.status, reason: request.reason },
      });

      if (request.reviewedAt) {
        events.push({
          id: `cancel-review:${request.id}`,
          type: 'BID_CANCELLATION_REVIEWED',
          title: request.status === 'APPROVED' ? 'Cancelamento aprovado' : 'Cancelamento rejeitado',
          description: request.reviewNote ?? `Pedido ficou com status ${request.status}.`,
          occurredAt: request.reviewedAt,
          tone: request.status === 'APPROVED' ? 'green' : request.status === 'REJECTED' ? 'red' : 'gold',
          actorName: this.userLabel(request.reviewedBy),
          targetId: request.id,
          metadata: { bidId: request.bidId, status: request.status },
        });
      }
    }

    for (const vote of auction.reviewVotes) {
      events.push({
        id: `review-vote:${vote.id}`,
        type: 'REVIEW_VOTE',
        title: vote.action === 'APPROVE' ? 'Voto de aprovacao' : 'Voto de rejeicao',
        description: vote.reason ?? `Voto ${vote.action} registrado na review.`,
        occurredAt: vote.updatedAt,
        tone: vote.action === 'APPROVE' ? 'green' : 'red',
        actorName: this.userLabel(vote.voter),
        targetId: vote.id,
        metadata: { playerId: vote.playerId, action: vote.action },
      });
    }

    for (const vote of auction.bidInvalidationVotes) {
      events.push({
        id: `bid-invalidation:${vote.id}`,
        type: 'BID_INVALIDATION_VOTE',
        title: 'Voto para invalidar bid',
        description: `${this.userLabel(vote.voter) ?? 'Staff'} votou para invalidar o bid de ${vote.bid.player.nickname}.`,
        occurredAt: vote.updatedAt,
        tone: 'red',
        actorName: this.userLabel(vote.voter),
        targetId: vote.bidId,
        metadata: { bidId: vote.bidId, playerId: vote.bid.playerId, reason: vote.reason },
      });
    }

    for (const transaction of transactions) {
      const transactionLabels: Record<DKPTransactionType, { title: string; tone: AuctionTimelineEvent['tone'] }> = {
        [DKPTransactionType.AUCTION_LOCK]: { title: 'Transacao de lock registrada', tone: 'gold' },
        [DKPTransactionType.AUCTION_REFUND]: { title: 'Reembolso de lock registrado', tone: 'blue' },
        [DKPTransactionType.AUCTION_WIN]: { title: 'Vitoria consumiu DKP', tone: 'green' },
        [DKPTransactionType.EVENT_REWARD]: { title: 'Transacao de evento', tone: 'muted' },
        [DKPTransactionType.ADMIN_ADJUSTMENT]: { title: 'Ajuste administrativo', tone: 'muted' },
      };
      const label = transactionLabels[transaction.type];
      events.push({
        id: `transaction:${transaction.id}`,
        type: transaction.type,
        title: label.title,
        description: `${transaction.player.nickname}: ${transaction.amount} DKP.`,
        occurredAt: transaction.createdAt,
        tone: label.tone,
        actorName: this.userLabel(transaction.createdBy),
        targetId: transaction.id,
        metadata: { playerId: transaction.playerId, amount: transaction.amount },
      });
    }

    if (auction.dropHistory) {
      events.push({
        id: `drop:${auction.dropHistory.id}`,
        type: 'DROP_DELIVERED',
        title: 'Entrega registrada',
        description: `${auction.dropHistory.player?.nickname ?? auction.dropHistory.nicknameIngame ?? 'Player'} recebeu ${auction.dropHistory.itemName ?? auction.itemName}.`,
        occurredAt: auction.dropHistory.deliveredAt ?? auction.dropHistory.createdAt,
        tone: 'green',
        actorName: auction.dropHistory.staffDiscordId ?? null,
        targetId: auction.dropHistory.id,
        metadata: { playerId: auction.dropHistory.playerId, proofImageUrl: auction.dropHistory.proofImageUrl },
      });
    }

    for (const log of auditLogs) {
      events.push({
        id: `audit:${log.id}`,
        type: 'AUDIT_LOG',
        title: log.action,
        description: `${log.targetType}${log.targetId ? ` / ${log.targetId}` : ''}`,
        occurredAt: log.createdAt,
        tone: 'muted',
        actorName: log.actor ? this.userLabel(log.actor) : null,
        targetId: log.targetId,
        metadata: log.metadata as Record<string, unknown> | null,
      });
    }

    return events.sort((left, right) => {
      const byTime = left.occurredAt.getTime() - right.occurredAt.getTime();
      if (byTime !== 0) return byTime;
      return left.type.localeCompare(right.type);
    });
  }

  async getAuctionFinalizationPreview(auctionId: string): Promise<AuctionFinalizationPreview> {
    const diagnostics = await this.getAuctionDiagnostics(auctionId);
    const auction = diagnostics.auction;
    const now = new Date();
    const activeLocks = diagnostics.locks.filter((lock) => !lock.released);
    const activeLockByPlayer = new Map(activeLocks.map((lock) => [lock.playerId, lock]));
    const minimumLayer = auction.minimumLayer ?? (auction.itemTier === ItemTier.T4 ? 4 : null);
    const eligibleBids = diagnostics.bids
      .filter((bid) => bid.isValid)
      .filter((bid) => activeLockByPlayer.has(bid.playerId))
      .filter((bid) => !minimumLayer || auction.itemTier !== ItemTier.T4 || bid.dimensionalLayer >= minimumLayer)
      .sort((left, right) => (
        right.bidAmount - left.bidAmount
        || right.dimensionalLayer - left.dimensionalLayer
        || right.attendancePercentage - left.attendancePercentage
        || new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
      ));
    const candidate = eligibleBids[0] ?? null;
    const winnerLock = candidate ? activeLockByPlayer.get(candidate.playerId) : undefined;
    const ignoredBids = diagnostics.bids.flatMap((bid) => {
      if (!bid.isValid) {
        return [{ id: bid.id, playerId: bid.playerId, nickname: bid.nickname, bidAmount: bid.bidAmount, reason: 'Bid ja invalidado.' }];
      }
      if (!activeLockByPlayer.has(bid.playerId)) {
        return [{ id: bid.id, playerId: bid.playerId, nickname: bid.nickname, bidAmount: bid.bidAmount, reason: 'Bid valido sem lock ativo.' }];
      }
      if (minimumLayer && auction.itemTier === ItemTier.T4 && bid.dimensionalLayer < minimumLayer) {
        return [{
          id: bid.id,
          playerId: bid.playerId,
          nickname: bid.nickname,
          bidAmount: bid.bidAmount,
          reason: `Player abaixo da camada minima atual (${minimumLayer}).`,
        }];
      }
      return [];
    });
    const topBidAmount = eligibleBids[0]?.bidAmount;
    const topBidTies = topBidAmount ? eligibleBids.filter((bid) => bid.bidAmount === topBidAmount) : [];
    const risks: AuctionFinalizationPreview['risks'] = [...diagnostics.issues];

    if (topBidTies.length > 1) {
      risks.push({
        severity: 'medium',
        title: 'Empate no maior bid apto',
        description: `${topBidTies.length} bids aptos estao no maior valor. A review da Staff deve conferir prioridade antes da entrega.`,
        metadata: { bidIds: topBidTies.map((bid) => bid.id) },
      });
    }

    if ((diagnostics.outcome === 'FINISH_STANDARD' || diagnostics.outcome === 'PENDING_REVIEW') && !candidate) {
      risks.push({
        severity: 'high',
        title: 'Sem candidato apto para a acao prevista',
        description: 'O diagnostico encontrou acao de fechamento, mas nenhum bid com lock ativo e camada compativel foi selecionado.',
      });
    }

    const actionLabels: Record<AuctionFinalizationPreview['action'], string> = {
      NO_ACTION: 'Sem acao automatica agora',
      FINISH_STANDARD: 'Fechamento padrao previsto',
      PENDING_REVIEW: 'Vai para review da Staff',
      EXPAND_LAYER: 'Expande camada T4',
      RELIST: 'Relista leilao',
    };
    const descriptions: Record<AuctionFinalizationPreview['action'], string> = {
      NO_ACTION: auction.status === AuctionStatus.OPEN && auction.endsAt > now
        ? 'O leilao ainda nao venceu; a automacao nao deve processar agora.'
        : 'O estado atual nao pede uma acao automatica de finalizacao.',
      FINISH_STANDARD: 'Existe bid apto para fechamento padrao; confira candidato e locks antes da decisao final.',
      PENDING_REVIEW: 'A automacao colocaria o leilao em review para a Staff decidir o vencedor e a entrega.',
      EXPAND_LAYER: 'Leilao T4 vencido sem bid apto na camada minima atual; a regra desce uma camada e prorroga o encerramento.',
      RELIST: 'Leilao vencido sem bid valido restante; locks ativos seriam liberados e o ciclo aguardaria reabertura.',
    };

    return {
      generatedAt: now,
      auctionId,
      action: diagnostics.outcome,
      actionLabel: actionLabels[diagnostics.outcome],
      description: descriptions[diagnostics.outcome],
      candidate: candidate
        ? {
            bidId: candidate.id,
            playerId: candidate.playerId,
            nickname: candidate.nickname,
            bidAmount: candidate.bidAmount,
            dimensionalLayer: candidate.dimensionalLayer,
            attendancePercentage: candidate.attendancePercentage,
          }
        : null,
      locksToConsume: diagnostics.outcome === 'FINISH_STANDARD' && winnerLock
        ? [{
            id: winnerLock.id,
            playerId: winnerLock.playerId,
            nickname: winnerLock.nickname,
            amount: winnerLock.amount,
          }]
        : [],
      locksToRelease: diagnostics.outcome === 'RELIST'
        ? activeLocks.map((lock) => ({ id: lock.id, playerId: lock.playerId, nickname: lock.nickname, amount: lock.amount }))
        : diagnostics.outcome === 'FINISH_STANDARD'
          ? activeLocks
              .filter((lock) => lock.playerId !== candidate?.playerId)
              .map((lock) => ({ id: lock.id, playerId: lock.playerId, nickname: lock.nickname, amount: lock.amount }))
          : [],
      ignoredBids,
      nextState: this.getAuctionPreviewNextState(diagnostics),
      risks,
    };
  }

  async getAuctionDossier(auctionId: string): Promise<AuctionDossier> {
    const [diagnostics, timeline, preview] = await Promise.all([
      this.getAuctionDiagnostics(auctionId),
      this.getAuctionTimeline(auctionId),
      this.getAuctionFinalizationPreview(auctionId),
    ]);
    const lines = [
      `# Dossie Staff - ${diagnostics.auction.itemName}`,
      '',
      `Gerado em: ${preview.generatedAt.toISOString()}`,
      `Leilao: ${diagnostics.auction.id}`,
      `Status: ${diagnostics.auction.status}`,
      `Modo: ${diagnostics.auction.auctionMode}`,
      `Tier/tipo: ${diagnostics.auction.itemTier} / ${diagnostics.auction.itemType}`,
      `Encerramento: ${diagnostics.auction.endsAt.toISOString()}`,
      `Camada minima: ${diagnostics.auction.minimumLayer ?? '-'}`,
      '',
      '## Estado',
      `${diagnostics.stateReason.title}: ${diagnostics.stateReason.description}`,
      '',
      '## Previa de finalizacao',
      `Acao: ${preview.actionLabel}`,
      `Descricao: ${preview.description}`,
      preview.candidate
        ? `Candidato: ${preview.candidate.nickname} (${preview.candidate.bidAmount} DKP, layer ${preview.candidate.dimensionalLayer}, presenca ${preview.candidate.attendancePercentage.toFixed(2)}%)`
        : 'Candidato: -',
      preview.nextState
        ? `Proximo estado previsto: ${preview.nextState.status}, camada ${preview.nextState.minimumLayer ?? '-'}, fim ${preview.nextState.endsAt?.toISOString() ?? '-'}, reabre ${preview.nextState.reopensAt?.toISOString() ?? '-'}`
        : 'Proximo estado previsto: -',
      '',
      '## Contadores',
      `Bids: ${diagnostics.counts.bids} (${diagnostics.counts.validBids} validos, ${diagnostics.counts.invalidBids} invalidos)`,
      `Locks ativos: ${diagnostics.counts.activeLocks}`,
      `Bids validos com lock: ${diagnostics.counts.validBidsWithActiveLocks}`,
      `Bids na camada minima: ${diagnostics.counts.validBidsAtMinimumLayer}`,
      `Cancelamentos: ${diagnostics.counts.cancellationRequests}`,
      `Votos review: ${diagnostics.counts.approvalVotes} aprovacao / ${diagnostics.counts.rejectionVotes} rejeicao`,
      `Votos invalidacao: ${diagnostics.counts.invalidationVotes}`,
      `Audit logs relacionados: ${diagnostics.counts.auditLogs}`,
      '',
      '## Riscos e problemas',
      ...this.markdownList(preview.risks.map((risk) => `[${risk.severity}] ${risk.title}: ${risk.description}`)),
      '',
      '## Bids',
      ...this.markdownList(diagnostics.bids.map((bid) => `${bid.nickname}: ${bid.bidAmount} DKP, layer ${bid.dimensionalLayer}, presenca ${bid.attendancePercentage.toFixed(2)}%, valido=${bid.isValid ? 'sim' : 'nao'}, lock=${bid.hasActiveLock ? `${bid.activeLockAmount ?? 0} DKP` : 'nao'}`)),
      '',
      '## Locks ativos que a previa liberaria/consumiria',
      ...this.markdownList([
        ...preview.locksToConsume.map((lock) => `Consumir: ${lock.nickname} - ${lock.amount} DKP`),
        ...preview.locksToRelease.map((lock) => `Liberar: ${lock.nickname} - ${lock.amount} DKP`),
      ]),
      '',
      '## Timeline resumida',
      ...this.markdownList(timeline.slice(-20).map((event) => `${event.occurredAt.toISOString()} - ${event.type} - ${event.title}: ${event.description}`)),
    ];

    return {
      generatedAt: preview.generatedAt,
      auctionId,
      title: `Dossie Staff - ${diagnostics.auction.itemName}`,
      markdown: lines.join('\n'),
    };
  }

  async getUniversalDossier(type: UniversalDossierType, id: string): Promise<UniversalDossier> {
    if (type === 'auction') {
      const [dossier, diagnostics] = await Promise.all([
        this.getAuctionDossier(id),
        this.getAuctionDiagnostics(id),
      ]);

      return {
        generatedAt: dossier.generatedAt,
        type,
        id,
        title: dossier.title,
        summary: [
          { label: 'Item', value: diagnostics.auction.itemName },
          { label: 'Status', value: diagnostics.auction.status },
          { label: 'Modo', value: diagnostics.auction.auctionMode },
          { label: 'Bids validos', value: String(diagnostics.counts.validBids) },
        ],
        internalLinks: [
          { label: 'Diagnostico Staff', href: `/dashboard/staff/auction-diagnostics?auctionId=${id}` },
          { label: 'Leilao player', href: `/dashboard/auctions/${id}` },
        ],
        auditLogs: diagnostics.auditLogs.slice(0, 20).map((log) => ({
          id: log.id,
          action: log.action,
          targetType: log.targetType,
          targetId: log.targetId,
          actorName: log.actorName,
          createdAt: log.createdAt,
        })),
        markdown: dossier.markdown,
      };
    }

    if (type === 'player') return this.getPlayerDossier(id);
    if (type === 'request') return this.getRequestDossier(id);
    if (type === 'interest') return this.getInterestDossier(id);
    if (type === 'drop') return this.getDropDossier(id);
    if (type === 'event') return this.getEventDossier(id);

    throw new NotFoundException('Tipo de dossie nao suportado.');
  }

  private async getPlayerDossier(playerId: string): Promise<UniversalDossier> {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: {
        user: { select: { discordId: true, discordUsername: true, discordNickname: true } },
        dkpTransactions: { orderBy: { createdAt: 'desc' }, take: 10 },
        dkpLocks: { where: { released: false }, orderBy: { createdAt: 'desc' }, take: 10 },
        itemRequests: { orderBy: { updatedAt: 'desc' }, take: 5 },
        dropHistories: { orderBy: { deliveredAt: 'desc' }, take: 5 },
        progressUpdates: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    if (!player) throw new NotFoundException('Player nao encontrado.');

    const totalDkp = player.dkpTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const lockedDkp = player.dkpLocks.reduce((sum, lock) => sum + lock.amount, 0);
    const auditLogs = await this.loadDossierAuditLogs([
      { targetType: 'Player', targetId: player.id },
      { metadata: { path: ['playerId'], equals: player.id } },
      { metadata: { path: ['discordId'], equals: player.user.discordId } },
    ]);
    const summary = [
      { label: 'Player', value: player.nickname },
      { label: 'Discord', value: player.user.discordNickname ?? player.user.discordUsername },
      { label: 'Classe', value: player.class },
      { label: 'Camada', value: String(player.dimensionalLayer) },
      { label: 'CP', value: String(player.combatPower) },
      { label: 'Attendance', value: `${player.attendancePercentage.toFixed(2)}%` },
      { label: 'DKP total/locked/available', value: `${totalDkp}/${lockedDkp}/${totalDkp - lockedDkp}` },
    ];
    const markdown = this.buildUniversalMarkdown('Dossie Staff - Player', player.id, summary, [
      '## Requests recentes',
      ...this.markdownList(player.itemRequests.map((request) => `${request.itemName}: rank ${request.rankPosition}, restante ${request.remainingQuantity}/${request.totalQuantity}`)),
      '',
      '## Drops recentes',
      ...this.markdownList(player.dropHistories.map((drop) => `${drop.itemName ?? 'Item'} em ${drop.deliveredAt?.toISOString() ?? drop.createdAt.toISOString()}`)),
      '',
      '## Progresso recente',
      ...this.markdownList(player.progressUpdates.map((progress) => `${progress.category}: ${progress.reviewStatus} em ${progress.createdAt.toISOString()}`)),
    ], auditLogs);

    return {
      generatedAt: new Date(),
      type: 'player',
      id: player.id,
      title: `Dossie Staff - ${player.nickname}`,
      summary,
      internalLinks: [
        { label: 'Perfil Staff', href: `/dashboard/staff/players/${player.id}` },
        { label: 'Comparar players', href: `/dashboard/staff/compare?playerIds=${player.id}` },
      ],
      auditLogs,
      markdown,
    };
  }

  private async getRequestDossier(requestId: string): Promise<UniversalDossier> {
    const request = await this.prisma.itemRequest.findUnique({
      where: { id: requestId },
      include: {
        player: { select: { id: true, nickname: true, dimensionalLayer: true } },
        itemCatalog: { select: { id: true, namePt: true, nameEn: true, itemTier: true, itemType: true, category: true } },
      },
    });
    if (!request) throw new NotFoundException('Request nao encontrado.');

    const auditLogs = await this.loadDossierAuditLogs([
      { targetType: 'ItemRequest', targetId: request.id },
      { metadata: { path: ['requestId'], equals: request.id } },
      { metadata: { path: ['itemRequestId'], equals: request.id } },
    ]);
    const summary = [
      { label: 'Item', value: request.itemName },
      { label: 'Player', value: request.player?.nickname ?? request.playerName },
      { label: 'Rank', value: String(request.rankPosition) },
      { label: 'Quantidade', value: `${request.remainingQuantity}/${request.totalQuantity}` },
      { label: 'Update', value: request.updateProofStatus ?? 'sem update pendente' },
      { label: 'Catalogo', value: request.itemCatalog ? `${request.itemCatalog.namePt} / ${request.itemCatalog.nameEn}` : 'sem vinculo' },
    ];

    return {
      generatedAt: new Date(),
      type: 'request',
      id: request.id,
      title: `Dossie Staff - Request ${request.itemName}`,
      summary,
      internalLinks: [
        { label: 'Requests player', href: '/dashboard/item-requests' },
        ...(request.playerId ? [{ label: 'Perfil Staff', href: `/dashboard/staff/players/${request.playerId}` }] : []),
      ],
      auditLogs,
      markdown: this.buildUniversalMarkdown('Dossie Staff - Request', request.id, summary, [
        '## Contexto',
        `Criado em: ${request.createdAt.toISOString()}`,
        `Atualizado em: ${request.updatedAt.toISOString()}`,
        `Thread: ${request.threadId ?? '-'}`,
        `Ultimo reminder: ${request.lastReminderStage ?? '-'} em ${request.lastReminderAt?.toISOString() ?? '-'}`,
      ], auditLogs),
    };
  }

  private async getInterestDossier(postId: string): Promise<UniversalDossier> {
    const post = await this.prisma.itemInterestPost.findUnique({
      where: { id: postId },
      include: {
        itemCatalog: { select: { namePt: true, nameEn: true, itemTier: true, itemType: true } },
        entries: {
          include: { player: { select: { id: true, nickname: true, dimensionalLayer: true, attendancePercentage: true } } },
          orderBy: { createdAt: 'asc' },
        },
        votes: true,
      },
    });
    if (!post) throw new NotFoundException('Interesse nao encontrado.');

    const auditLogs = await this.loadDossierAuditLogs([
      { targetType: 'ItemInterestPost', targetId: post.id },
      { targetType: 'ItemInterest', targetId: post.id },
      { metadata: { path: ['postId'], equals: post.id } },
    ]);
    const selected = post.entries.find((entry) => entry.id === post.selectedEntryId);
    const summary = [
      { label: 'Titulo', value: post.title },
      { label: 'Item', value: `${post.itemCatalog.namePt} / ${post.itemCatalog.nameEn}` },
      { label: 'Status', value: post.status },
      { label: 'Modo', value: post.mode },
      { label: 'Interessados', value: String(post.entries.length) },
      { label: 'Votos', value: String(post.votes.length) },
      { label: 'Selecionado', value: selected?.player.nickname ?? '-' },
    ];

    return {
      generatedAt: new Date(),
      type: 'interest',
      id: post.id,
      title: `Dossie Staff - Interesse ${post.title}`,
      summary,
      internalLinks: [
        { label: 'Interesses Staff', href: '/dashboard/staff/interests' },
        { label: 'Interesses player', href: '/dashboard/interests' },
      ],
      auditLogs,
      markdown: this.buildUniversalMarkdown('Dossie Staff - Interesse', post.id, summary, [
        '## Interessados',
        ...this.markdownList(post.entries.map((entry) => `${entry.player.nickname}: layer ${entry.player.dimensionalLayer}, presenca ${entry.player.attendancePercentage.toFixed(2)}%, transmutar=${entry.isTransmuteRequest ? 'sim' : 'nao'}`)),
      ], auditLogs),
    };
  }

  private async getDropDossier(dropId: string): Promise<UniversalDossier> {
    const drop = await this.prisma.dropHistory.findUnique({
      where: { id: dropId },
      include: {
        player: { select: { id: true, nickname: true } },
        itemCatalog: { select: { namePt: true, nameEn: true, itemTier: true, itemType: true } },
        auction: { select: { id: true, itemName: true, status: true } },
        itemInterestEntry: { include: { post: { select: { id: true, title: true } }, player: { select: { nickname: true } } } },
      },
    });
    if (!drop) throw new NotFoundException('Drop nao encontrado.');

    const auditLogs = await this.loadDossierAuditLogs([
      { targetType: 'DropHistory', targetId: drop.id },
      ...(drop.auctionId ? [{ targetType: 'Auction', targetId: drop.auctionId }] : []),
      { metadata: { path: ['dropHistoryId'], equals: drop.id } },
    ]);
    const summary = [
      { label: 'Item', value: drop.itemName ?? drop.itemCatalog?.namePt ?? 'Item sem nome' },
      { label: 'Player', value: drop.player?.nickname ?? drop.nicknameIngame ?? '-' },
      { label: 'Origem leilao', value: drop.auction?.itemName ?? '-' },
      { label: 'Origem interesse', value: drop.itemInterestEntry?.post.title ?? '-' },
      { label: 'Entregue em', value: drop.deliveredAt?.toISOString() ?? '-' },
      { label: 'Prova', value: drop.proofImageUrl ? 'sim' : 'nao' },
    ];

    return {
      generatedAt: new Date(),
      type: 'drop',
      id: drop.id,
      title: `Dossie Staff - Drop ${summary[0].value}`,
      summary,
      internalLinks: [
        { label: 'Drops Staff', href: '/dashboard/staff/drops' },
        ...(drop.playerId ? [{ label: 'Perfil Staff', href: `/dashboard/staff/players/${drop.playerId}` }] : []),
        ...(drop.auctionId ? [{ label: 'Diagnostico do leilao', href: `/dashboard/staff/auction-diagnostics?auctionId=${drop.auctionId}` }] : []),
      ],
      auditLogs,
      markdown: this.buildUniversalMarkdown('Dossie Staff - Drop', drop.id, summary, [
        '## Origem',
        `AuctionId: ${drop.auctionId ?? '-'}`,
        `ItemInterestEntryId: ${drop.itemInterestEntryId ?? '-'}`,
        `Thread: ${drop.threadId ?? '-'}`,
      ], auditLogs),
    };
  }

  private async getEventDossier(eventId: string): Promise<UniversalDossier> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        createdBy: { select: { discordUsername: true, discordNickname: true } },
        attendances: { include: { player: { select: { id: true, nickname: true } } }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!event) throw new NotFoundException('Evento nao encontrado.');

    const present = event.attendances.filter((attendance) => attendance.attended);
    const absent = event.attendances.filter((attendance) => !attendance.attended);
    const auditLogs = await this.loadDossierAuditLogs([
      { targetType: 'Event', targetId: event.id },
      { metadata: { path: ['eventId'], equals: event.id } },
      { metadata: { path: ['attendanceBatchId'], equals: event.attendanceBatchId ?? '' } },
    ]);
    const summary = [
      { label: 'Evento', value: event.name },
      { label: 'Tipo', value: event.type },
      { label: 'Status', value: event.status },
      { label: 'DKP', value: String(event.dkpReward) },
      { label: 'Presentes/ausentes', value: `${present.length}/${absent.length}` },
      { label: 'Lote', value: event.attendanceBatchId ?? '-' },
      { label: 'Finalizado em', value: event.finalizedAt?.toISOString() ?? '-' },
    ];

    return {
      generatedAt: new Date(),
      type: 'event',
      id: event.id,
      title: `Dossie Staff - Evento ${event.name}`,
      summary,
      internalLinks: [
        { label: 'Eventos Admin', href: '/dashboard/admin/events' },
        { label: 'Dia Staff', href: '/dashboard/staff/day' },
      ],
      auditLogs,
      markdown: this.buildUniversalMarkdown('Dossie Staff - Evento', event.id, summary, [
        '## Presenca',
        `Presentes: ${present.map((attendance) => attendance.player.nickname).join(', ') || '-'}`,
        `Ausentes: ${absent.map((attendance) => attendance.player.nickname).join(', ') || '-'}`,
      ], auditLogs),
    };
  }

  async getAuctionDiagnostics(auctionId: string): Promise<AuctionDiagnosticSummary> {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        bids: {
          include: {
            player: {
              select: {
                id: true,
                nickname: true,
                dimensionalLayer: true,
                attendancePercentage: true,
              },
            },
          },
          orderBy: [{ isValid: 'desc' }, { bidAmount: 'desc' }, { createdAt: 'asc' }],
        },
        dkpLocks: {
          include: {
            player: {
              select: {
                id: true,
                nickname: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        bidCancellationRequests: {
          include: {
            player: {
              select: {
                id: true,
                nickname: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        reviewVotes: {
          include: {
            voter: {
              select: {
                discordUsername: true,
                discordNickname: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        },
        bidInvalidationVotes: {
          include: {
            voter: {
              select: {
                discordUsername: true,
                discordNickname: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!auction) {
      throw new NotFoundException('Auction was not found.');
    }

    const now = new Date();
    const bidIds = auction.bids.map((bid) => bid.id);
    const lockIds = auction.dkpLocks.map((lock) => lock.id);
    const cancellationIds = auction.bidCancellationRequests.map((request) => request.id);
    const relatedTargetIds = [auction.id, ...bidIds, ...lockIds, ...cancellationIds];
    const auditOr: Prisma.AuditLogWhereInput[] = [
      { targetId: { in: relatedTargetIds } },
      { metadata: { path: ['auctionId'], equals: auction.id } },
      ...bidIds.map((bidId) => ({ metadata: { path: ['bidId'], equals: bidId } })),
      ...lockIds.map((lockId) => ({ metadata: { path: ['releasedLockId'], equals: lockId } })),
    ];
    const auditLogs = await this.prisma.auditLog.findMany({
      where: { OR: auditOr },
      include: {
        actor: {
          select: {
            discordUsername: true,
            discordNickname: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 80,
    });

    const activeLocks = auction.dkpLocks.filter((lock) => !lock.released);
    const activeLockByPlayer = new Map(activeLocks.map((lock) => [lock.playerId, lock]));
    const validBids = auction.bids.filter((bid) => bid.isValid);
    const invalidBids = auction.bids.filter((bid) => !bid.isValid);
    const minimumLayer = auction.minimumLayer ?? (auction.itemTier === ItemTier.T4 ? 4 : null);
    const validBidsAtMinimumLayer = minimumLayer
      ? validBids.filter((bid) => bid.player.dimensionalLayer >= minimumLayer)
      : validBids;
    const validBidsWithActiveLocks = validBids.filter((bid) => activeLockByPlayer.has(bid.playerId));
    const issues: AuctionDiagnosticSummary['issues'] = [];

    if (auction.status === AuctionStatus.OPEN && auction.endsAt <= now) {
      issues.push({
        severity: 'high',
        title: 'Leilao OPEN vencido',
        description: 'Este leilao ja passou do horario de fim e deve ser processado pelo job de finalizacao, nao pelo relist.',
      });
    }

    for (const bid of validBids) {
      const activeLock = activeLockByPlayer.get(bid.playerId);
      if (!activeLock) {
        issues.push({
          severity: 'high',
          title: 'Bid valido sem lock ativo',
          description: `${bid.player.nickname} tem bid valido sem DKP travado.`,
          metadata: { bidId: bid.id, playerId: bid.playerId },
        });
      } else if (activeLock.amount !== bid.bidAmount) {
        issues.push({
          severity: 'medium',
          title: 'Lock diferente do bid',
          description: `${bid.player.nickname} tem lock de ${activeLock.amount} DKP para bid de ${bid.bidAmount} DKP.`,
          metadata: { bidId: bid.id, lockId: activeLock.id },
        });
      }
    }

    for (const lock of activeLocks) {
      const validBid = validBids.find((bid) => bid.playerId === lock.playerId);
      if (!validBid) {
        issues.push({
          severity: 'high',
          title: 'Lock ativo sem bid valido',
          description: `${lock.player.nickname} tem DKP travado sem bid valido neste leilao.`,
          metadata: { lockId: lock.id, playerId: lock.playerId },
        });
      }
    }

    if (auction.status === AuctionStatus.PENDING_REVIEW && validBids.length === 0) {
      issues.push({
        severity: 'high',
        title: 'Review sem bid valido',
        description: 'Este leilao esta em review, mas nao possui nenhum bid valido.',
      });
    }

    if (auction.status === AuctionStatus.OPEN && auction.itemTier === ItemTier.T4 && minimumLayer && validBids.length > 0 && validBidsAtMinimumLayer.length === 0) {
      issues.push({
        severity: 'medium',
        title: 'Sem bid na camada minima atual',
        description: `Camada minima atual ${minimumLayer}. Ao finalizar vencido, a regra expande para a proxima camada.`,
      });
    }

    let outcome: AuctionDiagnosticSummary['outcome'] = 'NO_ACTION';
    if (auction.status === AuctionStatus.OPEN && auction.endsAt <= now) {
      if (auction.itemTier === ItemTier.T4 && minimumLayer && minimumLayer > 1 && validBidsAtMinimumLayer.length === 0) {
        outcome = 'EXPAND_LAYER';
      } else if (validBids.length === 0) {
        outcome = 'RELIST';
      } else if (auction.requiresStaffReview || auction.auctionMode !== AuctionMode.STANDARD) {
        outcome = 'PENDING_REVIEW';
      } else {
        outcome = 'FINISH_STANDARD';
      }
    }
    const stateReason = this.getAuctionStateReason({
      status: auction.status,
      endsAt: auction.endsAt,
      auctionMode: auction.auctionMode,
      requiresStaffReview: auction.requiresStaffReview,
      minimumLayer,
      reopensAt: auction.reopensAt,
      outcome,
      validBids: validBids.length,
      validBidsAtMinimumLayer: validBidsAtMinimumLayer.length,
    }, now);

    return {
      generatedAt: now,
      outcome,
      auction: {
        id: auction.id,
        itemName: auction.itemName,
        itemTier: auction.itemTier,
        itemType: auction.itemType,
        auctionMode: auction.auctionMode,
        status: auction.status,
        minimumBid: auction.minimumBid,
        minimumLayer: auction.minimumLayer,
        requiresStaffReview: auction.requiresStaffReview,
        endsAt: auction.endsAt,
        createdAt: auction.createdAt,
        updatedAt: auction.updatedAt,
      },
      stateReason,
      counts: {
        bids: auction.bids.length,
        validBids: validBids.length,
        invalidBids: invalidBids.length,
        activeLocks: activeLocks.length,
        validBidsWithActiveLocks: validBidsWithActiveLocks.length,
        validBidsAtMinimumLayer: validBidsAtMinimumLayer.length,
        cancellationRequests: auction.bidCancellationRequests.length,
        approvalVotes: auction.reviewVotes.filter((vote) => vote.action === 'APPROVE').length,
        rejectionVotes: auction.reviewVotes.filter((vote) => vote.action === 'REJECT').length,
        invalidationVotes: auction.bidInvalidationVotes.length,
        auditLogs: auditLogs.length,
      },
      issues,
      bids: auction.bids.map((bid) => {
        const activeLock = activeLockByPlayer.get(bid.playerId);
        return {
          id: bid.id,
          playerId: bid.playerId,
          nickname: bid.player.nickname,
          dimensionalLayer: bid.player.dimensionalLayer,
          attendancePercentage: bid.player.attendancePercentage,
          bidAmount: bid.bidAmount,
          isValid: bid.isValid,
          hasActiveLock: Boolean(activeLock),
          activeLockAmount: activeLock?.amount,
          createdAt: bid.createdAt,
        };
      }),
      locks: auction.dkpLocks.map((lock) => ({
        id: lock.id,
        playerId: lock.playerId,
        nickname: lock.player.nickname,
        amount: lock.amount,
        released: lock.released,
        createdAt: lock.createdAt,
      })),
      cancellationRequests: auction.bidCancellationRequests.map((request) => ({
        id: request.id,
        bidId: request.bidId,
        playerId: request.playerId,
        playerName: request.player.nickname,
        reason: request.reason,
        status: request.status,
        reviewNote: request.reviewNote,
        reviewedAt: request.reviewedAt,
        createdAt: request.createdAt,
      })),
      reviewVotes: auction.reviewVotes.map((vote) => ({
        id: vote.id,
        action: vote.action,
        playerId: vote.playerId,
        voterName: vote.voter.discordNickname ?? vote.voter.discordUsername,
        reason: vote.reason,
        updatedAt: vote.updatedAt,
      })),
      bidInvalidationVotes: auction.bidInvalidationVotes.map((vote) => ({
        id: vote.id,
        bidId: vote.bidId,
        voterName: vote.voter.discordNickname ?? vote.voter.discordUsername,
        reason: vote.reason,
        updatedAt: vote.updatedAt,
      })),
      auditLogs: auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        metadata: log.metadata as Record<string, unknown> | null,
        createdAt: log.createdAt,
        actorName: log.actor ? log.actor.discordNickname ?? log.actor.discordUsername : null,
      })),
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

  private userLabel(user?: { discordNickname?: string | null; discordUsername: string } | null): string | null {
    if (!user) return null;
    return user.discordNickname ?? user.discordUsername;
  }

  private morningTask(task: OperationTask): OperationTask {
    return task;
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

  private getAuctionPreviewNextState(diagnostics: AuctionDiagnosticSummary): AuctionFinalizationPreview['nextState'] {
    const { auction, outcome } = diagnostics;
    const minimumLayer = auction.minimumLayer ?? (auction.itemTier === ItemTier.T4 ? 4 : null);

    if (outcome === 'EXPAND_LAYER' && minimumLayer && minimumLayer > 1) {
      return {
        status: AuctionStatus.OPEN,
        minimumLayer: minimumLayer - 1,
        endsAt: this.addDays(auction.endsAt, 1),
        reopensAt: null,
      };
    }

    if (outcome === 'RELIST') {
      if (auction.itemTier === ItemTier.T4) {
        return {
          status: AuctionStatus.RELISTED,
          minimumLayer: 4,
          endsAt: auction.endsAt,
          reopensAt: this.addDays(auction.createdAt, AUCTION_RELIST_DELAY_DAYS),
        };
      }

      return {
        status: AuctionStatus.RELISTED,
        minimumLayer,
        endsAt: auction.endsAt,
        reopensAt: this.addDays(new Date(), AUCTION_RELIST_DELAY_DAYS),
      };
    }

    if (outcome === 'PENDING_REVIEW') {
      return {
        status: AuctionStatus.PENDING_REVIEW,
        minimumLayer,
        endsAt: auction.endsAt,
        reopensAt: null,
      };
    }

    if (outcome === 'FINISH_STANDARD') {
      return {
        status: AuctionStatus.FINISHED,
        minimumLayer,
        endsAt: auction.endsAt,
        reopensAt: null,
      };
    }

    return undefined;
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * DAYS);
  }

  private async checkPublicApiHealth(): Promise<DeploymentPanelSummary['publicHealth']> {
    const baseUrl = this.publicApiBaseUrl();
    if (!baseUrl) {
      return {
        status: 'degraded',
        checkedAt: new Date().toISOString(),
        message: 'PUBLIC_APP_URL nao esta configurada.',
      };
    }

    const startedAt = Date.now();
    try {
      const body = await this.fetchJson<{ status?: string; checkedAt?: string; version?: string }>(`${baseUrl}/health`, 6000);
      const status = body.status === 'ok' || body.status === 'degraded' || body.status === 'down' ? body.status : 'degraded';
      return {
        status,
        checkedAt: body.checkedAt ?? new Date().toISOString(),
        version: body.version ?? null,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        status: 'down',
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
        message: this.errorMessage(error),
      };
    }
  }

  private async getExpectedDeploymentVersion(): Promise<Omit<DeploymentPanelSummary['expectedVersion'], 'matchesCurrent'>> {
    const envSha = process.env.DEPLOY_EXPECTED_VERSION || process.env.GITHUB_SHA || process.env.APP_EXPECTED_VERSION;
    if (envSha) {
      return {
        sha: envSha,
        shortSha: envSha.slice(0, 7),
        source: 'env',
        checkedAt: new Date().toISOString(),
      };
    }

    try {
      const commit = await this.fetchJson<{ sha?: string }>('https://api.github.com/repos/Kasuminho/ERP-Raven-2/commits/master', 7000, {
        accept: 'application/vnd.github+json',
        'user-agent': 'raven2-deploy-panel',
      });
      const sha = commit.sha ?? null;
      return {
        sha,
        shortSha: sha ? sha.slice(0, 7) : null,
        source: 'github-public-api',
        checkedAt: new Date().toISOString(),
        message: sha ? null : 'GitHub respondeu sem SHA do master.',
      };
    } catch (error) {
      return {
        sha: null,
        shortSha: null,
        source: 'unavailable',
        checkedAt: new Date().toISOString(),
        message: this.errorMessage(error),
      };
    }
  }

  private async runPublicSmoke(): Promise<DeploymentPanelSummary['publicSmoke']> {
    const checkedAt = new Date().toISOString();
    const baseUrl = this.publicApiBaseUrl();

    if (!baseUrl) {
      return {
        status: 'degraded',
        checkedAt,
        checks: PUBLIC_SMOKE_PATHS.map((path) => ({
          path,
          ready: false,
          message: 'PUBLIC_APP_URL nao esta configurada.',
        })),
      };
    }

    const checks = await Promise.all(PUBLIC_SMOKE_PATHS.map(async (path) => {
      const startedAt = Date.now();
      try {
        const response = await this.fetchWithTimeout(`${baseUrl}${path}`, 6000);
        const body = path === '/health' ? await response.json().catch(() => undefined) as { version?: string } | undefined : undefined;
        return {
          path,
          ready: response.ok,
          statusCode: response.status,
          latencyMs: Date.now() - startedAt,
          version: body?.version ?? null,
          message: response.ok ? null : `HTTP ${response.status}`,
        };
      } catch (error) {
        return {
          path,
          ready: false,
          latencyMs: Date.now() - startedAt,
          message: this.errorMessage(error),
        };
      }
    }));

    return {
      status: checks.every((check) => check.ready) ? 'ok' : checks.some((check) => check.ready) ? 'degraded' : 'down',
      checkedAt,
      checks,
    };
  }

  private async getLatestStaffChangelog(): Promise<DeploymentPanelSummary['latestStaffChangelog']> {
    try {
      const docsDir = join(process.cwd(), 'docs');
      const files = (await readdir(docsDir))
        .filter((file) => /^discord-staff-update-\d{4}-\d{2}-\d{2}.+\.md$/.test(file))
        .sort((a, b) => b.localeCompare(a));
      const fileName = files[0];

      if (!fileName) {
        return {
          title: 'Nenhum changelog Staff encontrado',
          fileName: null,
          inferredDate: null,
          source: 'unavailable',
          sentReceiptAvailable: false,
          note: 'O painel nao encontrou arquivo docs/discord-staff-update-*.md.',
        };
      }

      const content = await readFile(join(docsDir, fileName), 'utf8');
      const title = content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? fileName.replace(/\.md$/, '');
      const inferredDate = fileName.match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;

      return {
        title,
        fileName,
        inferredDate,
        source: 'docs',
        sentReceiptAvailable: false,
        note: 'Envios por CLI nao gravam recibo no banco; este campo mostra o ultimo changelog Staff documentado no repositorio.',
      };
    } catch (error) {
      return {
        title: 'Changelog Staff indisponivel',
        fileName: null,
        inferredDate: null,
        source: 'unavailable',
        sentReceiptAvailable: false,
        note: this.errorMessage(error),
      };
    }
  }

  private async getStaffBackupHealthCheck(): Promise<StaffHealthSummary['checks'][number]> {
    const statusFile = process.env.BACKUP_STATUS_FILE || '/app/backups/last-verified-backup.json';
    const maxAgeHours = Number(process.env.BACKUP_MAX_AGE_HOURS ?? 26);

    try {
      const parsed = JSON.parse(await readFile(statusFile, 'utf8')) as {
        status?: string;
        verifiedAt?: string;
        backupFile?: string;
      };
      const verifiedAt = parsed.verifiedAt ? new Date(parsed.verifiedAt) : null;

      if (!verifiedAt || Number.isNaN(verifiedAt.getTime())) {
        return {
          key: 'verified-backup',
          label: 'Backup verificado',
          ready: false,
          detail: 'Marcador de backup existe, mas nao tem verifiedAt valido.',
        };
      }

      const ageHours = (Date.now() - verifiedAt.getTime()) / HOURS;
      const ready = parsed.status === 'verified' && ageHours <= maxAgeHours;

      return {
        key: 'verified-backup',
        label: 'Backup verificado',
        ready,
        detail: ready
          ? `Ultimo restore de teste ha ${Math.round(ageHours)}h (${parsed.backupFile ?? 'arquivo nao informado'}).`
          : `Ultimo backup verificado ha ${Math.round(ageHours)}h; limite atual ${maxAgeHours}h.`,
      };
    } catch (error) {
      return {
        key: 'verified-backup',
        label: 'Backup verificado',
        ready: false,
        detail: `Marcador nao encontrado ou ilegivel: ${this.errorMessage(error)}`,
      };
    }
  }

  private buildDeploymentProtocol(
    currentApiVersion: string,
    expectedSha: string | null | undefined,
    publicHealthStatus: DeploymentPanelSummary['publicHealth']['status'],
    publicSmokeStatus: DeploymentPanelSummary['publicSmoke']['status'],
    latestChangelogSource: DeploymentPanelSummary['latestStaffChangelog']['source'],
  ): DeploymentPanelSummary['protocol'] {
    const versionMatches = Boolean(expectedSha && currentApiVersion !== 'development' && currentApiVersion.startsWith(expectedSha.slice(0, 7)));

    return [
      {
        key: 'validate',
        label: 'Validar codigo local',
        detail: 'Prisma validate/generate, lint, builds API/Web e git diff --check antes do commit.',
        status: 'manual',
      },
      {
        key: 'push',
        label: 'Commit e push em master',
        detail: expectedSha ? `GitHub master esperado: ${expectedSha.slice(0, 7)}.` : 'GitHub master nao foi confirmado nesta leitura.',
        status: expectedSha ? 'done' : 'manual',
      },
      {
        key: 'actions',
        label: 'GitHub Actions Build Docker images',
        detail: 'Abrir o workflow e confirmar que a imagem do commit foi publicada.',
        status: 'manual',
      },
      {
        key: 'watchtower',
        label: 'Watchtower aplicou imagem',
        detail: versionMatches ? `API esta em ${currentApiVersion}.` : `API atual: ${currentApiVersion}; compare com o SHA esperado.`,
        status: versionMatches ? 'done' : expectedSha ? 'pending' : 'manual',
      },
      {
        key: 'public-health',
        label: 'Health publico',
        detail: publicHealthStatus === 'ok' ? 'GET /api/v1/health respondeu OK.' : 'Health publico precisa de revisao.',
        status: publicHealthStatus === 'ok' ? 'done' : 'blocked',
      },
      {
        key: 'public-smoke',
        label: 'Smoke publico',
        detail: publicSmokeStatus === 'ok' ? 'Endpoints publicos criticos responderam.' : 'Algum endpoint do smoke publico falhou.',
        status: publicSmokeStatus === 'ok' ? 'done' : 'blocked',
      },
      {
        key: 'staff-changelog',
        label: 'Changelog Staff',
        detail: latestChangelogSource === 'docs' ? 'Ha changelog Staff documentado; envio ainda depende do ritual pos-verificacao.' : 'Nenhum changelog Staff foi localizado nos docs.',
        status: latestChangelogSource === 'docs' ? 'manual' : 'pending',
      },
    ];
  }

  private publicApiBaseUrl(): string {
    const publicUrl = this.config.get<string>('discord.publicUrl') || process.env.PUBLIC_APP_URL || 'https://app.guild-g3x.com.br';
    return `${publicUrl.replace(/\/+$/, '')}/api/v1`;
  }

  private async fetchJson<T>(url: string, timeoutMs: number, headers?: Record<string, string>): Promise<T> {
    const response = await this.fetchWithTimeout(url, timeoutMs, headers);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json() as T;
  }

  private async fetchWithTimeout(url: string, timeoutMs: number, headers?: Record<string, string>): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, { headers, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Erro desconhecido.';
  }

  private markdownList(items: string[]): string[] {
    if (items.length === 0) return ['- Nenhum registro.'];
    return items.map((item) => `- ${item}`);
  }

  private async loadDossierAuditLogs(or: Prisma.AuditLogWhereInput[]): Promise<UniversalDossier['auditLogs']> {
    const logs = await this.prisma.auditLog.findMany({
      where: { OR: or },
      include: {
        actor: {
          select: {
            discordUsername: true,
            discordNickname: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      actorName: log.actor?.discordNickname ?? log.actor?.discordUsername ?? null,
      createdAt: log.createdAt,
    }));
  }

  private buildUniversalMarkdown(
    title: string,
    id: string,
    summary: UniversalDossier['summary'],
    sections: string[],
    auditLogs: UniversalDossier['auditLogs'],
  ): string {
    return [
      `# ${title}`,
      '',
      `Gerado em: ${new Date().toISOString()}`,
      `ID: ${id}`,
      '',
      '## Resumo',
      ...this.markdownList(summary.map((item) => `${item.label}: ${item.value}`)),
      '',
      ...sections,
      '',
      '## Audit logs recentes',
      ...this.markdownList(auditLogs.map((log) => `${log.createdAt.toISOString()} - ${log.action} (${log.targetType}/${log.targetId ?? '-'}) por ${log.actorName ?? 'sistema'}`)),
    ].join('\n');
  }

  private getAuctionStateReason(
    auction: {
      status: AuctionStatus;
      endsAt: Date;
      auctionMode: AuctionMode;
      requiresStaffReview: boolean;
      minimumLayer?: number | null;
      reopensAt?: Date | null;
      outcome: AuctionDiagnosticSummary['outcome'];
      validBids: number;
      validBidsAtMinimumLayer: number;
    },
    now: Date,
  ): AuctionDiagnosticSummary['stateReason'] {
    if (auction.status === AuctionStatus.OPEN && auction.endsAt > now) {
      return {
        title: 'Leilao aberto',
        description: `A automacao ainda nao deve finalizar: encerra em ${auction.endsAt.toISOString()}.`,
        tone: 'blue',
      };
    }

    if (auction.status === AuctionStatus.OPEN && auction.endsAt <= now) {
      const descriptions: Record<AuctionDiagnosticSummary['outcome'], string> = {
        NO_ACTION: 'O leilao venceu, mas o diagnostico nao encontrou acao automatica pendente.',
        FINISH_STANDARD: 'O leilao venceu com bid valido e pode finalizar pelo fluxo STANDARD.',
        PENDING_REVIEW: auction.requiresStaffReview || auction.auctionMode !== AuctionMode.STANDARD
          ? 'O leilao venceu e precisa entrar em review por regra de modo/tier.'
          : 'O leilao venceu e precisa de revisao antes da entrega.',
        EXPAND_LAYER: `Leilao T4 venceu sem bid apto na camada minima atual ${auction.minimumLayer ?? '-'}; a regra deve expandir a camada.`,
        RELIST: 'O leilao venceu sem bid valido; a regra deve relistar ou reiniciar o ciclo conforme tier/camada.',
      };
      return {
        title: 'Leilao vencido aguardando processamento',
        description: descriptions[auction.outcome],
        tone: auction.outcome === 'FINISH_STANDARD' ? 'green' : 'gold',
      };
    }

    if (auction.status === AuctionStatus.PENDING_REVIEW) {
      return {
        title: 'Aguardando review da Staff',
        description: auction.validBids > 0
          ? `${auction.validBids} bid(s) valido(s) aguardam decisao Staff.`
          : 'O leilao esta em review, mas o diagnostico nao encontrou bid valido.',
        tone: auction.validBids > 0 ? 'gold' : 'red',
      };
    }

    if (auction.status === AuctionStatus.FINISHED) {
      return {
        title: 'Leilao finalizado',
        description: 'O fluxo de vitoria ja foi processado; confira AUCTION_WIN e entrega na timeline.',
        tone: 'green',
      };
    }

    if (auction.status === AuctionStatus.RELISTED) {
      return {
        title: 'Leilao relistado',
        description: auction.reopensAt
          ? `O leilao esta aguardando reabertura em ${auction.reopensAt.toISOString()}.`
          : 'O leilao foi marcado para relist sem horario de reabertura registrado.',
        tone: 'gold',
      };
    }

    return {
      title: 'Leilao cancelado',
      description: 'O leilao foi cancelado e nao deve consumir DKP nem gerar entrega.',
      tone: 'red',
    };
  }
}
