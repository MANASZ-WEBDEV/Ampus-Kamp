import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { AuthRequest, UserRole } from '@/shared/types';
import { ForbiddenError, UnauthorizedError } from '@/shared/errors';

/**
 * requireRole — must be placed AFTER requireAuth.
 *
 * Checks that req.user.role is in the allowed list.
 * Role is ALWAYS read from the JWT payload, never from req.body or req.query.
 *
 * Usage:
 *   router.post('/events', requireAuth, requireRole(['faculty', 'admin']), handler)
 */
export function requireRole(roles: UserRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      return void next(new UnauthorizedError());
    }

    if (!roles.includes(authReq.user.role)) {
      return void next(
        new ForbiddenError(
          `This action requires one of: [${roles.join(', ')}]. Your role: ${authReq.user.role}`,
        ),
      );
    }

    next();
  };
}
