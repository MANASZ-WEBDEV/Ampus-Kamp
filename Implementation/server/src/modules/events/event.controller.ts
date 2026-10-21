import type { Response } from 'express';
import { asyncHandler } from '@/shared/utils';
import type { AuthRequest } from '@/shared/types';
import * as eventService from './event.service';
import type { ListEventsQuery } from './event.schema';

// ── GET /api/v1/events ────────────────────────────────────────────────────────

export const listEvents = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const query = req.query as unknown as ListEventsQuery;
  const result = await eventService.listEvents(req.user, query);
  res.status(200).json({ data: result });
});

// ── GET /api/v1/events/my ─────────────────────────────────────────────────────

export const getMyEvents = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const query = req.query as unknown as ListEventsQuery;
  const result = await eventService.getMyEvents(req.user, query);
  res.status(200).json({ data: result });
});

// ── GET /api/v1/events/:id ────────────────────────────────────────────────────

export const getEventById = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const event = await eventService.getEventById(req.user, req.params['id']!);
  res.status(200).json({ data: event });
});

// ── POST /api/v1/events ───────────────────────────────────────────────────────

export const createEvent = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const event = await eventService.createEvent(req.user, req.body);
  res.status(201).json({ data: event });
});

// ── PUT /api/v1/events/:id ────────────────────────────────────────────────────

export const updateEvent = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const event = await eventService.updateEvent(req.user, req.params['id']!, req.body);
  res.status(200).json({ data: event });
});

// ── PATCH /api/v1/events/:id/publish ─────────────────────────────────────────

export const publishEvent = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const event = await eventService.publishEvent(req.user, req.params['id']!);
  res.status(200).json({ data: event });
});

// ── PATCH /api/v1/events/:id/close ───────────────────────────────────────────

export const closeEvent = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const event = await eventService.closeEvent(req.user, req.params['id']!);
  res.status(200).json({ data: event });
});

// ── DELETE /api/v1/events/:id ─────────────────────────────────────────────────

export const deleteEvent = asyncHandler<AuthRequest>(async (req, res: Response) => {
  await eventService.deleteEvent(req.user, req.params['id']!);
  res.status(204).send();
});

// ── POST /api/v1/events/:id/bookmark ─────────────────────────────────────────

export const toggleBookmark = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const result = await eventService.toggleBookmark(req.user, req.params['id']!);
  res.status(200).json({ data: result });
});
