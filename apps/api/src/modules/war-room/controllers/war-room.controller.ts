import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import {
  CloseWarRoomOperationDto,
  CreateWarRoomOperationDto,
  CreateWarRoomRosterSlotDto,
  CreateWarRoomTimelineEventDto,
  MarkWarRoomAttendanceDto,
  UpdateWarRoomOperationDto,
  UpdateWarRoomRosterSlotDto,
  WarRoomOperationParamDto,
  WarRoomRosterSlotParamDto,
} from '../dto';
import { WarRoomService } from '../services/war-room.service';

type StaffRequest = {
  user: {
    userId: string;
  };
};

@Controller('war-room')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STAFF', 'ADMIN')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class WarRoomController {
  constructor(private readonly service: WarRoomService) {}

  @Get('operations')
  async listOperations() {
    return this.service.listOperations();
  }

  @Get('operations/:operationId')
  async getOperation(@Param() params: WarRoomOperationParamDto) {
    return this.service.getOperation(params.operationId);
  }

  @Post('operations')
  async createOperation(@Req() req: StaffRequest, @Body() dto: CreateWarRoomOperationDto) {
    return this.service.createOperation(req.user.userId, dto);
  }

  @Patch('operations/:operationId')
  async updateOperation(
    @Param() params: WarRoomOperationParamDto,
    @Req() req: StaffRequest,
    @Body() dto: UpdateWarRoomOperationDto,
  ) {
    return this.service.updateOperation(params.operationId, req.user.userId, dto);
  }

  @Post('operations/:operationId/open')
  async openOperation(@Param() params: WarRoomOperationParamDto, @Req() req: StaffRequest) {
    return this.service.openOperation(params.operationId, req.user.userId);
  }

  @Post('operations/:operationId/close')
  async closeOperation(
    @Param() params: WarRoomOperationParamDto,
    @Req() req: StaffRequest,
    @Body() dto: CloseWarRoomOperationDto,
  ) {
    return this.service.closeOperation(params.operationId, req.user.userId, dto);
  }

  @Post('operations/:operationId/cancel')
  async cancelOperation(@Param() params: WarRoomOperationParamDto, @Req() req: StaffRequest) {
    return this.service.cancelOperation(params.operationId, req.user.userId);
  }

  @Get('operations/:operationId/live')
  async getLiveDossier(@Param() params: WarRoomOperationParamDto) {
    return this.service.getLiveDossier(params.operationId);
  }

  @Get('operations/:operationId/after-action')
  async getAfterActionReport(@Param() params: WarRoomOperationParamDto) {
    return this.service.getAfterActionReport(params.operationId);
  }

  @Post('operations/:operationId/timeline')
  async createTimelineEvent(
    @Param() params: WarRoomOperationParamDto,
    @Req() req: StaffRequest,
    @Body() dto: CreateWarRoomTimelineEventDto,
  ) {
    return this.service.createTimelineEvent(params.operationId, req.user.userId, dto);
  }

  @Get('operations/:operationId/roster')
  async getRoster(@Param() params: WarRoomOperationParamDto) {
    return this.service.getOperationRoster(params.operationId);
  }

  @Post('operations/:operationId/roster')
  async createRosterSlot(
    @Param() params: WarRoomOperationParamDto,
    @Req() req: StaffRequest,
    @Body() dto: CreateWarRoomRosterSlotDto,
  ) {
    return this.service.createRosterSlot(params.operationId, req.user.userId, dto);
  }

  @Patch('operations/:operationId/roster/:slotId')
  async updateRosterSlot(
    @Param() params: WarRoomRosterSlotParamDto,
    @Req() req: StaffRequest,
    @Body() dto: UpdateWarRoomRosterSlotDto,
  ) {
    return this.service.updateRosterSlot(params.operationId, params.slotId, req.user.userId, dto);
  }

  @Post('operations/:operationId/roster/:slotId/attendance')
  async markAttendance(
    @Param() params: WarRoomRosterSlotParamDto,
    @Req() req: StaffRequest,
    @Body() dto: MarkWarRoomAttendanceDto,
  ) {
    return this.service.markAttendance(params.operationId, params.slotId, req.user.userId, dto);
  }
}
