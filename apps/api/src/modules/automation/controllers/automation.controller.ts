import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AuctionAutomationService } from '../services/auction-automation.service';
import { AuctionIntegrityReport, AutomationJobResult, AutomationStatus } from '../types/automation.types';

@Controller('automation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AutomationController {
  constructor(private readonly auctionAutomationService: AuctionAutomationService) {}

  @Post('finalize/:auctionId')
  async finalize(@Param('auctionId') auctionId: string): Promise<AutomationJobResult> {
    return this.auctionAutomationService.finalizeAuction(auctionId);
  }

  @Post('relist/:auctionId')
  async relist(@Param('auctionId') auctionId: string): Promise<AutomationJobResult> {
    return this.auctionAutomationService.relistAuction(auctionId);
  }

  @Post('validate-integrity')
  async validateIntegrity(): Promise<AuctionIntegrityReport> {
    return this.auctionAutomationService.validateAuctionIntegrity();
  }

  @Get('status')
  status(): AutomationStatus {
    return this.auctionAutomationService.getStatus();
  }
}
