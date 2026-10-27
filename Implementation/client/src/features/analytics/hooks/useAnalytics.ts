import { useQuery, useMutation } from '@tanstack/react-query';
import { getRanking, getBreakdown, getSummary, exportCsv } from '../api/analytics.api';
import type { AnalyticsMetric } from '../types';

// ── Cache key factory ─────────────────────────────────────────────────────────

export const analyticsKeys = {
  ranking:   (year: number, metric: AnalyticsMetric) =>
    ['analytics', 'ranking', year, metric] as const,
  breakdown: (deptId: string, year: number) =>
    ['analytics', 'breakdown', deptId, year] as const,
  summary:   (year: number) =>
    ['analytics', 'summary', year] as const,
};

const STALE_MS = 5 * 60 * 1_000; // 5 min — mirrors server node-cache TTL

// ── useRanking ────────────────────────────────────────────────────────────────

export function useRanking(year: number, metric: AnalyticsMetric = 'participationRate') {
  return useQuery({
    queryKey: analyticsKeys.ranking(year, metric),
    queryFn:  () => getRanking(year, metric),
    staleTime: STALE_MS,
  });
}

// ── useBreakdown ──────────────────────────────────────────────────────────────

export function useBreakdown(deptId: string | undefined, year: number) {
  return useQuery({
    queryKey: analyticsKeys.breakdown(deptId ?? '', year),
    queryFn:  () => getBreakdown(deptId!, year),
    enabled:  !!deptId,
    staleTime: STALE_MS,
  });
}

// ── useSummary ────────────────────────────────────────────────────────────────

export function useSummary(year: number) {
  return useQuery({
    queryKey: analyticsKeys.summary(year),
    queryFn:  () => getSummary(year),
    staleTime: STALE_MS,
  });
}

// ── useExportCsv ──────────────────────────────────────────────────────────────

/** Imperative download — useMutation, not useQuery (user-triggered action). */
export function useExportCsv() {
  return useMutation({
    mutationFn: (year: number) => exportCsv(year),
  });
}
