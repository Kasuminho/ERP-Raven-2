import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { DaoshiCashReceipt, DaoshiReceiptStatus, DaoshiRaffle } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CreateDaoshiReceiptDto, CreateManualDaoshiReceiptDto, ReviewDaoshiReceiptDto } from '../dto';
import { DaoshiMonthlySummary, DaoshiPlayerSummary, DaoshiReceiptDetails, DaoshiService } from '../services/daoshi.service';

type AuthRequest = {
  user: {
    userId: string;
  };
};

@Controller('daoshi')
@UseGuards(JwtAuthGuard)
export class DaoshiController {
  constructor(private readonly service: DaoshiService) {}

  @Get('me')
  async mine(@Req() req: AuthRequest): Promise<DaoshiReceiptDetails[]> {
    return this.service.listMine(req.user.userId);
  }

  @Get('me/summary')
  async mySummary(@Req() req: AuthRequest, @Query('month') month?: string): Promise<DaoshiPlayerSummary> {
    return this.service.getMySummary(req.user.userId, month);
  }

  @Post('me/receipts')
  async createMine(@Req() req: AuthRequest, @Body() dto: CreateDaoshiReceiptDto): Promise<DaoshiCashReceipt> {
    return this.service.createMine(req.user.userId, dto);
  }

  @Get('staff/receipts')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async staffReceipts(
    @Query('status') status?: DaoshiReceiptStatus,
    @Query('month') month?: string,
  ): Promise<DaoshiReceiptDetails[]> {
    return this.service.listForStaff(status, month);
  }

  @Get('staff/summary')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async staffSummary(@Query('month') month?: string): Promise<DaoshiMonthlySummary> {
    return this.service.getMonthlySummary(month);
  }

  @Post('staff/receipts/manual')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async createManualReceipt(
    @Body() dto: CreateManualDaoshiReceiptDto,
    @Req() req: AuthRequest,
  ): Promise<DaoshiCashReceipt> {
    return this.service.createManualReceipt(req.user.userId, dto);
  }

  @Post('staff/receipts/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async approve(
    @Param('id') id: string,
    @Body() dto: ReviewDaoshiReceiptDto,
    @Req() req: AuthRequest,
  ): Promise<DaoshiCashReceipt> {
    return this.service.approveReceipt(id, req.user.userId, dto);
  }

  @Post('staff/receipts/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async reject(
    @Param('id') id: string,
    @Body() dto: ReviewDaoshiReceiptDto,
    @Req() req: AuthRequest,
  ): Promise<DaoshiCashReceipt> {
    return this.service.rejectReceipt(id, req.user.userId, dto);
  }

  @Post('staff/raffle/:month/run')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async runRaffle(@Param('month') month: string, @Req() req: AuthRequest): Promise<DaoshiRaffle> {
    return this.service.runRaffle(month, req.user.userId);
  }
}
