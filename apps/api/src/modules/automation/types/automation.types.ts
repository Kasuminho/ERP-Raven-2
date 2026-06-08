import { AuctionStatus } from '@prisma/client';

export const AUTOMATION_TIMEZONE = 'America/Sao_Paulo';

export type AutomationJobResult = {
  job: string;
  processed: number;
  succeeded: number;
  failed: number;
  details: Array<{
    id: string;
    status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
    message?: string;
  }>;
};

export type AutomationStatus = {
  timezone: string;
  queuedNotifications: number;
  jobs: Array<{
    name: string;
    schedule: string;
    description: string;
  }>;
};

export type AuctionIntegrityIssue = {
  auctionId: string;
  status: AuctionStatus;
  issue: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
};

export type AuctionIntegrityReport = {
  checkedAt: string;
  issues: AuctionIntegrityIssue[];
};

export type AutomationNotificationJob = {
  id: string;
  type:
    | 'AUCTION_ENDING_SOON'
    | 'AUCTION_FINALIZED'
    | 'REVIEW_REQUIRED'
    | 'AUCTION_RELISTED'
    | 'EVENT_FINALIZED'
    | 'DKP_DISTRIBUTED';
  targetId: string;
  payload: Record<string, unknown>;
  createdAt: Date;
};
