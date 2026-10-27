import type { Request, Response, NextFunction } from 'express';
import { validate } from '@/shared/middleware';
import {
  listUsersQuerySchema,
  userIdParamSchema,
  mapCourseSchema,
  reviewReportSchema,
  auditQuerySchema,
} from './admin.schema';
import {
  listUsers,
  approveUser,
  suspendUser,
  getCourseAliasQueue,
  mapCourseAlias,
  listReports,
  reviewReport,
  listAuditLog,
} from './admin.service';

// ── Users ─────────────────────────────────────────────────────────────────────

export const getAdminUsers = [
  validate(listUsersQuerySchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await listUsers(req.query as unknown as Parameters<typeof listUsers>[0]);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },
];

export const approveUserHandler = [
  validate(userIdParamSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await approveUser(req.user!.id, req.params['id']!);
      res.status(200).json({ data: { message: 'User approved successfully.' } });
    } catch (err) {
      next(err);
    }
  },
];

export const suspendUserHandler = [
  validate(userIdParamSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await suspendUser(req.user!.id, req.params['id']!);
      res.status(200).json({ data: { message: 'User suspended successfully.' } });
    } catch (err) {
      next(err);
    }
  },
];

// ── Course Alias Queue ────────────────────────────────────────────────────────

export async function getCourseQueue(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const cursor = req.query['cursor'] as string | undefined;
    const limit  = req.query['limit']  ? Number(req.query['limit']) : 20;
    const data   = await getCourseAliasQueue(cursor, limit);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

export const mapCourseAliasHandler = [
  validate(mapCourseSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await mapCourseAlias(
        req.user!.id,
        req.params['credId']!,
        req.body as Parameters<typeof mapCourseAlias>[2],
      );
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },
];

// ── Reports ───────────────────────────────────────────────────────────────────

export async function getReports(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const status = req.query['status'] as string | undefined;
    const cursor = req.query['cursor'] as string | undefined;
    const limit  = req.query['limit'] ? Number(req.query['limit']) : 20;
    const data   = await listReports(status, cursor, limit);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

export const reviewReportHandler = [
  validate(reviewReportSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await reviewReport(
        req.user!.id,
        req.params['id']!,
        req.body as Parameters<typeof reviewReport>[2],
      );
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },
];

// ── Audit Log ─────────────────────────────────────────────────────────────────

export const getAuditLog = [
  validate(auditQuerySchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await listAuditLog(req.query as unknown as Parameters<typeof listAuditLog>[0]);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },
];
