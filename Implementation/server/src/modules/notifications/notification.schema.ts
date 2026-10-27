import { z } from 'zod';

// ── Helpers ───────────────────────────────────────────────────────────────────

function objectId(field: string) {
  return z.string().regex(/^[a-f\d]{24}$/i, `${field} must be a valid ObjectId`);
}

// ── Notification list query ───────────────────────────────────────────────────

export const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit:  z.coerce.number().int().min(1).max(50).default(20),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

// ── Notification ID param ─────────────────────────────────────────────────────

export const idParamSchema = z.object({
  id: objectId('id'),
});

export type IdParam = z.infer<typeof idParamSchema>;
