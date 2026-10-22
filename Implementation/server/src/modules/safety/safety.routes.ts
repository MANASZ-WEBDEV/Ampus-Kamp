import { Router } from 'express';
import { requireAuth, requireRole, validate } from '@/shared/middleware';
import { createBlockSchema, createReportSchema } from './safety.schema';
import * as ctrl from './safety.controller';

export const safetyRouter = Router();

// ── Blocks ────────────────────────────────────────────────────────────────────

// GET /api/v1/blocks — my block list
safetyRouter.get(
  '/blocks',
  requireAuth,
  requireRole(['student']),
  ctrl.getMyBlocks,
);

// POST /api/v1/blocks — block a user
safetyRouter.post(
  '/blocks',
  requireAuth,
  requireRole(['student']),
  validate(createBlockSchema),
  ctrl.createBlock,
);

// DELETE /api/v1/blocks/:blockedUserId — unblock
safetyRouter.delete(
  '/blocks/:blockedUserId',
  requireAuth,
  requireRole(['student']),
  ctrl.removeBlock,
);

// ── Reports ───────────────────────────────────────────────────────────────────

// POST /api/v1/reports — file a safety report
safetyRouter.post(
  '/reports',
  requireAuth,
  requireRole(['student']),
  validate(createReportSchema),
  ctrl.createReport,
);
