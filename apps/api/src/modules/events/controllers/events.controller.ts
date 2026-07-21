import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Event } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AttendanceStatsResponseDto, CancelEventDto, CreateEventDto, CreateEventSeriesDto, JustifyEventNoShowDto, MarkEventChecklistItemDto, PlayerAttendanceHistoryRowDto, RegisterAttendanceDto, RespondEventReservePromotionDto, RespondEventRsvpDto, UpdateEventCompositionTargetsDto, UpdateEventSeriesExceptionsDto, UpsertEventReserveDto, UpsertPlayerAbsenceDto } from '../dto';
import { EventDetails } from '../repositories/events.repository';
import { AttendanceService, EventBatchPanel, EventFinalizationChecklist, EventReadinessReport, FinalizeEventResult } from '../services/attendance.service';
import { EventsService } from '../services/events.service';
import { EventRsvpService } from '../services/event-rsvp.service';
import { EventAbsenceService } from '../services/event-absence.service';
import { EventSeriesService } from '../services/event-series.service';
import { EventReserveService } from '../services/event-reserve.service';

type AuthRequest = { user?: { userId?: string } };

@Controller()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class EventsController {
  constructor(
    private readonly service: EventsService,
    private readonly attendanceService: AttendanceService,
    private readonly rsvpService: EventRsvpService,
    private readonly absenceService: EventAbsenceService,
    private readonly seriesService: EventSeriesService,
    private readonly reserveService: EventReserveService,
  ) {}

  @Get('events/health')
  health(): { module: string; ready: boolean } {
    return this.service.health();
  }

  @Post('events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async createEvent(@Body() dto: CreateEventDto, @Req() req: AuthRequest): Promise<Event> {
    return this.attendanceService.createEvent({ ...dto, createdById: req.user?.userId });
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

  @Get('events/commitments/me')
  @UseGuards(JwtAuthGuard)
  async myCommitments(@Req() req: AuthRequest) {
    return this.rsvpService.listMyCommitments(req.user!.userId!);
  }

  @Get('events/no-shows/me')
  @UseGuards(JwtAuthGuard)
  async myNoShows(@Req() req: AuthRequest) {
    return this.rsvpService.listMyNoShows(req.user!.userId!);
  }

  @Put('events/:id/no-show-justification')
  @UseGuards(JwtAuthGuard)
  async justifyNoShow(@Param('id') eventId: string, @Body() dto: JustifyEventNoShowDto, @Req() req: AuthRequest) {
    return this.rsvpService.justifyNoShow(eventId, req.user!.userId!, dto);
  }

  @Get('events/absences/me')
  @UseGuards(JwtAuthGuard)
  async myAbsences(@Req() req: AuthRequest) {
    return this.absenceService.listMine(req.user!.userId!);
  }

  @Get('events/series')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async eventSeries() {
    return this.seriesService.listSeries();
  }

  @Post('events/series')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async createEventSeries(@Body() dto: CreateEventSeriesDto, @Req() req: AuthRequest) {
    return this.seriesService.create(dto, req.user!.userId!);
  }

  @Post('events/series/:seriesId/pause')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async pauseEventSeries(@Param('seriesId') seriesId: string, @Req() req: AuthRequest) {
    return this.seriesService.setPaused(seriesId, true, req.user!.userId!);
  }

  @Post('events/series/:seriesId/resume')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async resumeEventSeries(@Param('seriesId') seriesId: string, @Req() req: AuthRequest) {
    return this.seriesService.setPaused(seriesId, false, req.user!.userId!);
  }

  @Put('events/series/:seriesId/exceptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async updateEventSeriesExceptions(@Param('seriesId') seriesId: string, @Body() dto: UpdateEventSeriesExceptionsDto, @Req() req: AuthRequest) {
    return this.seriesService.updateExceptions(seriesId, dto.exceptionDates, req.user!.userId!);
  }

  @Post('events/absences/me')
  @UseGuards(JwtAuthGuard)
  async createAbsence(@Body() dto: UpsertPlayerAbsenceDto, @Req() req: AuthRequest) {
    return this.absenceService.create(req.user!.userId!, dto);
  }

  @Put('events/absences/me/:absenceId')
  @UseGuards(JwtAuthGuard)
  async updateAbsence(@Param('absenceId') absenceId: string, @Body() dto: UpsertPlayerAbsenceDto, @Req() req: AuthRequest) {
    return this.absenceService.update(absenceId, req.user!.userId!, dto);
  }

  @Delete('events/absences/me/:absenceId')
  @UseGuards(JwtAuthGuard)
  async removeAbsence(@Param('absenceId') absenceId: string, @Req() req: AuthRequest): Promise<void> {
    return this.absenceService.remove(absenceId, req.user!.userId!);
  }

  @Put('events/:id/rsvp')
  @UseGuards(JwtAuthGuard)
  async respondRsvp(@Param('id') eventId: string, @Body() dto: RespondEventRsvpDto, @Req() req: AuthRequest) {
    return this.rsvpService.respond(eventId, req.user!.userId!, dto);
  }

  @Get('events/:id/rsvp/staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async rsvpStaffSummary(@Param('id') eventId: string) {
    return this.rsvpService.getStaffSummary(eventId);
  }

  @Get('events/:id/rsvp/public')
  @UseGuards(JwtAuthGuard)
  async publicRsvps(@Param('id') eventId: string) {
    return this.rsvpService.getPublicResponses(eventId);
  }

  @Put('events/:id/composition-targets')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async updateCompositionTargets(@Param('id') eventId: string, @Body() dto: UpdateEventCompositionTargetsDto, @Req() req: AuthRequest) {
    return this.seriesService.updateEventTargets(eventId, dto.targets, req.user!.userId!);
  }

  @Put('events/:id/reserves/:playerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async upsertReserve(@Param('id') eventId: string, @Param('playerId') playerId: string, @Body() dto: UpsertEventReserveDto, @Req() req: AuthRequest) {
    return this.reserveService.upsert(eventId, playerId, dto, req.user!.userId!);
  }

  @Delete('events/:id/reserves/:playerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async removeReserve(@Param('id') eventId: string, @Param('playerId') playerId: string, @Req() req: AuthRequest) {
    return this.reserveService.remove(eventId, playerId, req.user!.userId!);
  }

  @Post('events/:id/reserves/:playerId/promote')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async promoteReserve(@Param('id') eventId: string, @Param('playerId') playerId: string, @Req() req: AuthRequest) {
    return this.reserveService.requestPromotion(eventId, playerId, req.user!.userId!);
  }

  @Put('events/:id/reserve-response')
  @UseGuards(JwtAuthGuard)
  async respondReservePromotion(@Param('id') eventId: string, @Body() dto: RespondEventReservePromotionDto, @Req() req: AuthRequest) {
    return this.reserveService.respond(eventId, req.user!.userId!, dto);
  }

  @Get('events/:id/finalization-checklist')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async finalizationChecklist(@Param('id') eventId: string): Promise<EventFinalizationChecklist> {
    return this.attendanceService.getFinalizationChecklist(eventId);
  }

  @Post('events/:id/checklist/:key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async markChecklistItem(
    @Param('id') eventId: string,
    @Param('key') key: string,
    @Body() dto: MarkEventChecklistItemDto,
    @Req() req: AuthRequest,
  ): Promise<Event> {
    return this.attendanceService.markChecklistItem(eventId, key, dto, req.user?.userId);
  }

  @Get('events/:id/readiness')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async readiness(@Param('id') eventId: string): Promise<EventReadinessReport> {
    return this.attendanceService.getReadinessReport(eventId);
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
