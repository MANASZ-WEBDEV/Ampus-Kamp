import { z } from 'zod';

// ── Upload participation proof ─────────────────────────────────────────────────

export const createParticipationSchema = z.object({
  body: z.object({
    eventId:        z.string().regex(/^[a-f\d]{24}$/i, 'Invalid eventId'),
    registrationId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid registrationId').optional(),
    teamName:       z.string().trim().max(100).optional(),
    members: z
      .array(
        z.object({
          userId:     z.string().regex(/^[a-f\d]{24}$/i, 'Invalid userId'),
          department: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid departmentId'),
        }),
      )
      .default([]),
    result:     z.enum(['winner', 'runner_up', 'participant', 'finisher']),
    resultNote: z.string().trim().max(200).optional(),
  }),
});

// ── Verify participation (faculty+) ───────────────────────────────────────────

export const verifyParticipationSchema = z.object({
  body: z.object({
    verdict: z.enum(['verified', 'rejected']),
    reason:  z.string().trim().max(500).optional(),
  }).refine(
    (data) => data.verdict === 'verified' || !!data.reason,
    { message: 'reason is required when rejecting.' },
  ),
});

// ── Inferred types ────────────────────────────────────────────────────────────

export type CreateParticipationBody = z.infer<typeof createParticipationSchema>['body'];
export type VerifyParticipationBody = z.infer<typeof verifyParticipationSchema>['body'];
