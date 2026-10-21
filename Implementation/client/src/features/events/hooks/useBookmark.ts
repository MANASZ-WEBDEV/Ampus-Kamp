import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toggleBookmark } from '../api/events.api';
import { EVENTS_QUERY_KEY } from './useEvents';
import type { EventCard } from '../types';

/**
 * useBookmark — per-event optimistic bookmark toggle.
 *
 * Pass the eventId and current isBookmarked state; get back `toggle()` + `isPending`.
 */
export function useBookmark(eventId: string, initialBookmarked: boolean) {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => toggleBookmark(eventId),

    // Optimistic: flip the flag in feed and detail caches
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: [EVENTS_QUERY_KEY, 'feed'] });
      await qc.cancelQueries({ queryKey: [EVENTS_QUERY_KEY, 'detail', eventId] });

      // Snapshot for rollback
      const previousFeed    = qc.getQueriesData({ queryKey: [EVENTS_QUERY_KEY, 'feed'] });
      const previousDetail  = qc.getQueryData([EVENTS_QUERY_KEY, 'detail', eventId]);

      // Flip flag in infinite feed pages
      qc.setQueriesData(
        { queryKey: [EVENTS_QUERY_KEY, 'feed'] },
        (old: { pages?: { items: EventCard[] }[] } | undefined) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map(page => ({
              ...page,
              items: page.items.map(ev =>
                ev.id === eventId ? { ...ev, isBookmarked: !ev.isBookmarked } : ev,
              ),
            })),
          };
        },
      );

      // Flip flag in event detail cache
      qc.setQueryData(
        [EVENTS_QUERY_KEY, 'detail', eventId],
        (old: EventCard | undefined) =>
          old ? { ...old, isBookmarked: !old.isBookmarked } : old,
      );

      return { previousFeed, previousDetail };
    },

    onError: (_err, _vars, context) => {
      // Roll back
      if (context?.previousFeed) {
        context.previousFeed.forEach(([key, data]) => qc.setQueryData(key, data));
      }
      if (context?.previousDetail) {
        qc.setQueryData([EVENTS_QUERY_KEY, 'detail', eventId], context.previousDetail);
      }
    },

    onSettled: () => {
      void qc.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY, 'detail', eventId] });
      void qc.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY, 'feed'] });
    },
  });

  return {
    isBookmarked: initialBookmarked, // the optimistic flip comes from cache, but keep stable for render
    toggle:    () => mutation.mutate(),
    isPending: mutation.isPending,
  };
}
