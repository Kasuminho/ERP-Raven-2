import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DiscordModule } from '../discord/discord.module';
import { UploadsModule } from '../uploads/uploads.module';
import { CodexController } from './controllers/codex.controller';
import { CodexService } from './services/codex.service';

@Module({
  imports: [AuditModule, DiscordModule, NotificationsModule, UploadsModule],
  controllers: [CodexController],
  providers: [CodexService, RolesGuard],
  exports: [CodexService],
})
export class CodexModule {}
