import rateLimit, { type Options } from 'express-rate-limit';
import { env } from '@/config/env';

/** Shared error response for all rate limiters */
function rateLimitHandler(
  _req: Parameters<NonNullable<Options['handler']>>[0],
  res: Parameters<NonNullable<Options['handler']>>[1],
): void {
  res.status(429).json({
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please slow down and try again.',
    },
  });
}

function makeLimiter(options: Partial<Options>) {
  return rateLimit({
    standardHeaders: true,  // Return RateLimit-* headers
    legacyHeaders: false,
    skip: () => env.NODE_ENV === 'test',
    handler: rateLimitHandler,
    ...options,
  });
}

// ── Specific limiters ─────────────────────────────────────────────────────────

/** Login: 10 attempts per 15 min per IP */
export const loginLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts.',
});

/** OTP send/verify: 5 per 10 min per IP */
export const otpLimiter = makeLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
});

/**
 * LLM extraction: 100 per IP per hour.
 * Per-user quota (20/day) is enforced in the extraction service using Setting.extractionsPerDay.
 */
export const extractionLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  max: 100,
});

/** General API limiter: 300 requests per minute per IP — safety net */
export const apiLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: 300,
});
