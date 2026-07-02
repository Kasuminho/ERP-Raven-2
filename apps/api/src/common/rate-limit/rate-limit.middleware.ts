import { NextFunction, Request, Response } from 'express';
import { InMemoryRateLimitStore, RateLimitStore } from './rate-limit.store';

export type RateLimitRule = {
  keyPrefix: string;
  matches: (req: Request) => boolean;
  limit: number;
  windowMs: number;
};

export type RateLimiterOptions = {
  store?: RateLimitStore;
  rules?: RateLimitRule[];
  keyFromRequest?: (req: Request) => string;
};

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

export const defaultRateLimitRules: RateLimitRule[] = [
  {
    keyPrefix: 'auth',
    matches: (req) => /\/auth\/discord(?:\/login)?\/?$/.test(req.path),
    limit: 30,
    windowMs: FIFTEEN_MINUTES_MS,
  },
  {
    keyPrefix: 'upload',
    matches: (req) => /\/uploads\/image\/?$/.test(req.path),
    limit: 60,
    windowMs: FIFTEEN_MINUTES_MS,
  },
];

export function createRateLimiter(options: RateLimiterOptions = {}): (req: Request, res: Response, next: NextFunction) => void {
  const store = options.store ?? new InMemoryRateLimitStore();
  const rules = options.rules ?? defaultRateLimitRules;
  const keyFromRequest = options.keyFromRequest ?? ((req) => req.ip ?? 'unknown');

  return (req, res, next) => {
    const rule = rules.find((candidate) => candidate.matches(req));
    if (!rule) return next();

    const now = Date.now();
    const key = `${rule.keyPrefix}:${keyFromRequest(req)}`;
    const hit = store.hit(key, now, rule.windowMs, rule.limit);

    res.setHeader('RateLimit-Limit', String(rule.limit));
    res.setHeader('RateLimit-Remaining', String(hit.remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil(hit.resetAt / 1000)));

    if (hit.limited) {
      return res.status(429).json({ statusCode: 429, message: 'Too many requests. Try again later.' });
    }

    return next();
  };
}
