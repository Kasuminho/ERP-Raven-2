import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { ItemRequestsModule } from '../item-requests/item-requests.module';
import { ItemsModule } from '../items/items.module';
import { StorageController } from './controllers/storage.controller';
import { StorageRepository } from './repositories/storage.repository';
import { GeminiOcrService } from './services/gemini-ocr.service';
import { StorageService } from './services/storage.service';

@Module({
  imports: [DatabaseModule, AuditModule, ItemRequestsModule, ItemsModule],
  controllers: [StorageController],
  providers: [StorageService, GeminiOcrService, StorageRepository, RolesGuard],
  exports: [StorageService, GeminiOcrService],
})
export class StorageModule {}
