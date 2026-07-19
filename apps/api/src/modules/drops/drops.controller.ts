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

  @Get('auction-results')
  @UseGuards(JwtAuthGuard)
  async auctionResults(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.getPublishedAuctionResults({ page: Number(page), limit: Number(limit) });
  }

  @Get('audit/items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async itemAuditSummaries(@Query('search') search?: string) {
    return this.service.getItemAuditSummaries(search);
  }

  @Get('audit/item')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async itemAuditDetails(@Query('itemCatalogId') itemCatalogId?: string, @Query('itemName') itemName?: string) {
    return this.service.getItemAuditDetails({ itemCatalogId, itemName });
  }

  @Get('audit/item/full')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async itemAuditFull(@Query('itemCatalogId') itemCatalogId?: string, @Query('itemName') itemName?: string) {
    return this.service.getItemAuditFull({ itemCatalogId, itemName });
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
