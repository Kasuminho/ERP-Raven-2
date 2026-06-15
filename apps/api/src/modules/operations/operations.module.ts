import { Module } from '@nestjs/common';
import { BusinessRulesModule } from '../business-rules/business-rules.module';
import { DiscordModule } from '../discord/discord.module';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';

@Module({
  imports: [BusinessRulesModule, DiscordModule],
  controllers: [OperationsController],
  providers: [OperationsService],
})
export class OperationsModule {}
