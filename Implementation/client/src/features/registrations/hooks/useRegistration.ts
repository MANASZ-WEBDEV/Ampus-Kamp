import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createRegistration,
  updateRegistration,
  respondMember,
  getMyRegistration,
  createTracking,
  getRoster,
  downloadRosterCsv,
} from '../api/registrations.api';
import type {
  CreateRegistrationInput,
  UpdateRegistrationInput,
  MemberRespondInput,
  CreateTrackingInput,
} from '../types';

// ── Query keys ────────────────────────────────────────────────────────────────

export const registrationKeys = {
  mine:   (eventId: string) => ['registrations', 'mine', eventId]    as const,
  roster: (eventId: string) => ['registrations', 'roster', eventId]  as const,
};

// ── Student: my registration ──────────────────────────────────────────────────

/**
 * useMyRegistration — fetches the current student's active registration for an event.
 * Returns null when the student hasn't registered yet.
 * staleTime: 30s — registration status changes are infrequent but important.
 */
export function useMyRegistration(eventId: string) {
  return useQuery({
    queryKey: registrationKeys.mine(eventId),
    queryFn:  () => getMyRegistration(eventId),
    enabled:  !!eventId,
    staleTime: 30_000,
  });
}

// ── Student: create registration ──────────────────────────────────────────────

export function useCreateRegistration(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRegistrationInput) => createRegistration(eventId, input),
    onSuccess: () => {
      // Invalidate own registration cache for this event
      queryClient.invalidateQueries({ queryKey: registrationKeys.mine(eventId) });
    },
  });
}

// ── Student: submit / withdraw / edit ────────────────────────────────────────

export function useUpdateRegistration(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ regId, input }: { regId: string; input: UpdateRegistrationInput }) =>
      updateRegistration(regId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: registrationKeys.mine(eventId) });
    },
  });
}

// ── Student: confirm / decline membership ────────────────────────────────────

/**
 * useRespondMember — for an invited member responding to a team invite.
 * Invalidates mine cache for the given eventId.
 * Note: regId and eventId are passed at mutation call time.
 */
export function useRespondMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      regId, uid, input,
    }: {
      regId: string;
      uid: string;
      input: MemberRespondInput;
      eventId: string;
    }) => respondMember(regId, uid, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: registrationKeys.mine(variables.eventId),
      });
    },
  });
}

// ── Student: external tracking ────────────────────────────────────────────────

export function useCreateTracking(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTrackingInput) => createTracking(eventId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: registrationKeys.mine(eventId) });
    },
  });
}

// ── Faculty: roster ───────────────────────────────────────────────────────────

export function useRoster(eventId: string, status = 'all') {
  return useQuery({
    queryKey: [...registrationKeys.roster(eventId), status],
    queryFn:  () => getRoster(eventId, { status }),
    enabled:  !!eventId,
    staleTime: 60_000,
  });
}

// ── Faculty: CSV download ─────────────────────────────────────────────────────

/**
 * useDownloadRosterCsv — triggers a file download.
 * Uses a mutation (not useQuery) since it's an imperative user action.
 * Creates a temporary <a> element with the blob URL, clicks it, then revokes.
 */
export function useDownloadRosterCsv(eventId: string) {
  return useMutation({
    mutationFn: async () => {
      const url = await downloadRosterCsv(eventId);
      const a   = document.createElement('a');
      a.href    = url;
      a.download = `roster-${eventId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Revoke blob URL after a short delay to ensure download started
      setTimeout(() => URL.revokeObjectURL(url), 5_000);
    },
  });
}
