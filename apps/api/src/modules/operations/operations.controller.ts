import { Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { OperationsService } from './operations.service';
import {
  AuctionDossier,
  DiscordTemplateSummary,
  DiscordWebhookQueueSummary,
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

@Controller('operations')
@UseGuards(JwtAuthGuard)
export class OperationsController {
  constructor(private readonly service: OperationsService) {}

  @Get('me')
  async me(@Req() req: AuthRequest): Promise<PlayerOperationsSummary> {
    return this.service.getPlayerSummary(req.user.userId);
  }

  @Get('me/notices')
  async notices(@Req() req: AuthRequest): Promise<NoticeBoardItem[]> {
    return this.service.getNoticeBoard(req.user.userId);
  }

  @Get('me/action-plan')
  async actionPlan(@Req() req: AuthRequest): Promise<PlayerActionPlan> {
    return this.service.getPlayerActionPlan(req.user.userId);
  }

  @Get('rules')
  async rules(): Promise<GuildRulesSummary> {
    return this.service.getGuildRules();
  }

  @Get('maintenance')
  async maintenance(): Promise<MaintenanceModeSummary> {
    return this.service.getMaintenanceMode();
  }

  @Get('staff')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async staff(): Promise<StaffOperationsSummary> {
    return this.service.getStaffSummary();
  }

  @Get('staff/health')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async health(): Promise<StaffHealthSummary> {
    return this.service.getStaffHealth();
  }

  @Get('staff/operational-health')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async operationalHealth(): Promise<OperationalHealthSummary> {
    return this.service.getOperationalHealth();
  }

  @Get('staff/day-view')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async dayView(): Promise<StaffDayViewSummary> {
    return this.service.getStaffDayView();
  }

  @Get('staff/morning-briefing')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async morningBriefing(): Promise<StaffMorningBriefing> {
    return this.service.getStaffMorningBriefing();
  }

  @Get('staff/season')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async season(@Query('month') month?: string): Promise<SeasonMonthlySummary> {
    return this.service.getSeasonSummary(month);
  }

  @Get('staff/weekly')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async weekly(): Promise<WeeklyGuildSummary> {
    return this.service.getWeeklySummary();
  }

  @Post('staff/weekly/post')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async postWeekly(): Promise<{ posted: boolean; summary: WeeklyGuildSummary }> {
    return this.service.postWeeklySummary();
  }

  @Get('staff/integrity')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async integrity(): Promise<IntegritySummary> {
    return this.service.getIntegritySummary();
  }

  @Get('staff/auction-diagnostics/options')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async auctionDiagnosticOptions(): Promise<AuctionDiagnosticOption[]> {
    return this.service.getAuctionDiagnosticOptions();
  }

  @Get('staff/auction-diagnostics/:auctionId')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async auctionDiagnostics(@Param('auctionId') auctionId: string): Promise<AuctionDiagnosticSummary> {
    return this.service.getAuctionDiagnostics(auctionId);
  }

  @Get('staff/auction-diagnostics/:auctionId/finalization-preview')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async auctionFinalizationPreview(@Param('auctionId') auctionId: string): Promise<AuctionFinalizationPreview> {
    return this.service.getAuctionFinalizationPreview(auctionId);
  }

  @Get('staff/auction-diagnostics/:auctionId/dossier')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async auctionDossier(@Param('auctionId') auctionId: string): Promise<AuctionDossier> {
    return this.service.getAuctionDossier(auctionId);
  }

  @Get('staff/dossiers/:type/:id')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async universalDossier(@Param('type') type: UniversalDossierType, @Param('id') id: string): Promise<UniversalDossier> {
    return this.service.getUniversalDossier(type, id);
  }

  @Get('staff/auction-diagnostics/:auctionId/timeline')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async auctionTimeline(@Param('auctionId') auctionId: string): Promise<AuctionTimelineEvent[]> {
    return this.service.getAuctionTimeline(auctionId);
  }

  @Get('staff/fairness')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async fairness(@Query('days') days?: string): Promise<LootFairnessSummary> {
    return this.service.getLootFairness(Number(days) || 30);
  }

  @Get('staff/compare')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async compare(@Query('playerIds') playerIds?: string): Promise<PlayerComparisonSummary> {
    return this.service.comparePlayers((playerIds ?? '').split(',').map((id) => id.trim()).filter(Boolean));
  }

  @Get('staff/meeting')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async meeting(): Promise<StaffMeetingSummary> {
    return this.service.getStaffMeetingSummary();
  }

  @Get('staff/legacy-audit')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async legacyAudit(): Promise<LegacyAuditSummary> {
    return this.service.getLegacyAudit();
  }

  @Get('staff/discord-templates')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async discordTemplates(): Promise<DiscordTemplateSummary> {
    return this.service.getDiscordTemplates();
  }

  @Get('staff/discord-webhooks')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async discordWebhookQueue(@Query('limit') limit?: string): Promise<DiscordWebhookQueueSummary> {
    return this.service.getDiscordWebhookQueue(Number(limit) || 50);
  }

  @Post('staff/discord-webhooks/:deliveryId/retry')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async retryDiscordWebhookDelivery(@Param('deliveryId') deliveryId: string): Promise<DiscordWebhookQueueSummary> {
    return this.service.retryDiscordWebhookDelivery(deliveryId);
  }

  @Get('staff/audit')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async audit(@Query('limit') limit?: string) {
    return this.service.getRecentAudit(Number(limit) || 25);
  }
}
