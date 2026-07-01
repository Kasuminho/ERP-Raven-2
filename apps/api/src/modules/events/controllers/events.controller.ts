import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Event } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AttendanceStatsResponseDto, CancelEventDto, CreateEventDto, PlayerAttendanceHistoryRowDto, RegisterAttendanceDto } from '../dto';
import { EventDetails } from '../repositories/events.repository';
import { AttendanceService, EventBatchPanel, EventFinalizationChecklist, FinalizeEventResult } from '../services/attendance.service';
import { EventsService } from '../services/events.service';

type AuthRequest = { user?: { userId?: string } };

@Controller()
export class EventsController {
  constructor(
    private readonly service: EventsService,
    private readonly attendanceService: AttendanceService,
  ) {}

  @Get('events/health')
  health(): { module: string; ready: boolean } {
    return this.service.health();
  }

  @Post('events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async createEvent(@Body() dto: CreateEventDto, @Req() req: AuthRequest): Promise<Event> {
    return this.attendanceService.createEvent({ ...dto, createdById: dto.createdById ?? req.user?.userId });
  }

  @Post('events/:id/attendance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async registerAttendance(
    @Param('id') eventId: string,
    @Body() dto: RegisterAttendanceDto,
    @Req() req: AuthRequest,
  ): Promise<void> {
    return this.attendanceService.registerAttendance(eventId, dto.playerId, req.user?.userId);
  }

  @Delete('events/:id/attendance/:playerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async removeAttendance(
    @Param('id') eventId: string,
    @Param('playerId') playerId: string,
    @Req() req: AuthRequest,
  ): Promise<void> {
    return this.attendanceService.removeAttendance(eventId, playerId, true, req.user?.userId);
  }

  @Post('events/:id/finalize')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async finalizeEvent(@Param('id') eventId: string): Promise<FinalizeEventResult> {
    return this.attendanceService.finalizeEvent(eventId);
  }

  @Get('events/:id/finalization-checklist')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async finalizationChecklist(@Param('id') eventId: string): Promise<EventFinalizationChecklist> {
    return this.attendanceService.getFinalizationChecklist(eventId);
  }

  @Get('events/batches/:batchId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async batchPanel(@Param('batchId') batchId: string): Promise<EventBatchPanel> {
    return this.attendanceService.getBatchPanel(batchId);
  }

  @Post('events/:id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async cancelEvent(
    @Param('id') eventId: string,
    @Body() dto: CancelEventDto,
    @Req() req: AuthRequest,
  ): Promise<Event> {
    return this.attendanceService.cancelEvent(eventId, req.user?.userId, dto.reason);
  }

  @Get('events')
  async events(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('hideFinalized') hideFinalized?: string,
  ): Promise<Event[]> {
    return this.attendanceService.getEvents({
      page: Number(page),
      limit: Number(limit),
      hideFinalized: hideFinalized === 'true',
    });
  }

  @Get('events/:id')
  async event(@Param('id') eventId: string): Promise<EventDetails> {
    return this.attendanceService.getEvent(eventId);
  }

  @Get('events/:id/attendance')
  async eventAttendance(@Param('id') eventId: string): Promise<EventDetails> {
    return this.attendanceService.getEventAttendance(eventId);
  }

  @Get('attendance/player/:playerId')
  async playerAttendance(@Param('playerId') playerId: string): Promise<AttendanceStatsResponseDto> {
    return this.attendanceService.getPlayerAttendanceStats(playerId);
  }

  @Get('attendance/player/:playerId/history')
  @UseGuards(JwtAuthGuard)
  async playerAttendanceHistory(@Param('playerId') playerId: string): Promise<PlayerAttendanceHistoryRowDto[]> {
    return this.attendanceService.getPlayerAttendanceHistory(playerId);
  }
}
