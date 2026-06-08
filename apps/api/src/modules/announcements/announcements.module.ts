import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { DiscordModule } from '../discord/discord.module';
import { AnnouncementsController } from './controllers/announcements.controller';
import { AnnouncementsRepository } from './repositories/announcements.repository';
import { AnnouncementsCronService } from './schedulers/announcements-cron.service';
import { AnnouncementsService } from './services/announcements.service';

@Module({
  imports: [AuditModule, DiscordModule],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService, AnnouncementsRepository, AnnouncementsCronService, RolesGuard],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
