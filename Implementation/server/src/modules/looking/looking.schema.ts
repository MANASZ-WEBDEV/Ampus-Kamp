import { z } from 'zod';

// ── PUT /api/v1/events/:id/looking ───────────────────────────────────────────
// Toggle: if flag exists → delete; if not → create.

export const upsertLookingSchema = z.object({
  note: z
    .string()
    .trim()
    .max(120, 'Note must be 120 characters or fewer')
    .optional(),
});

export type UpsertLookingBody = z.infer<typeof upsertLookingSchema>;

// ── GET /api/v1/events/:id/looking ───────────────────────────────────────────

export const lookingQuerySchema = z.object({
  limit:  z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

export type LookingQuery = z.infer<typeof lookingQuerySchema>;
