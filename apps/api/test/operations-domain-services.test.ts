import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { AuctionDiagnosticsService } from '../src/modules/operations/services/auction-diagnostics.service';
import { DiscordOperationsService } from '../src/modules/operations/services/discord-operations.service';
import { MeetingService } from '../src/modules/operations/services/meeting.service';
import { OperationalBriefingService } from '../src/modules/operations/services/operational-briefing.service';
import { OperationsAuditService } from '../src/modules/operations/services/operations-audit.service';
import { OperationsRulesService } from '../src/modules/operations/services/operations-rules.service';
import { PlayerOperationsService } from '../src/modules/operations/services/player-operations.service';
import { StaffInsightsService } from '../src/modules/operations/services/staff-insights.service';
import { StaffSummaryService } from '../src/modules/operations/services/staff-summary.service';
import { UniversalDossierService } from '../src/modules/operations/services/universal-dossier.service';
import { WeeklySummaryService } from '../src/modules/operations/services/weekly-summary.service';

describe('Operations domain services', () => {
  it('builds staff summary and health inside the staff summary domain service', async () => {
    const now = new Date(Date.now() - 3_600_000);
    const prisma = {
      $queryRaw: mock.fn(async () => [{ ok: 1 }]),
      auction: { findMany: mock.fn(async () => [{ id: 'auction-1', itemName: 'Lamina', updatedAt: now }]) },
      codexRequest: { findMany: mock.fn(async () => []) },
      itemRequest: { findMany: mock.fn(async () => []) },
      itemInterestPost: { findMany: mock.fn(async () => []) },
      dKPTransaction: { findMany: mock.fn(async () => []) },
      dropHistory: { findMany: mock.fn(async () => []) },
      playerProgress: {
        findMany: mock.fn(async () => []),
        count: mock.fn(async () => 5),
      },
      announcement: {
        findMany: mock.fn(async () => []),
        count: mock.fn(async () => 1),
      },
      event: {
        findMany: mock.fn(async () => []),
        count: mock.fn(async () => 2),
      },
      auditLog: {
        count: mock.fn(async () => 2),
        findFirst: mock.fn(async (args: { where: { action: { contains: string } } }) => (
          args.where.action.contains === 'AUTOMATION'
            ? { createdAt: new Date('2026-07-02T02:00:00.000Z') }
            : { createdAt: new Date('2026-07-02T01:00:00.000Z') }
        )),
      },
      discordWebhookDelivery: {
        count: mock.fn(async (args: { where: { status: string } }) => {
          if (args.where.status === 'PENDING') return 1;
          if (args.where.status === 'FAILED') return 2;
          return 0;
        }),
        findFirst: mock.fn(async (args: { where: { action?: string; status?: unknown; retriedAt?: unknown } }) => {
          if (args.where.action === 'STAFF_CHANGELOG_SENT') return { sentAt: new Date('2026-07-10T03:00:00.000Z') };
          if (typeof args.where.status === 'object') return { queuedAt: new Date(Date.now() - 20 * 60_000), action: 'TEST_PENDING', channelLabel: 'Staff', status: 'PENDING' };
          if (args.where.retriedAt) return { retriedAt: new Date('2026-07-10T02:30:00.000Z'), action: 'TEST_RETRY', channelLabel: 'Staff' };
          if (args.where.status === 'FAILED') return { failedAt: new Date('2026-07-10T02:45:00.000Z'), action: 'TEST_FAILED', channelLabel: 'Staff' };
          return null;
        }),
      },
    };
    const businessRules = {
      getStaffPendingThresholds: mock.fn(async () => ({
        auctionReview: { mediumAfterMs: 1, highAfterMs: 2 },
        codexRetry: { mediumAfterMs: 1, highAfterMs: 2 },
        codexPending: { mediumAfterMs: 1, highAfterMs: 2 },
        itemRequest: { mediumAfterMs: 1, highAfterMs: 2 },
        interestDelivery: { mediumAfterMs: 1, highAfterMs: 2 },
        auctionDropDelivery: { mediumAfterMs: 1, highAfterMs: 2 },
        progressReview: { mediumAfterMs: 1, highAfterMs: 2 },
        eventFinalization: { mediumAfterMs: 1, highAfterMs: 2 },
      })),
    };
    const config = {
      get: mock.fn((key: string) => {
        if (key === 'IMAGE_STORAGE_PROVIDER') return 'local';
        if (key.startsWith('discord.webhooks.')) return 'configured';
        return undefined;
      }),
    };
    const previousBackupStatusFile = process.env.BACKUP_STATUS_FILE;
    const previousAppVersion = process.env.APP_VERSION;
    const previousExpectedVersion = process.env.DEPLOY_EXPECTED_VERSION;
    const previousFetch = globalThis.fetch;
    process.env.BACKUP_STATUS_FILE = 'C:/tmp/raven2-missing-backup-marker.json';
    process.env.APP_VERSION = 'abc1234';
    process.env.DEPLOY_EXPECTED_VERSION = 'abc123456789';
    globalThis.fetch = mock.fn(async (url: string) => ({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => (url.endsWith('/health')
        ? { status: 'ok', checkedAt: '2026-07-02T00:00:00.000Z', version: 'abc1234' }
        : {}),
      text: async () => '',
    })) as never;
    const service = new StaffSummaryService(prisma as never, businessRules as never, config as never);

    const staff = await service.getStaffSummary();
    assert.equal(staff.counts.reviews, 1);
    assert.equal(staff.tasks[0].type, 'STAFF_REVIEW');
    const health = await service.getStaffHealth();
    assert.equal(health.checks.find((check) => check.key === 'database')?.ready, true);
    assert.equal(health.checks.find((check) => check.key === 'discord-webhooks')?.ready, true);
    assert.equal(health.checks.find((check) => check.key === 'verified-backup')?.ready, false);
    const operationalHealth = await service.getOperationalHealth();
    assert.equal(operationalHealth.discordFailures24h, 2);
    assert.equal(operationalHealth.pendingQueueApproximation, 1);
    const deploy = await service.getDeploymentPanel();
    assert.equal(deploy.currentApiVersion, 'abc1234');
    assert.equal(deploy.expectedVersion.matchesCurrent, true);
    assert.equal(deploy.publicSmoke.status, 'ok');
    assert.equal(deploy.publicSmoke.outcome, 'ok');
    assert.equal(deploy.protocol.find((step) => step.key === 'watchtower')?.status, 'done');
    assert.equal(deploy.webhookQueue.pending, 1);
    assert.equal(deploy.webhookQueue.failed, 2);
    assert.equal(deploy.webhookQueue.status, 'down');
    assert.equal(deploy.latestStaffChangelog.sentReceiptAvailable, true);
    assert.equal(deploy.protocol.find((step) => step.key === 'staff-changelog')?.status, 'done');
    globalThis.fetch = mock.fn(async () => ({
      ok: false,
      status: 403,
      headers: { get: () => 'text/html; charset=UTF-8' },
      json: async () => undefined,
      text: async () => '<!DOCTYPE html><title>Just a moment...</title>',
    })) as never;
    const edgeDeploy = await service.getDeploymentPanel();
    assert.equal(edgeDeploy.publicHealth.diagnostic, 'edge-challenge');
    assert.equal(edgeDeploy.publicSmoke.status, 'degraded');
    assert.equal(edgeDeploy.publicSmoke.outcome, 'edge-challenge');
    assert.equal(edgeDeploy.publicSmoke.checks[0].diagnostic, 'edge-challenge');
    assert.equal(edgeDeploy.protocol.find((step) => step.key === 'public-smoke')?.status, 'manual');
    const dayView = await service.getStaffDayView();
    assert.equal(dayView.todaysAnnouncements, 1);
    assert.equal(dayView.openEvents, 2);
    assert.equal(dayView.pendingStaffVotes, 1);
    assert.equal(dayView.pendingDeliveries, 0);
    assert.equal(dayView.pendingProgressReviews, 5);
    assert.equal(dayView.urgentTasks.length, 1);
    if (previousBackupStatusFile === undefined) {
      delete process.env.BACKUP_STATUS_FILE;
    } else {
      process.env.BACKUP_STATUS_FILE = previousBackupStatusFile;
    }
    if (previousAppVersion === undefined) {
      delete process.env.APP_VERSION;
    } else {
      process.env.APP_VERSION = previousAppVersion;
    }
    if (previousExpectedVersion === undefined) {
      delete process.env.DEPLOY_EXPECTED_VERSION;
    } else {
      process.env.DEPLOY_EXPECTED_VERSION = previousExpectedVersion;
    }
    globalThis.fetch = previousFetch;
  });

  it('calculates season summaries inside the weekly domain service', async () => {
    const prisma = {
      dKPTransaction: {
        findMany: mock.fn(async () => [
          { amount: 120, player: { id: 'p1', nickname: 'Aiko' } },
          { amount: -40, player: { id: 'p1', nickname: 'Aiko' } },
          { amount: 80, player: { id: 'p2', nickname: 'Brann' } },
        ]),
      },
      eventAttendance: {
        findMany: mock.fn(async () => [
          { eventId: 'e1', player: { id: 'p1', nickname: 'Aiko' } },
          { eventId: 'e2', player: { id: 'p1', nickname: 'Aiko' } },
          { eventId: 'e1', player: { id: 'p2', nickname: 'Brann' } },
        ]),
      },
      dropHistory: {
        findMany: mock.fn(async () => [
          { player: { id: 'p2', nickname: 'Brann' } },
          { player: { id: 'p1', nickname: 'Aiko' } },
        ]),
      },
      daoshiCashReceipt: {
        findMany: mock.fn(async () => [
          { approvedCents: 2500, player: { id: 'p2', nickname: 'Brann' } },
        ]),
      },
      itemRequest: {
        count: mock.fn(async () => 3),
      },
    };
    const service = new WeeklySummaryService(
      prisma as never,
      { sendOperationalNotification: mock.fn(async () => undefined) } as never,
      { getStaffSummary: mock.fn(async () => ({ counts: { reviews: 0, deliveries: 0, codex: 0, interests: 0 } })) } as never,
    );

    const summary = await service.getSeasonSummary('2026-07');

    assert.equal(summary.month, '2026-07');
    assert.equal(summary.dkpEarned, 200);
    assert.equal(summary.dkpSpent, 40);
    assert.equal(summary.attendanceEvents, 2);
    assert.equal(summary.dropsDelivered, 2);
    assert.equal(summary.daoshiApprovedCents, 2500);
    assert.equal(summary.itemRequestsDelivered, 3);
    assert.equal(summary.topPlayers[0].nickname, 'Aiko');
    assert.equal(summary.topPlayers[1].nickname, 'Brann');
    assert.equal(prisma.dKPTransaction.findMany.mock.calls.length, 1);
  });

  it('calculates fairness and player comparison inside the staff insights domain service', async () => {
    const recent = new Date();
    const prisma = {
      player: {
        findMany: mock.fn(async (args: { where?: { id?: { in?: string[] } } }) => {
          if (args.where?.id?.in) {
            return [
              {
                id: 'p1',
                nickname: 'Aiko',
                class: 'VANGUARD',
                dimensionalLayer: 4,
                attendancePercentage: 95,
                combatPower: 12345,
              },
              {
                id: 'p2',
                nickname: 'Brann',
                class: 'DIVINE_CASTER',
                dimensionalLayer: 3,
                attendancePercentage: 87,
                combatPower: 11300,
              },
            ];
          }

          return [
            { id: 'p1', nickname: 'Aiko', attendancePercentage: 95 },
            { id: 'p2', nickname: 'Brann', attendancePercentage: 87 },
          ];
        }),
      },
      dropHistory: {
        findMany: mock.fn(async () => [
          { playerId: 'p2', deliveredAt: recent, itemCatalog: { itemTier: 'T4' } },
          { playerId: 'p2', deliveredAt: new Date(recent.getTime() - 1_000), itemCatalog: { itemTier: 'LEGENDARY' } },
          { playerId: 'p1', deliveredAt: recent, itemCatalog: { itemTier: 'T3' } },
        ]),
        count: mock.fn(async (args: { where: { playerId: string } }) => args.where.playerId === 'p1' ? 2 : 1),
        findFirst: mock.fn(async (args: { where: { playerId: string } }) => ({ deliveredAt: args.where.playerId === 'p1' ? recent : null })),
      },
      dKPTransaction: {
        groupBy: mock.fn(async () => [
          { playerId: 'p1', _sum: { amount: 150 } },
          { playerId: 'p2', _sum: { amount: 60 } },
        ]),
        aggregate: mock.fn(async (args: { where: { playerId: string } }) => ({
          _sum: { amount: args.where.playerId === 'p1' ? 150 : 60 },
        })),
      },
      itemRequest: {
        count: mock.fn(async (args: { where: { playerId: string } }) => args.where.playerId === 'p1' ? 1 : 0),
      },
    };
    const service = new StaffInsightsService(prisma as never);

    const fairness = await service.getLootFairness(3);
    assert.equal(fairness.days, 7);
    assert.equal(fairness.rows[0].playerId, 'p2');
    assert.equal(fairness.rows[0].dropsCount, 2);
    assert.equal(fairness.rows[0].t4Drops, 1);
    assert.equal(fairness.rows[0].legendaryDrops, 1);
    assert.equal(fairness.rows[1].currentDkp, 150);

    const comparison = await service.comparePlayers(['p1', 'p1', 'p2', 'p3', 'p4', 'p5']);
    assert.equal(comparison.players.length, 2);
    assert.equal(comparison.players[0].playerId, 'p1');
    assert.equal(comparison.players[0].drops30d, 2);
    assert.equal(comparison.players[0].activeRequests, 1);
    assert.equal(comparison.players[1].currentDkp, 60);
  });

  it('builds Discord previews and queue summaries inside the Discord operations domain service', async () => {
    const queuedAt = new Date('2026-07-02T00:00:00.000Z');
    const queue = {
      listDeliveries: mock.fn(async () => [
        {
          id: 'delivery-1',
          webhookKey: 'auctions',
          channelLabel: 'Leiloes',
          action: 'AUCTION_CREATED',
          targetId: 'auction-1',
          status: 'FAILED',
          attempts: 2,
          maxAttempts: 5,
          retryable: true,
          payloadPreview: { content: 'Aviso teste', embeds: [{ title: 'Embed teste', fields: [{ name: 'A', value: 'B' }] }] },
          lastError: 'HTTP 500',
          queuedAt,
        },
        {
          id: 'delivery-2',
          webhookKey: 'drops',
          channelLabel: 'Drops',
          status: 'SENT',
          attempts: 1,
          maxAttempts: 5,
          retryable: false,
          payloadPreview: { embeds: [{ title: 'Drop entregue' }] },
          queuedAt,
          sentAt: new Date('2026-07-02T00:01:00.000Z'),
        },
      ]),
      retryDelivery: mock.fn(async () => undefined),
    };
    const config = {
      get: mock.fn((key: string) => {
        if (key === 'discord.publicUrl') return 'https://app.guild-g3x.com.br/';
        if (key === 'discord.webhookUsername') return 'Aristolfo, 570 anos de webhook';
        if (key === 'discord.webhookAvatarUrl') return 'https://app.guild-g3x.com.br/aristolfo-webhooks.png';
        return undefined;
      }),
    };
    const service = new DiscordOperationsService(config as never, queue as never);

    const templates = service.getDiscordTemplates();
    assert.equal(templates.templates.length, 8);
    assert.equal(templates.templates.find((template) => template.key === 'auction_created')?.previews.length, 2);
    assert.equal(templates.templates.find((template) => template.key === 'staff_review')?.previews.length, 1);
    assert.equal(templates.templates[0].previews[0].payload.username, 'Aristolfo, 570 anos de webhook');
    assert.ok(JSON.stringify(templates).includes('https://app.guild-g3x.com.br/dashboard/auctions/preview'));

    const summary = await service.getDiscordWebhookQueue(25);
    assert.equal(queue.listDeliveries.mock.calls[0].arguments[0], 25);
    assert.equal(summary.counts.FAILED, 1);
    assert.equal(summary.counts.SENT, 1);
    assert.equal(summary.deliveries[0].payloadSummary.includes('Aviso teste'), true);
    assert.equal(summary.deliveries[1].sentAt, '2026-07-02T00:01:00.000Z');

    await service.retryDiscordWebhookDelivery('delivery-1');
    assert.equal(queue.retryDelivery.mock.calls[0].arguments[0], 'delivery-1');
    assert.equal(queue.listDeliveries.mock.calls.at(-1)?.arguments[0], 50);
  });

  it('builds guild rules and maintenance summaries inside the rules domain service', async () => {
    const businessRules = {
      getMaintenanceMode: mock.fn(async () => ({ enabled: true, message: 'Manutencao planejada' })),
      getEventRewards: mock.fn(async () => ({ BOSS: 10, RAID: 20 })),
      getAuctionTierRules: mock.fn(async () => ({
        T2: { minimumBid: 100 },
        T3: { minimumBid: 250 },
        T4: { minimumBid: 450, auctionMode: 'SCORE', minimumLayer: 4 },
        LEGENDARY: { minimumBid: 1000, auctionMode: 'ALL_IN', minimumLayer: 8 },
      })),
      getPriorityScoreRules: mock.fn(async () => ({
        layerWeight: 100,
        attendanceWeight: 10,
        bidDkpWeight: 1,
        classPriorityBonus: 25,
      })),
    };
    const service = new OperationsRulesService(businessRules as never);

    const maintenance = await service.getMaintenanceMode();
    assert.equal(maintenance.enabled, true);
    assert.equal(maintenance.message, 'Manutencao planejada');

    const rules = await service.getGuildRules();
    assert.deepEqual(rules.sections.map((section) => section.key), ['dkp', 'auctions', 'interests', 'attendance', 'daoshi']);
    assert.ok(rules.sections.find((section) => section.key === 'auctions')?.bullets.join(' ').includes('T4 minimo 450'));
    assert.ok(rules.sections.find((section) => section.key === 'attendance')?.bullets.join(' ').includes('BOSS=10'));
  });

  it('builds player summary, notices and action plan inside the player operations domain service', async () => {
    const now = new Date();
    const player = {
      id: 'player-1',
      userId: 'user-1',
      nickname: 'PlayerDemo',
      dimensionalLayer: 5,
      joinedAt: now,
      isActive: true,
    };
    const request = {
      id: 'request-1',
      playerId: player.id,
      itemName: 'Cristal T3',
      rankPosition: 1,
      remainingQuantity: 1,
      totalQuantity: 1,
      warned3d: true,
      warned4d: false,
      updatedAt: new Date('2026-07-02T00:00:00.000Z'),
      itemCatalog: { category: 'material' },
    };
    const codexRequest = {
      id: 'codex-1',
      playerId: player.id,
      status: 'SENT',
      sentAt: new Date('2026-07-02T00:05:00.000Z'),
      updatedAt: new Date('2026-07-02T00:04:00.000Z'),
      queuedAt: new Date('2026-07-02T00:03:00.000Z'),
    };
    const bid = {
      id: 'bid-1',
      playerId: player.id,
      auctionId: 'auction-1',
      bidAmount: 450,
      createdAt: new Date('2026-07-02T00:10:00.000Z'),
      auction: {
        id: 'auction-1',
        itemName: 'Espada T4',
        status: 'OPEN',
        endsAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
      },
    };
    const openInterest = {
      id: 'interest-1',
      title: 'Skill T4',
      status: 'OPEN',
      closesAt: new Date(Date.now() + 5 * 60 * 60 * 1000),
      createdAt: new Date('2026-07-02T00:15:00.000Z'),
      itemCatalog: { category: 'skill' },
    };
    const suggestedAuction = {
      id: 'auction-2',
      itemName: 'Arco T4',
      itemTier: 'T4',
      status: 'OPEN',
      minimumLayer: 4,
      endsAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      createdAt: new Date('2026-07-02T00:20:00.000Z'),
    };
    const prisma = {
      player: {
        findFirst: mock.fn(async (args: { select?: unknown }) => (args.select ? { id: player.id } : player)),
      },
      itemRequest: { findMany: mock.fn(async () => [request]) },
      codexRequest: { findMany: mock.fn(async () => [codexRequest]) },
      auctionBid: { findMany: mock.fn(async () => [bid]) },
      itemInterestPost: { findMany: mock.fn(async () => [openInterest]) },
      itemInterestEntry: { findMany: mock.fn(async () => []) },
      playerProgress: { findMany: mock.fn(async () => []) },
      event: {
        findMany: mock.fn(async () => [{
          id: 'event-1',
          name: 'BOSSES T4',
          type: 'BOSS',
          status: 'OPEN',
          startsAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        }]),
      },
      auction: { findMany: mock.fn(async () => [suggestedAuction]) },
      dKPLock: { findMany: mock.fn(async () => [{ auctionId: bid.auctionId, amount: 450 }]) },
      daoshiCashReceipt: { aggregate: mock.fn(async () => ({ _count: 1 })) },
    };
    const service = new PlayerOperationsService(prisma as never);

    const summary = await service.getPlayerSummary('user-1');
    assert.equal(summary.counts.requests, 1);
    assert.equal(summary.tasks.some((task) => task.type === 'CODEX_CONFIRMATION'), true);
    assert.equal(JSON.stringify(summary).includes('concorrente'), false);

    const actionPlan = await service.getPlayerActionPlan('user-1');
    assert.equal(actionPlan.cards.some((card) => card.type === 'AUCTION_BID'), true);
    assert.equal(actionPlan.cards.some((card) => card.type === 'AUCTION_AVAILABLE' && card.id === suggestedAuction.id), true);
    assert.equal(JSON.stringify(actionPlan).includes('ranking'), false);

    const notices = await service.getNoticeBoard('user-1');
    assert.equal(notices.some((notice) => notice.type === 'DAOSHI_PENDING'), true);
    assert.equal(notices.some((notice) => notice.type === 'AUCTION_ENDING'), true);
  });

  it('loads recent audit entries inside the operations audit domain service', async () => {
    const prisma = {
      auditLog: {
        findMany: mock.fn(async () => [{
          id: 'audit-1',
          action: 'TEST_ACTION',
          actor: { id: 'user-1', discordUsername: 'staff', discordNickname: 'Staff' },
          createdAt: new Date('2026-07-02T00:00:00.000Z'),
        }]),
      },
    };
    const service = new OperationsAuditService(prisma as never);

    const highLimit = await service.getRecentAudit(999);
    assert.equal(highLimit[0].id, 'audit-1');
    assert.equal(prisma.auditLog.findMany.mock.calls[0].arguments[0].take, 100);
    assert.deepEqual(prisma.auditLog.findMany.mock.calls[0].arguments[0].include.actor.select, {
      id: true,
      discordUsername: true,
      discordNickname: true,
    });

    await service.getRecentAudit(-5);
    assert.equal(prisma.auditLog.findMany.mock.calls[1].arguments[0].take, 1);
  });

  it('builds morning briefing inside the briefing domain service', async () => {
    const now = new Date();
    const expiredAt = new Date(now.getTime() - 60_000);
    const endingAt = new Date(now.getTime() + 60_000);
    const prisma = {
      auction: {
        findMany: mock.fn(async (_args: unknown) => {
          if (prisma.auction.findMany.mock.calls.length === 1) {
            return [{ id: 'expired-1', itemName: 'Machado', endsAt: expiredAt }];
          }
          return [{ id: 'ending-1', itemName: 'Arco', endsAt: endingAt }];
        }),
      },
    };
    const staffSummary = {
      getStaffSummary: mock.fn(async () => ({
        tasks: [
          {
            id: 'review-1',
            type: 'STAFF_REVIEW',
            title: 'Review pendente',
            description: 'Decidir leilao.',
            href: '/dashboard/staff/reviews',
            priority: 'high',
            createdAt: now,
          },
          {
            id: 'drop-1',
            type: 'DROP_DELIVERY',
            title: 'Entrega pendente',
            description: 'Confirmar print.',
            href: '/dashboard/staff/deliveries',
            priority: 'medium',
            createdAt: now,
          },
        ],
        counts: {
          reviews: 1,
          codex: 0,
          itemRequests: 0,
          interests: 0,
          deliveries: 1,
          progress: 0,
          events: 0,
          announcements: 0,
        },
      })),
      getStaffHealth: mock.fn(async () => ({
        generatedAt: now,
        checks: [{ key: 'backup', label: 'Backup verificado', ready: false, detail: 'Sem marcador.' }],
      })),
    };
    const integrity = {
      getIntegritySummary: mock.fn(async () => ({
        generatedAt: now,
        counts: { high: 1, medium: 0, low: 0, total: 1 },
        issues: [{
          id: 'issue-1',
          type: 'FINALIZED_EVENT_WITHOUT_DKP',
          severity: 'high',
          title: 'Evento sem DKP',
          description: 'Falta transacao.',
          href: '/dashboard/admin/events',
          createdAt: now,
        }],
      })),
    };
    const service = new OperationalBriefingService(prisma as never, staffSummary as never, integrity as never);

    const briefing = await service.getStaffMorningBriefing();

    assert.equal(briefing.title, 'Resumo matinal Staff');
    assert.equal(briefing.counts.expiredOpenAuctions, 1);
    assert.equal(briefing.counts.endingAuctions24h, 1);
    assert.equal(briefing.counts.healthAlerts, 1);
    assert.equal(briefing.counts.integrityHigh, 1);
    assert.equal(briefing.sections.find((section) => section.key === 'auctions')?.tasks.length, 3);
    assert.match(briefing.markdown, /Resumo matinal Staff/);
    assert.equal(prisma.auction.findMany.mock.calls.length, 2);
  });

  it('builds meeting summaries inside the meeting domain service', async () => {
    const day = {
      generatedAt: new Date('2026-07-02T00:00:00.000Z'),
      todaysAnnouncements: 1,
      openEvents: 2,
      pendingStaffVotes: 3,
      pendingDeliveries: 4,
      pendingProgressReviews: 5,
      urgentTasks: [],
    };
    const prisma = {
      auction: {
        findMany: mock.fn(async () => [
          { id: 'a1', itemName: 'Espada', status: 'PENDING_REVIEW', updatedAt: new Date('2026-07-02T01:00:00.000Z') },
        ]),
      },
      itemInterestPost: {
        findMany: mock.fn(async () => [
          { id: 'i1', title: 'Cajado', status: 'VOTING', updatedAt: new Date('2026-07-02T02:00:00.000Z'), entries: [{ id: 'e1' }, { id: 'e2' }] },
        ]),
      },
      event: {
        findMany: mock.fn(async () => [
          { id: 'ev1', name: 'Boss T4', type: 'BOSS', startsAt: new Date('2026-07-02T03:00:00.000Z'), status: 'OPEN' },
        ]),
      },
      dKPTransaction: {
        findMany: mock.fn(async () => [
          { id: 'tx1', type: 'ADMIN_ADJUSTMENT', amount: 25, createdAt: new Date('2026-07-02T04:00:00.000Z'), player: { nickname: 'Aiko' } },
        ]),
      },
      playerStaffNote: {
        findMany: mock.fn(async () => [
          { id: 'note1', playerId: 'p1', severity: 'WARNING', body: 'Precisa alinhamento.', createdAt: new Date('2026-07-02T05:00:00.000Z'), player: { nickname: 'Brann' } },
        ]),
      },
      announcement: {
        findMany: mock.fn(async () => [
          { id: 'ann1', title: 'Raid hoje', type: 'RAID', eventTime: new Date('2026-07-02T06:00:00.000Z'), status: 'ACTIVE' },
        ]),
      },
      auditLog: {
        findMany: mock.fn(async () => []),
      },
    };
    const audit = { log: mock.fn() };
    const service = new MeetingService(prisma as never, audit as never, { getStaffDayView: mock.fn(async () => day) } as never);

    const summary = await service.getStaffMeetingSummary();

    assert.equal(summary.todaysAnnouncements, 1);
    assert.equal(summary.reviewAuctions[0].itemName, 'Espada');
    assert.equal(summary.votingInterests[0].entries, 2);
    assert.equal(summary.openEventRows[0].name, 'Boss T4');
    assert.equal(summary.sections.length, 7);
    assert.equal(summary.sections.find((section) => section.key === 'loot')?.items.length, 2);
    assert.equal(summary.sections.find((section) => section.key === 'dkp')?.items[0]?.title, 'ADMIN_ADJUSTMENT: Aiko');
    assert.match(summary.markdown, /Pauta Staff/);
    assert.equal(prisma.auction.findMany.mock.calls.length, 1);
  });

  it('marks meeting items as resolved through audit log', async () => {
    const prisma = {};
    const audit = { log: mock.fn(async () => undefined) };
    const service = new MeetingService(prisma as never, audit as never, { getStaffDayView: mock.fn() } as never);

    await service.resolveMeetingItem('2026-07-02:MEETING_AUCTION_REVIEW:a1', 'user-1', {
      title: 'Review: Espada',
      type: 'MEETING_AUCTION_REVIEW',
      href: '/dashboard/staff/reviews',
    });

    assert.equal(audit.log.mock.calls.length, 1);
    assert.equal(audit.log.mock.calls[0].arguments[0].action, 'STAFF_MEETING_ITEM_RESOLVED');
    assert.equal(audit.log.mock.calls[0].arguments[0].targetType, 'StaffMeetingItem');
    assert.equal(audit.log.mock.calls[0].arguments[0].targetId, '2026-07-02:MEETING_AUCTION_REVIEW:a1');
  });

  it('calculates auction diagnostics inside the auction domain service', async () => {
    const createdAt = new Date('2026-07-02T00:00:00.000Z');
    const endsAt = new Date(Date.now() - 60_000);
    const prisma = {
      auction: {
        findUnique: mock.fn(async () => ({
          id: 'auction-1',
          itemName: 'Cajado',
          minimumBid: 100,
          auctionMode: 'STANDARD',
          itemTier: 'T4',
          itemType: 'WEAPON',
          minimumLayer: 4,
          requiresStaffReview: false,
          createdAt,
          updatedAt: createdAt,
          endsAt,
          status: 'OPEN',
          createdBy: { discordUsername: 'staff-user', discordNickname: 'Staff' },
          bids: [{
            id: 'bid-1',
            playerId: 'player-1',
            bidAmount: 150,
            isValid: true,
            createdAt: new Date('2026-07-02T00:10:00.000Z'),
            player: { id: 'player-1', nickname: 'Aiko', dimensionalLayer: 4, attendancePercentage: 91.5 },
          }],
          dkpLocks: [{
            id: 'lock-1',
            playerId: 'player-1',
            amount: 150,
            released: false,
            createdAt: new Date('2026-07-02T00:11:00.000Z'),
            player: { id: 'player-1', nickname: 'Aiko' },
          }],
          bidCancellationRequests: [],
          reviewVotes: [],
          bidInvalidationVotes: [],
          dropHistory: {
            id: 'drop-1',
            playerId: 'player-1',
            nicknameIngame: null,
            itemName: 'Cajado',
            deliveredAt: new Date('2026-07-02T02:00:00.000Z'),
            createdAt: new Date('2026-07-02T02:00:00.000Z'),
            staffDiscordId: 'staff-1',
            proofImageUrl: 'proof.png',
            player: { id: 'player-1', nickname: 'Aiko' },
          },
        })),
        findMany: mock.fn(async () => [
          { id: 'auction-1', itemName: 'Cajado', endsAt: new Date('2026-07-02T01:00:00.000Z') },
          { id: 'auction-2', itemName: 'Arco', endsAt: new Date('2026-07-02T02:00:00.000Z') },
        ]),
      },
      dKPTransaction: {
        findMany: mock.fn(async (args: { where: { referenceId?: string } }) => (
          args.where.referenceId === 'auction-1'
            ? [{
                id: 'tx-1',
                type: 'AUCTION_WIN',
                amount: -150,
                playerId: 'player-1',
                createdAt: new Date('2026-07-02T01:00:00.000Z'),
                player: { id: 'player-1', nickname: 'Aiko' },
                createdBy: { discordUsername: 'staff-user', discordNickname: null },
              }]
            : [{ referenceId: 'auction-1', player: { nickname: 'Aiko' } }]
        )),
      },
      auditLog: {
        findMany: mock.fn(async () => [{
          id: 'audit-1',
          action: 'AUCTION_TEST',
          targetType: 'Auction',
          targetId: 'auction-1',
          createdAt: new Date('2026-07-02T02:30:00.000Z'),
          metadata: { auctionId: 'auction-1' },
          actor: { discordUsername: 'auditor', discordNickname: null },
        }]),
      },
    };
    const service = new AuctionDiagnosticsService(prisma as never);

    const options = await service.getAuctionDiagnosticOptions();
    assert.equal(options[0].id, 'auction-1');
    assert.equal(options[0].winnerName, 'Aiko');
    assert.equal(options[1].winnerName, null);
    const diagnostics = await service.getAuctionDiagnostics('auction-1');
    assert.equal(diagnostics.auction.id, 'auction-1');
    assert.equal(diagnostics.outcome, 'FINISH_STANDARD');
    assert.equal(diagnostics.stateReason.title, 'Leilao vencido aguardando processamento');
    assert.equal(diagnostics.counts.validBids, 1);
    assert.equal(diagnostics.counts.validBidsWithActiveLocks, 1);
    assert.equal(diagnostics.counts.validBidsAtMinimumLayer, 1);
    assert.equal(diagnostics.counts.auditLogs, 1);
    assert.equal(diagnostics.bids[0].nickname, 'Aiko');
    assert.equal(diagnostics.bids[0].hasActiveLock, true);
    assert.equal(diagnostics.locks[0].amount, 150);
    assert.equal(diagnostics.auditLogs[0].actorName, 'auditor');
    const preview = await service.getAuctionFinalizationPreview('auction-1');
    assert.equal(preview.auctionId, 'auction-1');
    assert.equal(preview.action, 'FINISH_STANDARD');
    assert.equal(preview.candidate?.nickname, 'Aiko');
    assert.equal(preview.candidate?.bidAmount, 150);
    assert.equal(preview.locksToConsume[0].id, 'lock-1');
    assert.equal(preview.locksToRelease.length, 0);
    assert.equal(preview.nextState?.status, 'FINISHED');
    const dossier = await service.getAuctionDossier('auction-1');
    assert.equal(dossier.auctionId, 'auction-1');
    assert.equal(dossier.title, 'Dossie Staff - Cajado');
    assert.match(dossier.markdown, /## Previa de finalizacao/);
    assert.match(dossier.markdown, /Candidato: Aiko/);
    assert.match(dossier.markdown, /AUCTION_WIN/);
    const universal = await service.getUniversalDossier('auction', 'auction-1');
    assert.equal(universal.type, 'auction');
    assert.equal(universal.id, 'auction-1');
    assert.equal(universal.title, 'Dossie Staff - Cajado');
    assert.equal(universal.summary.find((item) => item.label === 'Bids validos')?.value, '1');
    assert.equal(universal.internalLinks[0].href, '/dashboard/staff/auction-diagnostics?auctionId=auction-1');
    assert.equal(universal.auditLogs[0].action, 'AUCTION_TEST');
    assert.match(universal.markdown, /Dossie Staff - Cajado/);
    const timeline = await service.getAuctionTimeline('auction-1');
    assert.equal(timeline[0].type, 'AUCTION_CREATED');
    assert.ok(timeline.some((event) => event.type === 'BID_CREATED'));
    assert.ok(timeline.some((event) => event.type === 'AUCTION_WIN'));
    assert.ok(timeline.some((event) => event.type === 'DROP_DELIVERED'));
    assert.ok(timeline.some((event) => event.type === 'AUDIT_LOG'));
  });

  it('builds non-auction universal dossiers inside the dossier domain service', async () => {
    const prisma = {
      itemRequest: {
        findUnique: mock.fn(async () => ({
          id: 'request-1',
          itemName: 'Essencia Suprema',
          playerName: 'Aiko',
          playerId: 'player-1',
          rankPosition: 2,
          remainingQuantity: 3,
          totalQuantity: 5,
          updateProofStatus: 'APPROVED',
          createdAt: new Date('2026-07-01T10:00:00.000Z'),
          updatedAt: new Date('2026-07-02T10:00:00.000Z'),
          threadId: 'thread-1',
          lastReminderStage: 'SECOND',
          lastReminderAt: new Date('2026-07-02T09:00:00.000Z'),
          player: { id: 'player-1', nickname: 'Aiko', dimensionalLayer: 4 },
          itemCatalog: {
            id: 'item-1',
            namePt: 'Essencia Suprema',
            nameEn: 'Supreme Essence',
            itemTier: 'T4',
            itemType: 'MATERIAL',
            category: 'CRAFT',
          },
        })),
      },
      auditLog: {
        findMany: mock.fn(async () => [{
          id: 'audit-1',
          action: 'REQUEST_UPDATED',
          targetType: 'ItemRequest',
          targetId: 'request-1',
          createdAt: new Date('2026-07-02T11:00:00.000Z'),
          actor: { discordUsername: 'staff-user', discordNickname: 'Staff' },
        }]),
      },
    };
    const service = new UniversalDossierService(prisma as never);

    const dossier = await service.getUniversalDossier('request', 'request-1');
    assert.equal(dossier.type, 'request');
    assert.equal(dossier.id, 'request-1');
    assert.equal(dossier.title, 'Dossie Staff - Request Essencia Suprema');
    assert.equal(dossier.summary.find((item) => item.label === 'Item')?.value, 'Essencia Suprema');
    assert.equal(dossier.summary.find((item) => item.label === 'Player')?.value, 'Aiko');
    assert.equal(dossier.internalLinks.find((link) => link.label === 'Perfil Staff')?.href, '/dashboard/staff/players/player-1');
    assert.equal(dossier.auditLogs[0].actorName, 'Staff');
    assert.match(dossier.markdown, /REQUEST_UPDATED/);
    assert.match(dossier.markdown, /Ultimo reminder: SECOND/);

    await assert.rejects(
      service.getUniversalDossier('auction', 'auction-1'),
      /Tipo de dossie nao suportado/,
    );
  });
});
