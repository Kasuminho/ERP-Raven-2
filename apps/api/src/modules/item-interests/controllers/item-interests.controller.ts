import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ItemInterestEntry, ItemInterestPost, ItemInterestStatus } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { BulkCreateItemInterestPostDto, CreateItemInterestPostDto, DeclareItemInterestDto, DeliverItemInterestDto, VoteItemInterestDto } from '../dto';
import { ItemInterestDetails, ItemInterestsService } from '../services/item-interests.service';

type AuthRequest = { user: { userId: string } };

@Controller('item-interests')
@UseGuards(JwtAuthGuard)
export class ItemInterestsController {
  constructor(private readonly service: ItemInterestsService) {}

  @Get()
  async list(@Query('status') status: ItemInterestStatus | undefined, @Req() req: AuthRequest): Promise<ItemInterestDetails[]> {
    return this.service.listPosts(status, req.user.userId);
  }

  @Get(':id')
  async detail(@Param('id') id: string): Promise<ItemInterestDetails> {
    return this.service.getPost(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async create(@Body() dto: CreateItemInterestPostDto, @Req() req: AuthRequest): Promise<ItemInterestPost> {
    return this.service.createPost(dto, req.user.userId);
  }

  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async createBulk(@Body() dto: BulkCreateItemInterestPostDto, @Req() req: AuthRequest): Promise<ItemInterestPost[]> {
    return this.service.createBulkPosts(dto, req.user.userId);
  }

  @Post(':id/declare')
  async declare(@Param('id') id: string, @Body() dto: DeclareItemInterestDto, @Req() req: AuthRequest): Promise<ItemInterestEntry> {
    return this.service.declareInterest(id, req.user.userId, dto);
  }

  @Post(':id/seen')
  async markSeen(@Param('id') id: string, @Req() req: AuthRequest): Promise<{ seenAt: Date }> {
    return this.service.markSeen(id, req.user.userId);
  }

  @Post(':id/close')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async close(@Param('id') id: string, @Req() req: AuthRequest): Promise<ItemInterestPost> {
    return this.service.closePost(id, req.user.userId);
  }

  @Post(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async cancel(@Param('id') id: string, @Body('reason') reason: string, @Req() req: AuthRequest): Promise<ItemInterestPost> {
    return this.service.cancelPost(id, req.user.userId, reason);
  }

  @Post(':id/vote')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async vote(@Param('id') id: string, @Body() dto: VoteItemInterestDto, @Req() req: AuthRequest): Promise<ItemInterestDetails> {
    return this.service.vote(id, dto.entryId, req.user.userId);
  }

  @Post(':id/tie-break')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async tieBreak(@Param('id') id: string, @Req() req: AuthRequest): Promise<ItemInterestDetails> {
    return this.service.startTieBreak(id, req.user.userId);
  }

  @Post(':id/deliver')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async deliver(@Param('id') id: string, @Body() dto: DeliverItemInterestDto, @Req() req: AuthRequest): Promise<ItemInterestPost> {
    return this.service.markDelivered(id, dto, req.user.userId);
  }
}
