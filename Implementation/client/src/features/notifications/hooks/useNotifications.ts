import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markNotificationRead }        from '../api/notifications.api';

// ── useNotifications — cursor-based infinite scroll ───────────────────────────

export function useNotifications() {
  return useInfiniteQuery({
    queryKey:        ['notifications'],
    queryFn:         ({ pageParam }) =>
      getNotifications(pageParam as string | undefined),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    staleTime:        30_000,
  });
}

// ── useMarkRead — marks a single notification as read ─────────────────────────

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      // Refresh notification list + home unread flag
      void qc.invalidateQueries({ queryKey: ['notifications'] });
      void qc.invalidateQueries({ queryKey: ['home'] });
    },
  });
}
