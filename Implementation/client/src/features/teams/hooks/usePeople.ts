import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  searchPeople, toggleLooking, listLooking,
  getMyBlocks, createBlock, removeBlock, createReport,
} from '../api/people.api';
import type { PeopleQuery, CreateBlockInput, CreateReportInput } from '../types.f5';

// ── Query keys ────────────────────────────────────────────────────────────────

export const peopleKeys = {
  search:  (q: PeopleQuery) => ['people', 'search', q]   as const,
  looking: (eventId: string) => ['people', 'looking', eventId] as const,
  blocks:  ()               => ['people', 'blocks']       as const,
};

// ── People Search ─────────────────────────────────────────────────────────────

/**
 * usePeopleSearch — searches for students with optional isLooking annotation.
 *
 * ALWAYS pass eventId when navigating from EventDetailPage so the
 * isLooking field is populated via the server-side batch annotation.
 * Without eventId, isLooking will be absent from results.
 */
export function usePeopleSearch(query: PeopleQuery, enabled = true) {
  return useQuery({
    queryKey: peopleKeys.search(query),
    queryFn:  () => searchPeople(query),
    enabled:  enabled,
    staleTime: 30_000,
    // Keep previous data while new query loads — prevents flash of empty state
    placeholderData: (prev) => prev,
  });
}

// ── Looking Flag ──────────────────────────────────────────────────────────────

/** useLooking — fetch list of students who are looking for this event */
export function useLooking(eventId: string) {
  return useQuery({
    queryKey: peopleKeys.looking(eventId),
    queryFn:  () => listLooking(eventId),
    enabled:  !!eventId,
    staleTime: 20_000,
  });
}

/** useToggleLooking — toggle the current student's looking flag */
export function useToggleLooking(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (note?: string) => toggleLooking(eventId, note),
    onSuccess: () => {
      // Invalidate the looking list and people search for this event
      queryClient.invalidateQueries({ queryKey: peopleKeys.looking(eventId) });
      // Invalidate people search caches for this event (isLooking may have changed)
      queryClient.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === 'people' &&
          q.queryKey[1] === 'search' &&
          (q.queryKey[2] as PeopleQuery)?.eventId === eventId,
      });
    },
  });
}

// ── Safety — Blocks ───────────────────────────────────────────────────────────

export function useMyBlocks() {
  return useQuery({
    queryKey: peopleKeys.blocks(),
    queryFn:  getMyBlocks,
    staleTime: 60_000,
  });
}

export function useCreateBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBlockInput) => createBlock(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: peopleKeys.blocks() });
      // Block cascade also affects links — invalidate inbox/sent
      queryClient.invalidateQueries({ queryKey: ['links'] });
    },
  });
}

export function useRemoveBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (blockedUserId: string) => removeBlock(blockedUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: peopleKeys.blocks() });
    },
  });
}

// ── Safety — Report ───────────────────────────────────────────────────────────

export function useCreateReport() {
  return useMutation({
    mutationFn: (input: CreateReportInput) => createReport(input),
    // No cache invalidation needed — reports go to admin queue
  });
}
