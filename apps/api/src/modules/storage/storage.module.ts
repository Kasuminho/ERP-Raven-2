import { forwardRef, Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { ItemRequestsModule } from '../item-requests/item-requests.module';
import { ItemsModule } from '../items/items.module';
import { DiscordModule } from '../discord/discord.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OcrModule } from '../ocr/ocr.module';
import { StorageController } from './controllers/storage.controller';
import { StorageRepository } from './repositories/storage.repository';
import { StorageService } from './services/storage.service';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    ItemRequestsModule,
    forwardRef(() => ItemsModule),
    DiscordModule,
    NotificationsModule,
    OcrModule,
  ],
  controllers: [StorageController],
  providers: [StorageService, StorageRepository, RolesGuard],
  exports: [StorageService, OcrModule],
})
export class StorageModule {}
