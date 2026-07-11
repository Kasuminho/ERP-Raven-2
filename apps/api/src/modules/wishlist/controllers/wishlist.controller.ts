import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { WishlistStatus } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CreateWishlistItemDto, FulfillWishlistItemDto } from '../dto';
import { WishlistService } from '../services/wishlist.service';

type AuthRequest = { user: { userId: string } };

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class WishlistController {
  constructor(private readonly service: WishlistService) {}

  @Get('me')
  async mine(@Req() req: AuthRequest) {
    return this.service.listMine(req.user.userId);
  }

  @Post('me')
  async createMine(@Req() req: AuthRequest, @Body() dto: CreateWishlistItemDto) {
    return this.service.createMine(req.user.userId, dto);
  }

  @Patch('me/:wishlistItemId/pause')
  async pauseMine(@Req() req: AuthRequest, @Param('wishlistItemId') wishlistItemId: string) {
    return this.service.setMineStatus(req.user.userId, wishlistItemId, WishlistStatus.PAUSED);
  }

  @Patch('me/:wishlistItemId/resume')
  async resumeMine(@Req() req: AuthRequest, @Param('wishlistItemId') wishlistItemId: string) {
    return this.service.setMineStatus(req.user.userId, wishlistItemId, WishlistStatus.ACTIVE);
  }

  @Patch('me/:wishlistItemId/remove')
  async removeMine(@Req() req: AuthRequest, @Param('wishlistItemId') wishlistItemId: string) {
    return this.service.setMineStatus(req.user.userId, wishlistItemId, WishlistStatus.REMOVED);
  }

  @Get('staff/items')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async staffDemand() {
    return this.service.listStaffDemand();
  }

  @Get('staff/items/:itemCatalogId')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async staffDemandForItem(@Param('itemCatalogId') itemCatalogId: string) {
    return this.service.getStaffDemandForItem(itemCatalogId);
  }

  @Post('staff/:wishlistItemId/fulfill')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async fulfill(
    @Param('wishlistItemId') wishlistItemId: string,
    @Req() req: AuthRequest,
    @Body() dto: FulfillWishlistItemDto,
  ) {
    return this.service.fulfillByStaff(wishlistItemId, req.user.userId, dto.note);
  }
}
