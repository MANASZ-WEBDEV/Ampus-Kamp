import type { Response } from 'express';
import { asyncHandler }     from '@/shared/utils';
import type { AuthRequest } from '@/shared/types';
import * as svc             from './credential.service';

// ── POST /api/v1/credentials ───────────────────────────────────────────────────
// File is attached by multer before this handler runs.

export const createCredential = asyncHandler<AuthRequest>(async (req, res: Response) => {
  if (!req.file) {
    res.status(422).json({
      error: { code: 'MISSING_FILE', message: 'A proof file (PDF, JPEG, or PNG) is required.' },
    });
    return;
  }
  const result = await svc.createCredential(req.user, req.body, req.file);
  res.status(201).json({ data: result });
});

// ── GET /api/v1/credentials/me ─────────────────────────────────────────────────

export const getMyCredentials = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const result = await svc.getMyCredentials(req.user);
  res.status(200).json({ data: result });
});

// ── GET /api/v1/credentials/pending (faculty+) ─────────────────────────────────

export const getPendingQueue = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const result = await svc.getPendingQueue(req.user);
  res.status(200).json({ data: result });
});

// ── PATCH /api/v1/credentials/:id (student — edit pending) ────────────────────

export const editCredential = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await svc.editCredential(req.user, id, req.body);
  res.status(200).json({ data: result });
});

// ── PATCH /api/v1/credentials/:id/verify (faculty+) ───────────────────────────

export const verifyCredential = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await svc.verifyCredential(req.user, id, req.body);
  res.status(200).json({ data: result });
});
