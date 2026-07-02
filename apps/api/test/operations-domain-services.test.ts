import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { AuctionDiagnosticsService } from '../src/modules/operations/services/auction-diagnostics.service';
import { MeetingService } from '../src/modules/operations/services/meeting.service';
import { OperationalBriefingService } from '../src/modules/operations/services/operational-briefing.service';
import { StaffSummaryService } from '../src/modules/operations/services/staff-summary.service';
import { WeeklySummaryService } from '../src/modules/operations/services/weekly-summary.service';

describe('Operations domain services', () => {
  it('keeps staff summary endpoints delegated through the domain service', async () => {
    const operations = {
      getStaffSummary: mock.fn(async () => ({ tasks: [], counts: {} })),
      getStaffHealth: mock.fn(async () => ({ checks: [] })),
      getOperationalHealth: mock.fn(async () => ({ checks: [], discordFailures24h: 0 })),
      getDeploymentPanel: mock.fn(async () => ({ currentApiVersion: 'test' })),
      getStaffDayView: mock.fn(async () => ({ urgentTasks: [] })),
    };
    const service = new StaffSummaryService(operations as never);

    assert.deepEqual(await service.getStaffSummary(), { tasks: [], counts: {} });
    assert.deepEqual(await service.getStaffHealth(), { checks: [] });
    assert.equal((await service.getOperationalHealth()).discordFailures24h, 0);
    assert.equal((await service.getDeploymentPanel()).currentApiVersion, 'test');
    assert.deepEqual(await service.getStaffDayView(), { urgentTasks: [] });
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
      getAuctionDiagnosticOptions: mock.fn(async () => [{ id: 'auction-1' }]),
      getAuctionDiagnostics: mock.fn(async (auctionId: string) => ({ auction: { id: auctionId } })),
      getAuctionFinalizationPreview: mock.fn(async (auctionId: string) => ({ auctionId })),
      getAuctionDossier: mock.fn(async (auctionId: string) => ({ auctionId })),
      getUniversalDossier: mock.fn(async (type: string, id: string) => ({ type, id })),
      getAuctionTimeline: mock.fn(async (auctionId: string) => [{ auctionId }]),
    };
    const service = new AuctionDiagnosticsService(operations as never);

    assert.equal((await service.getAuctionDiagnosticOptions())[0].id, 'auction-1');
    assert.equal((await service.getAuctionDiagnostics('auction-1')).auction.id, 'auction-1');
    assert.equal((await service.getAuctionFinalizationPreview('auction-1')).auctionId, 'auction-1');
    assert.equal((await service.getAuctionDossier('auction-1')).auctionId, 'auction-1');
    assert.deepEqual(await service.getUniversalDossier('auction', 'auction-1'), { type: 'auction', id: 'auction-1' });
    assert.equal((await service.getAuctionTimeline('auction-1'))[0].auctionId, 'auction-1');
  });
});
