import { Injectable, Logger } from '@nestjs/common';
import { Auction, AuctionStatus, Prisma } from '@prisma/client';
import { AuditService } from '../../audit/services/audit.service';
import { AuctionsService } from '../../auctions/services/auctions.service';
import { NotificationService } from '../../discord/services/notification.service';
import { AutomationRepository } from '../repositories/automation.repository';
import { AutomationNotificationQueueService } from './automation-notification-queue.service';
import {
  AuctionIntegrityReport,
  AutomationJobResult,
  AutomationStatus,
  AUTOMATION_TIMEZONE,
} from '../types/automation.types';

@Injectable()
export class AuctionAutomationService {
  private readonly logger = new Logger(AuctionAutomationService.name);
  private readonly relistDelayDays = 7;

  constructor(
    private readonly repository: AutomationRepository,
    private readonly auctionsService: AuctionsService,
    private readonly notificationService: NotificationService,
    private readonly auditService: AuditService,
    private readonly notificationQueue: AutomationNotificationQueueService,
  ) {}

  getStatus(): AutomationStatus {
    return {
      timezone: AUTOMATION_TIMEZONE,
      queuedNotifications: this.notificationQueue.size(),
      jobs: [
        {
          name: 'finalizeExpiredAuctions',
          schedule: '*/5 * * * *',
          description: 'Finalize OPEN auctions whose BRT end time has passed.',
        },
        {
          name: 'notifyAuctionsEndingSoon',
          schedule: '*/15 * * * *',
          description: 'Notify auction channel about auctions ending within one hour.',
        },
        {
          name: 'relistInvalidAuctions',
          schedule: '0 * * * *',
          description: 'Relist malformed OPEN auctions and reopen RELISTED auctions whose delay elapsed.',
        },
        {
          name: 'cleanupExpiredLocks',
          schedule: '*/30 * * * *',
          description: 'Release active DKP locks attached to terminal auctions.',
        },
        {
          name: 'validateAuctionIntegrity',
          schedule: '0 */6 * * *',
          description: 'Inspect auction, bid, and lock consistency.',
        },
      ],
    };
  }

  async finalizeExpiredAuctions(now = new Date()): Promise<AutomationJobResult> {
    const auctions = await this.repository.findExpiredOpenAuctions(now);
    const result = this.createResult('finalizeExpiredAuctions', auctions);

    for (const auction of auctions) {
      try {
        const current = await this.repository.client.auction.findUnique({ where: { id: auction.id } });

        if (!current || current.status !== AuctionStatus.OPEN || current.endsAt > now) {
          this.skip(result, auction.id, 'Auction is no longer eligible for finalization.');
          continue;
        }

        const finalized = await this.auctionsService.finalizeAuction(auction.id);
        this.succeed(result, auction.id, `Auction moved to ${finalized.auction.status}.`);

        await this.audit('AUTOMATION_AUCTION_FINALIZED', 'Auction', auction.id, {
          status: finalized.auction.status,
          winnerPlayerId: finalized.winner?.playerId,
          refundedLockIds: finalized.refundedLockIds,
        });
      } catch (error) {
        await this.recordFailure(result, auction.id, 'AUTOMATION_FINALIZATION_FAILED', error);
      }
    }

    return result;
  }

  async finalizeAuction(auctionId: string): Promise<AutomationJobResult> {
    const auction = await this.repository.client.auction.findUnique({ where: { id: auctionId } });
    const result = this.createResult('finalizeAuction', auction ? [auction] : []);

    if (!auction) {
      this.fail(result, auctionId, 'Auction was not found.');
      return result;
    }

    if (auction.status !== AuctionStatus.OPEN) {
      this.skip(result, auctionId, `Auction status is ${auction.status}.`);
      return result;
    }

    try {
      const finalized = await this.auctionsService.finalizeAuction(auctionId);
      this.succeed(result, auctionId, `Auction moved to ${finalized.auction.status}.`);
      await this.audit('AUTOMATION_AUCTION_FINALIZED_MANUAL', 'Auction', auctionId, {
        status: finalized.auction.status,
        winnerPlayerId: finalized.winner?.playerId,
      });
    } catch (error) {
      await this.recordFailure(result, auctionId, 'AUTOMATION_MANUAL_FINALIZATION_FAILED', error);
    }

    return result;
  }

