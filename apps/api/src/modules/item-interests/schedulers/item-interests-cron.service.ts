import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ItemInterestsService } from '../services/item-interests.service';

@Injectable()
export class ItemInterestsCronService {
  private readonly logger = new Logger(ItemInterestsCronService.name);
  private running = false;

  constructor(private readonly itemInterests: ItemInterestsService) {}

  @Cron('*/1 * * * *', { timeZone: 'America/Sao_Paulo' })
  async closeExpiredInterests(): Promise<void> {
    if (this.running) {
      this.logger.warn('item_interest_auto_close_skipped_overlap');
      return;
    }

    this.running = true;

    try {
      const result = await this.itemInterests.closeExpiredPosts();

      if (result.closed > 0) {
        this.logger.log(`item_interest_auto_closed total=${result.closed} voting=${result.voting} empty=${result.empty} autoSelected=${result.autoSelected}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown item interest automation failure.';
      this.logger.error(`item_interest_auto_close_failed error=${message}`, error instanceof Error ? error.stack : undefined);
    } finally {
      this.running = false;
    }
  }
}
