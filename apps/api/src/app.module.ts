import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@database/database.module';
import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import dbConfig from './config/database.config';
import discordConfig from './config/discord.config';
import { AuthModule } from './modules/auth/auth.module';
import { PlayersModule } from './modules/players/players.module';
import { EventsModule } from './modules/events/events.module';
import { DkpModule } from './modules/dkp/dkp.module';
import { AuctionsModule } from './modules/auctions/auctions.module';
import { EligibilityModule } from './modules/eligibility/eligibility.module';
import { AuditModule } from './modules/audit/audit.module';
import { StaffReviewModule } from './modules/staff-review/staff-review.module';
import { DiscordModule } from './modules/discord/discord.module';
import { AutomationModule } from './modules/automation/automation.module';
import { ItemsModule } from './modules/items/items.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { ItemRequestsModule } from './modules/item-requests/item-requests.module';
import { DropsModule } from './modules/drops/drops.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { ItemInterestsModule } from './modules/item-interests/item-interests.module';
import { CodexModule } from './modules/codex/codex.module';
import { OperationsModule } from './modules/operations/operations.module';
import { DaoshiModule } from './modules/daoshi/daoshi.module';
import { HealthModule } from './modules/health/health.module';
import { BusinessRulesModule } from './modules/business-rules/business-rules.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SearchModule } from './modules/search/search.module';

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
  ],
})
export class AppModule {}