  async relistInvalidAuctions(now = new Date()): Promise<AutomationJobResult> {
    const malformedOpenAuctions = await this.repository.findInvalidOpenAuctions();
    const invalidAuctions = this.dedupeAuctions(malformedOpenAuctions);
    const readyToReopen = await this.repository.findRelistedAuctionsReadyToReopen(now);
    const result = this.createResult('relistInvalidAuctions', [...invalidAuctions, ...readyToReopen]);

    for (const auction of invalidAuctions) {
      try {
        const relisted = await this.auctionsService.relistAuction(auction.id);
        this.succeed(result, auction.id, `Invalid auction relisted until ${relisted.reopensAt?.toISOString() ?? 'unscheduled'}.`);
        await this.audit('AUTOMATION_AUCTION_RELISTED', 'Auction', auction.id, {
          previousStatus: auction.status,
          reopensAt: relisted.reopensAt?.toISOString(),
        });
      } catch (error) {
        await this.recordFailure(result, auction.id, 'AUTOMATION_RELIST_FAILED', error);
      }
    }

    for (const auction of readyToReopen) {
      try {
        const reopened = await this.auctionsService.reopenRelistedAuction(auction.id);
        this.succeed(result, auction.id, `Relisted auction reopened until ${reopened.endsAt.toISOString()}.`);
        await this.audit('AUTOMATION_AUCTION_REOPENED', 'Auction', auction.id, {
          endsAt: reopened.endsAt.toISOString(),
        });
      } catch (error) {
        await this.recordFailure(result, auction.id, 'AUTOMATION_REOPEN_FAILED', error);
      }
    }

    return result;
  }

  async relistAuction(auctionId: string): Promise<AutomationJobResult> {
    const auction = await this.repository.client.auction.findUnique({ where: { id: auctionId } });
    const result = this.createResult('relistAuction', auction ? [auction] : []);

    if (!auction) {
      this.fail(result, auctionId, 'Auction was not found.');
      return result;
    }

    try {
      const relisted = await this.auctionsService.relistAuction(auctionId);
      this.succeed(result, auctionId, `Auction relisted until ${relisted.reopensAt?.toISOString() ?? 'unscheduled'}.`);
      await this.audit('AUTOMATION_AUCTION_RELISTED_MANUAL', 'Auction', auctionId, {
        reopensAt: relisted.reopensAt?.toISOString(),
      });
    } catch (error) {
      await this.recordFailure(result, auctionId, 'AUTOMATION_MANUAL_RELIST_FAILED', error);
    }

    return result;
  }

  async processPendingReviews(): Promise<AutomationJobResult> {
    const auctions = await this.repository.findPendingReviews();
    const result = this.createResult('processPendingReviews', auctions);

    for (const auction of auctions) {
      try {
        await this.notificationService.notifyStaffReviewRequired({
          auctionId: auction.id,
          itemName: auction.itemName,
        });
        this.succeed(result, auction.id, 'Staff review notification sent.');
        await this.audit('AUTOMATION_REVIEW_REQUIRED_NOTIFIED', 'Auction', auction.id, {
          itemName: auction.itemName,
        });
      } catch (error) {
        await this.recordFailure(result, auction.id, 'AUTOMATION_REVIEW_NOTIFICATION_FAILED', error);
      }
    }

    return result;
  }

