import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateEvent } from '../api/events.api';
import { EVENTS_QUERY_KEY } from './useEvents';
import type { UpdateEventInput } from '../types';

export function useUpdateEvent(eventId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateEventInput) => updateEvent(eventId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY, 'detail', eventId] });
      void qc.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY, 'feed'] });
      void qc.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY, 'my'] });
    },
  });
}
