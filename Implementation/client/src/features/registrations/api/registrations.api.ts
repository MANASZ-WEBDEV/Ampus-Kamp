import { apiClient } from '@/lib/apiClient';
import type {
  Registration,
  RegistrationPage,
  CreateRegistrationInput,
  UpdateRegistrationInput,
  MemberRespondInput,
  CreateTrackingInput,
} from '../types';

// ── Student ───────────────────────────────────────────────────────────────────

/** POST /events/:eventId/registrations — create individual or team registration */
export async function createRegistration(
  eventId: string,
  input: CreateRegistrationInput,
): Promise<Registration> {
  const res = await apiClient.post<{ data: Registration }>(
    `/events/${eventId}/registrations`,
    input,
  );
  return res.data.data;
}

/** PATCH /registrations/:id — submit / withdraw / edit */
export async function updateRegistration(
  regId: string,
  input: UpdateRegistrationInput,
): Promise<Registration> {
  const res = await apiClient.patch<{ data: Registration }>(
    `/registrations/${regId}`,
    input,
  );
  return res.data.data;
}

/** PATCH /registrations/:id/members/:uid — confirm or decline membership */
export async function respondMember(
  regId: string,
  uid: string,
  input: MemberRespondInput,
): Promise<Registration> {
  const res = await apiClient.patch<{ data: Registration }>(
    `/registrations/${regId}/members/${uid}`,
    input,
  );
  return res.data.data;
}

/** GET /registrations/mine?eventId= — student's own active registration */
export async function getMyRegistration(eventId: string): Promise<Registration | null> {
  const res = await apiClient.get<{ data: Registration | null }>(
    '/registrations/mine',
    { params: { eventId } },
  );
  return res.data.data;
}

/** POST /events/:eventId/tracking — mark external registration */
export async function createTracking(
  eventId: string,
  input: CreateTrackingInput,
): Promise<Registration> {
  const res = await apiClient.post<{ data: Registration }>(
    `/events/${eventId}/tracking`,
    input,
  );
  return res.data.data;
}

// ── Faculty ───────────────────────────────────────────────────────────────────

/** GET /events/:eventId/registrations — faculty roster */
export async function getRoster(
  eventId: string,
  params?: { status?: string; limit?: number; cursor?: string },
): Promise<RegistrationPage> {
  const res = await apiClient.get<{ data: RegistrationPage }>(
    `/events/${eventId}/registrations`,
    { params },
  );
  return res.data.data;
}

/**
 * GET /events/:eventId/registrations/export — downloads CSV blob.
 * Returns a URL string via URL.createObjectURL for <a> download trigger.
 */
export async function downloadRosterCsv(eventId: string): Promise<string> {
  const res = await apiClient.get<Blob>(
    `/events/${eventId}/registrations/export`,
    { responseType: 'blob' },
  );
  return URL.createObjectURL(res.data);
}
