import { z } from 'zod';

const objectId = (field: string) =>
  z.string().regex(/^[a-f\d]{24}$/i, `Invalid ${field}`);

// ── Shared ────────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

const yearSchema = z.coerce
  .number()
  .int()
  .min(2020, 'Year must be 2020 or later')
  .max(2100, 'Year out of range')
  .default(CURRENT_YEAR);

// ── Ranking query ─────────────────────────────────────────────────────────────

export const rankingQuerySchema = z.object({
  year:   yearSchema,
  metric: z
    .enum(['participationRate', 'perHundred', 'weightedPoints'])
    .default('participationRate'),
});

export type RankingQuery = z.infer<typeof rankingQuerySchema>;

// ── Breakdown query ───────────────────────────────────────────────────────────

export const breakdownParamsSchema = z.object({
  deptId: objectId('deptId'),
});

export const breakdownQuerySchema = z.object({
  year: yearSchema,
});

export type BreakdownQuery  = z.infer<typeof breakdownQuerySchema>;
export type BreakdownParams = z.infer<typeof breakdownParamsSchema>;

// ── Summary query ─────────────────────────────────────────────────────────────

export const summaryQuerySchema = z.object({
  year: yearSchema,
});

export type SummaryQuery = z.infer<typeof summaryQuerySchema>;
