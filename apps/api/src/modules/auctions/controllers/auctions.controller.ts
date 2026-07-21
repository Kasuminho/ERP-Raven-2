import { Body, Controller, Get, Param, Post, Query, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Auction, AuctionBid, AuctionBidCancellationRequest, AuctionDispute, AuctionDisputeStatus } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CreateAuctionDisputeDto, CreateAuctionDto, PlaceBidDto, RequestBidCancellationDto, ReviewAuctionDisputeDto } from '../dto';
import { AuctionFinalizationResult, AuctionsService, BidCancellationRequestResult, PlayerAuctionResultReceipt, PlayerAuctionTimelineEvent, StaffAuctionDispute } from '../services/auctions.service';

type AuthRequest = { user?: { userId?: string } };

@Controller('auctions')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class AuctionsController {
  constructor(private readonly service: AuctionsService) {}

  @Get('health')
  health(): { module: string; ready: boolean } {
    return this.service.health();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async create(@Body() dto: CreateAuctionDto, @Req() req: AuthRequest): Promise<Auction> {
    return this.service.createAuction({ ...dto, createdById: req.user?.userId ?? '' });
  }

  @Post(':id/bid')
  @UseGuards(JwtAuthGuard)
  async bid(@Param('id') auctionId: string, @Body() dto: PlaceBidDto, @Req() req: AuthRequest): Promise<AuctionBid> {
    return this.service.placeBidForUser(req.user?.userId ?? '', auctionId, dto.amount);
  }

  @Post(':id/bid-cancellation')
  @UseGuards(JwtAuthGuard)
  async requestBidCancellation(
    @Param('id') auctionId: string,
    @Body() dto: RequestBidCancellationDto,
    @Req() req: AuthRequest,
  ): Promise<BidCancellationRequestResult> {
    return this.service.requestBidCancellationForUser(req.user?.userId ?? '', auctionId, dto.reason);
  }

  @Get(':id/bid-cancellation/me')
  @UseGuards(JwtAuthGuard)
  async myBidCancellation(
    @Param('id') auctionId: string,
    @Req() req: AuthRequest,
  ): Promise<AuctionBidCancellationRequest | null> {
    return this.service.getUserBidCancellation(req.user?.userId ?? '', auctionId);
  }

  @Get(':id/bid/me')
  @UseGuards(JwtAuthGuard)
  async myBid(@Param('id') auctionId: string, @Req() req: AuthRequest): Promise<AuctionBid | null> {
    return this.service.getUserBid(req.user?.userId ?? '', auctionId);
  }

  @Get(':id/result/me')
  @UseGuards(JwtAuthGuard)
  async myResult(@Param('id') auctionId: string, @Req() req: AuthRequest): Promise<PlayerAuctionResultReceipt> {
    return this.service.getPlayerResultReceipt(req.user?.userId ?? '', auctionId);
  }

  @Get(':id/timeline/me')
  @UseGuards(JwtAuthGuard)
  async mySafeTimeline(@Param('id') auctionId: string): Promise<PlayerAuctionTimelineEvent[]> {
    return this.service.getPlayerSafeTimeline(auctionId);
  }

  @Get(':id/dispute/me')
  @UseGuards(JwtAuthGuard)
  async myDispute(@Param('id') auctionId: string, @Req() req: AuthRequest): Promise<AuctionDispute | null> {
    return this.service.getUserDispute(req.user?.userId ?? '', auctionId);
  }

  @Post(':id/disputes')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async createDispute(
    @Param('id') auctionId: string,
    @Body() dto: CreateAuctionDisputeDto,
    @Req() req: AuthRequest,
  ): Promise<AuctionDispute> {
    return this.service.createDisputeForUser(req.user?.userId ?? '', auctionId, dto);
  }

  @Get('staff/disputes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async staffDisputes(@Query('status') status?: AuctionDisputeStatus): Promise<StaffAuctionDispute[]> {
    return this.service.listStaffDisputes(status);
  }

  @Post('staff/disputes/:disputeId/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async reviewDispute(
    @Param('disputeId') disputeId: string,
    @Body() dto: ReviewAuctionDisputeDto,
    @Req() req: AuthRequest,
  ): Promise<AuctionDispute> {
    return this.service.reviewDispute(disputeId, req.user?.userId ?? '', dto);
  }

  @Post(':id/finalize')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async finalize(@Param('id') auctionId: string): Promise<AuctionFinalizationResult> {
    return this.service.finalizeAuction(auctionId);
  }

  @Post(':id/relist')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async relist(@Param('id') auctionId: string): Promise<Auction> {
    return this.service.relistAuction(auctionId);
  }

  @Get()
  async active(): Promise<Auction[]> {
    return this.service.getActiveAuctions();
  }

  @Get(':id')
  async details(@Param('id') auctionId: string): Promise<unknown> {
    return this.service.getAuctionDetails(auctionId);
  }

  @Get(':id/bids')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async bids(@Param('id') auctionId: string): Promise<AuctionBid[]> {
    return this.service.getAuctionBids(auctionId);
  }
}
