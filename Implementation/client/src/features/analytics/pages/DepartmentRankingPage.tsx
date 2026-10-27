import { useState } from 'react';
import { useRanking, useSummary, useExportCsv } from '../hooks/useAnalytics';
import { RankCard } from '../components/RankCard';
import { useAuth } from '@/features/auth/context/AuthContext';
import type { AnalyticsMetric } from '../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const YEARS        = Array.from({ length: CURRENT_YEAR - 2023 }, (_, i) => CURRENT_YEAR - i);

const METRICS: { key: AnalyticsMetric; label: string; icon: string }[] = [
  { key: 'participationRate', label: 'Participation Rate', icon: 'groups' },
  { key: 'perHundred',        label: 'Certs per 100',      icon: 'workspace_premium' },
  { key: 'weightedPoints',    label: 'Weighted Points',    icon: 'stars' },
];

// ── Summary stat card ─────────────────────────────────────────────────────────

function SummaryCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="bg-secondary-container rounded-2xl p-4 flex items-center gap-3">
      <span className="material-symbols-outlined text-2xl text-on-secondary-container">{icon}</span>
      <div>
        <p className="font-display-sm text-display-sm text-on-secondary-container tabular-nums">
          {value}
        </p>
        <p className="font-label-sm text-label-sm text-on-secondary-container/70">{label}</p>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function RankSkeleton() {
  return (
    <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-surface-variant" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-surface-variant rounded w-3/4" />
          <div className="h-3 bg-surface-variant rounded w-1/4" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-12 bg-surface-variant rounded-xl" />
        ))}
      </div>
      <div className="h-1.5 bg-surface-variant rounded-full" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DepartmentRankingPage() {
  const { user }   = useAuth();

  const [year,   setYear]   = useState(CURRENT_YEAR);
  const [metric, setMetric] = useState<AnalyticsMetric>('participationRate');

  const isAdmin    = user?.role === 'admin';
  const isDeptHead = user?.role === 'dept_head';

  const { data: rows, isLoading, isError } = useRanking(year, metric);
  const { data: summary }                   = useSummary(year);
  const exportMutation                      = useExportCsv();

  // dept_head sees full ranking (competitive transparency) but breakdown is restricted
  const displayRows = rows ?? [];

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-on-primary px-4 pt-14 pb-6">
        <div className="max-w-2xl mx-auto">
          <p className="font-label-sm text-label-sm text-on-primary/70 uppercase tracking-widest mb-1">
            Analytics
          </p>
          <h1 className="font-display-sm text-display-sm mb-1">Department Ranking</h1>
          <p className="font-body-md text-body-md text-on-primary/80">
            {year} · Verified credentials only
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-4 mt-4">
        {/* ── Admin summary stats ──────────────────────────────────────────── */}
        {isAdmin && summary && (
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard label="Departments"      value={summary.totalDepts}             icon="corporate_fare" />
            <SummaryCard label="Verified Certs"   value={summary.totalVerified}          icon="verified" />
            <SummaryCard label="Students w/ Certs" value={summary.totalStudentsWithCreds} icon="school" />
            <SummaryCard
              label="Avg Participation"
              value={`${summary.avgParticipationRate.toFixed(1)}%`}
              icon="trending_up"
            />
          </div>
        )}

        {/* ── Controls ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Year picker */}
          <select
            id="year-picker"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="
              px-3 py-2 rounded-xl border border-outline-variant
              bg-surface-container text-on-surface
              font-body-md text-body-md
              focus:outline-none focus:ring-2 focus:ring-primary
            "
          >
            {YEARS.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Metric switcher */}
          <div className="flex rounded-xl border border-outline-variant overflow-hidden">
            {METRICS.map(m => (
              <button
                key={m.key}
                id={`metric-${m.key}`}
                onClick={() => setMetric(m.key)}
                className={`
                  flex items-center gap-1.5 px-3 py-2
                  font-label-md text-label-md transition-colors
                  ${metric === m.key
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-variant'}
                `}
              >
                <span className="material-symbols-outlined text-base">{m.icon}</span>
                <span className="hidden sm:inline">{m.label}</span>
              </button>
            ))}
          </div>

          {/* Export CSV — admin only */}
          {isAdmin && (
            <button
              id="export-csv-btn"
              onClick={() => exportMutation.mutate(year)}
              disabled={exportMutation.isPending || displayRows.length === 0}
              className="
                ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl
                bg-tertiary text-on-tertiary font-label-md text-label-md
                disabled:opacity-50 transition-opacity
              "
            >
              <span className="material-symbols-outlined text-base">download</span>
              {exportMutation.isPending ? 'Exporting…' : 'Export CSV'}
            </button>
          )}
        </div>

        {/* ── dept_head context note ────────────────────────────────────────── */}
        {isDeptHead && (
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            You can see all department rankings. Click your department to view the full breakdown.
          </p>
        )}

        {/* ── List ─────────────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map(i => <RankSkeleton key={i} />)}
          </div>
        ) : isError ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-5xl text-error mb-3 block">
              error_outline
            </span>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Failed to load ranking. Please try again.
            </p>
          </div>
        ) : displayRows.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant mb-3 block">
              leaderboard
            </span>
            <p className="font-title-md text-title-md text-on-surface mb-1">
              No data for {year}
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant">
              No verified credentials found for this year.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayRows.map(row => (
              <RankCard
                key={row.department.id}
                row={row}
                activeMetric={metric}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
