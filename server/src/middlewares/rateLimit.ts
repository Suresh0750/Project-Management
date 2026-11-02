import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import { env } from '../config/env.js';

interface RateLimiterOptions {
  windowMs: number;
  limit: number;
  message?: string;
}

const MINUTE_MS = 60 * 1000;
export const minutes = (count: number): number => count * MINUTE_MS;


const defaultEnabled = env.NODE_ENV === 'production' || env.RATE_LIMIT_ENABLED === true;

export function createRateLimiter(
  { windowMs, limit, message = 'Too many requests. Please try again later.' }: RateLimiterOptions,
  enabled: boolean = defaultEnabled,
): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => !enabled,
    message: { success: false, message, errors: [] },
  });
}
