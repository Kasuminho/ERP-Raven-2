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

  it('keeps briefing, weekly and meeting services on the existing contract', async () => {
    const operations = {
      getStaffMorningBriefing: mock.fn(async () => ({ title: 'briefing' })),
      getSeasonSummary: mock.fn(async (month?: string) => ({ month })),
      getWeeklySummary: mock.fn(async () => ({ weekStart: '2026-07-01' })),
      postWeeklySummary: mock.fn(async () => ({ posted: true, summary: { weekStart: '2026-07-01' } })),
      getStaffMeetingSummary: mock.fn(async () => ({ urgentTasks: [] })),
    };

    assert.equal((await new OperationalBriefingService(operations as never).getStaffMorningBriefing()).title, 'briefing');
    assert.equal((await new WeeklySummaryService(operations as never).getSeasonSummary('2026-07')).month, '2026-07');
    assert.equal((await new WeeklySummaryService(operations as never).getWeeklySummary()).weekStart, '2026-07-01');
    assert.equal((await new WeeklySummaryService(operations as never).postWeeklySummary()).posted, true);
    assert.deepEqual(await new MeetingService(operations as never).getStaffMeetingSummary(), { urgentTasks: [] });
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
