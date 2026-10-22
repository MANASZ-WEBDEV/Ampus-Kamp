import { Router } from 'express';
import { requireAuth, requireRole, validate } from '@/shared/middleware';
import { sendLinkSchema, respondLinkSchema, linksQuerySchema } from './link.schema';
import * as ctrl from './link.controller';

export const linksRouter = Router();

// ── GET /api/v1/links?box=in|out — inbox / sent ───────────────────────────────
linksRouter.get(
  '/',
  requireAuth,
  requireRole(['student']),
  validate(linksQuerySchema, 'query'),
  ctrl.getLinks,
);

// ── POST /api/v1/links — send a join request / invite / connect ───────────────
linksRouter.post(
  '/',
  requireAuth,
  requireRole(['student']),
  validate(sendLinkSchema),
  ctrl.sendLink,
);

// ── PATCH /api/v1/links/:id — accept / decline / withdraw ─────────────────────
linksRouter.patch(
  '/:id',
  requireAuth,
  requireRole(['student']),
  validate(respondLinkSchema),
  ctrl.respondLink,
);
