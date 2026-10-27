import { apiClient } from '@/lib/apiClient';
import type {
  AnalyticsMetric,
  DeptRankRow,
  DeptBreakdown,
  InstituteSummary,
} from '../types';

const BASE = '/analytics';

// ── Ranking ───────────────────────────────────────────────────────────────────

export async function getRanking(
  year: number,
  metric: AnalyticsMetric = 'participationRate',
): Promise<DeptRankRow[]> {
  const res = await apiClient.get<{ data: DeptRankRow[] }>(`${BASE}/department-ranking`, {
    params: { year, metric },
  });
  return res.data.data;
}

// ── Breakdown ─────────────────────────────────────────────────────────────────

export async function getBreakdown(
  deptId: string,
  year: number,
): Promise<DeptBreakdown> {
  const res = await apiClient.get<{ data: DeptBreakdown }>(`${BASE}/breakdown/${deptId}`, {
    params: { year },
  });
  return res.data.data;
}

// ── Institute summary ─────────────────────────────────────────────────────────

export async function getSummary(year: number): Promise<InstituteSummary> {
  const res = await apiClient.get<{ data: InstituteSummary }>(`${BASE}/summary`, {
    params: { year },
  });
  return res.data.data;
}

// ── CSV export ────────────────────────────────────────────────────────────────

/**
 * exportCsv — triggers a browser file download.
 * Uses responseType:'blob' → creates an object URL → clicks a hidden anchor.
 * Blob URL is revoked after 3 s (enough time for the browser to start download).
 * No navigation, no new tab.
 */
export async function exportCsv(year: number): Promise<void> {
  const res = await apiClient.get<Blob>(`${BASE}/export`, {
    params:       { year },
    responseType: 'blob',
  });

  const url    = URL.createObjectURL(res.data);
  const anchor = document.createElement('a');
  anchor.href     = url;
  anchor.download = `ranking-${year}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 3_000);
}
