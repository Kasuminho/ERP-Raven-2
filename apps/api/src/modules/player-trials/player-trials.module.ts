import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlayerTrialsController } from './player-trials.controller';
import { PlayerTrialsService } from './player-trials.service';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [PlayerTrialsController],
  providers: [PlayerTrialsService],
})
export class PlayerTrialsModule {}
