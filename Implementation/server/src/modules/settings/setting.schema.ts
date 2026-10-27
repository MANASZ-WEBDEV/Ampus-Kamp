import { z } from 'zod';

// ── PUT /settings body ────────────────────────────────────────────────────────
// All fields optional — supports partial update (PATCH semantics under PUT URL).
// Admin reads current values first, then sends only changed fields.

export const putSettingsSchema = z.object({
  body: z.object({
    uploadsPer24h: z.number().int().min(1).max(50).optional(),
    pendingCap:          z.number().int().min(1).max(100).optional(),
    linksPerDay:         z.number().int().min(1).max(50).optional(),
    linkExpiryDays:      z.number().int().min(1).max(90).optional(),
    declineCooldownDays: z.number().int().min(0).max(365).optional(),
    spotCheckPercent:    z.number().int().min(1).max(100).optional(),
    extractionsPerDay:   z.number().int().min(1).max(200).optional(),
    rankingMetric: z
      .enum(['participation_rate', 'per_hundred', 'weighted_points'])
      .optional(),
    tierPoints: z
      .object({
        pass:         z.number().int().min(0),
        elite:        z.number().int().min(0),
        elite_silver: z.number().int().min(0),
        elite_gold:   z.number().int().min(0),
      })
      .optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one setting field must be provided.' },
  ),
});

// ── Inferred types ────────────────────────────────────────────────────────────

export type PutSettingsBody = z.infer<typeof putSettingsSchema>['body'];

// ── SettingsDto — canonical shape returned by GET and PUT ─────────────────────
// Exported so client types can mirror it.

export interface SettingsDto {
  uploadsPer24h:       number;
  pendingCap:          number;
  linksPerDay:         number;
  linkExpiryDays:      number;
  declineCooldownDays: number;
  spotCheckPercent:    number;
  extractionsPerDay:   number;
  rankingMetric:       'participation_rate' | 'per_hundred' | 'weighted_points';
  tierPoints: {
    pass:         number;
    elite:        number;
    elite_silver: number;
    elite_gold:   number;
  };
}
