import type { Response } from 'express';
import { asyncHandler } from '@/shared/utils';
import type { AuthRequest } from '@/shared/types';
import * as safetyService from './safety.service';

// ── POST /api/v1/blocks ───────────────────────────────────────────────────────

export const createBlock = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const result = await safetyService.createBlock(req.user, req.body);
  res.status(201).json({ data: result });
});

// ── DELETE /api/v1/blocks/:blockedUserId ──────────────────────────────────────

export const removeBlock = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const { blockedUserId } = req.params as { blockedUserId: string };
  await safetyService.removeBlock(req.user, blockedUserId);
  res.status(204).send();
});

// ── GET /api/v1/blocks ────────────────────────────────────────────────────────

export const getMyBlocks = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const result = await safetyService.getMyBlocks(req.user);
  res.status(200).json({ data: result });
});

// ── POST /api/v1/reports ──────────────────────────────────────────────────────

export const createReport = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const result = await safetyService.createReport(req.user, req.body);
  res.status(201).json({ data: result });
});
