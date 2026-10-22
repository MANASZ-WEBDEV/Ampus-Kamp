import { Router } from 'express';
import { requireAuth, requireRole, validate } from '@/shared/middleware';
import {
  updateRegistrationSchema,
  memberRespondSchema,
} from './registration.schema';
import * as ctrl from './registration.controller';

export const registrationsRouter = Router();

// ── Student: my registration ──────────────────────────────────────────────────
// GET /api/v1/registrations/mine?eventId=
// IMPORTANT: 'mine' must be declared BEFORE '/:id' to avoid route collision
registrationsRouter.get(
  '/mine',
  requireAuth,
  requireRole(['student']),
  ctrl.getMyRegistration,
);

// ── Student: edit / submit / withdraw ────────────────────────────────────────
// PATCH /api/v1/registrations/:id
registrationsRouter.patch(
  '/:id',
  requireAuth,
  requireRole(['student']),
  validate(updateRegistrationSchema),
  ctrl.updateRegistration,
);

// ── Student: confirm or decline membership ────────────────────────────────────
// PATCH /api/v1/registrations/:id/members/:uid
registrationsRouter.patch(
  '/:id/members/:uid',
  requireAuth,
  requireRole(['student']),
  validate(memberRespondSchema),
  ctrl.respondMember,
);
