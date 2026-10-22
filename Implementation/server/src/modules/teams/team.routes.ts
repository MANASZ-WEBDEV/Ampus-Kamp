import { Router } from 'express';
import { requireAuth, requireRole, validate } from '@/shared/middleware';
import { createTeamPostSchema, updateTeamPostSchema } from './team.schema';
import * as ctrl from './team.controller';

export const teamsRouter = Router();

// ── GET /api/v1/teams/my — must be before /:id ────────────────────────────────
teamsRouter.get(
  '/my',
  requireAuth,
  requireRole(['student']),
  ctrl.getMyTeamPosts,
);

// ── POST /api/v1/teams — create a new team post ───────────────────────────────
teamsRouter.post(
  '/',
  requireAuth,
  requireRole(['student']),
  validate(createTeamPostSchema),
  ctrl.createTeamPost,
);

// ── PATCH /api/v1/teams/:id — edit or close (owner only) ─────────────────────
teamsRouter.patch(
  '/:id',
  requireAuth,
  requireRole(['student']),
  validate(updateTeamPostSchema),
  ctrl.updateTeamPost,
);

// ── GET /api/v1/events/:eventId/teams — list team posts for an event ──────────
// NOTE: This route is mounted on eventsRouter in event.routes.ts, not here.
//       See: eventsRouter.get('/:id/teams', ...) in event.routes.ts
