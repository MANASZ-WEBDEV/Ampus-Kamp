import { Router } from 'express';
import { requireAuth, requireRole, validate } from '@/shared/middleware';
import { createEventSchema, updateEventSchema, listEventsSchema } from './event.schema';
import { extractRequestSchema } from './extraction/extraction.schema';
import { extractEvent } from './extraction/extraction.controller';
import * as ctrl from './event.controller';

export const eventsRouter = Router();

// ── Public-ish (requires login, but any role) ─────────────────────────────────

// GET /api/v1/events — paginated feed (students: published only; faculty: own filter)
eventsRouter.get(
  '/',
  requireAuth,
  validate(listEventsSchema, 'query'),
  ctrl.listEvents,
);

// GET /api/v1/events/my — own events (faculty/admin only)
// NOTE: /my must be declared BEFORE /:id so Express matches it correctly
eventsRouter.get(
  '/my',
  requireAuth,
  requireRole(['faculty', 'dept_head', 'admin']),
  validate(listEventsSchema, 'query'),
  ctrl.getMyEvents,
);

// GET /api/v1/events/:id — event detail
eventsRouter.get(
  '/:id',
  requireAuth,
  ctrl.getEventById,
);

// ── Faculty / admin only ──────────────────────────────────────────────────────

// POST /api/v1/events — create draft
eventsRouter.post(
  '/',
  requireAuth,
  requireRole(['faculty', 'dept_head', 'admin']),
  validate(createEventSchema),
  ctrl.createEvent,
);

// PUT /api/v1/events/:id — edit (ownership checked in service)
eventsRouter.put(
  '/:id',
  requireAuth,
  requireRole(['faculty', 'dept_head', 'admin']),
  validate(updateEventSchema),
  ctrl.updateEvent,
);

// PATCH /api/v1/events/:id/publish — draft → published
eventsRouter.patch(
  '/:id/publish',
  requireAuth,
  requireRole(['faculty', 'dept_head', 'admin']),
  ctrl.publishEvent,
);

// PATCH /api/v1/events/:id/close — published → closed
eventsRouter.patch(
  '/:id/close',
  requireAuth,
  requireRole(['faculty', 'dept_head', 'admin']),
  ctrl.closeEvent,
);

// DELETE /api/v1/events/:id — soft-delete (ownership checked in service)
eventsRouter.delete(
  '/:id',
  requireAuth,
  requireRole(['faculty', 'dept_head', 'admin']),
  ctrl.deleteEvent,
);

// ── Student only ──────────────────────────────────────────────────────────────

// POST /api/v1/events/:id/bookmark — toggle bookmark
eventsRouter.post(
  '/:id/bookmark',
  requireAuth,
  requireRole(['student']),
  ctrl.toggleBookmark,
);

// ── F-3: Paste-to-Post AI Extraction ────────────────────────────────────────
// IMPORTANT: This route MUST remain before /:id — Express matches routes in order,
// and "extract" would otherwise be captured as an :id param.

eventsRouter.post(
  '/extract',
  requireAuth,
  requireRole(['faculty', 'dept_head', 'admin']),
  validate(extractRequestSchema),
  extractEvent,
);

// ── F-4: Team posts per event ─────────────────────────────────────────────────
// GET /api/v1/events/:id/teams — list open/full team posts for a specific event
import { listTeamPosts } from '@/modules/teams/team.controller';

eventsRouter.get(
  '/:id/teams',
  requireAuth,
  requireRole(['student', 'faculty', 'dept_head', 'admin']),
  listTeamPosts,
);

// ── F-5: Looking flag ─────────────────────────────────────────────────────────
import { toggleLooking, listLooking } from '@/modules/looking/looking.controller';
import { upsertLookingSchema, lookingQuerySchema } from '@/modules/looking/looking.schema';

// PUT /api/v1/events/:id/looking — toggle looking flag (student only)
eventsRouter.put(
  '/:id/looking',
  requireAuth,
  requireRole(['student']),
  validate(upsertLookingSchema),
  toggleLooking,
);

// GET /api/v1/events/:id/looking — list students looking (all authenticated)
eventsRouter.get(
  '/:id/looking',
  requireAuth,
  validate(lookingQuerySchema, 'query'),
  listLooking,
);
