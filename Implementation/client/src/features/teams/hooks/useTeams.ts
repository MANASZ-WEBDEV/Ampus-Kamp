import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listTeamPosts, getMyTeamPosts,
  createTeamPost, updateTeamPost,
  getLinks, sendLink, respondLink,
} from '../api/teams.api';
import type { CreateTeamPostInput, UpdateTeamPostInput, SendLinkInput, RespondLinkAction } from '../types';

// ── Query keys ────────────────────────────────────────────────────────────────

export const teamKeys = {
  forEvent:  (eventId: string) => ['teams', 'event', eventId]   as const,
  myPosts:   ()                => ['teams', 'my']                as const,
  links:     (box: 'in'|'out')=> ['links', box]                 as const,
};

// ── Team Posts ────────────────────────────────────────────────────────────────

/** Fetch all open/full team posts for a specific event */
export function useTeamPosts(eventId: string) {
  return useQuery({
    queryKey: teamKeys.forEvent(eventId),
    queryFn:  () => listTeamPosts(eventId),
    enabled:  !!eventId,
    staleTime: 30_000,
  });
}

/** Fetch the current student's own team posts */
export function useMyTeamPosts() {
  return useQuery({
    queryKey: teamKeys.myPosts(),
    queryFn:  getMyTeamPosts,
    staleTime: 30_000,
  });
}

/** Create a new team post */
export function useCreateTeamPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTeamPostInput) => createTeamPost(input),
    onSuccess: (post) => {
      // Invalidate the event's team feed and my posts
      queryClient.invalidateQueries({ queryKey: teamKeys.forEvent(post.eventId) });
      queryClient.invalidateQueries({ queryKey: teamKeys.myPosts() });
    },
  });
}

/** Update (edit or close) a team post */
export function useUpdateTeamPost(postId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTeamPostInput) => updateTeamPost(postId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.forEvent(eventId) });
      queryClient.invalidateQueries({ queryKey: teamKeys.myPosts() });
    },
  });
}

// ── Links ─────────────────────────────────────────────────────────────────────

/** Fetch inbox (in) or sent (out) links */
export function useLinks(box: 'in' | 'out') {
  return useQuery({
    queryKey: teamKeys.links(box),
    queryFn:  () => getLinks(box),
    staleTime: 15_000,
  });
}

/** Send a join request / invite / connect */
export function useSendLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendLinkInput) => sendLink(input),
    onSuccess: () => {
      // Refresh both inbox and sent
      queryClient.invalidateQueries({ queryKey: ['links'] });
    },
  });
}

/** Accept / decline / withdraw a link */
export function useRespondLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: RespondLinkAction }) =>
      respondLink(id, action),
    onSuccess: (updatedLink) => {
      // Invalidate links and the affected event's team posts (spots may have changed)
      queryClient.invalidateQueries({ queryKey: ['links'] });
      if (updatedLink.eventId) {
        queryClient.invalidateQueries({ queryKey: teamKeys.forEvent(updatedLink.eventId) });
      }
    },
  });
}
