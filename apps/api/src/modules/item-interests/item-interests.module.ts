import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { DiscordModule } from '../discord/discord.module';
import { UploadsModule } from '../uploads/uploads.module';
import { ItemInterestsController } from './controllers/item-interests.controller';
import { ItemInterestsCronService } from './schedulers/item-interests-cron.service';
import { ItemInterestTransmuteRaffleService } from './services/item-interest-transmute-raffle.service';
import { ItemInterestsService } from './services/item-interests.service';

@Module({
  imports: [AuditModule, DiscordModule, UploadsModule],
  controllers: [ItemInterestsController],
  providers: [ItemInterestsService, ItemInterestTransmuteRaffleService, ItemInterestsCronService, RolesGuard],
  exports: [ItemInterestsService],
})
export class ItemInterestsModule {}
