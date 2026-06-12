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
