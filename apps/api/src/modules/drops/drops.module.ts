import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { DiscordModule } from '../discord/discord.module';
import { DropsController } from './drops.controller';
import { DropsService } from './drops.service';

@Module({
  imports: [AuditModule, DiscordModule],
  controllers: [DropsController],
  providers: [DropsService, RolesGuard],
})
export class DropsModule {}
