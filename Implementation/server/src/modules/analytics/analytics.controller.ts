import { type Request, type Response, type NextFunction } from 'express';
import {
  rankingQuerySchema,
  breakdownParamsSchema,
  breakdownQuerySchema,
  summaryQuerySchema,
} from './analytics.schema';
import {
  getDepartmentRanking,
  getDeptBreakdown,
  getInstituteSummary,
  exportRankingCsv,
} from './analytics.service';
import type { AuthUser } from '@/shared/types';

// ── getRanking ────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/analytics/department-ranking
 * Auth: dept_head+ | admin
 *
 * Returns all departments ranked by the requested metric.
 * dept_head sees the full ranking — competitive transparency is the point.
 * Breakdown restriction is enforced on the /breakdown/:deptId endpoint.
 */
export async function getRanking(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = rankingQuerySchema.parse(req.query);
    const data  = await getDepartmentRanking(query);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

// ── getBreakdown ──────────────────────────────────────────────────────────────

/**
 * GET /api/v1/analytics/breakdown/:deptId
 * Auth: dept_head+ | admin
 *
 * Per-department category/tier/course breakdown.
 * dept_head: restricted to own department (enforced in service).
 */
export async function getBreakdown(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { deptId } = breakdownParamsSchema.parse(req.params);
    const query      = breakdownQuerySchema.parse(req.query);
    const data       = await getDeptBreakdown(deptId, query, req.user as AuthUser);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

// ── getSummary ────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/analytics/summary
 * Auth: admin only
 *
 * Institute-wide summary: totals, averages, top dept, tier distribution.
 */
export async function getSummary(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = summaryQuerySchema.parse(req.query);
    const data  = await getInstituteSummary(query);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

// ── exportCsv ─────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/analytics/export?year=2026
 * Auth: admin only
 *
 * Streams a RFC-4180 CSV ranked by participationRate.
 * Uses cache-first getDepartmentRanking — no extra DB hit on warm cache.
 */
export async function exportCsv(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { year } = summaryQuerySchema.parse(req.query);
    const csv      = await exportRankingCsv(year);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ranking-${year}.csv"`);
    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
}
