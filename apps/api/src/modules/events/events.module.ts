import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { DkpModule } from '../dkp/dkp.module';
import { DiscordModule } from '../discord/discord.module';
import { EventsController } from './controllers/events.controller';
import { AttendanceService } from './services/attendance.service';
import { EventsService } from './services/events.service';
import { EventsRepository } from './repositories/events.repository';

@Module({
  imports: [AuditModule, DkpModule, DiscordModule],
  controllers: [EventsController],
  providers: [EventsService, AttendanceService, EventsRepository, RolesGuard],
  exports: [EventsService, AttendanceService],
})
export class EventsModule {}
