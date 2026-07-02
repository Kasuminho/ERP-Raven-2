import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { AuctionDiagnosticsService } from '../src/modules/operations/services/auction-diagnostics.service';
import { MeetingService } from '../src/modules/operations/services/meeting.service';
import { OperationalBriefingService } from '../src/modules/operations/services/operational-briefing.service';
import { StaffSummaryService } from '../src/modules/operations/services/staff-summary.service';
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
      json: async () => (url.endsWith('/health')
        ? { status: 'ok', checkedAt: '2026-07-02T00:00:00.000Z', version: 'abc1234' }
        : {}),
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
    assert.equal(deploy.protocol.find((step) => step.key === 'watchtower')?.status, 'done');
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
    };
    const service = new MeetingService(prisma as never, { getStaffDayView: mock.fn(async () => day) } as never);

    const summary = await service.getStaffMeetingSummary();

    assert.equal(summary.todaysAnnouncements, 1);
    assert.equal(summary.reviewAuctions[0].itemName, 'Espada');
    assert.equal(summary.votingInterests[0].entries, 2);
    assert.equal(summary.openEventRows[0].name, 'Boss T4');
    assert.equal(prisma.auction.findMany.mock.calls.length, 1);
  });

  it('keeps auction diagnostics methods behind the auction domain service', async () => {
    const operations = {
      getAuctionDiagnostics: mock.fn(async (auctionId: string) => ({ auction: { id: auctionId } })),
      getAuctionFinalizationPreview: mock.fn(async (auctionId: string) => ({ auctionId })),
      getAuctionDossier: mock.fn(async (auctionId: string) => ({ auctionId })),
      getUniversalDossier: mock.fn(async (type: string, id: string) => ({ type, id })),
    };
    const createdAt = new Date('2026-07-02T00:00:00.000Z');
    const endsAt = new Date('2026-07-02T03:00:00.000Z');
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
            player: { id: 'player-1', nickname: 'Aiko' },
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
    const service = new AuctionDiagnosticsService(operations as never, prisma as never);

    const options = await service.getAuctionDiagnosticOptions();
    assert.equal(options[0].id, 'auction-1');
    assert.equal(options[0].winnerName, 'Aiko');
    assert.equal(options[1].winnerName, null);
    assert.equal((await service.getAuctionDiagnostics('auction-1')).auction.id, 'auction-1');
    assert.equal((await service.getAuctionFinalizationPreview('auction-1')).auctionId, 'auction-1');
    assert.equal((await service.getAuctionDossier('auction-1')).auctionId, 'auction-1');
    assert.deepEqual(await service.getUniversalDossier('auction', 'auction-1'), { type: 'auction', id: 'auction-1' });
    const timeline = await service.getAuctionTimeline('auction-1');
    assert.equal(timeline[0].type, 'AUCTION_CREATED');
    assert.ok(timeline.some((event) => event.type === 'BID_CREATED'));
    assert.ok(timeline.some((event) => event.type === 'AUCTION_WIN'));
    assert.ok(timeline.some((event) => event.type === 'DROP_DELIVERED'));
    assert.ok(timeline.some((event) => event.type === 'AUDIT_LOG'));
  });
});
