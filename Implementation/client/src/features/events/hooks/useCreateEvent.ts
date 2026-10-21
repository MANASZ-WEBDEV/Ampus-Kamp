import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createEvent, updateEvent, publishEvent, closeEvent, deleteEvent } from '../api/events.api';
import { EVENTS_QUERY_KEY } from './useEvents';
import type { CreateEventInput, UpdateEventInput } from '../types';

/**
 * useCreateEvent — creates a new draft event.
 * Invalidates the feed and "my events" cache on success.
 */
export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateEventInput) => createEvent(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY] });
    },
  });
}

/**
 * useUpdateEvent — updates an existing event.
 */
export function useUpdateEvent(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateEventInput) => updateEvent(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY] });
    },
  });
}

/**
 * usePublishEvent — transitions a draft to published.
 */
export function usePublishEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => publishEvent(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY] });
    },
  });
}

/**
 * useCloseEvent — closes a published event manually.
 */
export function useCloseEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => closeEvent(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY] });
    },
  });
}

/**
 * useDeleteEvent — soft-deletes an event.
 */
export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY] });
    },
  });
}
