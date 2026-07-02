export type OperationPriority = 'high' | 'medium' | 'low';

export type OperationTask = {
  id: string;
  type: string;
  title: string;
  description: string;
  href: string;
  priority: OperationPriority;
  createdAt?: Date | string;
  metadata?: Record<string, unknown>;
};

export type PlayerOperationsSummary = {
  tasks: OperationTask[];
  counts: {
    urgent: number;
    bids: number;
    requests: number;
    codex: number;
    interests: number;
    progress: number;
  };
};

export type MaintenanceModeSummary = {
  enabled: boolean;
  message: string;
};

export type PlayerActionPlan = {
  generatedAt: Date;
  headline: string;
  summary: string;
  cards: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    actionLabel: string;
    href: string;
    priority: OperationPriority;
    reason: string;
    impact: string;
    dueAt?: Date | string | null;
    metadata?: Record<string, unknown>;
  }>;
};

export type StaffOperationsSummary = {
  tasks: OperationTask[];
  counts: {
    reviews: number;
    codex: number;
    itemRequests: number;
    interests: number;
    deliveries: number;
    progress: number;
    events: number;
    announcements: number;
  };
};

export type StaffHealthCheck = {
  key: string;
  label: string;
  ready: boolean;
  detail: string;
};

export type StaffHealthSummary = {
  generatedAt: Date;
  checks: StaffHealthCheck[];
};

export type DeploymentProtocolStepStatus = 'done' | 'pending' | 'blocked' | 'manual';

export type DeploymentPanelSummary = {
  generatedAt: Date;
  currentApiVersion: string;
  expectedVersion: {
    sha?: string | null;
    shortSha?: string | null;
    source: 'github-public-api' | 'env' | 'unavailable';
    matchesCurrent: boolean | null;
    checkedAt?: string | null;
    message?: string | null;
  };
  publicHealth: {
    status: 'ok' | 'degraded' | 'down';
    checkedAt?: string | null;
    version?: string | null;
    latencyMs?: number | null;
    message?: string | null;
  };
  privateHealth: StaffHealthSummary;
  publicSmoke: {
    status: 'ok' | 'degraded' | 'down';
    checkedAt: string;
    checks: Array<{
      path: string;
      ready: boolean;
      statusCode?: number | null;
      latencyMs?: number | null;
      version?: string | null;
      message?: string | null;
    }>;
  };
  latestStaffChangelog: {
    title: string;
    fileName?: string | null;
    inferredDate?: string | null;
    source: 'docs' | 'unavailable';
    sentReceiptAvailable: boolean;
    note: string;
  };
  protocol: Array<{
    key: string;
    label: string;
    detail: string;
    status: DeploymentProtocolStepStatus;
  }>;
  actionsUrl?: string | null;
};

export type StaffDayViewSummary = {
  generatedAt: Date;
  todaysAnnouncements: number;
  openEvents: number;
  pendingStaffVotes: number;
  pendingDeliveries: number;
  pendingProgressReviews: number;
  urgentTasks: OperationTask[];
};

export type StaffMorningBriefing = {
  generatedAt: Date;
  title: string;
  summary: string;
  counts: {
    urgent: number;
    reviews: number;
    deliveries: number;
    codex: number;
    itemRequests: number;
    interests: number;
    progress: number;
    events: number;
    expiredOpenAuctions: number;
    endingAuctions24h: number;
    integrityHigh: number;
    healthAlerts: number;
  };
  sections: Array<{
    key: string;
    title: string;
    description: string;
    href: string;
    priority: OperationPriority;
    count: number;
    tasks: OperationTask[];
  }>;
  markdown: string;
};

export type SeasonMonthlySummary = {
  month: string;
  dkpEarned: number;
  dkpSpent: number;
  attendanceEvents: number;
  dropsDelivered: number;
  daoshiApprovedCents: number;
  itemRequestsDelivered: number;
  topPlayers: Array<{
    playerId: string;
    nickname: string;
    dkpDelta: number;
    attendanceCount: number;
    dropsCount: number;
    daoshiApprovedCents: number;
  }>;
};

export type WeeklyGuildSummary = Omit<SeasonMonthlySummary, 'month'> & {
  weekStart: string;
  weekEnd: string;
};

export type IntegrityIssueSeverity = 'high' | 'medium' | 'low';

export type IntegrityIssue = {
  id: string;
  type: string;
  severity: IntegrityIssueSeverity;
  title: string;
  description: string;
  href?: string;
  createdAt?: Date | string;
  metadata?: Record<string, unknown>;
};

