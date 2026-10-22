import { useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppBar }        from '@/components/layout/AppBar';
import { usePeopleSearch } from '../hooks/usePeople';
import { StudentCard }   from '../components/StudentCard';
import type { Person }   from '../types.f5';
import type { PeopleQuery } from '../types.f5';

// ── Branch filter options (matches Dept.code values) ─────────────────────────
const BRANCHES = ['CSE', 'ECE', 'MECH', 'CIVIL', 'EEE', 'IT', 'AIDS', 'AIML'];
const YEARS    = [1, 2, 3, 4];

// ── Report modal (inline) ─────────────────────────────────────────────────────
// Full BlockReportMenu is only on LinkCard (incoming links); from PeopleSearchPage
// we only need a lightweight report modal scoped to a Person (no linkId).
import { useCreateReport } from '../hooks/usePeople';

function QuickReportModal({ person, onClose }: { person: Person; onClose: () => void }) {
  const { mutate: report, isPending, isSuccess } = useCreateReport();
  const [reason, setReason] = useState('');

  if (isSuccess) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div className="w-full max-w-xs bg-surface rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
        <span className="material-symbols-outlined text-[36px] text-primary">check_circle</span>
        <p className="font-title-sm text-sm font-semibold text-on-surface">Report Submitted</p>
        <button onClick={onClose} className="w-full py-2 rounded-xl bg-primary text-on-primary font-label-lg text-sm">Done</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm bg-surface rounded-2xl p-5 flex flex-col gap-4">
        <h2 className="font-headline-sm text-base font-bold text-on-surface">Report {person.name}</h2>
        <textarea rows={4} maxLength={520} value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Describe the issue…"
          className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low text-on-surface
                     font-body-sm text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"/>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-outline-variant/40 font-label-lg text-sm text-on-surface-variant">Cancel</button>
          <button onClick={() => report({ targetUserId: person.id, reason: reason.trim() })}
            disabled={reason.trim().length < 10 || isPending}
            className="flex-1 py-2 rounded-xl bg-primary text-on-primary font-label-lg text-sm disabled:opacity-50">
            {isPending ? 'Sending…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PeopleSearchPage ──────────────────────────────────────────────────────────

/**
 * PeopleSearchPage — /teams/people?eventId=xxx
 *
 * Always accessed from EventDetailPage with ?eventId in the URL.
 * When eventId is present, isLooking is annotated on each result.
 */
export default function PeopleSearchPage() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const eventId        = searchParams.get('eventId') ?? undefined;

  // ── Filter state ──────────────────────────────────────────────────
  const [branch,       setBranch]       = useState('');
  const [year,         setYear]         = useState<number | undefined>();
  const [skillInput,   setSkillInput]   = useState('');
  const [activeSkills, setActiveSkills] = useState<string[]>([]);
  const [reportTarget, setReportTarget] = useState<Person | null>(null);

  const query: PeopleQuery = {
    branch:  branch  || undefined,
    year:    year    || undefined,
    skills:  activeSkills.length ? activeSkills.join(',') : undefined,
    eventId,
    limit:   20,
  };

  const { data, isLoading, isError, isFetching } = usePeopleSearch(query);

  const addSkill = useCallback(() => {
    const s = skillInput.trim();
    if (s && !activeSkills.includes(s) && activeSkills.length < 5) {
      setActiveSkills(prev => [...prev, s]);
      setSkillInput('');
    }
  }, [skillInput, activeSkills]);

  const clearFilters = () => {
    setBranch(''); setYear(undefined);
    setActiveSkills([]); setSkillInput('');
  };

  const hasFilters = !!(branch || year || activeSkills.length);

  return (
    <div className="min-h-screen bg-background pb-24 pt-14">
      <AppBar title="Find People" subtitle="Team Finder" />

      <div className="max-w-2xl mx-auto px-4">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="pt-5 pb-4 flex items-center justify-between">
          <div>
            <h1 className="font-headline-lg text-xl text-on-surface font-bold">People Search</h1>
            <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
              {eventId ? 'Find teammates for this event' : 'Search all students'}
            </p>
          </div>
          {eventId && (
            <button onClick={() => navigate(-1)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-container
                         font-label-lg text-xs text-on-surface-variant hover:text-on-surface transition-all">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Event
            </button>
          )}
        </div>

        {/* ── Filters ────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 mb-5">

          {/* Branch filter */}
          <div className="flex flex-wrap gap-2">
            {BRANCHES.map(b => (
              <button key={b} onClick={() => setBranch(prev => prev === b ? '' : b)}
                className={`px-3 py-1.5 rounded-xl font-label-lg text-xs font-medium transition-all
                            ${branch === b
                              ? 'bg-primary text-on-primary'
                              : 'bg-surface-container text-on-surface-variant hover:text-on-surface'}`}>
                {b}
              </button>
            ))}
          </div>

          {/* Year + Skills row */}
          <div className="flex gap-2 flex-wrap">
            {YEARS.map(y => (
              <button key={y} onClick={() => setYear(prev => prev === y ? undefined : y)}
                className={`w-10 h-8 rounded-xl font-label-lg text-xs font-medium transition-all
                            ${year === y
                              ? 'bg-secondary text-on-secondary'
                              : 'bg-surface-container text-on-surface-variant hover:text-on-surface'}`}>
                {y}Y
              </button>
            ))}

            {/* Skill input */}
            <div className="flex gap-1 flex-1 min-w-40">
              <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                placeholder="Add skill…"
                className="flex-1 px-3 py-1.5 rounded-xl bg-surface-container-low text-on-surface
                           font-body-sm text-xs placeholder:text-on-surface-variant/50
                           focus:outline-none focus:ring-2 focus:ring-primary/30"/>
              <button onClick={addSkill} disabled={!skillInput.trim() || activeSkills.length >= 5}
                className="px-2.5 py-1.5 rounded-xl bg-primary/10 text-primary font-label-sm text-xs
                           hover:bg-primary/20 transition-all disabled:opacity-40">
                +
              </button>
            </div>
          </div>

          {/* Active skills */}
          {activeSkills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              {activeSkills.map(s => (
                <button key={s} onClick={() => setActiveSkills(p => p.filter(x => x !== s))}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-secondary/10 text-secondary
                             font-label-sm text-[10px] hover:bg-error/10 hover:text-error transition-all">
                  {s}
                  <span className="material-symbols-outlined text-[11px]">close</span>
                </button>
              ))}
              {hasFilters && (
                <button onClick={clearFilters}
                  className="px-2 py-0.5 rounded-lg bg-surface-container text-on-surface-variant
                             font-label-sm text-[10px] hover:text-error transition-all">
                  Clear all
                </button>
              )}
            </div>
          )}
          {hasFilters && !activeSkills.length && (
            <button onClick={clearFilters}
              className="self-start font-label-sm text-[10px] text-on-surface-variant hover:text-error transition-all">
              Clear filters
            </button>
          )}
        </div>

        {/* ── Result count / fetching indicator ──────────────── */}
        {!isLoading && data && (
          <p className="font-label-sm text-[10px] text-on-surface-variant mb-3 flex items-center gap-1">
            {isFetching && <span className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />}
            {data.items.length} student{data.items.length !== 1 ? 's' : ''} found
            {data.hasMore ? ' (scroll for more)' : ''}
          </p>
        )}

        {/* ── Loading ─────────────────────────────────────────── */}
        {isLoading && (
          <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-36 rounded-2xl bg-surface-container animate-pulse" />
            ))}
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────── */}
        {isError && (
          <div className="p-5 rounded-2xl bg-error-container text-on-error-container
                          flex flex-col items-center gap-2 text-center">
            <span className="material-symbols-outlined text-[28px]">error_outline</span>
            <p className="font-body-sm text-xs">Failed to load results</p>
          </div>
        )}

        {/* ── Empty ───────────────────────────────────────────── */}
        {!isLoading && !isError && data?.items.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px] text-on-surface-variant">person_search</span>
            </div>
            <div>
              <p className="font-title-sm text-sm font-semibold text-on-surface">No students found</p>
              <p className="font-body-sm text-xs text-on-surface-variant mt-1">
                Try adjusting your filters or clearing them
              </p>
            </div>
            {hasFilters && (
              <button onClick={clearFilters}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-lg text-sm">
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* ── Results list ────────────────────────────────────── */}
        {!isLoading && data && data.items.length > 0 && (
          <div className="flex flex-col gap-3">
            {data.items.map(person => (
              <StudentCard
                key={person.id}
                person={person}
                eventId={eventId}
                onReport={setReportTarget}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Quick Report modal ────────────────────────────────── */}
      {reportTarget && (
        <QuickReportModal
          person={reportTarget}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
}
