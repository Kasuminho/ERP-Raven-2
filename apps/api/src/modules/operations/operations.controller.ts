import { Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { OperationsService } from './operations.service';
import {
  DiscordTemplateSummary,
  GuildRulesSummary,
  IntegritySummary,
  LegacyAuditSummary,
  LootFairnessSummary,
  NoticeBoardItem,
  OperationalHealthSummary,
  PlayerComparisonSummary,
  PlayerOperationsSummary,
  SeasonMonthlySummary,
  StaffDayViewSummary,
  StaffHealthSummary,
  StaffMeetingSummary,
  StaffOperationsSummary,
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

  @Get('rules')
  async rules(): Promise<GuildRulesSummary> {
    return this.service.getGuildRules();
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

  @Get('staff/audit')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async audit(@Query('limit') limit?: string) {
    return this.service.getRecentAudit(Number(limit) || 25);
  }
}
