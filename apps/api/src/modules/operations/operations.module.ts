import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BusinessRulesModule } from '../business-rules/business-rules.module';
import { DiscordModule } from '../discord/discord.module';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';
import { AuctionDiagnosticsService } from './services/auction-diagnostics.service';
import { IntegrityService } from './services/integrity.service';
import { MeetingService } from './services/meeting.service';
import { OperationalBriefingService } from './services/operational-briefing.service';
import { StaffSummaryService } from './services/staff-summary.service';
import { WeeklySummaryService } from './services/weekly-summary.service';

@Module({
  imports: [AuditModule, BusinessRulesModule, DiscordModule],
  controllers: [OperationsController],
  providers: [
    OperationsService,
    AuctionDiagnosticsService,
    IntegrityService,
    MeetingService,
    OperationalBriefingService,
    StaffSummaryService,
    WeeklySummaryService,
  ],
})
export class OperationsModule {}
