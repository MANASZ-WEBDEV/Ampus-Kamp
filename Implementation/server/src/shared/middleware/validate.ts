import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { ValidationError } from '@/shared/errors';

type RequestTarget = 'body' | 'query' | 'params';

/**
 * validate — Zod middleware factory.
 *
 * Validates and coerces req[target] against the provided schema.
 * On failure: returns a structured 422 with per-field error messages.
 * On success: replaces req[target] with the parsed (coerced) value.
 *
 * Usage:
 *   router.post('/events', validate(createEventSchema), handler)
 *   router.get('/events', validate(eventQuerySchema, 'query'), handler)
 */
export function validate(schema: ZodSchema, target: RequestTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const details: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path.join('.') || '_root';
        details[path] = issue.message;
      });
      return void next(new ValidationError('Validation failed', details));
    }

    // Replace with coerced/transformed value (e.g. string '3' → number 3)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    (req as any)[target] = result.data;
    next();
  };
}
