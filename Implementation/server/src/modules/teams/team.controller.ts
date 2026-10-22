import type { Response } from 'express';
import { asyncHandler } from '@/shared/utils';
import type { AuthRequest } from '@/shared/types';
import * as teamService from './team.service';

// ── GET /api/v1/events/:id/teams ──────────────────────────────────────────────

export const listTeamPosts = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const { id: eventId } = req.params as { id: string };
  const statusFilter = req.query['status'] as string | undefined;
  const result = await teamService.listTeamPosts(eventId, req.user.id, statusFilter);
  res.status(200).json({ data: result });
});

// ── POST /api/v1/teams ────────────────────────────────────────────────────────

export const createTeamPost = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const result = await teamService.createTeamPost(req.user, req.body);
  res.status(201).json({ data: result });
});

// ── PATCH /api/v1/teams/:id ───────────────────────────────────────────────────

export const updateTeamPost = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await teamService.updateTeamPost(req.user, id, req.body);
  res.status(200).json({ data: result });
});

// ── GET /api/v1/teams/my ─────────────────────────────────────────────────────

export const getMyTeamPosts = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const result = await teamService.getMyTeamPosts(req.user);
  res.status(200).json({ data: result });
});