  async cleanupExpiredLocks(): Promise<AutomationJobResult> {
    const locks = await this.repository.findActiveLocksForTerminalAuctions();
    const result: AutomationJobResult = {
      job: 'cleanupExpiredLocks',
      processed: locks.length,
      succeeded: 0,
      failed: 0,
      details: [],
    };

    for (const lock of locks) {
      try {
        await this.repository.client.$transaction(
          async (tx) => {
            const current = await tx.dKPLock.findUnique({
              where: { id: lock.id },
              include: { auction: true },
            });

            if (!current || current.released || current.auction.status === AuctionStatus.OPEN || current.auction.status === AuctionStatus.PENDING_REVIEW) {
              return;
            }

            await this.repository.releaseLock(lock.id, tx);
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );

        this.succeed(result, lock.id, 'Released terminal-auction lock.');
        await this.audit('AUTOMATION_LOCK_RELEASED', 'DKPLock', lock.id, {
          auctionId: lock.auctionId,
          playerId: lock.playerId,
          amount: lock.amount,
        });
      } catch (error) {
        await this.recordFailure(result, lock.id, 'AUTOMATION_LOCK_CLEANUP_FAILED', error);
      }
    }

    return result;
  }

  async validateAuctionIntegrity(): Promise<AuctionIntegrityReport> {
    const checkedAt = new Date().toISOString();
    const issues: AuctionIntegrityReport['issues'] = [];
    const now = new Date();
    const expiredOpenAuctions = await this.repository.findExpiredOpenAuctions(now);
    const finishedWithLocks = await this.repository.findFinishedAuctionsWithActiveLocks();
    const pendingReviews = await this.repository.findPendingReviews();

    for (const auction of expiredOpenAuctions) {
      issues.push({
        auctionId: auction.id,
        status: auction.status,
        issue: 'OPEN auction has passed its end time.',
        severity: 'HIGH',
      });
    }

    for (const auction of finishedWithLocks) {
      issues.push({
        auctionId: auction.id,
        status: auction.status,
        issue: 'FINISHED auction still has active DKP locks.',
        severity: 'HIGH',
      });
    }

    for (const auction of pendingReviews) {
      const activeLocks = await this.repository.countActiveLocks(auction.id);
      const validBids = await this.repository.countValidBids(auction.id);

      if (validBids === 0) {
        issues.push({
          auctionId: auction.id,
          status: auction.status,
          issue: 'PENDING_REVIEW auction has no valid bids.',
          severity: 'MEDIUM',
        });
      }

      if (activeLocks === 0) {
        issues.push({
          auctionId: auction.id,
          status: auction.status,
          issue: 'PENDING_REVIEW auction has no active DKP locks.',
          severity: 'HIGH',
        });
      }
    }

    await this.audit('AUTOMATION_INTEGRITY_VALIDATED', 'Automation', 'auction-integrity', {
      checkedAt,
      issueCount: issues.length,
      issues,
    });

    return { checkedAt, issues };
  }

  async notifyAuctionsEndingSoon(now = new Date()): Promise<AutomationJobResult> {
    const until = new Date(now.getTime() + 60 * 60 * 1000);
    const auctions = await this.repository.findOpenAuctionsEndingSoon(until, now);
    const result = this.createResult('notifyAuctionsEndingSoon', auctions);

    for (const auction of auctions) {
      try {
        await this.notificationService.notifyAuctionEndingSoon({
          auctionId: auction.id,
          itemName: auction.itemName,
        });
        this.succeed(result, auction.id, 'Ending soon notification sent.');
      } catch (error) {
        await this.recordFailure(result, auction.id, 'AUTOMATION_ENDING_SOON_NOTIFICATION_FAILED', error);
      }
    }

    return result;
  }

  private createResult(job: string, items: Array<{ id: string }>): AutomationJobResult {
    return {
      job,
      processed: items.length,
      succeeded: 0,
      failed: 0,
      details: [],
    };
  }

  private dedupeAuctions(auctions: Auction[]): Auction[] {
    const seen = new Set<string>();
    return auctions.filter((auction) => {
      if (seen.has(auction.id)) {
        return false;
      }

      seen.add(auction.id);
      return true;
    });
  }

  private succeed(result: AutomationJobResult, id: string, message?: string): void {
    result.succeeded += 1;
    result.details.push({ id, status: 'SUCCESS', message });
  }

  private skip(result: AutomationJobResult, id: string, message?: string): void {
    result.details.push({ id, status: 'SKIPPED', message });
  }

  private fail(result: AutomationJobResult, id: string, message?: string): void {
    result.failed += 1;
    result.details.push({ id, status: 'FAILED', message });
  }

  private async recordFailure(
    result: AutomationJobResult,
    id: string,
    action: string,
    error: unknown,
  ): Promise<void> {
    const message = error instanceof Error ? error.message : 'Unknown automation failure.';
    this.fail(result, id, message);
    this.logger.warn(`${action} id=${id} error=${message}`);
    await this.audit(action, 'Automation', id, { message });
  }

  private async audit(
    action: string,
    targetType: string,
    targetId: string,
    metadata: Prisma.InputJsonObject,
  ): Promise<void> {
    await this.auditService.log({
      action,
      targetType,
      targetId,
      metadata,
    });
  }
}
