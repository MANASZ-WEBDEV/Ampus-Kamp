import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@/shared/errors';
import { env } from '@/config/env';

/**
 * Global error handler — MUST be the last middleware in app.ts.
 *
 * Converts every thrown error into the canonical response shape:
 *   { error: { code, message, details? } }
 *
 * Stack traces are NEVER sent to clients in production.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // Express requires the 4th param even if unused
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const requestId = req.headers['x-request-id'] as string | undefined;

  // ── Structured error log ──────────────────────────────────────────────────
  console.error(
    JSON.stringify({
      level: 'error',
      requestId,
      method: req.method,
      path: req.path,
      error:
        err instanceof Error
          ? {
              name: err.name,
              message: err.message,
              ...(env.NODE_ENV === 'development' && { stack: err.stack }),
            }
          : String(err),
      timestamp: new Date().toISOString(),
    }),
  );

  // ── Known application errors ─────────────────────────────────────────────
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && Object.keys(err.details).length > 0 && { details: err.details }),
      },
    });
    return;
  }

  // ── Mongoose validation error ─────────────────────────────────────────────
  if (err instanceof Error && err.name === 'ValidationError') {
    res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: err.message },
    });
    return;
  }

  if (
    err instanceof Error &&
    'code' in err &&
    (err as { code?: unknown }).code === 11000
  ) {
    res.status(409).json({
      error: { code: 'CONFLICT', message: 'A record with this value already exists.' },
    });
    return;
  }

  // ── JWT errors ────────────────────────────────────────────────────────────
  if (
    err instanceof Error &&
    (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')
  ) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token.' },
    });
    return;
  }

  // ── Generic 500 — never leak internals ────────────────────────────────────
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred. Please try again.',
    },
  });
}
