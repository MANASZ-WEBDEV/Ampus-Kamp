import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './apiClient';

/**
 * Shared TanStack Query client.
 *
 * Defaults:
 *   - staleTime: 30 s (data refetched after 30 s in background)
 *   - gcTime: 5 min (unused cache entries removed after 5 min)
 *   - retry: 2 times for non-auth errors
 *   - refetchOnWindowFocus: false (avoids spurious refetches on alt-tab)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Never retry 401/403 — user needs to re-authenticate or doesn't have access
        if (
          error instanceof ApiError &&
          (error.isUnauthorized() || error.isForbidden())
        ) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      // Don't retry mutations — side effects may have already occurred
      retry: false,
    },
  },
});
