import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { AuctionsModule } from '../auctions/auctions.module';
import { ItemsController } from './controllers/items.controller';
import { ItemsRepository } from './repositories/items.repository';
import { ItemsService } from './services/items.service';

@Module({
  imports: [AuditModule, AuctionsModule],
  controllers: [ItemsController],
  providers: [ItemsService, ItemsRepository, RolesGuard],
  exports: [ItemsService],
})
export class ItemsModule {}
