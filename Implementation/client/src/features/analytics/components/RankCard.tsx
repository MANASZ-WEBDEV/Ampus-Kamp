import { useNavigate } from 'react-router-dom';
import type { DeptRankRow, AnalyticsMetric } from '../types';

// ── Rank badge config ─────────────────────────────────────────────────────────

const MEDAL: Record<number, { icon: string; color: string }> = {
  1: { icon: 'emoji_events', color: 'text-[#b8860b]' },   // gold
  2: { icon: 'emoji_events', color: 'text-[#9e9e9e]' },   // silver
  3: { icon: 'emoji_events', color: 'text-[#cd7f32]' },   // bronze
};

// ── Metric display config ─────────────────────────────────────────────────────

const METRIC_LABEL: Record<AnalyticsMetric, string> = {
  participationRate: 'Part. Rate',
  perHundred:        'Per 100',
  weightedPoints:    'Wt. Pts',
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface RankCardProps {
  row:           DeptRankRow;
  activeMetric:  AnalyticsMetric;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RankCard({ row, activeMetric }: RankCardProps) {
  const navigate = useNavigate();
  const medal    = MEDAL[row.rank];

  const metrics: { key: AnalyticsMetric; label: string; value: number }[] = [
    { key: 'participationRate', label: 'Part. Rate',  value: row.participationRate },
    { key: 'perHundred',        label: 'Per 100',     value: row.perHundred },
    { key: 'weightedPoints',    label: 'Wt. Pts',     value: row.weightedPointsPerHundred },
  ];

  return (
    <div
      id={`rank-card-${row.department.id}`}
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/analytics/${row.department.id}`)}
      onKeyDown={e => e.key === 'Enter' && navigate(`/analytics/${row.department.id}`)}
      className="
        group relative bg-surface-container rounded-2xl p-4
        border border-outline-variant
        hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-px
        transition-all duration-200 cursor-pointer
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary
      "
    >
      {/* Top row: rank badge + dept name + code chip */}
      <div className="flex items-center gap-3 mb-3">
        {/* Rank badge */}
        <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center">
          {medal ? (
            <span className={`material-symbols-outlined text-2xl ${medal.color}`}>
              {medal.icon}
            </span>
          ) : (
            <span className="
              w-8 h-8 rounded-full bg-surface-variant
              flex items-center justify-center
              font-label-md text-label-md text-on-surface-variant
            ">
              {row.rank}
            </span>
          )}
        </div>

        {/* Dept info */}
        <div className="flex-1 min-w-0">
          <p className="font-title-sm text-title-sm text-on-surface truncate">
            {row.department.name}
          </p>
          <span className="
            inline-block px-2 py-0.5 rounded-full
            bg-secondary-container text-on-secondary-container
            font-label-sm text-label-sm mt-0.5
          ">
            {row.department.code}
          </span>
        </div>

        {/* Chevron */}
        <span className="
          material-symbols-outlined text-xl text-on-surface-variant
          group-hover:text-primary transition-colors
        ">
          chevron_right
        </span>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {metrics.map(m => {
          const isActive = m.key === activeMetric;
          return (
            <div
              key={m.key}
              className={`
                rounded-xl p-2 text-center transition-colors
                ${isActive
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-surface-variant text-on-surface-variant'}
              `}
            >
              <p className={`font-label-sm text-label-sm mb-0.5 ${isActive ? 'font-semibold' : ''}`}>
                {METRIC_LABEL[m.key]}
              </p>
              <p className={`font-title-sm text-title-sm tabular-nums ${isActive ? 'font-bold' : ''}`}>
                {m.value.toFixed(1)}
                <span className="font-label-sm text-label-sm ml-0.5">%</span>
              </p>
            </div>
          );
        })}
      </div>

      {/* Participation rate progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant">
          <span>{row.uniqueStudents} students with certs</span>
          <span>of {row.studentStrength}</span>
        </div>
        <div className="h-1.5 rounded-full bg-surface-variant overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${Math.min(row.participationRate, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
