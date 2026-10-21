import { useQuery } from '@tanstack/react-query';
import { getEvent } from '../api/events.api';
import { EVENTS_QUERY_KEY } from './useEvents';

/**
 * useEvent — fetches a single event by ID.
 * For faculty who own the event, rawMessage will be populated.
 */
export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: [EVENTS_QUERY_KEY, 'detail', id],
    queryFn: () => getEvent(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}
