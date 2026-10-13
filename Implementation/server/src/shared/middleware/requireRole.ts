import type { Response, NextFunction } from 'express';
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
export function requireRole(roles: UserRole[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return void next(new UnauthorizedError());
    }

    if (!roles.includes(req.user.role)) {
      return void next(
        new ForbiddenError(
          `This action requires one of: [${roles.join(', ')}]. Your role: ${req.user.role}`,
        ),
      );
    }

    next();
  };
}
