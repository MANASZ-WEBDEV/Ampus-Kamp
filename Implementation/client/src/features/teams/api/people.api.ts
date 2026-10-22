import { apiClient } from '@/lib/apiClient';
import type {
  PeoplePage, PeopleQuery,
  ToggleResult, LookingPage,
  BlockCard, CreateBlockInput, CreateReportInput,
} from '../types.f5';

// ── People ────────────────────────────────────────────────────────────────────

/** GET /people — people search with optional isLooking annotation */
export async function searchPeople(query: PeopleQuery = {}): Promise<PeoplePage> {
  const params: Record<string, string> = {};
  if (query.skills)  params['skills']  = query.skills;
  if (query.branch)  params['branch']  = query.branch;
  if (query.year)    params['year']    = String(query.year);
  if (query.eventId) params['eventId'] = query.eventId;
  if (query.cursor)  params['cursor']  = query.cursor;
  if (query.limit)   params['limit']   = String(query.limit);

  const res = await apiClient.get<{ data: PeoplePage }>('/people', { params });
  return res.data.data;
}

// ── Looking Flag ──────────────────────────────────────────────────────────────

/** PUT /events/:eventId/looking — toggle looking flag */
export async function toggleLooking(
  eventId: string,
  note?: string,
): Promise<ToggleResult> {
  const res = await apiClient.put<{ data: ToggleResult }>(
    `/events/${eventId}/looking`,
    { note },
  );
  return res.data.data;
}

/** GET /events/:eventId/looking — list students looking */
export async function listLooking(
  eventId: string,
  cursor?: string,
): Promise<LookingPage> {
  const res = await apiClient.get<{ data: LookingPage }>(
    `/events/${eventId}/looking`,
    { params: cursor ? { cursor } : undefined },
  );
  return res.data.data;
}

// ── Safety ────────────────────────────────────────────────────────────────────

/** GET /blocks — my block list */
export async function getMyBlocks(): Promise<BlockCard[]> {
  const res = await apiClient.get<{ data: BlockCard[] }>('/blocks');
  return res.data.data;
}

/** POST /blocks — block a user */
export async function createBlock(input: CreateBlockInput): Promise<BlockCard> {
  const res = await apiClient.post<{ data: BlockCard }>('/blocks', input);
  return res.data.data;
}

/** DELETE /blocks/:blockedUserId — unblock */
export async function removeBlock(blockedUserId: string): Promise<void> {
  await apiClient.delete(`/blocks/${blockedUserId}`);
}

/** POST /reports — file a safety report */
export async function createReport(input: CreateReportInput): Promise<{ id: string }> {
  const res = await apiClient.post<{ data: { id: string } }>('/reports', input);
  return res.data.data;
}
