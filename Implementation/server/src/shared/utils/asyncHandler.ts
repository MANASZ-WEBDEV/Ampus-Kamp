import type { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * asyncHandler — wraps an async route handler so that any rejected promise
 * is forwarded to Express's error middleware instead of causing an unhandled rejection.
 *
 * Usage:
 *   router.get('/events', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(fn: AsyncFn): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
