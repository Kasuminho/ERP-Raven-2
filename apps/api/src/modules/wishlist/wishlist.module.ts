import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { WishlistController } from './controllers/wishlist.controller';
import { WishlistService } from './services/wishlist.service';

@Module({
  imports: [AuditModule],
  controllers: [WishlistController],
  providers: [WishlistService],
})
export class WishlistModule {}
