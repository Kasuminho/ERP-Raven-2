import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';
import { PlayersController } from './controllers/players.controller';
import { PlayersService } from './services/players.service';
import { PlayersRepository } from './repositories/players.repository';
import { RavenStatusOcrService } from './services/raven-status-ocr.service';

@Module({
  imports: [AuditModule, NotificationsModule, StorageModule],
  controllers: [PlayersController],
  providers: [PlayersService, PlayersRepository, RavenStatusOcrService, RolesGuard],
  exports: [PlayersService, RavenStatusOcrService],
})
export class PlayersModule {}
