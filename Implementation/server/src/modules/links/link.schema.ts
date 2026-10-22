import { z } from 'zod';
import mongoose from 'mongoose';

// ── Helpers ───────────────────────────────────────────────────────────────────

const objectId = z
  .string({ required_error: 'ID is required' })
  .refine(v => mongoose.isValidObjectId(v), { message: 'Invalid ID format' });

// URL detector used to reject links in messages
const URL_PATTERN = /https?:\/\/|www\./i;

// ── Send Link ─────────────────────────────────────────────────────────────────
// Used by POST /api/v1/links
// For F-4 (Path A) direction is always 'request'.
// F-5 adds 'invite' and 'connect' paths — same schema, same endpoint.

export const sendLinkSchema = z
  .object({
    direction: z.enum(['request', 'invite', 'connect'], {
      required_error: 'direction is required',
      invalid_type_error: 'direction must be "request", "invite", or "connect"',
    }),

    // For request: the teamPostId whose owner becomes toUserId server-side
    teamPostId: objectId.optional(),

    // For invite/connect: explicit target user
    toUserId: objectId.optional(),

    // For request/invite: required to enforce per-pair-per-event uniqueness
    eventId: objectId.optional(),

    message: z
      .string()
      .max(200, 'Message must not exceed 200 characters')
      .trim()
      .refine(
        val => !URL_PATTERN.test(val),
        { message: 'Message must not contain URLs' },
      )
      .optional(),
  })
  .superRefine((body, ctx) => {
    // request: teamPostId is required; toUserId is derived server-side from post.ownerId
    if (body.direction === 'request' && !body.teamPostId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'teamPostId is required for direction="request"',
        path: ['teamPostId'],
      });
    }

    // invite/connect: explicit toUserId required
    if ((body.direction === 'invite' || body.direction === 'connect') && !body.toUserId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `toUserId is required for direction="${body.direction}"`,
        path: ['toUserId'],
      });
    }

    // invite: eventId required (we're linking in context of an event)
    if (body.direction === 'invite' && !body.eventId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'eventId is required for direction="invite"',
        path: ['eventId'],
      });
    }
  });

export type SendLinkBody = z.infer<typeof sendLinkSchema>;

// ── Respond to Link ───────────────────────────────────────────────────────────
// Used by PATCH /api/v1/links/:id
// accept  — recipient accepts (post owner for requests; invitee for invites)
// decline — recipient declines (triggers 30-day cool-down on requester side)
// withdraw — sender cancels their own pending link

export const respondLinkSchema = z.object({
  action: z.enum(['accept', 'decline', 'withdraw'], {
    required_error: 'action is required',
    invalid_type_error: 'action must be "accept", "decline", or "withdraw"',
  }),
});

export type RespondLinkBody = z.infer<typeof respondLinkSchema>;

// ── Inbox query ───────────────────────────────────────────────────────────────
// Used by GET /api/v1/links?box=in|out

export const linksQuerySchema = z.object({
  box: z.enum(['in', 'out'], {
    required_error: 'box is required',
    invalid_type_error: 'box must be "in" or "out"',
  }),
  cursor: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform(v => (v ? parseInt(v, 10) : 20))
    .pipe(z.number().int().min(1).max(50)),
});

export type LinksQuery = z.infer<typeof linksQuerySchema>;
