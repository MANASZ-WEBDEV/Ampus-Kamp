// ── F-7: Credentials & Verification — TanStack Query Hooks ───────────────────

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  searchCourses,
  createCredential,
  getMyCredentials,
  getPendingCredentials,
  editCredential,
  verifyCredential,
  createParticipation,
  verifyParticipation,
} from '../api/credentials.api';
import type {
  CreateCredentialInput,
  EditCredentialInput,
  VerifyCredentialInput,
  CreateParticipationInput,
  VerifyParticipationInput,
} from '../types';

// ── Query keys ────────────────────────────────────────────────────────────────

export const credentialKeys = {
  courses:      (q?: string, category?: string) => ['courses', q, category]  as const,
  mine:         ()                               => ['credentials', 'me']     as const,
  pending:      ()                               => ['credentials', 'pending'] as const,
  participations: ()                             => ['participations', 'me']  as const,
};

// ── Courses ───────────────────────────────────────────────────────────────────

/**
 * Search course catalog with a text query and optional category filter.
 * Debounce the `q` param client-side before calling this hook.
 */
export function useCourseSearch(q?: string, category?: string) {
  return useQuery({
    queryKey: credentialKeys.courses(q, category),
    queryFn:  () => searchCourses(q, category),
    enabled:  true,   // always load; when q='' returns all/top results
    staleTime: 60_000, // catalog changes rarely
  });
}

// ── Credentials ───────────────────────────────────────────────────────────────

/** Student: own credentials list (newest-first) */
export function useMyCredentials() {
  return useQuery({
    queryKey: credentialKeys.mine(),
    queryFn:  getMyCredentials,
    staleTime: 15_000,
  });
}

/** Faculty: department pending queue (oldest-first) */
export function usePendingCredentials() {
  return useQuery({
    queryKey: credentialKeys.pending(),
    queryFn:  getPendingCredentials,
    staleTime: 10_000,
    refetchInterval: 30_000,  // auto-refresh every 30s
  });
}

/** Student: upload a new credential (multipart) */
export function useCreateCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCredentialInput) => createCredential(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.mine() });
    },
  });
}

/** Student: edit a pending credential */
export function useEditCredential(credentialId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EditCredentialInput) => editCredential(credentialId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.mine() });
    },
  });
}

/** Faculty: approve or reject a credential */
export function useVerifyCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: VerifyCredentialInput }) =>
      verifyCredential(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.pending() });
    },
  });
}

// ── Participations ────────────────────────────────────────────────────────────

/** Student: upload participation proof */
export function useCreateParticipation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateParticipationInput) => createParticipation(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.participations() });
    },
  });
}

/** Faculty: verify a participation record */
export function useVerifyParticipation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: VerifyParticipationInput }) =>
      verifyParticipation(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.pending() });
    },
  });
}
