import { Router } from 'express';
import { requireAuth, requireRole, validate } from '@/shared/middleware';
import { createCourseSchema, appendAliasesSchema, searchCourseSchema } from './course.schema';
import * as ctrl from './course.controller';

export const coursesRouter = Router();

// ── GET /api/v1/courses?q=&category= — search catalog (student+) ──────────────
coursesRouter.get(
  '/',
  requireAuth,
  requireRole(['student', 'faculty', 'dept_head', 'admin']),
  validate(searchCourseSchema),
  ctrl.searchCourses,
);

// ── POST /api/v1/courses — add course (admin) ─────────────────────────────────
coursesRouter.post(
  '/',
  requireAuth,
  requireRole(['admin']),
  validate(createCourseSchema),
  ctrl.createCourse,
);

// ── PATCH /api/v1/courses/:id/aliases — append aliases (admin) ────────────────
coursesRouter.patch(
  '/:id/aliases',
  requireAuth,
  requireRole(['admin']),
  validate(appendAliasesSchema),
  ctrl.appendAliases,
);
