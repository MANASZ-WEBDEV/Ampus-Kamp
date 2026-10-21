import { useMutation, useQueryClient } from '@tanstack/react-query';
import { registerForEvent } from '../api/events.api';
import { EVENTS_QUERY_KEY } from './useEvents';

export function useRegister(eventId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: Record<string, unknown>) => registerForEvent(eventId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY, 'detail', eventId] });
    },
  });
}
