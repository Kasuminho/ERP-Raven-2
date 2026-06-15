import { Module } from '@nestjs/common';
import { BusinessRulesModule } from '../business-rules/business-rules.module';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';

@Module({
  imports: [BusinessRulesModule],
  controllers: [OperationsController],
  providers: [OperationsService],
})
export class OperationsModule {}
