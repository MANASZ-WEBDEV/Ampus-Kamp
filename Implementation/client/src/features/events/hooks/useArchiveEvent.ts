import { useMutation, useQueryClient } from '@tanstack/react-query';
import { archiveEvent as archiveEventApi } from '../api/events.api';
import { EVENTS_QUERY_KEY } from './useEvents';

export function useArchiveEvent(eventId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => archiveEventApi(eventId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY, 'detail', eventId] });
      void qc.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY, 'feed'] });
      void qc.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY, 'my'] });
    },
  });
}
