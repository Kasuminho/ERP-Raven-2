import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { PlayerWarRoomController } from './controllers/player-war-room.controller';
import { WarRoomController } from './controllers/war-room.controller';
import { WarRoomRepository } from './repositories/war-room.repository';
import { WarRoomService } from './services/war-room.service';

@Module({
  imports: [AuditModule],
  controllers: [WarRoomController, PlayerWarRoomController],
  providers: [WarRoomService, WarRoomRepository, RolesGuard],
  exports: [WarRoomService],
})
export class WarRoomModule {}
