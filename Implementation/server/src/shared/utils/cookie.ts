import type { Response } from 'express';
import { env } from '@/config/env';

const COOKIE_NAME = 'amp_token';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Set the httpOnly JWT cookie on the response.
 * httpOnly → immune to XSS
 * secure  → HTTPS only in production
 * sameSite: 'lax' → sent on top-level navigations, not third-party requests
 */
export function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE_MS,
    path: '/',
  });
}

/** Clear the auth cookie on logout. */
export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}
