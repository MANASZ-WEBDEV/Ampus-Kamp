import { useInfiniteQuery } from '@tanstack/react-query';
import { getMyEvents } from '../api/events.api';
import { EVENTS_QUERY_KEY } from './useEvents';

export function useMyEvents() {
  return useInfiniteQuery({
    queryKey: [EVENTS_QUERY_KEY, 'my'],
    queryFn:  ({ pageParam }) => getMyEvents(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: page => page.nextCursor ?? undefined,
    staleTime: 30_000,
  });
}
