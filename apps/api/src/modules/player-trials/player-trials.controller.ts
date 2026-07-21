import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CompletePlayerTrialCheckInDto, CreatePlayerTrialDto, DecidePlayerTrialDto } from './dto';
import { PlayerTrialsService } from './player-trials.service';

type AuthRequest = { user: { userId: string } };

@Controller('player-trials')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class PlayerTrialsController {
  constructor(private readonly service: PlayerTrialsService) {}

  @Get('me')
  mine(@Req() req: AuthRequest) { return this.service.getMine(req.user.userId); }

  @Get('staff')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  staff() { return this.service.getStaffWorkspace(); }

  @Post('staff')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  create(@Req() req: AuthRequest, @Body() dto: CreatePlayerTrialDto) { return this.service.create(req.user.userId, dto); }

  @Post('staff/:trialId/check-ins/:day')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  checkIn(@Req() req: AuthRequest, @Param('trialId') trialId: string, @Param('day', ParseIntPipe) day: number, @Body() dto: CompletePlayerTrialCheckInDto) {
    return this.service.completeCheckIn(req.user.userId, trialId, day, dto);
  }

  @Post('staff/:trialId/decision')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  decide(@Req() req: AuthRequest, @Param('trialId') trialId: string, @Body() dto: DecidePlayerTrialDto) {
    return this.service.decide(req.user.userId, trialId, dto);
  }
}