export type IntegritySummary = {
  generatedAt: Date;
  counts: {
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  issues: IntegrityIssue[];
};

export type NoticeBoardItem = {
  id: string;
  type: string;
  title: string;
  description: string;
  href: string;
  priority: OperationPriority;
  createdAt?: Date | string;
};

export type GuildRulesSummary = {
  sections: Array<{
    key: string;
    title: string;
    bullets: string[];
  }>;
};

export type LootFairnessSummary = {
  days: number;
  generatedAt: Date;
  rows: Array<{
    playerId: string;
    nickname: string;
    dropsCount: number;
    t4Drops: number;
    legendaryDrops: number;
    attendancePercentage: number;
    currentDkp: number;
    lastDropAt?: Date | null;
  }>;
};

export type PlayerComparisonSummary = {
  players: Array<{
    playerId: string;
    nickname: string;
    class: string;
    dimensionalLayer: number;
    attendancePercentage: number;
    combatPower: number;
    currentDkp: number;
    drops30d: number;
    drops90d: number;
    activeRequests: number;
    lastDropAt?: Date | null;
  }>;
};

export type StaffMeetingSummary = StaffDayViewSummary & {
  reviewAuctions: Array<{ id: string; itemName: string; status: string; updatedAt: Date }>;
  votingInterests: Array<{ id: string; title: string; status: string; entries: number; updatedAt: Date }>;
  openEventRows: Array<{ id: string; name: string; type: string; startsAt: Date; status: string }>;
  meetingDay: string;
  sections: Array<{
    key: string;
    title: string;
    description: string;
    href: string;
    priority: OperationPriority;
    items: Array<OperationTask & { meetingItemKey: string; resolved: boolean }>;
  }>;
  resolvedItemKeys: string[];
  markdown: string;
};

export type LegacyAuditSummary = {
  generatedAt: Date;
  unlinkedDrops: number;
  unlinkedRequests: number;
  itemsWithoutTier: number;
  itemsWithoutType: number;
  inactiveItems: number;
  recentUnlinkedDrops: Array<{ id: string; discordId?: string | null; nicknameIngame?: string | null; itemName?: string | null; deliveredAt?: Date | null }>;
  recentUnlinkedRequests: Array<{ id: string; discordId: string; playerName: string; itemName: string; updatedAt: Date }>;
};

export type DiscordTemplateSummary = {
  templates: Array<{
    key: string;
    channel: string;
    title: string;
    preview: string;
    playerFacing: boolean;
    previews: Array<{
      locale: 'pt-BR' | 'en';
      label: string;
      payload: {
        username: string;
        avatar_url?: string;
        content?: string;
        embeds?: Array<{
          title?: string;
          description?: string;
          color?: number;
          fields?: Array<{ name: string; value: string; inline?: boolean }>;
          image?: { url?: string };
          thumbnail?: { url?: string };
          timestamp?: string;
        }>;
        allowed_mentions?: unknown;
      };
    }>;
  }>;
};

export type DiscordWebhookDeliveryStatus = 'PENDING' | 'SENDING' | 'SENT' | 'FAILED' | 'RETRYING';

export type DiscordWebhookDeliveryItem = {
  id: string;
  webhookKey: string;
  channelLabel: string;
  action?: string;
  targetId?: string;
  status: DiscordWebhookDeliveryStatus;
  attempts: number;
  maxAttempts: number;
  retryable: boolean;
  payloadPreview: unknown;
  payloadSummary: string;
  lastError?: string;
  queuedAt: string;
  startedAt?: string;
  sentAt?: string;
  failedAt?: string;
  retriedAt?: string;
};

export type DiscordWebhookQueueSummary = {
  generatedAt: string;
  counts: Record<DiscordWebhookDeliveryStatus, number>;
  deliveries: DiscordWebhookDeliveryItem[];
};

export type OperationalHealthSummary = StaffHealthSummary & {
  discordFailures24h: number;
  latestAutomationAudit?: Date | null;
  latestDiscordFailure?: Date | null;
  activeAnnouncements: number;
  pendingQueueApproximation: number;
};

export type AuctionDiagnosticIssue = {
  severity: IntegrityIssueSeverity;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
};

export type AuctionDiagnosticOption = {
  id: string;
  itemName: string;
  winnerName?: string | null;
  endedAt: Date;
};

export type AuctionTimelineEvent = {
  id: string;
  type: string;
  title: string;
  description: string;
  occurredAt: Date;
  tone: 'gold' | 'green' | 'red' | 'blue' | 'muted';
  actorName?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type AuctionFinalizationPreview = {
  generatedAt: Date;
  auctionId: string;
  action: 'NO_ACTION' | 'FINISH_STANDARD' | 'PENDING_REVIEW' | 'EXPAND_LAYER' | 'RELIST';
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
    endsAt?: Date | null;
    reopensAt?: Date | null;
  };
  risks: AuctionDiagnosticIssue[];
};

export type AuctionDossier = {
  generatedAt: Date;
  auctionId: string;
  title: string;
  markdown: string;
};

export type UniversalDossierType = 'player' | 'auction' | 'request' | 'interest' | 'drop' | 'event';

export type UniversalDossier = {
  generatedAt: Date;
  type: UniversalDossierType;
  id: string;
  title: string;
  summary: Array<{ label: string; value: string }>;
  internalLinks: Array<{ label: string; href: string }>;
  auditLogs: Array<{
    id: string;
    action: string;
    targetType: string;
    targetId?: string | null;
    actorName?: string | null;
    createdAt: Date;
  }>;
  markdown: string;
};

export type AuctionDiagnosticSummary = {
  generatedAt: Date;
  outcome: 'NO_ACTION' | 'FINISH_STANDARD' | 'PENDING_REVIEW' | 'EXPAND_LAYER' | 'RELIST';
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
    endsAt: Date;
    createdAt: Date;
    updatedAt: Date;
  };
  stateReason: {
    title: string;
    description: string;
    tone: 'gold' | 'green' | 'red' | 'blue' | 'muted';
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
    createdAt: Date;
  }>;
  locks: Array<{
    id: string;
    playerId: string;
    nickname: string;
    amount: number;
    released: boolean;
    createdAt: Date;
    releasedAt?: Date | null;
  }>;
  cancellationRequests: Array<{
    id: string;
    bidId: string;
    playerId: string;
    playerName: string;
    reason: string;
    status: string;
    reviewNote?: string | null;
    reviewedAt?: Date | null;
    createdAt: Date;
  }>;
  reviewVotes: Array<{
    id: string;
    action: string;
    playerId?: string | null;
    voterName: string;
    reason?: string | null;
    updatedAt: Date;
  }>;
  bidInvalidationVotes: Array<{
    id: string;
    bidId: string;
    voterName: string;
    reason: string;
    updatedAt: Date;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    targetType: string;
    targetId?: string | null;
    metadata?: Record<string, unknown> | null;
    createdAt: Date;
    actorName?: string | null;
  }>;
};
