import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GuildCasesController } from './guild-cases.controller';
import { GuildCasesService } from './guild-cases.service';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [GuildCasesController],
  providers: [GuildCasesService],
})
export class GuildCasesModule {}
