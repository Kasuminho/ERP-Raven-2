import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuctionDiagnosticsService } from './services/auction-diagnostics.service';
import { DiscordOperationsService } from './services/discord-operations.service';
import { IntegrityService } from './services/integrity.service';
import { MeetingService } from './services/meeting.service';
import { OperationalBriefingService } from './services/operational-briefing.service';
import { OperationsAuditService } from './services/operations-audit.service';
import { OperationsRulesService } from './services/operations-rules.service';
import { PlayerOperationsService } from './services/player-operations.service';
import { StaffInsightsService } from './services/staff-insights.service';
import { StaffSummaryService } from './services/staff-summary.service';
import { UniversalDossierService } from './services/universal-dossier.service';
import { WeeklySummaryService } from './services/weekly-summary.service';
import {
  AuctionDossier,
  DiscordTemplateSummary,
  DiscordWebhookQueueSummary,
  DeploymentPanelSummary,
  GuildRulesSummary,
  IntegritySummary,
  AuctionDiagnosticOption,
  AuctionDiagnosticSummary,
  AuctionFinalizationPreview,
  AuctionTimelineEvent,
  LegacyAuditSummary,
  LootFairnessSummary,
  MaintenanceModeSummary,
  NoticeBoardItem,
  OperationalHealthSummary,
  PlayerActionPlan,
  PlayerComparisonSummary,
  PlayerOperationsSummary,
  SeasonMonthlySummary,
  StaffDayViewSummary,
  StaffMorningBriefing,
  StaffHealthSummary,
  StaffMeetingSummary,
  StaffOperationsSummary,
  UniversalDossier,
  UniversalDossierType,
  WeeklyGuildSummary,
} from './operations.types';

type AuthRequest = { user: { userId: string } };
type ResolveMeetingItemBody = { title?: string; type?: string; href?: string };

@Controller('operations')
@UseGuards(JwtAuthGuard)
export class OperationsController {
  constructor(
    private readonly auctionDiagnosticsService: AuctionDiagnosticsService,
    private readonly discordOperations: DiscordOperationsService,
    private readonly integrityService: IntegrityService,
    private readonly meetingService: MeetingService,
    private readonly operationalBriefing: OperationalBriefingService,
    private readonly operationsAudit: OperationsAuditService,
    private readonly operationsRules: OperationsRulesService,
    private readonly playerOperations: PlayerOperationsService,
    private readonly staffInsights: StaffInsightsService,
    private readonly staffSummary: StaffSummaryService,
    private readonly universalDossiers: UniversalDossierService,
    private readonly weeklySummary: WeeklySummaryService,
  ) {}

  @Get('me')
  async me(@Req() req: AuthRequest): Promise<PlayerOperationsSummary> {
    return this.playerOperations.getPlayerSummary(req.user.userId);
  }

  @Get('me/notices')
  async notices(@Req() req: AuthRequest): Promise<NoticeBoardItem[]> {
    return this.playerOperations.getNoticeBoard(req.user.userId);
  }

  @Get('me/action-plan')
  async actionPlan(@Req() req: AuthRequest): Promise<PlayerActionPlan> {
    return this.playerOperations.getPlayerActionPlan(req.user.userId);
  }

  @Get('rules')
  async rules(): Promise<GuildRulesSummary> {
    return this.operationsRules.getGuildRules();
  }

  @Get('maintenance')
  async maintenance(): Promise<MaintenanceModeSummary> {
    return this.operationsRules.getMaintenanceMode();
  }

  @Get('staff')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async staff(): Promise<StaffOperationsSummary> {
    return this.staffSummary.getStaffSummary();
  }

  @Get('staff/health')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async health(): Promise<StaffHealthSummary> {
    return this.staffSummary.getStaffHealth();
  }

  @Get('staff/operational-health')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async operationalHealth(): Promise<OperationalHealthSummary> {
    return this.staffSummary.getOperationalHealth();
  }

  @Get('staff/deploy')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async deploy(): Promise<DeploymentPanelSummary> {
    return this.staffSummary.getDeploymentPanel();
  }

  @Get('staff/day-view')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async dayView(): Promise<StaffDayViewSummary> {
    return this.staffSummary.getStaffDayView();
  }

  @Get('staff/morning-briefing')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async morningBriefing(): Promise<StaffMorningBriefing> {
    return this.operationalBriefing.getStaffMorningBriefing();
  }

