import { Router } from 'express';
import { requireAuth, requireRole, validate } from '@/shared/middleware';
import { createEventSchema, updateEventSchema, listEventsSchema } from './event.schema';
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

// ── F-3 hook (do not remove this comment) ────────────────────────────────────
// POST /api/v1/events/extract   ← will be mounted here by F-3 (Paste-to-Post AI Extraction)
// It must be added BEFORE /:id to prevent Express matching "extract" as an :id param.
