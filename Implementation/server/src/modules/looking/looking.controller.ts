import type { Response } from 'express';
import { asyncHandler } from '@/shared/utils';
import type { AuthRequest } from '@/shared/types';
import * as lookingService from './looking.service';
import type { LookingQuery } from './looking.schema';

// ── PUT /api/v1/events/:id/looking ───────────────────────────────────────────

export const toggleLooking = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const { id: eventId } = req.params as { id: string };
  const result = await lookingService.toggleLooking(req.user, eventId, req.body);
  res.status(200).json({ data: result });
});

// ── GET /api/v1/events/:id/looking ───────────────────────────────────────────

export const listLooking = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const { id: eventId } = req.params as { id: string };
  const query = req.query as unknown as LookingQuery;
  const result = await lookingService.listLooking(eventId, query);
  res.status(200).json({ data: result });
});
