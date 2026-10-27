import { z } from 'zod';

// ── Upload credential (multipart/form-data) ───────────────────────────────────
// The 'proof' file field is parsed by multer before Zod runs.
// Body fields come from the text parts of the form.

export const createCredentialSchema = z.object({
  body: z.object({
    // Course reference — either a valid courseId OR "other"
    courseId:       z.string().regex(/^[a-f\d]{24}$/i, 'Invalid courseId').optional(),
    otherCourseName: z.string().trim().min(1).max(200).optional(),

    issuer:        z.string().trim().min(1).max(100),
    session:       z.string().trim().min(1).max(50),   // e.g. 'Jan–Apr 2026'
    year:          z.coerce.number().int().min(2000).max(2100),
    tier:          z.enum(['pass', 'elite', 'elite_silver', 'elite_gold']),
    certificateId: z.string().trim().min(1).max(100),

    // studentId & department are NEVER accepted from body — set from req.user
  }).refine(
    (data) => data.courseId || data.otherCourseName,
    { message: 'Either courseId or otherCourseName must be provided.' },
  ),
});

// ── Edit pending credential ────────────────────────────────────────────────────

export const editCredentialSchema = z.object({
  body: z.object({
    session:       z.string().trim().min(1).max(50).optional(),
    year:          z.coerce.number().int().min(2000).max(2100).optional(),
    tier:          z.enum(['pass', 'elite', 'elite_silver', 'elite_gold']).optional(),
    certificateId: z.string().trim().min(1).max(100).optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided.' },
  ),
});

// ── Verify credential (faculty+) ──────────────────────────────────────────────

export const verifyCredentialSchema = z.object({
  body: z.object({
    verdict: z.enum(['verified', 'rejected']),
    reason:  z.string().trim().max(500).optional(),
  }).refine(
    (data) => data.verdict === 'verified' || !!data.reason,
    { message: 'reason is required when rejecting a credential.' },
  ),
});

// ── Inferred types ────────────────────────────────────────────────────────────

export type CreateCredentialBody = z.infer<typeof createCredentialSchema>['body'];
export type EditCredentialBody   = z.infer<typeof editCredentialSchema>['body'];
export type VerifyCredentialBody = z.infer<typeof verifyCredentialSchema>['body'];
