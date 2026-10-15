import { z } from 'zod';

// ── PUT /api/v1/users/me ──────────────────────────────────────────────────────

export const updateMeSchema = z.object({
  skills: z
    .array(z.string().min(1).max(40).trim())
    .max(20, 'Maximum 20 skills')
    .optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9]{7,15}$/, 'Invalid phone number format')
    .optional()
    .nullable(),
  phoneVisible: z.boolean().optional(),
  allowInvites: z.boolean().optional(),
});

export type UpdateMeBody = z.infer<typeof updateMeSchema>;
