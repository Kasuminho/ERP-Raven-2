export type AuctionDiagnosticTone = 'gold' | 'green' | 'red' | 'blue' | 'muted';

export type AuctionDiagnosticIssueSeverity = 'high' | 'medium' | 'low';

export type AuctionDiagnosticOutcome =
  | 'NO_ACTION'
  | 'FINISH_STANDARD'
  | 'PENDING_REVIEW'
  | 'EXPAND_LAYER'
  | 'RELIST';

export type AuctionDiagnosticIssue = {
  severity: AuctionDiagnosticIssueSeverity;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
};

export type AuctionDiagnosticOption<TDate = string | Date> = {
  id: string;
  itemName: string;
  winnerName?: string | null;
  endedAt: TDate;
};

export type AuctionTimelineEvent<TDate = string | Date> = {
  id: string;
  type: string;
  title: string;
  description: string;
  occurredAt: TDate;
  tone: AuctionDiagnosticTone;
  actorName?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type AuctionFinalizationPreview<TDate = string | Date> = {
  generatedAt: TDate;
  auctionId: string;
  action: AuctionDiagnosticOutcome;
  actionLabel: string;
  description: string;
  candidate?: {
    bidId: string;
    playerId: string;
    nickname: string;
    bidAmount: number;
    dimensionalLayer: number;
    attendancePercentage: number;
  } | null;
  locksToConsume: Array<{
    id: string;
    playerId: string;
    nickname: string;
    amount: number;
  }>;
  locksToRelease: Array<{
    id: string;
    playerId: string;
    nickname: string;
    amount: number;
  }>;
  ignoredBids: Array<{
    id: string;
    playerId: string;
    nickname: string;
    bidAmount: number;
    reason: string;
  }>;
  nextState?: {
    status: string;
    minimumLayer?: number | null;
    endsAt?: TDate | null;
    reopensAt?: TDate | null;
  };
  risks: AuctionDiagnosticIssue[];
};

export type AuctionDossier<TDate = string | Date> = {
  generatedAt: TDate;
  auctionId: string;
  title: string;
  markdown: string;
};

export type AuctionDiagnosticSummary<TDate = string | Date> = {
  generatedAt: TDate;
  outcome: AuctionDiagnosticOutcome;
  auction: {
    id: string;
    itemName: string;
    itemTier: string;
    itemType: string;
    auctionMode: string;
    status: string;
    minimumBid: number;
    minimumLayer?: number | null;
    requiresStaffReview: boolean;
    endsAt: TDate;
    createdAt: TDate;
    updatedAt: TDate;
  };
  stateReason: {
    title: string;
    description: string;
    tone: AuctionDiagnosticTone;
  };
  counts: {
    bids: number;
    validBids: number;
    invalidBids: number;
    activeLocks: number;
    validBidsWithActiveLocks: number;
    validBidsAtMinimumLayer: number;
    cancellationRequests: number;
    approvalVotes: number;
    rejectionVotes: number;
    invalidationVotes: number;
    auditLogs: number;
  };
  issues: AuctionDiagnosticIssue[];
  bids: Array<{
    id: string;
    playerId: string;
    nickname: string;
    dimensionalLayer: number;
    attendancePercentage: number;
    bidAmount: number;
    isValid: boolean;
    hasActiveLock: boolean;
    activeLockAmount?: number;
    createdAt: TDate;
  }>;
  locks: Array<{
    id: string;
    playerId: string;
    nickname: string;
    amount: number;
    released: boolean;
    createdAt: TDate;
    releasedAt?: TDate | null;
  }>;
  cancellationRequests: Array<{
    id: string;
    bidId: string;
    playerId: string;
    playerName: string;
    reason: string;
    status: string;
    reviewNote?: string | null;
    reviewedAt?: TDate | null;
    createdAt: TDate;
  }>;
  reviewVotes: Array<{
    id: string;
    action: string;
    playerId?: string | null;
    voterName: string;
    reason?: string | null;
    updatedAt: TDate;
  }>;
  bidInvalidationVotes: Array<{
    id: string;
    bidId: string;
    voterName: string;
    reason: string;
    updatedAt: TDate;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    targetType: string;
    targetId?: string | null;
    metadata?: Record<string, unknown> | null;
    createdAt: TDate;
    actorName?: string | null;
  }>;
};
