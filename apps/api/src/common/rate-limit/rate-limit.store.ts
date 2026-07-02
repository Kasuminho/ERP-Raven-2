export type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export type RateLimitHit = RateLimitBucket & {
  remaining: number;
  limited: boolean;
};

export interface RateLimitStore {
  hit(key: string, now: number, windowMs: number, limit: number): RateLimitHit;
}

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, RateLimitBucket>();

  hit(key: string, now: number, windowMs: number, limit: number): RateLimitHit {
    const current = this.buckets.get(key);
    const bucket = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current;

    bucket.count += 1;
    this.buckets.set(key, bucket);

    return {
      ...bucket,
      remaining: Math.max(0, limit - bucket.count),
      limited: bucket.count > limit,
    };
  }

  prune(now = Date.now()): number {
    let removed = 0;

    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
        removed += 1;
      }
    }

    return removed;
  }
}
