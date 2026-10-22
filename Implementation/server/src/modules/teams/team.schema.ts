import { z } from 'zod';
import mongoose from 'mongoose';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Accept a string that is a valid MongoDB ObjectId */
const objectId = z
  .string({ required_error: 'ID is required' })
  .refine(v => mongoose.isValidObjectId(v), { message: 'Invalid ID format' });

// ── Create TeamPost ───────────────────────────────────────────────────────────

export const createTeamPostSchema = z.object({
  eventId: objectId,

  title: z
    .string({ required_error: 'Title is required' })
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must not exceed 100 characters')
    .trim(),

  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .trim()
    .optional(),

  rolesNeeded: z
    .array(
      z
        .string()
        .min(1, 'Role cannot be empty')
        .max(50, 'Each role must not exceed 50 characters')
        .trim(),
    )
    .max(5, 'You can specify at most 5 roles')
    .default([]),

  spotsTotal: z
    .number({
      required_error: 'spotsTotal is required',
      invalid_type_error: 'spotsTotal must be a number',
    })
    .int('spotsTotal must be an integer')
    .min(1, 'You need at least 1 spot')
    .max(10, 'Maximum 10 spots per team post'),
});

export type CreateTeamPostBody = z.infer<typeof createTeamPostSchema>;

// ── Update TeamPost ───────────────────────────────────────────────────────────
// Owner can edit title/description/roles or close the post.
// spotsTotal and eventId are immutable after creation.
// status can only be set to 'closed' manually (other transitions are automatic).

export const updateTeamPostSchema = z
  .object({
    title: z
      .string()
      .min(3, 'Title must be at least 3 characters')
      .max(100)
      .trim()
      .optional(),

    description: z
      .string()
      .max(500)
      .trim()
      .optional(),

    rolesNeeded: z
      .array(z.string().min(1).max(50).trim())
      .max(5, 'You can specify at most 5 roles')
      .optional(),

    status: z
      .literal('closed', {
        errorMap: () => ({ message: 'You can only set status to "closed"' }),
      })
      .optional(),
  })
  .refine(
    body => Object.values(body).some(v => v !== undefined),
    { message: 'At least one field is required to update' },
  );

export type UpdateTeamPostBody = z.infer<typeof updateTeamPostSchema>;
