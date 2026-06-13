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

export type StaffDayViewSummary = {
  generatedAt: Date;
  todaysAnnouncements: number;
  openEvents: number;
  pendingStaffVotes: number;
  pendingDeliveries: number;
  pendingProgressReviews: number;
  urgentTasks: OperationTask[];
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
  }>;
};

export type OperationalHealthSummary = StaffHealthSummary & {
  discordFailures24h: number;
  latestAutomationAudit?: Date | null;
  latestDiscordFailure?: Date | null;
  activeAnnouncements: number;
  pendingQueueApproximation: number;
};
