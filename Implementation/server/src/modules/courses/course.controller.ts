import type { Response } from 'express';
import { asyncHandler }     from '@/shared/utils';
import type { AuthRequest } from '@/shared/types';
import * as svc             from './course.service';
import type { SearchCourseQuery } from './course.schema';

// ── GET /api/v1/courses?q=&category=&limit= ───────────────────────────────────

export const searchCourses = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const { q, category, limit } = req.query as unknown as SearchCourseQuery;
  const courses = await svc.searchCourses(q, category, limit);
  res.status(200).json({ data: courses });
});

// ── POST /api/v1/courses (admin) ──────────────────────────────────────────────

export const createCourse = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const course = await svc.createCourse(req.body);
  res.status(201).json({ data: course });
});

// ── PATCH /api/v1/courses/:id/aliases (admin) ─────────────────────────────────

export const appendAliases = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const { id } = req.params as { id: string };
  const course = await svc.appendAliases(id, req.body);
  res.status(200).json({ data: course });
});
