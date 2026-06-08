import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { DiscordModule } from '../discord/discord.module';
import { UploadsModule } from '../uploads/uploads.module';
import { ItemRequestsController } from './controllers/item-requests.controller';
import { ItemRequestsRepository } from './repositories/item-requests.repository';
import { ItemRequestsCronService } from './schedulers/item-requests-cron.service';
import { ItemRequestsService } from './services/item-requests.service';

@Module({
  imports: [AuditModule, UploadsModule, DiscordModule],
  controllers: [ItemRequestsController],
  providers: [ItemRequestsService, ItemRequestsRepository, ItemRequestsCronService, RolesGuard],
  exports: [ItemRequestsService],
})
export class ItemRequestsModule {}
