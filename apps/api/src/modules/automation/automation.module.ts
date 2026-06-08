import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { AuctionsModule } from '../auctions/auctions.module';
import { DiscordModule } from '../discord/discord.module';
import { AutomationController } from './controllers/automation.controller';
import { AutomationRepository } from './repositories/automation.repository';
import { AutomationCronService } from './schedulers/automation-cron.service';
import { AutomationNotificationQueueService } from './services/automation-notification-queue.service';
import { AuctionAutomationService } from './services/auction-automation.service';

@Module({
  imports: [ScheduleModule.forRoot(), AuditModule, AuctionsModule, DiscordModule],
  controllers: [AutomationController],
  providers: [
    AuctionAutomationService,
    AutomationNotificationQueueService,
    AutomationRepository,
    AutomationCronService,
    RolesGuard,
  ],
  exports: [AuctionAutomationService],
})
export class AutomationModule {}
