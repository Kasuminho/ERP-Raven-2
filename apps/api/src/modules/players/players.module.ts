import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlayersController } from './controllers/players.controller';
import { PlayersService } from './services/players.service';
import { PlayersRepository } from './repositories/players.repository';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [PlayersController],
  providers: [PlayersService, PlayersRepository, RolesGuard],
  exports: [PlayersService],
})
export class PlayersModule {}
