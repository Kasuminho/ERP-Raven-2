import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Auction, ItemCatalog } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CreateItemAuctionsDto, CreateItemDto, UpdateItemDto } from '../dto';
import { ItemsService } from '../services/items.service';

type AuthRequest = { user?: { userId?: string } };

@Controller('items')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class ItemsController {
  constructor(private readonly service: ItemsService) {}

  @Get('health')
  health(): { module: string; ready: boolean } {
    return this.service.health();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async create(@Body() dto: CreateItemDto, @Req() req: AuthRequest): Promise<ItemCatalog> {
    return this.service.createItem({ ...dto, createdById: req.user?.userId });
  }

  @Get()
  async list(
    @Query('active') active?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ): Promise<ItemCatalog[]> {
    return this.service.getItems({
      activeOnly: active === 'true',
      page: Number(page),
      limit: Number(limit),
      search,
    });
  }

  @Get('requestable')
  async requestable(): Promise<ItemCatalog[]> {
    return this.service.getRequestableItems();
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<ItemCatalog> {
    return this.service.getItem(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async update(@Param('id') id: string, @Body() dto: UpdateItemDto, @Req() req: AuthRequest): Promise<ItemCatalog> {
    return this.service.updateItem(id, { ...dto, updatedById: req.user?.userId });
  }

  @Post(':id/auctions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async createAuctions(@Param('id') id: string, @Body() dto: CreateItemAuctionsDto, @Req() req: AuthRequest): Promise<Auction[]> {
    return this.service.createAuctionsFromItem(id, { ...dto, createdById: req.user?.userId ?? '' });
  }
}
