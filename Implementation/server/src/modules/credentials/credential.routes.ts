import { Router } from 'express';
import { requireAuth, requireRole, validate } from '@/shared/middleware';
import { singleProofUpload }    from '@/shared/upload';
import {
  editCredentialSchema,
  verifyCredentialSchema,
} from './credential.schema';
import * as ctrl from './credential.controller';

export const credentialsRouter = Router();

// ── IMPORTANT: specific paths BEFORE /:id to avoid route collision ─────────────

// GET /api/v1/credentials/me — own credentials (newest first)
credentialsRouter.get(
  '/me',
  requireAuth,
  requireRole(['student']),
  ctrl.getMyCredentials,
);

// GET /api/v1/credentials/pending — faculty dept queue (oldest first)
credentialsRouter.get(
  '/pending',
  requireAuth,
  requireRole(['faculty', 'dept_head', 'admin']),
  ctrl.getPendingQueue,
);

// POST /api/v1/credentials — upload credential (multipart/form-data)
// multer runs BEFORE validate so req.file is populated before Zod sees req.body
credentialsRouter.post(
  '/',
  requireAuth,
  requireRole(['student']),
  singleProofUpload,    // multer parses multipart; writes file to disk
  ctrl.createCredential,
);

// PATCH /api/v1/credentials/:id — edit pending (student)
credentialsRouter.patch(
  '/:id',
  requireAuth,
  requireRole(['student']),
  validate(editCredentialSchema),
  ctrl.editCredential,
);

// PATCH /api/v1/credentials/:id/verify — approve / reject (faculty+)
credentialsRouter.patch(
  '/:id/verify',
  requireAuth,
  requireRole(['faculty', 'dept_head', 'admin']),
  validate(verifyCredentialSchema),
  ctrl.verifyCredential,
);
