import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Auction, AuctionBidCancellationRequest } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import {
  ApproveWinnerDto,
  OverridePriorityDto,
  RejectWinnerDto,
  RemoveBidDto,
  ReviewBidCancellationDto,
  ReviewActionDto,
} from '../dto';
import { StaffBidCancellationRequest, StaffReviewDetails, StaffReviewService } from '../services/staff-review.service';

type StaffRequest = {
  user: {
    userId: string;
  };
};

@Controller('staff/reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STAFF', 'ADMIN')
export class StaffReviewController {
  constructor(private readonly service: StaffReviewService) {}

  @Get()
  async pendingReviews(): Promise<Auction[]> {
    return this.service.getPendingReviews();
  }

  @Get('bid-cancellations')
  async pendingBidCancellations(): Promise<StaffBidCancellationRequest[]> {
    return this.service.getPendingBidCancellations();
  }

  @Get('bid-cancellations/history')
  async bidCancellationHistory(): Promise<StaffBidCancellationRequest[]> {
    return this.service.getBidCancellationHistory();
  }

  @Post('bid-cancellations/:requestId/approve')
  async approveBidCancellation(
    @Param('requestId') requestId: string,
    @Body() dto: ReviewBidCancellationDto,
    @Req() req: StaffRequest,
  ): Promise<AuctionBidCancellationRequest> {
    return this.service.approveBidCancellation(requestId, req.user.userId, dto.note);
  }

  @Post('bid-cancellations/:requestId/reject')
  async rejectBidCancellation(
    @Param('requestId') requestId: string,
    @Body() dto: ReviewBidCancellationDto,
    @Req() req: StaffRequest,
  ): Promise<AuctionBidCancellationRequest> {
    return this.service.rejectBidCancellation(requestId, req.user.userId, dto.note);
  }

  @Get(':auctionId')
  async reviewDetails(@Param('auctionId') auctionId: string): Promise<StaffReviewDetails> {
    return this.service.getAuctionReviewDetails(auctionId);
  }

  @Post(':auctionId/approve')
  async approve(
    @Param('auctionId') auctionId: string,
    @Body() dto: ApproveWinnerDto,
    @Req() req: StaffRequest,
  ): Promise<Auction | StaffReviewDetails> {
    return this.service.approveAuctionWinner(auctionId, dto.playerId, req.user.userId);
  }

  @Post(':auctionId/reject')
  async reject(
    @Param('auctionId') auctionId: string,
    @Body() dto: RejectWinnerDto,
    @Req() req: StaffRequest,
  ): Promise<Auction | StaffReviewDetails> {
    return this.service.rejectAuctionWinner(auctionId, dto.reason, req.user.userId);
  }

  @Post(':auctionId/override')
  async override(
    @Param('auctionId') auctionId: string,
    @Body() dto: OverridePriorityDto,
    @Req() req: StaffRequest,
  ): Promise<Auction> {
    return this.service.overrideAuctionPriority(auctionId, dto.targetPlayerId, req.user.userId, dto.reason);
  }

  @Post(':auctionId/remove-bid')
  async removeBid(
    @Param('auctionId') auctionId: string,
    @Body() dto: RemoveBidDto,
    @Req() req: StaffRequest,
  ): Promise<void | StaffReviewDetails> {
    return this.service.removeBid(auctionId, dto.bidId, req.user.userId, dto.reason);
  }

  @Post(':auctionId/reopen')
  async reopen(
    @Param('auctionId') auctionId: string,
    @Body() dto: ReviewActionDto,
    @Req() req: StaffRequest,
  ): Promise<Auction> {
    return this.service.reopenAuction(auctionId, req.user.userId, dto.reason);
  }

  @Post(':auctionId/cancel')
  async cancel(
    @Param('auctionId') auctionId: string,
    @Body() dto: ReviewActionDto,
    @Req() req: StaffRequest,
  ): Promise<Auction> {
    return this.service.cancelAuction(auctionId, req.user.userId, dto.reason);
  }
}
