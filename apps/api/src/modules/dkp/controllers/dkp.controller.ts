import { Body, Controller, Get, Param, Post, Query, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { DKPLock, DKPTransaction } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CreateDkpTransactionDto, LockDkpDto, PreviewDkpBidPolicySimulationDto, PreviewDkpDecaySimulationDto, PromoteDkpPolicySimulationDto, SaveDkpBidPolicySimulationDto, SaveDkpDecaySimulationDto, UnlockDkpDto } from '../dto';
import { DkpBidPolicySimulationSummary, DkpDecaySimulationSummary, DkpEconomySummary, DkpLeaderboardRow, DkpService, PromotedDkpPolicySimulation, StaffDkpPlayerRow } from '../services/dkp.service';

type AuthRequest = { user?: { userId?: string } };

@Controller('dkp')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class DkpController {
  constructor(private readonly service: DkpService) {}

  @Get('health')
  health(): { module: string; ready: boolean } {
    return this.service.health();
  }

  @Get('leaderboard')
  @UseGuards(JwtAuthGuard)
  async leaderboard(): Promise<DkpLeaderboardRow[]> {
    return this.service.getLeaderboard(10);
  }

  @Get('staff/players')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async staffPlayers(@Query('search') search?: string): Promise<StaffDkpPlayerRow[]> {
    return this.service.getStaffPlayerRows(search);
  }

  @Get('staff/economy')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async economy(): Promise<DkpEconomySummary> {
    return this.service.getEconomySummary();
  }

  @Get('staff/simulations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async simulations() {
    return this.service.listPolicySimulations();
  }

  @Post('staff/simulations/decay/preview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async previewDecay(@Body() dto: PreviewDkpDecaySimulationDto): Promise<DkpDecaySimulationSummary> {
    return this.service.previewDecaySimulation(dto);
  }

  @Post('staff/simulations/decay')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async saveDecay(@Body() dto: SaveDkpDecaySimulationDto, @Req() req: AuthRequest): Promise<DkpDecaySimulationSummary> {
    return this.service.saveDecaySimulation(req.user?.userId ?? '', dto);
  }

  @Post('staff/simulations/bid-policy/preview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async previewBidPolicy(@Body() dto: PreviewDkpBidPolicySimulationDto): Promise<DkpBidPolicySimulationSummary> {
    return this.service.previewBidPolicySimulation(dto);
  }

  @Post('staff/simulations/bid-policy')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async saveBidPolicy(@Body() dto: SaveDkpBidPolicySimulationDto, @Req() req: AuthRequest): Promise<DkpBidPolicySimulationSummary> {
    return this.service.saveBidPolicySimulation(req.user?.userId ?? '', dto);
  }

  @Post('staff/simulations/:simulationId/promote')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async promotePolicySimulation(
    @Param('simulationId') simulationId: string,
    @Body() dto: PromoteDkpPolicySimulationDto,
    @Req() req: AuthRequest,
  ): Promise<PromotedDkpPolicySimulation> {
    return this.service.promotePolicySimulation(req.user?.userId ?? '', simulationId, dto);
  }

  @Get(':playerId/total')
  async total(@Param('playerId') playerId: string): Promise<{ playerId: string; total: number }> {
    return {
      playerId,
      total: await this.service.calculateTotalDKP(playerId),
    };
  }

  @Get(':playerId/locked')
  async locked(@Param('playerId') playerId: string): Promise<{ playerId: string; locked: number }> {
    return {
      playerId,
      locked: await this.service.calculateLockedDKP(playerId),
    };
  }

  @Get(':playerId/available')
  async available(@Param('playerId') playerId: string): Promise<{ playerId: string; available: number }> {
    return {
      playerId,
      available: await this.service.calculateAvailableDKP(playerId),
    };
  }

  @Post('transaction')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async createTransaction(@Body() dto: CreateDkpTransactionDto, @Req() req: AuthRequest): Promise<DKPTransaction> {
    return this.service.createTransaction({ ...dto, createdById: req.user?.userId ?? '' });
  }

  @Post('lock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async lock(@Body() dto: LockDkpDto): Promise<DKPLock> {
    return this.service.lockDKP(dto.playerId, dto.auctionId, dto.amount);
  }

  @Post('unlock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async unlock(@Body() dto: UnlockDkpDto): Promise<DKPLock> {
    return this.service.unlockDKP(dto.lockId);
  }
}
