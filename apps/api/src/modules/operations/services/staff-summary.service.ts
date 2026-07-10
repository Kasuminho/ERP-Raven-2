import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AnnouncementStatus,
  AuctionStatus,
  CodexRequestStatus,
  DiscordWebhookDeliveryStatus,
  DKPTransactionType,
  EventStatus,
  ItemInterestStatus,
  ProgressReviewStatus,
} from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { BusinessRulesService } from '../../business-rules/business-rules.service';
import {
  DeploymentPanelSummary,
  OperationPriority,
  OperationTask,
  OperationalHealthSummary,
  StaffDayViewSummary,
  StaffHealthSummary,
  StaffOperationsSummary,
} from '../operations.types';

const HOURS = 60 * 60 * 1000;
const PUBLIC_SMOKE_PATHS = ['/health', '/auctions/health', '/items/health', '/eligibility/health', '/audit/health'];
const DEPLOYMENT_ACTIONS_URL = 'https://github.com/Kasuminho/ERP-Raven-2/actions/workflows/docker-images.yml';

@Injectable()
export class StaffSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessRules: BusinessRulesService,
    private readonly config: ConfigService,
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
      ...pendingAuctionDeliveries.slice(0, 5).map((transaction) => {
        const ageHours = Math.max(0, Math.floor((Date.now() - transaction.createdAt.getTime()) / HOURS));
        const dueAt = new Date(transaction.createdAt.getTime() + thresholds.auctionDropDelivery.highAfterMs);
        return {
          id: transaction.id,
          type: 'DROP_DELIVERY',
          title: 'Entrega de leilao pendente',
          description: `${transaction.player.nickname} tem drop de leilao ha ${ageHours}h para registrar com prova.`,
          href: '/dashboard/staff/deliveries',
          priority: this.priorityByAge(transaction.createdAt, thresholds.auctionDropDelivery),
          createdAt: transaction.createdAt,
          metadata: {
            dueAt: dueAt.toISOString(),
            ageHours,
            priorityReason: ageHours >= 24
              ? 'Entrega atrasada desde o AUCTION_WIN.'
              : 'Entrega ainda dentro do dia operacional, mas precisa comprovante.',
          },
        };
      }),
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
        {
          key: 'rate-limit',
          label: 'Rate limit',
          ready: true,
          detail: 'Provider em memoria local para OAuth/upload; multi-replica exige Redis ou gateway compartilhado.',
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
      protocol: this.buildDeploymentProtocol(currentApiVersion, expectedVersion.sha, publicHealth.status, publicSmoke.status, latestStaffChangelog),
      actionsUrl: DEPLOYMENT_ACTIONS_URL,
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

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Erro desconhecido.';
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
      const { docsDir, files } = await this.readDocsDirectory();
      const changelogFiles = files
        .filter((file) => /^discord-staff-update-\d{4}-\d{2}-\d{2}.+\.md$/.test(file))
        .sort((a, b) => b.localeCompare(a));
      const fileName = changelogFiles[0];

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
      const receipt = await this.prisma.discordWebhookDelivery.findFirst({
        where: {
          webhookKey: 'staff-updates',
          action: 'STAFF_CHANGELOG_SENT',
          targetId: fileName,
          status: DiscordWebhookDeliveryStatus.SENT,
        },
        orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }],
      });

      return {
        title,
        fileName,
        inferredDate,
        source: 'docs',
        sentReceiptAvailable: Boolean(receipt),
        note: receipt?.sentAt
          ? `Recibo interno encontrado em ${receipt.sentAt.toISOString()}; URL de webhook nao e armazenada.`
          : 'Changelog Staff documentado; recibo interno ainda nao encontrado para este arquivo.',
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

  private async readDocsDirectory(): Promise<{ docsDir: string; files: string[] }> {
    const candidates = [
      join(process.cwd(), 'docs'),
      join(process.cwd(), '..', 'docs'),
      join(process.cwd(), '..', '..', 'docs'),
    ];

    for (const docsDir of candidates) {
      try {
        return { docsDir, files: await readdir(docsDir) };
      } catch {
        // Try the next likely workspace root.
      }
    }

    throw new Error('Diretorio docs nao encontrado.');
  }

  private buildDeploymentProtocol(
    currentApiVersion: string,
    expectedSha: string | null | undefined,
    publicHealthStatus: DeploymentPanelSummary['publicHealth']['status'],
    publicSmokeStatus: DeploymentPanelSummary['publicSmoke']['status'],
    latestStaffChangelog: DeploymentPanelSummary['latestStaffChangelog'],
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
        detail: latestStaffChangelog.sentReceiptAvailable
          ? 'Changelog Staff documentado e recibo interno encontrado sem guardar URL de webhook.'
          : latestStaffChangelog.source === 'docs'
            ? 'Ha changelog Staff documentado; envio ainda precisa de recibo interno.'
            : 'Nenhum changelog Staff foi localizado nos docs.',
        status: latestStaffChangelog.sentReceiptAvailable ? 'done' : latestStaffChangelog.source === 'docs' ? 'manual' : 'pending',
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
}
