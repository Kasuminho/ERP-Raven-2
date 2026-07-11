import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BusinessRulesModule } from '../business-rules/business-rules.module';
import { DiscordModule } from '../discord/discord.module';
import { DkpModule } from '../dkp/dkp.module';
import { EligibilityModule } from '../eligibility/eligibility.module';
import { OperationsController } from './operations.controller';
import { AuctionDiagnosticsService } from './services/auction-diagnostics.service';
import { ContextualEligibilityService } from './services/contextual-eligibility.service';
import { DiscordOperationsService } from './services/discord-operations.service';
import { GuildProgressReportService } from './services/guild-progress-report.service';
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

@Module({
  imports: [AuditModule, BusinessRulesModule, DiscordModule, DkpModule, EligibilityModule],
  controllers: [OperationsController],
  providers: [
    AuctionDiagnosticsService,
    ContextualEligibilityService,
    DiscordOperationsService,
    GuildProgressReportService,
    IntegrityService,
    MeetingService,
    OperationalBriefingService,
    OperationsAuditService,
    OperationsRulesService,
    PlayerOperationsService,
    StaffInsightsService,
    StaffSummaryService,
    UniversalDossierService,
    WeeklySummaryService,
  ],
})
export class OperationsModule {}
