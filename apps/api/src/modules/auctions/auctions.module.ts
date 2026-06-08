import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DkpModule } from '../dkp/dkp.module';
import { DiscordModule } from '../discord/discord.module';
import { EligibilityModule } from '../eligibility/eligibility.module';
import { AuctionsController } from './controllers/auctions.controller';
import { AuctionsService } from './services/auctions.service';
import { AuctionsRepository } from './repositories/auctions.repository';
import { AuctionAutomationService } from './schedulers/auction-automation.service';

@Module({
  imports: [AuditModule, DkpModule, DiscordModule, EligibilityModule],
  controllers: [AuctionsController],
  providers: [AuctionsService, AuctionsRepository, AuctionAutomationService],
  exports: [AuctionsService, AuctionAutomationService],
})
export class AuctionsModule {}
