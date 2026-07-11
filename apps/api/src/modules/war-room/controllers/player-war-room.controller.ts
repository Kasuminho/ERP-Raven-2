import { Body, Controller, Get, Param, Post, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PlayerWarRoomConfirmationDto, PlayerWarRoomSlotParamDto } from '../dto';
import { WarRoomService } from '../services/war-room.service';

type AuthRequest = {
  user: {
    userId: string;
  };
};

@Controller('war-room/me')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class PlayerWarRoomController {
  constructor(private readonly service: WarRoomService) {}

  @Get()
  async listMine(@Req() req: AuthRequest) {
    return this.service.listPlayerAssignments(req.user.userId);
  }

  @Post('slots/:slotId/confirm')
  async confirm(@Param() params: PlayerWarRoomSlotParamDto, @Req() req: AuthRequest, @Body() dto: PlayerWarRoomConfirmationDto) {
    return this.service.confirmPlayerSlot(req.user.userId, params.slotId, dto);
  }

  @Post('slots/:slotId/decline')
  async decline(@Param() params: PlayerWarRoomSlotParamDto, @Req() req: AuthRequest, @Body() dto: PlayerWarRoomConfirmationDto) {
    return this.service.declinePlayerSlot(req.user.userId, params.slotId, dto);
  }
}