  @Get('staff/season')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async season(@Query('month') month?: string): Promise<SeasonMonthlySummary> {
    return this.weeklySummary.getSeasonSummary(month);
  }

  @Get('staff/weekly')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async weekly(): Promise<WeeklyGuildSummary> {
    return this.weeklySummary.getWeeklySummary();
  }

  @Post('staff/weekly/post')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async postWeekly(): Promise<{ posted: boolean; summary: WeeklyGuildSummary }> {
    return this.weeklySummary.postWeeklySummary();
  }

  @Get('staff/integrity')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async integrity(): Promise<IntegritySummary> {
    return this.integrityService.getIntegritySummary();
  }

  @Get('staff/auction-diagnostics/options')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async auctionDiagnosticOptions(): Promise<AuctionDiagnosticOption[]> {
    return this.auctionDiagnosticsService.getAuctionDiagnosticOptions();
  }

  @Get('staff/auction-diagnostics/:auctionId')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async auctionDiagnostics(@Param('auctionId') auctionId: string): Promise<AuctionDiagnosticSummary> {
    return this.auctionDiagnosticsService.getAuctionDiagnostics(auctionId);
  }

  @Get('staff/auction-diagnostics/:auctionId/finalization-preview')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async auctionFinalizationPreview(@Param('auctionId') auctionId: string): Promise<AuctionFinalizationPreview> {
    return this.auctionDiagnosticsService.getAuctionFinalizationPreview(auctionId);
  }

  @Get('staff/auction-diagnostics/:auctionId/dossier')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async auctionDossier(@Param('auctionId') auctionId: string): Promise<AuctionDossier> {
    return this.auctionDiagnosticsService.getAuctionDossier(auctionId);
  }

  @Get('staff/dossiers/:type/:id')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async universalDossier(@Param('type') type: UniversalDossierType, @Param('id') id: string): Promise<UniversalDossier> {
    if (type === 'auction') {
      return this.auctionDiagnosticsService.getUniversalDossier(type, id);
    }
    return this.universalDossiers.getUniversalDossier(type, id);
  }

  @Get('staff/auction-diagnostics/:auctionId/timeline')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async auctionTimeline(@Param('auctionId') auctionId: string): Promise<AuctionTimelineEvent[]> {
    return this.auctionDiagnosticsService.getAuctionTimeline(auctionId);
  }

  @Get('staff/fairness')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async fairness(@Query('days') days?: string): Promise<LootFairnessSummary> {
    return this.staffInsights.getLootFairness(Number(days) || 30);
  }

  @Get('staff/compare')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async compare(@Query('playerIds') playerIds?: string): Promise<PlayerComparisonSummary> {
    return this.staffInsights.comparePlayers((playerIds ?? '').split(',').map((id) => id.trim()).filter(Boolean));
  }

  @Get('staff/meeting')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async meeting(): Promise<StaffMeetingSummary> {
    return this.meetingService.getStaffMeetingSummary();
  }

  @Post('staff/meeting/items/:itemKey/resolve')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async resolveMeetingItem(
    @Param('itemKey') itemKey: string,
    @Body() body: ResolveMeetingItemBody,
    @Req() req: AuthRequest,
  ): Promise<StaffMeetingSummary> {
    await this.meetingService.resolveMeetingItem(itemKey, req.user.userId, body);
    return this.meetingService.getStaffMeetingSummary();
  }

  @Get('staff/legacy-audit')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async legacyAudit(): Promise<LegacyAuditSummary> {
    return this.integrityService.getLegacyAudit();
  }

  @Get('staff/discord-templates')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async discordTemplates(): Promise<DiscordTemplateSummary> {
    return this.discordOperations.getDiscordTemplates();
  }

  @Get('staff/discord-webhooks')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async discordWebhookQueue(@Query('limit') limit?: string): Promise<DiscordWebhookQueueSummary> {
    return this.discordOperations.getDiscordWebhookQueue(Number(limit) || 50);
  }

  @Post('staff/discord-webhooks/:deliveryId/retry')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async retryDiscordWebhookDelivery(@Param('deliveryId') deliveryId: string): Promise<DiscordWebhookQueueSummary> {
    return this.discordOperations.retryDiscordWebhookDelivery(deliveryId);
  }

  @Get('staff/audit')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async audit(@Query('limit') limit?: string) {
    return this.operationsAudit.getRecentAudit(Number(limit) || 25);
  }
}
