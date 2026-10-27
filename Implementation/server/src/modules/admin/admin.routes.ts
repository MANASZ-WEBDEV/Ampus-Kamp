import { Router } from 'express';
import { requireAuth, requireRole } from '@/shared/middleware';
import {
  getAdminUsers,
  approveUserHandler,
  suspendUserHandler,
  getCourseQueue,
  mapCourseAliasHandler,
  getReports,
  reviewReportHandler,
  getAuditLog,
} from './admin.controller';

export const adminRouter = Router();

// ── Global middleware — all admin routes require auth + admin role ──────────
// Applied once at router level — DRY, nothing slips through.
adminRouter.use(requireAuth, requireRole(['admin']));

// ── Users ─────────────────────────────────────────────────────────────────────
adminRouter.get  ('/users',             ...getAdminUsers);
adminRouter.patch('/users/:id/approve', ...approveUserHandler);
adminRouter.patch('/users/:id/suspend', ...suspendUserHandler);

// ── Course Alias Queue ────────────────────────────────────────────────────────
adminRouter.get  ('/courses/queue',         getCourseQueue);
adminRouter.patch('/courses/queue/:credId', ...mapCourseAliasHandler);

// ── Safety Reports ────────────────────────────────────────────────────────────
adminRouter.get  ('/reports',    getReports);
adminRouter.patch('/reports/:id', ...reviewReportHandler);

// ── Audit Log (read-only) ─────────────────────────────────────────────────────
adminRouter.get('/audit', ...getAuditLog);
