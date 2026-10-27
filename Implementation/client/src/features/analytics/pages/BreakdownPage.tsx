import { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import { useBreakdown } from '../hooks/useAnalytics';
import { useAuth } from '@/features/auth/context/AuthContext';

// ── Constants ─────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const YEARS        = Array.from({ length: CURRENT_YEAR - 2023 }, (_, i) => CURRENT_YEAR - i);

// Colour palette for category bars — visually distinct, accessible
const CATEGORY_COLORS: Record<string, string> = {
  nptel:       '#6750A4',
  coursera:    '#0EA5E9',
  udemy:       '#F59E0B',
  competition: '#EF4444',
  other:       '#94A3B8',
};

const TIER_COLORS: Record<string, string> = {
  pass:         '#94A3B8',
  elite:        '#6750A4',
  elite_silver: '#9E9E9E',
  elite_gold:   '#B8860B',
};

function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat.toLowerCase()] ?? '#94A3B8';
}

function tierColor(tier: string): string {
  return TIER_COLORS[tier] ?? '#94A3B8';
}

// ── Recharts custom tooltip ───────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl px-3 py-2 shadow-lg">
      <p className="font-label-md text-label-md text-on-surface capitalize">{label}</p>
      <p className="font-title-sm text-title-sm text-primary">{payload[0]?.value} certs</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BreakdownPage() {
  const { deptId } = useParams<{ deptId: string }>();
  const navigate   = useNavigate();
  const { user }   = useAuth();

  const [year, setYear] = useState(CURRENT_YEAR);

  // dept_head can only view their own dept — redirect otherwise
  if (
    user?.role === 'dept_head' &&
    user.department &&
    user.department !== deptId
  ) {
    return <Navigate to="/analytics" replace />;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { data, isLoading, isError } = useBreakdown(deptId, year);

  const byCategory = data?.byCategory ?? [];
  const byTier     = data?.byTier     ?? [];
  const topCourses = data?.topCourses  ?? [];

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-secondary to-secondary/80 text-on-secondary px-4 pt-14 pb-6">
        <div className="max-w-2xl mx-auto">
          <button
            id="breakdown-back-btn"
            onClick={() => navigate('/analytics')}
            className="flex items-center gap-1 font-label-md text-label-md text-on-secondary/70 mb-3 hover:text-on-secondary transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to Ranking
          </button>
          <h1 className="font-display-sm text-display-sm mb-1">Dept Breakdown</h1>
          <p className="font-body-md text-body-md text-on-secondary/80">
            Verified credentials by category, tier & course
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-6 mt-4">
        {/* Year picker */}
        <select
          id="breakdown-year-picker"
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="
            px-3 py-2 rounded-xl border border-outline-variant
            bg-surface-container text-on-surface
            font-body-md text-body-md
            focus:outline-none focus:ring-2 focus:ring-secondary
          "
        >
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        {isLoading && (
          <div className="space-y-6">
            {[240, 200, 180].map((h, i) => (
              <div key={i} className="bg-surface-container rounded-2xl p-4 animate-pulse">
                <div className="h-4 bg-surface-variant rounded w-1/3 mb-4" />
                <div className={`bg-surface-variant rounded`} style={{ height: h }} />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-5xl text-error mb-3 block">error_outline</span>
            <p className="font-body-lg text-body-lg text-on-surface-variant">Failed to load breakdown.</p>
          </div>
        )}

        {!isLoading && !isError && (
          <>
            {/* ── Category bar chart ──────────────────────────────────────── */}
            <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant">
              <h2 className="font-title-md text-title-md text-on-surface mb-4">By Category</h2>
              {byCategory.length === 0 ? (
                <p className="font-body-md text-body-md text-on-surface-variant text-center py-8">
                  No data
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={byCategory}
                    layout="vertical"
                    margin={{ top: 0, right: 20, left: 60, bottom: 0 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="category"
                      width={55}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v: string) => v.charAt(0).toUpperCase() + v.slice(1)}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {byCategory.map(entry => (
                        <Cell
                          key={entry.category}
                          fill={categoryColor(entry.category)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* ── Tier distribution (pie) ─────────────────────────────────── */}
            <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant">
              <h2 className="font-title-md text-title-md text-on-surface mb-4">By Tier</h2>
              {byTier.length === 0 ? (
                <p className="font-body-md text-body-md text-on-surface-variant text-center py-8">
                  No data
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={byTier}
                      dataKey="count"
                      nameKey="tier"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }: { name?: unknown; percent?: number }) =>
                        `${String(name ?? '')} (${((percent ?? 0) * 100).toFixed(0)}%)`
                      }
                    >
                      {byTier.map(entry => (
                        <Cell key={entry.tier} fill={tierColor(entry.tier)} />
                      ))}
                    </Pie>
                    <Legend
                      formatter={(value: string) => (
                        <span className="capitalize text-sm">{value.replace(/_/g, ' ')}</span>
                      )}
                    />
                    <Tooltip formatter={(v) => [`${String(v ?? 0)} certs`, '']} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* ── Top 5 courses ───────────────────────────────────────────── */}
            <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant">
              <h2 className="font-title-md text-title-md text-on-surface mb-3">Top Courses</h2>
              {topCourses.length === 0 ? (
                <p className="font-body-md text-body-md text-on-surface-variant text-center py-6">
                  No catalog courses found
                </p>
              ) : (
                <div className="space-y-2">
                  {topCourses.map((c, i) => (
                    <div
                      key={`${c.name}-${i}`}
                      className="flex items-center justify-between gap-3 py-2 border-b border-outline-variant last:border-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="
                          w-6 h-6 rounded-full bg-primary-container text-on-primary-container
                          flex items-center justify-center flex-shrink-0
                          font-label-sm text-label-sm
                        ">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-body-md text-body-md text-on-surface truncate">
                            {c.name}
                          </p>
                          <p className="font-label-sm text-label-sm text-on-surface-variant">
                            {c.issuer}
                          </p>
                        </div>
                      </div>
                      <span className="
                        flex-shrink-0 px-2 py-0.5 rounded-full
                        bg-tertiary-container text-on-tertiary-container
                        font-label-sm text-label-sm tabular-nums
                      ">
                        {c.count} certs
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
