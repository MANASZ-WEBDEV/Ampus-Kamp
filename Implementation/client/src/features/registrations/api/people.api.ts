import { apiClient } from '@/lib/apiClient';

// ── Response shape mirrors server PersonCard ──────────────────────────────────

export interface PersonCard {
  id:           string;
  name:         string;
  department:   { id: string; code: string; name: string };
  year?:        number;
  skills:       string[];
  allowInvites: boolean;
}

interface PeopleResponse {
  data: {
    items:       PersonCard[];
    nextCursor?: string;
    hasMore:     boolean;
  };
}

/**
 * searchStudents — calls GET /api/v1/people with name or email lookup.
 *
 * - If query contains '@', sends ?email= (exact match, fast-path on server)
 * - Otherwise sends ?name= (partial regex, typeahead)
 *
 * Email is NEVER returned in the response — only used server-side for lookup.
 */
export async function searchStudents(
  query:   string,
  eventId: string,
): Promise<PersonCard[]> {
  if (!query.trim()) return [];
  const isEmail = query.includes('@');
  const res = await apiClient.get<PeopleResponse>('/people', {
    params: isEmail
      ? { email: query.trim().toLowerCase(), eventId, limit: 1 }
      : { name:  query.trim(),               eventId, limit: 8 },
  });
  return res.data.data.items;
}
