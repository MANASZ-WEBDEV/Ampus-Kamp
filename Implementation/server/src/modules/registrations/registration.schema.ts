import { z } from 'zod';

// ── POST /api/v1/events/:id/registrations ─────────────────────────────────────
//
// SDE3 note: type is derived from the body, but also cross-validated:
//   - type='team'       → teamName required; memberUserIds ≤ teamSize.max-1
//   - type='individual' → teamName + memberUserIds must be absent
//   - type='tracking'   → only externalRegId allowed (no members, no teamName)
//
// teamSize.min/max are NOT validated here — only on submit.
// This allows leaders to create a draft and add members incrementally.

export const createRegistrationSchema = z
  .object({
    type: z.enum(['individual', 'team', 'tracking']),
    teamName: z
      .string()
      .trim()
      .min(2, 'Team name must be at least 2 characters')
      .max(60, 'Team name must be 60 characters or fewer')
      .optional(),
    // Member user IDs to invite (excluding self — service adds leader as confirmed[0])
    memberUserIds: z
      .array(z.string().min(1))
      .max(9, 'Cannot invite more than 9 members at creation time')
      .optional(),
    externalRegId: z.string().trim().max(100).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'team' && !data.teamName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'teamName is required for team registrations',
        path: ['teamName'],
      });
    }
    if (data.type !== 'team' && data.memberUserIds?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'memberUserIds is only valid for type=team',
        path: ['memberUserIds'],
      });
    }
    if (data.type !== 'tracking' && data.externalRegId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'externalRegId is only valid for type=tracking',
        path: ['externalRegId'],
      });
    }
  });

export type CreateRegistrationBody = z.infer<typeof createRegistrationSchema>;

// ── PATCH /api/v1/registrations/:id — Edit, Submit, or Withdraw ───────────────
//
// action:
//   'submit'   → validate teamSize and move to 'submitted'
//   'withdraw' → move to 'withdrawn'; decrement counters if was 'submitted'
//   'edit'     → update teamName and/or memberUserIds (draft only)

export const updateRegistrationSchema = z
  .object({
    action: z.enum(['submit', 'withdraw', 'edit']),
    teamName: z.string().trim().min(2).max(60).optional(),
    // Full replacement of invited member list; confirmed members are NOT removed
    memberUserIds: z.array(z.string().min(1)).max(9).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action !== 'edit' && (data.teamName || data.memberUserIds)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'teamName and memberUserIds are only valid with action=edit',
        path: ['action'],
      });
    }
  });

export type UpdateRegistrationBody = z.infer<typeof updateRegistrationSchema>;

// ── PATCH /api/v1/registrations/:id/members/:uid ──────────────────────────────
//
// Only the member whose uid matches req.user.id can respond.
// Declined → member removed from members[] by service.

export const memberRespondSchema = z.object({
  action: z.enum(['confirm', 'decline']),
});

export type MemberRespondBody = z.infer<typeof memberRespondSchema>;

// ── POST /api/v1/events/:id/tracking ─────────────────────────────────────────

export const createTrackingSchema = z.object({
  externalRegId: z.string().trim().max(100).optional(),
});

export type CreateTrackingBody = z.infer<typeof createTrackingSchema>;

// ── GET /api/v1/events/:id/registrations (faculty) ───────────────────────────

export const rosterQuerySchema = z.object({
  status: z.enum(['draft', 'submitted', 'withdrawn', 'locked', 'all']).default('all'),
  limit:  z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export type RosterQuery = z.infer<typeof rosterQuerySchema>;
