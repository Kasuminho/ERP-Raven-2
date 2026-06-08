import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuctionAutomationService } from '../services/auction-automation.service';
import { AUTOMATION_TIMEZONE } from '../types/automation.types';

@Injectable()
export class AutomationCronService {
  private readonly logger = new Logger(AutomationCronService.name);
  private readonly runningJobs = new Set<string>();

  constructor(private readonly auctionAutomationService: AuctionAutomationService) {}

  @Cron(CronExpression.EVERY_5_MINUTES, { timeZone: AUTOMATION_TIMEZONE })
  async finalizeExpiredAuctions(): Promise<void> {
    await this.runOnce('finalizeExpiredAuctions', () => this.auctionAutomationService.finalizeExpiredAuctions());
  }

  @Cron(CronExpression.EVERY_10_MINUTES, { timeZone: AUTOMATION_TIMEZONE })
  async processPendingReviews(): Promise<void> {
    await this.runOnce('processPendingReviews', () => this.auctionAutomationService.processPendingReviews());
  }

  @Cron(CronExpression.EVERY_30_MINUTES, { timeZone: AUTOMATION_TIMEZONE })
  async cleanupExpiredLocks(): Promise<void> {
    await this.runOnce('cleanupExpiredLocks', () => this.auctionAutomationService.cleanupExpiredLocks());
  }

  @Cron('*/15 * * * *', { timeZone: AUTOMATION_TIMEZONE })
  async notifyAuctionsEndingSoon(): Promise<void> {
    await this.runOnce('notifyAuctionsEndingSoon', () => this.auctionAutomationService.notifyAuctionsEndingSoon());
  }

  @Cron('0 * * * *', { timeZone: AUTOMATION_TIMEZONE })
  async relistInvalidAuctions(): Promise<void> {
    await this.runOnce('relistInvalidAuctions', () => this.auctionAutomationService.relistInvalidAuctions());
  }

  @Cron('0 */6 * * *', { timeZone: AUTOMATION_TIMEZONE })
  async validateAuctionIntegrity(): Promise<void> {
    await this.runOnce('validateAuctionIntegrity', () => this.auctionAutomationService.validateAuctionIntegrity());
  }

  private async runOnce(jobName: string, handler: () => Promise<unknown>): Promise<void> {
    if (this.runningJobs.has(jobName)) {
      this.logger.warn(`automation_job_skipped_overlap job=${jobName}`);
      return;
    }

    this.runningJobs.add(jobName);

    try {
      await handler();
      this.logger.debug(`automation_job_completed job=${jobName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown scheduled automation failure.';
      this.logger.error(`automation_job_failed job=${jobName} error=${message}`);
    } finally {
      this.runningJobs.delete(jobName);
    }
  }
}
