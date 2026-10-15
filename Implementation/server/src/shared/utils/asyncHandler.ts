import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * asyncHandler — wraps an async route handler so that any rejected promise
 * is forwarded to Express's error middleware instead of causing an unhandled rejection.
 *
 * Generic parameter TReq allows typed sub-types of Request (e.g., AuthRequest)
 * to be used without losing type safety.
 *
 * Usage:
 *   router.get('/events', asyncHandler(async (req, res) => { ... }))
 *   router.get('/me', asyncHandler<AuthRequest>(async (req, res) => { ... }))
 */
export function asyncHandler<TReq extends Request = Request>(
  fn: (req: TReq, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req as TReq, res, next)).catch(next);
  };
}
