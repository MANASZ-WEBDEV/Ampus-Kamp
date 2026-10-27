import { Router } from 'express';
import { requireAuth, requireRole } from '@/shared/middleware';
import { getRanking, getBreakdown, getSummary, exportCsv } from './analytics.controller';

export const analyticsRouter = Router();

// ── GET /analytics/department-ranking ─────────────────────────────────────────
// Full ranking visible to all dept_head+ (competitive transparency is the point).
// dept_head CANNOT see other depts' /breakdown — restricted in service layer.
analyticsRouter.get(
  '/department-ranking',
  requireAuth,
  requireRole(['dept_head', 'admin']),
  getRanking,
);

// ── GET /analytics/breakdown/:deptId ─────────────────────────────────────────
// dept_head: own dept only (enforced in analytics.service, not here — service
// knows which deptId the caller owns; middleware only knows the role).
analyticsRouter.get(
  '/breakdown/:deptId',
  requireAuth,
  requireRole(['dept_head', 'admin']),
  getBreakdown,
);

// ── GET /analytics/summary ────────────────────────────────────────────────────
// Institute-wide summary. Admin only.
analyticsRouter.get(
  '/summary',
  requireAuth,
  requireRole(['admin']),
  getSummary,
);

// ── GET /analytics/export ─────────────────────────────────────────────────────
// CSV download. Admin only.
analyticsRouter.get(
  '/export',
  requireAuth,
  requireRole(['admin']),
  exportCsv,
);
