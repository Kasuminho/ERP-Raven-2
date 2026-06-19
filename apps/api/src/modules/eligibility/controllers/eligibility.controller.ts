import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { EligibilityValidationResponseDto, RankingResponseDto } from '../dto';
import { EligibilityService } from '../services/eligibility.service';

@Controller('eligibility')
export class EligibilityController {
  constructor(private readonly service: EligibilityService) {}

  @Get('health')
  health(): { module: string; ready: boolean } {
    return this.service.health();
  }

  @Get('auction/:auctionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async eligiblePlayers(@Param('auctionId') auctionId: string): Promise<RankingResponseDto[]> {
    return this.service.getEligiblePlayers(auctionId);
  }

  @Get('auction/:auctionId/ranking')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async ranking(@Param('auctionId') auctionId: string): Promise<RankingResponseDto[]> {
    return this.service.rankAuctionCandidates(auctionId);
  }

  @Get('player/:playerId/auction/:auctionId')
  @UseGuards(JwtAuthGuard)
  async playerEligibility(
    @Param('playerId') playerId: string,
    @Param('auctionId') auctionId: string,
  ): Promise<EligibilityValidationResponseDto> {
    return this.service.canPlayerBid(playerId, auctionId);
  }
}
