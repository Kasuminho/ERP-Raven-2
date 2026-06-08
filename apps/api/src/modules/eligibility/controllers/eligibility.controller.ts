import { Controller, Get, Param } from '@nestjs/common';
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
  async eligiblePlayers(@Param('auctionId') auctionId: string): Promise<RankingResponseDto[]> {
    return this.service.getEligiblePlayers(auctionId);
  }

  @Get('auction/:auctionId/ranking')
  async ranking(@Param('auctionId') auctionId: string): Promise<RankingResponseDto[]> {
    return this.service.rankAuctionCandidates(auctionId);
  }

  @Get('player/:playerId/auction/:auctionId')
  async playerEligibility(
    @Param('playerId') playerId: string,
    @Param('auctionId') auctionId: string,
  ): Promise<EligibilityValidationResponseDto> {
    return this.service.canPlayerBid(playerId, auctionId);
  }
}
