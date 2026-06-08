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
