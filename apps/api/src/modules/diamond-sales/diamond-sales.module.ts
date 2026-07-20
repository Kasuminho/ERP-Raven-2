import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { DiscordModule } from '../discord/discord.module';
import { DiamondSalesController } from './diamond-sales.controller';
import { DiamondSalesService } from './diamond-sales.service';

@Module({
  imports: [AuditModule, DiscordModule],
  controllers: [DiamondSalesController],
  providers: [DiamondSalesService, RolesGuard],
})
export class DiamondSalesModule {}
