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
  DispatchStorageItemDto,
  ImportStorageItemsDto,
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
@Roles('STAFF', 'ADMIN')
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
  async scanPrints(@Body() dto: ScanOcrDto) {
    return this.service.scanStoragePrints(dto);
  }

  @Post('import')
  async importItems(@Body() dto: ImportStorageItemsDto, @Req() req: AuthenticatedRequest) {
    return this.service.importItems(dto, req.user.userId);
  }

  @Post('dispatch')
  async dispatchItem(@Body() dto: DispatchStorageItemDto, @Req() req: AuthenticatedRequest) {
    return this.service.dispatchItem(dto, req.user.userId);
  }

  @Patch(':id')
  async updateItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStorageItemDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<GuildStorageItem> {
    return this.service.updateItem(id, dto, req.user.userId);
  }

  @Delete(':id')
  async deleteItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean }> {
    await this.service.deleteItem(id, req.user.userId);
    return { success: true };
  }

  @Get('config')
  async getConfig(): Promise<{ hasConfiguredKey: boolean }> {
    return this.service.getGeminiConfig();
  }

  @Post('config')
  async setConfig(@Body() dto: SetGeminiConfigDto, @Req() req: AuthenticatedRequest): Promise<{ success: boolean }> {
    return this.service.setGeminiConfig(dto.apiKey, req.user.userId);
  }
}
