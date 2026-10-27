import { z } from 'zod';

// ── Course schemas ─────────────────────────────────────────────────────────────

export const searchCourseSchema = z.object({
  query: z.object({
    q:        z.string().trim().optional(),
    category: z.string().trim().optional(),
    limit:    z.coerce.number().int().min(1).max(50).default(20),
  }),
});

export const createCourseSchema = z.object({
  body: z.object({
    issuer:             z.string().trim().min(1).max(100),
    name:               z.string().trim().min(1).max(200),
    code:               z.string().trim().max(30).optional(),
    category:           z.string().trim().min(1).max(50),
    language:           z.string().trim().max(50).optional(),
    aliases:            z.array(z.string().trim().max(200)).default([]),
    verificationMethod: z.enum(['issuer_qr', 'faculty', 'manual']).default('faculty'),
    active:             z.boolean().default(true),
  }),
});

export const appendAliasesSchema = z.object({
  body: z.object({
    aliases: z.array(z.string().trim().min(1).max(200)).min(1),
  }),
});

// ── Inferred types ────────────────────────────────────────────────────────────

export type SearchCourseQuery  = z.infer<typeof searchCourseSchema>['query'];
export type CreateCourseBody   = z.infer<typeof createCourseSchema>['body'];
export type AppendAliasesBody  = z.infer<typeof appendAliasesSchema>['body'];
