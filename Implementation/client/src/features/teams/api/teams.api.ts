import { apiClient } from '@/lib/apiClient';
import type {
  TeamPost,
  TeamLink,
  CreateTeamPostInput,
  UpdateTeamPostInput,
  SendLinkInput,
  RespondLinkAction,
  TeamLinksPage,
} from '../types';

// ── Team Posts ────────────────────────────────────────────────────────────────

/** GET /events/:eventId/teams — list open/full team posts for an event */
export async function listTeamPosts(eventId: string): Promise<TeamPost[]> {
  const res = await apiClient.get<{ data: TeamPost[] }>(`/events/${eventId}/teams`);
  return res.data.data;
}

/** GET /teams/my — my own team posts */
export async function getMyTeamPosts(): Promise<TeamPost[]> {
  const res = await apiClient.get<{ data: TeamPost[] }>('/teams/my');
  return res.data.data;
}

/** POST /teams — create a new team post */
export async function createTeamPost(input: CreateTeamPostInput): Promise<TeamPost> {
  const res = await apiClient.post<{ data: TeamPost }>('/teams', input);
  return res.data.data;
}

/** PATCH /teams/:id — update or close a team post */
export async function updateTeamPost(id: string, input: UpdateTeamPostInput): Promise<TeamPost> {
  const res = await apiClient.patch<{ data: TeamPost }>(`/teams/${id}`, input);
  return res.data.data;
}

// ── Team Links ────────────────────────────────────────────────────────────────

/** GET /links?box=in|out — inbox or sent list */
export async function getLinks(
  box: 'in' | 'out',
  cursor?: string,
): Promise<TeamLinksPage> {
  const res = await apiClient.get<{ data: TeamLinksPage }>('/links', {
    params: { box, ...(cursor ? { cursor } : {}) },
  });
  return res.data.data;
}

/** POST /links — send a join request / invite / connect */
export async function sendLink(input: SendLinkInput): Promise<TeamLink> {
  const res = await apiClient.post<{ data: TeamLink }>('/links', input);
  return res.data.data;
}

/** PATCH /links/:id — accept / decline / withdraw */
export async function respondLink(id: string, action: RespondLinkAction): Promise<TeamLink> {
  const res = await apiClient.patch<{ data: TeamLink }>(`/links/${id}`, { action });
  return res.data.data;
}
