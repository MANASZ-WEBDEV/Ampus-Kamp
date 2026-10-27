import { useQuery }    from '@tanstack/react-query';
import { getHomeData } from '../api/home.api';

/**
 * useHome — fetches personalised home feed.
 * staleTime=30s mirrors the server 30s cache TTL.
 * refetchOnWindowFocus: true ensures the data refreshes when the user
 * returns to the tab (e.g. after replying to a team request).
 */
export function useHome() {
  return useQuery({
    queryKey:             ['home'],
    queryFn:              getHomeData,
    staleTime:            30_000,
    refetchOnWindowFocus: true,
  });
}
