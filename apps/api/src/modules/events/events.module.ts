import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { DkpModule } from '../dkp/dkp.module';
import { DiscordModule } from '../discord/discord.module';
import { BusinessRulesModule } from '../business-rules/business-rules.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventsController } from './controllers/events.controller';
import { AttendanceService } from './services/attendance.service';
import { EventsService } from './services/events.service';
import { EventsRepository } from './repositories/events.repository';
import { EventRsvpService } from './services/event-rsvp.service';
import { EventAbsenceService } from './services/event-absence.service';
import { EventSeriesService } from './services/event-series.service';
import { EventReserveService } from './services/event-reserve.service';

@Module({
  imports: [AuditModule, DkpModule, DiscordModule, BusinessRulesModule, NotificationsModule],
  controllers: [EventsController],
  providers: [EventsService, AttendanceService, EventRsvpService, EventAbsenceService, EventSeriesService, EventReserveService, EventsRepository, RolesGuard],
  exports: [EventsService, AttendanceService, EventRsvpService, EventAbsenceService, EventSeriesService, EventReserveService],
})
export class EventsModule {}
