import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { GuildStorageItem } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import {
  CreateStorageRequestDto,
  DispatchStorageItemDto,
  DispatchStorageRequestActionDto,
  ImportStorageItemsDto,
  RejectStorageRequestDto,
  ScanOcrDto,
  SetGeminiConfigDto,
  UpdateStorageItemDto,
} from '../dto';
import { StorageItemWithQueue, StorageService } from '../services/storage.service';

type AuthenticatedRequest = {
  user: {
    userId: string;
  };
};

@Controller('storage')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class StorageController {
  constructor(private readonly service: StorageService) {}

  @Get()
  async getStorage(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('kind') kind?: string,
  ): Promise<{
    items: StorageItemWithQueue[];
    totalUnits: number;
    totalUniqueItems: number;
    totalQueueAlerts: number;
  }> {
    return this.service.getStorageItems({ search, category, kind });
  }

  @Post('scan-ocr')
  @Roles('STAFF', 'ADMIN')
  async scanPrints(@Body() dto: ScanOcrDto) {
    return this.service.scanStoragePrints(dto);
  }

  @Post('import')
  @Roles('STAFF', 'ADMIN')
  async importItems(@Body() dto: ImportStorageItemsDto, @Req() req: AuthenticatedRequest) {
    return this.service.importItems(dto, req.user.userId);
  }

  @Post('dispatch')
  @Roles('STAFF', 'ADMIN')
  async dispatchItem(@Body() dto: DispatchStorageItemDto, @Req() req: AuthenticatedRequest) {
    return this.service.dispatchItem(dto, req.user.userId);
  }

  // --- Guild Storage Requests Endpoints ---

  @Post('requests')
  async createRequest(
    @Body() dto: CreateStorageRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.createStorageRequest(req.user.userId, dto);
  }

  @Get('requests/me')
  async getMyRequests(@Req() req: AuthenticatedRequest) {
    return this.service.getMyRequests(req.user.userId);
  }

  @Get('requests/staff')
  @Roles('STAFF', 'ADMIN')
  async getStaffRequests() {
    return this.service.getStaffRequests();
  }

  @Delete('requests/:id')
  async cancelRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.cancelMyRequest(req.user.userId, id);
  }

  @Post('requests/:id/dispatch')
  @Roles('STAFF', 'ADMIN')
  async dispatchRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DispatchStorageRequestActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.dispatchStorageRequest(req.user.userId, id, dto.staffNote);
  }

  @Post('requests/:id/reject')
  @Roles('STAFF', 'ADMIN')
  async rejectRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectStorageRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.rejectStorageRequest(req.user.userId, id, dto.staffNote);
  }

  // --- End Guild Storage Requests Endpoints ---

  @Patch(':id')
  @Roles('STAFF', 'ADMIN')
  async updateItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStorageItemDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<GuildStorageItem> {
    return this.service.updateItem(id, dto, req.user.userId);
  }

  @Delete(':id')
  @Roles('STAFF', 'ADMIN')
  async deleteItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean }> {
    await this.service.deleteItem(id, req.user.userId);
    return { success: true };
  }

  @Get('config')
  @Roles('STAFF', 'ADMIN')
  async getConfig(): Promise<{ hasConfiguredKey: boolean }> {
    return this.service.getGeminiConfig();
  }

  @Post('config')
  @Roles('STAFF', 'ADMIN')
  async setConfig(@Body() dto: SetGeminiConfigDto, @Req() req: AuthenticatedRequest): Promise<{ success: boolean }> {
    return this.service.setGeminiConfig(dto.apiKey, req.user.userId);
  }
}
