import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { DiscordModule } from '../discord/discord.module';
import { ItemInterestsController } from './controllers/item-interests.controller';
import { ItemInterestsService } from './services/item-interests.service';

@Module({
  imports: [AuditModule, DiscordModule],
  controllers: [ItemInterestsController],
  providers: [ItemInterestsService, RolesGuard],
  exports: [ItemInterestsService],
})
export class ItemInterestsModule {}
