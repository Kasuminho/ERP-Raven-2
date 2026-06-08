import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Auction, AuctionBid } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CreateAuctionDto, PlaceBidDto } from '../dto';
import { AuctionFinalizationResult, AuctionsService } from '../services/auctions.service';

type AuthRequest = { user?: { userId?: string } };

@Controller('auctions')
export class AuctionsController {
  constructor(private readonly service: AuctionsService) {}

  @Get('health')
  health(): { module: string; ready: boolean } {
    return this.service.health();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async create(@Body() dto: CreateAuctionDto): Promise<Auction> {
    return this.service.createAuction(dto);
  }

  @Post(':id/bid')
  @UseGuards(JwtAuthGuard)
  async bid(@Param('id') auctionId: string, @Body() dto: PlaceBidDto, @Req() req: AuthRequest): Promise<AuctionBid> {
    return this.service.placeBidForUser(req.user?.userId ?? '', auctionId, dto.amount);
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
  async bids(@Param('id') auctionId: string): Promise<AuctionBid[]> {
    return this.service.getAuctionBids(auctionId);
  }
}
