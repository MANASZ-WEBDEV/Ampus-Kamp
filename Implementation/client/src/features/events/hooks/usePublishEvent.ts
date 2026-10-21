import { useMutation, useQueryClient } from '@tanstack/react-query';
import { publishEvent as publishEventApi } from '../api/events.api';
import { EVENTS_QUERY_KEY } from './useEvents';

export function usePublishEvent(eventId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => publishEventApi(eventId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY, 'detail', eventId] });
      void qc.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY, 'feed'] });
      void qc.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY, 'my'] });
    },
  });
}
