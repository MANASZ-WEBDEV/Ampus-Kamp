import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { UnauthorizedError } from '@/shared/errors';
import type { AuthUser } from '@/shared/types';

// Augment Express Request so req.user is typed everywhere
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * requireAuth — reads a JWT from:
 *   1. httpOnly cookie `amp_token`  (preferred — immune to XSS)
 *   2. Authorization: Bearer <token> (for API clients / Postman)
 *
 * Attaches decoded payload to req.user.
 * Throws UnauthorizedError if token is missing or invalid.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const cookie = (req.cookies as Record<string, string> | undefined)?.['amp_token'];
    const bearer = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : undefined;

    const token = cookie ?? bearer;
    if (!token) {
      return void next(new UnauthorizedError('No authentication token provided.'));
    }

    const payload = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    req.user = payload;
    next();
  } catch {
    // Covers JsonWebTokenError, TokenExpiredError, NotBeforeError
    next(new UnauthorizedError('Invalid or expired token.'));
  }
}
