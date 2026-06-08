import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { DiscordBotService } from './bot/services/discord-bot.service';
import { DiscordApiService } from './bot/services/discord-api.service';
import { DiscordCommandHandler } from './bot/handlers/command-handler.service';
import { DiscordEventHandler } from './bot/handlers/event-handler.service';
import { DiscordController } from './controllers/discord.controller';
import { DiscordRepository } from './repositories/discord.repository';
import { DiscordSyncService } from './services/discord-sync.service';
import { DiscordWebhookQueueService } from './services/discord-webhook-queue.service';
import { NotificationService } from './services/notification.service';

@Module({
  imports: [AuditModule],
  controllers: [DiscordController],
  providers: [
    DiscordApiService,
    DiscordBotService,
    DiscordCommandHandler,
    DiscordEventHandler,
    DiscordRepository,
    DiscordSyncService,
    DiscordWebhookQueueService,
    NotificationService,
    RolesGuard,
  ],
  exports: [DiscordSyncService, NotificationService, DiscordBotService],
})
export class DiscordModule {}
