import type { Response } from 'express';
import { asyncHandler }      from '@/shared/utils';
import type { AuthRequest }  from '@/shared/types';
import * as svc              from './registration.service';
import type { RosterQuery }  from './registration.schema';

// ── POST /api/v1/events/:id/registrations ────────────────────────────────────

export const createRegistration = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const { id: eventId } = req.params as { id: string };
  const result = await svc.createRegistration(req.user, eventId, req.body);
  res.status(201).json({ data: result });
});

// ── POST /api/v1/events/:id/tracking ─────────────────────────────────────────

export const createTracking = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const { id: eventId } = req.params as { id: string };
  const result = await svc.createTracking(req.user, eventId, req.body);
  res.status(201).json({ data: result });
});

// ── PATCH /api/v1/registrations/:id ──────────────────────────────────────────

export const updateRegistration = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const { id: regId } = req.params as { id: string };
  const result = await svc.updateRegistration(req.user, regId, req.body);
  res.status(200).json({ data: result });
});

// ── PATCH /api/v1/registrations/:id/members/:uid ─────────────────────────────

export const respondMember = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const { id: regId, uid } = req.params as { id: string; uid: string };
  const result = await svc.respondMember(req.user, regId, uid, req.body);
  res.status(200).json({ data: result });
});

// ── GET /api/v1/registrations/mine?eventId= ──────────────────────────────────

export const getMyRegistration = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const { eventId } = req.query as { eventId?: string };
  if (!eventId) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'eventId query param is required.' } });
    return;
  }
  const result = await svc.getMyRegistration(req.user, eventId);
  res.status(200).json({ data: result }); // null → { data: null }
});

// ── GET /api/v1/events/:id/registrations (faculty+) ──────────────────────────

export const getRoster = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const { id: eventId } = req.params as { id: string };
  const query = req.query as unknown as RosterQuery;
  const result = await svc.getRoster(eventId, query);
  res.status(200).json({ data: result });
});

// ── GET /api/v1/events/:id/registrations/export (faculty+) ───────────────────
//
// Streams CSV directly to the response.
// Uses svc.streamRosterCsv with .cursor() — never loads all docs into memory.

const CSV_HEADERS = ['regId', 'type', 'status', 'teamName', 'leaderName', 'members', 'submittedAt'];

export const exportRosterCsv = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const { id: eventId } = req.params as { id: string };

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="roster-${eventId}.csv"`);

  // Write BOM for Excel compatibility + header row
  res.write('\uFEFF' + CSV_HEADERS.join(',') + '\r\n');

  await svc.streamRosterCsv(eventId, row => {
    const line = CSV_HEADERS.map(h => {
      const val = String(row[h as keyof typeof row] ?? '');
      // RFC 4180: wrap in quotes if contains comma, quote, or newline
      return val.includes(',') || val.includes('"') || val.includes('\n')
        ? `"${val.replace(/"/g, '""')}"`
        : val;
    }).join(',');
    res.write(line + '\r\n');
  });

  res.end();
});
