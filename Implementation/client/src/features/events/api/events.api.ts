import { apiClient } from '@/lib/apiClient';
import type {
  EventCard,
  EventDetail,
  EventFeedPage,
  EventsQuery,
  CreateEventInput,
  UpdateEventInput,
} from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Serialises EventsQuery to URLSearchParams, skipping undefined values. */
function buildParams(query: EventsQuery): Record<string, string> {
  const p: Record<string, string> = {};
  if (query.type?.length)   p['type']   = query.type.join(',');
  if (query.branch?.length) p['branch'] = query.branch.join(',');
  if (query.year?.length)   p['year']   = query.year.join(',');
  if (query.status?.length) p['status'] = query.status.join(',');
  if (query.cursor)         p['cursor'] = query.cursor;
  if (query.limit)          p['limit']  = String(query.limit);
  return p;
}

// ── Events API ────────────────────────────────────────────────────────────────

/** GET /events — paginated feed */
export async function listEvents(query: EventsQuery = {}): Promise<EventFeedPage> {
  const res = await apiClient.get<{ data: EventFeedPage }>('/events', {
    params: buildParams(query),
  });
  return res.data.data;
}

/** GET /events/my — faculty's own events */
export async function listMyEvents(query: EventsQuery = {}): Promise<EventFeedPage> {
  const res = await apiClient.get<{ data: EventFeedPage }>('/events/my', {
    params: buildParams(query),
  });
  return res.data.data;
}

/** GET /events/:id — single event detail */
export async function getEvent(id: string): Promise<EventDetail> {
  const res = await apiClient.get<{ data: EventDetail }>(`/events/${id}`);
  return res.data.data;
}

/** POST /events — create a draft */
export async function createEvent(body: CreateEventInput): Promise<EventDetail> {
  const res = await apiClient.post<{ data: EventDetail }>('/events', body);
  return res.data.data;
}

/** PUT /events/:id — update an event */
export async function updateEvent(id: string, body: UpdateEventInput): Promise<EventDetail> {
  const res = await apiClient.put<{ data: EventDetail }>(`/events/${id}`, body);
  return res.data.data;
}

/** PATCH /events/:id/publish — publish a draft */
export async function publishEvent(id: string): Promise<EventDetail> {
  const res = await apiClient.patch<{ data: EventDetail }>(`/events/${id}/publish`);
  return res.data.data;
}

/** PATCH /events/:id/close — close a published event */
export async function closeEvent(id: string): Promise<EventDetail> {
  const res = await apiClient.patch<{ data: EventDetail }>(`/events/${id}/close`);
  return res.data.data;
}

/** DELETE /events/:id — soft-delete */
export async function deleteEvent(id: string): Promise<void> {
  await apiClient.delete(`/events/${id}`);
}

/** POST /events/:id/bookmark — toggle bookmark */
export async function toggleBookmark(id: string): Promise<{ bookmarked: boolean }> {
  const res = await apiClient.post<{ data: { bookmarked: boolean } }>(`/events/${id}/bookmark`);
  return res.data.data;
}

// ── Re-export types for convenient imports ─────────────────────────────────────
export type { EventCard, EventDetail, EventFeedPage, EventsQuery, CreateEventInput, UpdateEventInput };

/** Alias used by useMyEvents hook */
export async function getMyEvents(cursor?: string): Promise<EventFeedPage> {
  return listMyEvents({ cursor });
}

/** POST /events/:id/register — in-app registration */
export async function registerForEvent(id: string, body: Record<string, unknown>): Promise<{ success: boolean }> {
  const res = await apiClient.post<{ data: { success: boolean } }>(`/events/${id}/register`, body);
  return res.data.data;
}
