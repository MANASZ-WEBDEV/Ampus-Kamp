import { z } from 'zod';

// ── POST /api/v1/blocks ───────────────────────────────────────────────────────

export const createBlockSchema = z.object({
  blockedUserId: z.string().min(1, 'blockedUserId is required'),
});

export type CreateBlockBody = z.infer<typeof createBlockSchema>;

// ── POST /api/v1/reports ──────────────────────────────────────────────────────
// At least one of targetUserId or linkId must be present (cross-field validation).

export const createReportSchema = z
  .object({
    targetUserId: z.string().optional(),
    linkId:       z.string().optional(),
    reason:       z
      .string()
      .trim()
      .min(10, 'Please describe the issue (at least 10 characters)')
      .max(500, 'Reason must be 500 characters or fewer'),
  })
  .superRefine((data, ctx) => {
    if (!data.targetUserId && !data.linkId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one of targetUserId or linkId is required',
        path: ['targetUserId'],
      });
    }
  });

export type CreateReportBody = z.infer<typeof createReportSchema>;
