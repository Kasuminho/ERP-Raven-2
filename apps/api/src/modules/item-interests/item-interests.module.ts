import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { DiscordModule } from '../discord/discord.module';
import { ItemInterestsController } from './controllers/item-interests.controller';
import { ItemInterestsCronService } from './schedulers/item-interests-cron.service';
import { ItemInterestsService } from './services/item-interests.service';

@Module({
  imports: [AuditModule, DiscordModule],
  controllers: [ItemInterestsController],
  providers: [ItemInterestsService, ItemInterestsCronService, RolesGuard],
  exports: [ItemInterestsService],
})
export class ItemInterestsModule {}
