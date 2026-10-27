import type { Response } from 'express';
import { asyncHandler }     from '@/shared/utils';
import type { AuthRequest } from '@/shared/types';
import * as svc             from './participation.service';

// ── POST /api/v1/participations ────────────────────────────────────────────────

export const createParticipation = asyncHandler<AuthRequest>(async (req, res: Response) => {
  if (!req.file) {
    res.status(422).json({
      error: { code: 'MISSING_FILE', message: 'A proof file (PDF, JPEG, or PNG) is required.' },
    });
    return;
  }
  const result = await svc.createParticipation(req.user, req.body, req.file);
  res.status(201).json({ data: result });
});

// ── PATCH /api/v1/participations/:id/verify ────────────────────────────────────

export const verifyParticipation = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const { id } = req.params as { id: string };
  const result  = await svc.verifyParticipation(req.user, id, req.body);
  res.status(200).json({ data: result });
});
