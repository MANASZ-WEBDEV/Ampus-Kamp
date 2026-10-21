import { useInfiniteQuery } from '@tanstack/react-query';
import { listEvents } from '../api/events.api';
import type { EventsQuery } from '../types';

export const EVENTS_QUERY_KEY = 'events';

/**
 * useEvents — infinite-scrolling feed hook.
 *
 * Fetches the first page on mount and appends more pages via fetchNextPage().
 * Students automatically see only published events (server-enforced).
 * Faculty can pass { status: ['draft','published','closed'] } to see all.
 */
export function useEvents(query: Omit<EventsQuery, 'cursor'> = {}) {
  return useInfiniteQuery({
    queryKey: [EVENTS_QUERY_KEY, 'feed', query],
    queryFn: ({ pageParam }) =>
      listEvents({ ...query, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 60_000, // 1 minute — matches server cache TTL
  });
}
