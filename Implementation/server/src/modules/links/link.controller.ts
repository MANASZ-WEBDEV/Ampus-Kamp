import type { Response } from 'express';
import { asyncHandler } from '@/shared/utils';
import type { AuthRequest } from '@/shared/types';
import * as linkService from './link.service';
import type { LinksQuery } from './link.schema';

// ── POST /api/v1/links ────────────────────────────────────────────────────────

export const sendLink = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const result = await linkService.sendLink(req.user, req.body);
  res.status(201).json({ data: result });
});

// ── PATCH /api/v1/links/:id ───────────────────────────────────────────────────

export const respondLink = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const { id } = req.params as { id: string };
  const { action } = req.body as { action: 'accept' | 'decline' | 'withdraw' };
  const result = await linkService.respondLink(req.user, id, action);
  res.status(200).json({ data: result });
});

// ── GET /api/v1/links?box=in|out ─────────────────────────────────────────────

export const getLinks = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const query = req.query as unknown as LinksQuery;
  const result = await linkService.getLinks(req.user, query);
  res.status(200).json({ data: result });
});
