import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AnnouncementsService } from '../services/announcements.service';

@Injectable()
export class AnnouncementsCronService {
  private readonly logger = new Logger(AnnouncementsCronService.name);

  constructor(private readonly announcements: AnnouncementsService) {}

  @Cron('*/1 * * * *', { timeZone: 'America/Sao_Paulo' })
  async processAnnouncements(): Promise<void> {
    try {
      const result = await this.announcements.processDueAnnouncements();

      if (result.sent > 0) {
        this.logger.log(`announcement_messages_sent=${result.sent}`);
      }
    } catch (error) {
      this.logger.error('announcement_cron_failed', error instanceof Error ? error.stack : undefined);
    }
  }
}
