import type { EventType } from '../types';
import { useAuth } from '@/features/auth/context/AuthContext';

// ── Config ────────────────────────────────────────────────────────────────────

const EVENT_TYPES: { value: EventType; label: string; icon: string }[] = [
  { value: 'hackathon',   label: 'Hackathon',   icon: 'bolt' },
  { value: 'competition', label: 'Competition', icon: 'trophy' },
  { value: 'sports',      label: 'Sports',      icon: 'sports_soccer' },
  { value: 'workshop',    label: 'Workshop',    icon: 'build' },
  { value: 'seminar',     label: 'Seminar',     icon: 'school' },
  { value: 'other',       label: 'Other',       icon: 'more_horiz' },
];

const BRANCH_OPTIONS = ['CSE', 'CSIT', 'IT', 'ECE', 'ME', 'CE', 'EE'];
const YEAR_OPTIONS   = [1, 2, 3, 4];

// ── Props ─────────────────────────────────────────────────────────────────────

interface FilterBarProps {
  selectedTypes:    EventType[];
  selectedBranches: string[];
  selectedYears:    number[];
  onTypeToggle:     (type: EventType) => void;
  onBranchToggle:   (branch: string) => void;
  onYearToggle:     (year: number) => void;
  onClearAll:       () => void;
}

/**
 * EventFilterBar — horizontally-scrollable chip rows matching Stitch reference.
 * Row 1: Event type chips (all roles).
 * Row 2: Branch chips + Year circles (student only, collapsed by default on faculty).
 */
export function EventFilterBar({
  selectedTypes,
  selectedBranches,
  selectedYears,
  onTypeToggle,
  onBranchToggle,
  onYearToggle,
  onClearAll,
}: FilterBarProps) {
  const { user } = useAuth();
  const isStudent = user?.role === 'student';

  const hasActiveFilters =
    selectedTypes.length > 0 || selectedBranches.length > 0 || selectedYears.length > 0;

  return (
    <div>
      {/* ── Row 1: Event type chips ───────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto px-4 py-2.5 scrollbar-hide">

        {/* "All" shortcut chip */}
        {hasActiveFilters && (
          <button
            id="filter-all"
            onClick={onClearAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-label-lg text-xs font-bold bg-on-surface text-surface-bright whitespace-nowrap shrink-0 transition-all active:scale-95 shadow-sm"
          >
            <span className="material-symbols-outlined text-[13px]">close</span>
            All
          </button>
        )}

        {EVENT_TYPES.map(({ value, label, icon }) => {
          const active = selectedTypes.includes(value);
          return (
            <button
              key={value}
              id={`filter-type-${value}`}
              onClick={() => onTypeToggle(value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-label-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all duration-150 active:scale-95 ${
                active
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <span
                className="material-symbols-outlined text-[14px]"
                style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {icon}
              </span>
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Row 2: Branch + Year filters (student only) ───────────────── */}
      {isStudent && (
        <div className="flex items-center gap-2 overflow-x-auto px-4 pb-2.5 scrollbar-hide">
          {/* Branch label */}
          <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider shrink-0">
            Branch
          </span>

          {BRANCH_OPTIONS.map(b => {
            const active = selectedBranches.includes(b);
            return (
              <button
                key={b}
                id={`filter-branch-${b}`}
                onClick={() => onBranchToggle(b)}
                className={`inline-flex px-3 py-1 rounded-full font-label-sm text-[11px] font-bold whitespace-nowrap shrink-0 transition-all duration-150 active:scale-95 ${
                  active
                    ? 'bg-secondary-container text-on-secondary-container shadow-sm'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {b}
              </button>
            );
          })}

          {/* Year divider */}
          <span className="w-px h-4 bg-outline-variant/50 shrink-0 mx-0.5" />
          <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider shrink-0">Yr</span>

          {YEAR_OPTIONS.map(y => {
            const active = selectedYears.includes(y);
            return (
              <button
                key={y}
                id={`filter-year-${y}`}
                onClick={() => onYearToggle(y)}
                className={`w-8 h-8 rounded-full font-label-lg text-xs font-bold shrink-0 transition-all duration-150 active:scale-95 flex items-center justify-center ${
                  active
                    ? 'bg-primary-fixed text-on-primary-fixed-variant shadow-sm'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {y}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
