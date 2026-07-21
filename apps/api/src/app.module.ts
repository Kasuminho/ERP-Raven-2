import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "@database/database.module";
import appConfig from "./config/app.config";
import authConfig from "./config/auth.config";
import dbConfig from "./config/database.config";
import discordConfig from "./config/discord.config";
import { AuthModule } from "./modules/auth/auth.module";
import { PlayersModule } from "./modules/players/players.module";
import { EventsModule } from "./modules/events/events.module";
import { DkpModule } from "./modules/dkp/dkp.module";
import { AuctionsModule } from "./modules/auctions/auctions.module";
import { EligibilityModule } from "./modules/eligibility/eligibility.module";
import { AuditModule } from "./modules/audit/audit.module";
import { StaffReviewModule } from "./modules/staff-review/staff-review.module";
import { DiscordModule } from "./modules/discord/discord.module";
import { AutomationModule } from "./modules/automation/automation.module";
import { ItemsModule } from "./modules/items/items.module";
import { AnnouncementsModule } from "./modules/announcements/announcements.module";
import { ItemRequestsModule } from "./modules/item-requests/item-requests.module";
import { DropsModule } from "./modules/drops/drops.module";
import { UploadsModule } from "./modules/uploads/uploads.module";
import { ItemInterestsModule } from "./modules/item-interests/item-interests.module";
import { CodexModule } from "./modules/codex/codex.module";
import { OperationsModule } from "./modules/operations/operations.module";
import { DaoshiModule } from "./modules/daoshi/daoshi.module";
import { HealthModule } from "./modules/health/health.module";
import { BusinessRulesModule } from "./modules/business-rules/business-rules.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { SearchModule } from "./modules/search/search.module";
import { WarRoomModule } from "./modules/war-room/war-room.module";
import { WishlistModule } from "./modules/wishlist/wishlist.module";
import { RecruitmentModule } from "./modules/recruitment/recruitment.module";
import { MaintenanceModeGuard } from "./common/guards/maintenance-mode.guard";
import { DiamondSalesModule } from "./modules/diamond-sales/diamond-sales.module";
import { GuildCasesModule } from "./modules/guild-cases/guild-cases.module";
import { OnboardingModule } from "./modules/onboarding/onboarding.module";
import { PlayerTrialsModule } from "./modules/player-trials/player-trials.module";
import { MentorshipModule } from "./modules/mentorship/mentorship.module";
import { GuildPulseModule } from "./modules/guild-pulse/guild-pulse.module";
import { GuildHealthModule } from "./modules/guild-health/guild-health.module";
import { LeadershipHealthModule } from "./modules/leadership-health/leadership-health.module";
import { StaffTasksModule } from "./modules/staff-tasks/staff-tasks.module";
import { StaffCoverageModule } from "./modules/staff-coverage/staff-coverage.module";
import { StaffAutomationModule } from "./modules/staff-automation/staff-automation.module";
import { PlaybooksModule } from "./modules/playbooks/playbooks.module";
import { CommunicationsModule } from "./modules/communications/communications.module";
import { ProductValidationModule } from "./modules/product-validation/product-validation.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, dbConfig, discordConfig],
    }),
    DatabaseModule,
    AuthModule,
    PlayersModule,
    EventsModule,
    DkpModule,
    AuctionsModule,
    EligibilityModule,
    AuditModule,
    BusinessRulesModule,
    NotificationsModule,
    StaffReviewModule,
    DiscordModule,
    AutomationModule,
    ItemsModule,
    AnnouncementsModule,
    ItemRequestsModule,
    DropsModule,
    UploadsModule,
    ItemInterestsModule,
    CodexModule,
    OperationsModule,
    DaoshiModule,
    HealthModule,
    SearchModule,
    WarRoomModule,
    WishlistModule,
    RecruitmentModule,
    DiamondSalesModule,
    GuildCasesModule,
    OnboardingModule,
    PlayerTrialsModule,
    MentorshipModule,
    GuildPulseModule,
    GuildHealthModule,
    LeadershipHealthModule,
    StaffTasksModule,
    StaffCoverageModule,
    StaffAutomationModule,
    PlaybooksModule,
    CommunicationsModule,
    ProductValidationModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: MaintenanceModeGuard,
    },
  ],
})
export class AppModule {}
