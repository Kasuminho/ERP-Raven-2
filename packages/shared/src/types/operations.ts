export type OperationPriority = 'high' | 'medium' | 'low';

export type OperationTask<TDate = string | Date> = {
  id: string;
  type: string;
  title: string;
  description: string;
  href: string;
  priority: OperationPriority;
  createdAt?: TDate;
  metadata?: Record<string, unknown>;
};

export type PlayerActionPlanCard<TDate = string | Date> = {
  id: string;
  type: string;
  title: string;
  description: string;
  actionLabel: string;
  href: string;
  priority: OperationPriority;
  reason: string;
  impact: string;
  dueAt?: TDate | null;
  metadata?: Record<string, unknown>;
};

export type PlayerActionPlan<TDate = string | Date> = {
  generatedAt: TDate;
  headline: string;
  summary: string;
  cards: Array<PlayerActionPlanCard<TDate>>;
};
