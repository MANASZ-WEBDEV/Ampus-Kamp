import { z } from 'zod';

export const importRosterSchema = z.object({
  // Validated at multipart/form-data level via multer — no JSON body
});

// CSV row shape after parsing
export const rosterRowSchema = z.object({
  enrollmentNo: z.string().min(4).toUpperCase().trim(),
  collegeId: z.string().min(1).trim(),
  name: z.string().min(2).trim(),
  department: z.string().min(1).toUpperCase().trim(), // dept code e.g. "CS"
  year: z.coerce.number().int().min(1).max(5),
  email: z.string().email().optional().or(z.literal('')).transform(v => v || undefined),
});

export type RosterRow = z.infer<typeof rosterRowSchema>;
