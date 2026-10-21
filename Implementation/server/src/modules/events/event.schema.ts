import { z } from 'zod';

// ── Reusable primitives ───────────────────────────────────────────────────────

const EVENT_TYPES = ['hackathon', 'competition', 'sports', 'workshop', 'seminar', 'other'] as const;

const isoDate = z
  .string()
  .datetime({ message: 'Must be a valid ISO 8601 date-time string (e.g. 2026-11-30T23:59:00Z)' })
  .transform((s) => new Date(s))
  .optional();

const httpUrl = z
  .string()
  .url('Must be a valid URL starting with http:// or https://')
  .refine((u) => u.startsWith('http://') || u.startsWith('https://'), {
    message: 'URL must use http or https',
  })
  .optional()
  .or(z.literal(''));  // allow clearing the link with an empty string

// ── POST /events — create a draft ────────────────────────────────────────────

export const createEventSchema = z
  .object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(200).trim(),

    type: z.enum(EVENT_TYPES, {
      errorMap: () => ({
        message: `type must be one of: ${EVENT_TYPES.join(', ')}`,
      }),
    }),

    organizer: z.string().max(100).trim().optional(),

    deadline: isoDate,
    eventDate: isoDate,

    eligibility: z
      .object({
        branches: z.array(z.string().trim().toUpperCase()).default([]),
        years: z.array(z.number().int().min(1).max(5)).default([]),
        notes: z.string().max(300).trim().optional(),
      })
      .default({ branches: [], years: [] }),

    teamSize: z
      .object({
        min: z.number().int().min(1).default(1),
        max: z.number().int().min(1).default(1),
      })
      .refine((ts) => ts.max >= ts.min, {
        message: 'teamSize.max must be >= teamSize.min',
      })
      .default({ min: 1, max: 1 }),

    fee: z.string().max(100).trim().optional(),
    link: httpUrl,
    summary: z.string().max(200).trim().optional(),

    registrationMode: z.enum(['in_app', 'external']).default('external'),
    registrationDeadline: isoDate,

    // rawMessage is set only by the F-3 extraction endpoint — not accepted here
  })
  .refine(
    (body) => {
      // If both deadline and registrationDeadline are set,
      // registrationDeadline must not be after the event deadline.
      if (body.deadline && body.registrationDeadline) {
        return body.registrationDeadline <= body.deadline;
      }
      return true;
    },
    { message: 'registrationDeadline cannot be after deadline', path: ['registrationDeadline'] },
  );

export type CreateEventBody = z.infer<typeof createEventSchema>;

// ── PUT /events/:id — edit an existing event ──────────────────────────────────
// All fields optional — only provided fields are updated.
//
// IMPORTANT: .partial() cannot be called on ZodEffects (result of .refine()).
// Fix: define a plain ZodObject without the cross-field refine, call .partial() on
// that, then add a lightweight non-empty check.

const updateEventObject = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200).trim(),
  type: z.enum(EVENT_TYPES, {
    errorMap: () => ({ message: `type must be one of: ${EVENT_TYPES.join(', ')}` }),
  }),
  organizer: z.string().max(100).trim().optional(),
  deadline: isoDate,
  eventDate: isoDate,
  eligibility: z
    .object({
      branches: z.array(z.string().trim().toUpperCase()).default([]),
      years: z.array(z.number().int().min(1).max(5)).default([]),
      notes: z.string().max(300).trim().optional(),
    })
    .optional(),
  teamSize: z
    .object({
      min: z.number().int().min(1).default(1),
      max: z.number().int().min(1).default(1),
    })
    .refine((ts) => ts.max >= ts.min, { message: 'teamSize.max must be >= teamSize.min' })
    .optional(),
  fee: z.string().max(100).trim().optional(),
  link: httpUrl,
  summary: z.string().max(200).trim().optional(),
  registrationMode: z.enum(['in_app', 'external']).optional(),
  registrationDeadline: isoDate,
});

export const updateEventSchema = updateEventObject
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Request body must contain at least one field to update',
  });

export type UpdateEventBody = z.infer<typeof updateEventSchema>;

// ── GET /events — query params ────────────────────────────────────────────────

export const listEventsSchema = z.object({
  // Comma-separated event types: ?type=hackathon,competition
  type: z
    .string()
    .transform((s) =>
      s
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.enum(EVENT_TYPES)))
    .optional(),

  // Comma-separated branch codes: ?branch=CSE,IT
  branch: z
    .string()
    .transform((s) =>
      s
        .split(',')
        .map((b) => b.trim().toUpperCase())
        .filter(Boolean),
    )
    .optional(),

  // Comma-separated years: ?year=2,3
  year: z
    .string()
    .transform((s) =>
      s
        .split(',')
        .map(Number)
        .filter((n) => !Number.isNaN(n)),
    )
    .pipe(z.array(z.number().int().min(1).max(5)))
    .optional(),

  // Faculty/admin only: filter by status
  status: z
    .string()
    .transform((s) =>
      s
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.enum(['draft', 'published', 'closed', 'archived'])))
    .optional(),

  // Cursor-based pagination
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListEventsQuery = z.infer<typeof listEventsSchema>;

// ── Path param ────────────────────────────────────────────────────────────────

export const eventIdSchema = z.object({
  id: z.string().length(24, 'Event ID must be a 24-character hex string'),
});

export type EventIdParam = z.infer<typeof eventIdSchema>;
