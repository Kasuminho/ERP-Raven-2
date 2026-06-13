export type HealthState = 'ok' | 'degraded' | 'down';

export interface HealthCheckResult {
  name: string;
  status: HealthState;
  message?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface HealthReport {
  status: HealthState;
  checkedAt: string;
  uptimeSeconds: number;
  checks: HealthCheckResult[];
}
