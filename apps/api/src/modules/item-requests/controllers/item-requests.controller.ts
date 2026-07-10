import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ItemRequest } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ApproveItemRequestUpdateDto, CreateItemRequestDto, CreateSelfItemRequestDto, DeliverItemRequestDto, UpdateItemRequestProofDto } from '../dto';
import { ItemRequestDetails } from '../repositories/item-requests.repository';
import { ItemRequestsService } from '../services/item-requests.service';

type StaffRequest = {
  user: {
    userId: string;
  };
};

@Controller('item-requests')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class ItemRequestsController {
  constructor(private readonly service: ItemRequestsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async create(@Body() dto: CreateItemRequestDto, @Req() req: StaffRequest): Promise<ItemRequest> {
    return this.service.createRequest(dto, req.user.userId);
  }

  @Post('me')
  @UseGuards(JwtAuthGuard)
  async createMine(@Body() dto: CreateSelfItemRequestDto, @Req() req: StaffRequest): Promise<ItemRequest> {
    return this.service.createSelfRequest(req.user.userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async listMine(@Req() req: StaffRequest): Promise<ItemRequestDetails[]> {
    return this.service.getRequestsForCurrentUser(req.user.userId);
  }

  @Get('staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async listStaff(): Promise<ItemRequestDetails[]> {
    return this.service.getRequestsForStaff();
  }

  @Get('rankings')
  @UseGuards(JwtAuthGuard)
  async rankings(): Promise<ItemRequestDetails[]> {
    return this.service.getPublicRankings();
  }

  @Get('player/:discordId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async player(@Param('discordId') discordId: string): Promise<ItemRequestDetails[]> {
    return this.service.getPlayerRequests(discordId);
  }

  @Get('item/:itemName')
  @UseGuards(JwtAuthGuard)
  async ranking(@Param('itemName') itemName: string): Promise<ItemRequestDetails[]> {
    return this.service.getItemRanking(itemName);
  }

  @Post(':id/update')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async markUpdated(@Param('id', ParseUUIDPipe) id: string, @Req() req: StaffRequest): Promise<ItemRequest> {
    return this.service.markUpdated(id, req.user.userId);
  }

  @Post(':id/player-update')
  @UseGuards(JwtAuthGuard)
  async markPlayerUpdated(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateItemRequestProofDto, @Req() req: StaffRequest): Promise<ItemRequest> {
    return this.service.markPlayerUpdated(id, req.user.userId, dto);
  }

  @Post(':id/approve-update')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async approvePlayerUpdate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ApproveItemRequestUpdateDto, @Req() req: StaffRequest): Promise<ItemRequest> {
    return this.service.approvePlayerUpdate(id, dto, req.user.userId);
  }

  @Post(':id/deliver')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async deliver(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeliverItemRequestDto,
    @Req() req: StaffRequest,
  ): Promise<{ delivered: number; completed: boolean }> {
    return this.service.deliver(id, dto, req.user.userId);
  }

  @Post(':id/drop-rank')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async dropRank(@Param('id', ParseUUIDPipe) id: string, @Req() req: StaffRequest): Promise<void> {
    return this.service.dropRank(id, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async delete(@Param('id', ParseUUIDPipe) id: string, @Req() req: StaffRequest): Promise<void> {
    return this.service.deleteRequest(id, req.user.userId);
  }

  @Post('process-stale')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  async processStale(): Promise<{ warned3d: number; warned4d: number; dropped: number }> {
    return this.service.processStaleRequests();
  }
}
