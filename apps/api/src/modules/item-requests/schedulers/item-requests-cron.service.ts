import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ItemRequestsService } from '../services/item-requests.service';

@Injectable()
export class ItemRequestsCronService {
  private readonly logger = new Logger(ItemRequestsCronService.name);
  private running = false;

  constructor(private readonly service: ItemRequestsService) {}

  @Cron('15 12 * * *', { timeZone: 'America/Sao_Paulo' })
  async processStaleRequests(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      const result = await this.service.processStaleRequests();
      this.logger.log(`item_request_stale_processed warned3d=${result.warned3d} warned4d=${result.warned4d} dropped=${result.dropped}`);
    } finally {
      this.running = false;
    }
  }
}
