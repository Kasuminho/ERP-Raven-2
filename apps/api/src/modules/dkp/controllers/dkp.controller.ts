import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { DKPLock, DKPTransaction } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CreateDkpTransactionDto, LockDkpDto, UnlockDkpDto } from '../dto';
import { DkpLeaderboardRow, DkpService, StaffDkpPlayerRow } from '../services/dkp.service';

type AuthRequest = { user?: { userId?: string } };

@Controller('dkp')
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
    return this.service.createTransaction({ ...dto, createdById: req.user?.userId ?? dto.createdById });
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
