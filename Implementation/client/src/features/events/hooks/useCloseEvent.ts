import { useMutation, useQueryClient } from '@tanstack/react-query';
import { closeEvent as closeEventApi } from '../api/events.api';
import { EVENTS_QUERY_KEY } from './useEvents';

export function useCloseEvent(eventId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => closeEventApi(eventId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY, 'detail', eventId] });
      void qc.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY, 'feed'] });
      void qc.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY, 'my'] });
    },
  });
}
