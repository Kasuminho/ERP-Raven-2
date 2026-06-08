import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DeliverAuctionDropDto } from './dto/deliver-auction-drop.dto';
import { DropsService } from './drops.service';

type AuthRequest = {
  user: {
    userId: string;
  };
};

@Controller('drops')
export class DropsController {
  constructor(private readonly service: DropsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async delivered(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.getDeliveredDrops({ page: Number(page), limit: Number(limit) });
  }

  @Get('pending-auction-deliveries')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async pendingAuctionDeliveries(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.getPendingAuctionDeliveries({ page: Number(page), limit: Number(limit) });
  }

  @Post('auction/:auctionId/deliver')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async deliverAuctionDrop(
    @Param('auctionId') auctionId: string,
    @Body() dto: DeliverAuctionDropDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.deliverAuctionDrop(auctionId, dto.proofImageUrl, req.user.userId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async mine(@Req() req: AuthRequest) {
    return this.service.getMyDrops(req.user.userId);
  }
}
