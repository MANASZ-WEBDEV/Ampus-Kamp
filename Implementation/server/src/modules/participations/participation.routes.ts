import { Router } from 'express';
import { requireAuth, requireRole, validate } from '@/shared/middleware';
import { singleProofUpload }      from '@/shared/upload';
import {
  createParticipationSchema,
  verifyParticipationSchema,
} from './participation.schema';
import * as ctrl from './participation.controller';

export const participationsRouter = Router();

// POST /api/v1/participations — upload participation proof (student)
participationsRouter.post(
  '/',
  requireAuth,
  requireRole(['student']),
  singleProofUpload,
  validate(createParticipationSchema),
  ctrl.createParticipation,
);

// PATCH /api/v1/participations/:id/verify — verify (faculty+)
participationsRouter.patch(
  '/:id/verify',
  requireAuth,
  requireRole(['faculty', 'dept_head', 'admin']),
  validate(verifyParticipationSchema),
  ctrl.verifyParticipation,
);
