import { useParams, useNavigate } from 'react-router-dom';
import { AppBar } from '@/components/layout/AppBar';
import { useLooking } from '../hooks/usePeople';

/**
 * LookingListPage — /events/:id/looking
 * Lists all students who have toggled "looking for a team" for this event.
 */
export default function LookingListPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate        = useNavigate();

  const { data, isLoading, isError } = useLooking(eventId!);

  return (
    <div className="min-h-screen bg-background pb-24 pt-14">
      <AppBar title="Looking for a Team" subtitle="Team Finder" />

      <div className="max-w-2xl mx-auto px-4">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="pt-5 pb-4 flex items-center justify-between">
          <div>
            <h1 className="font-headline-lg text-xl text-on-surface font-bold">
              Seeking Teammates
            </h1>
            <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
              Students who marked themselves as looking for a team for this event
            </p>
          </div>
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-container
                       font-label-lg text-xs text-on-surface-variant hover:text-on-surface transition-all">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back
          </button>
        </div>

        {/* ── Loading ─────────────────────────────────────────── */}
        {isLoading && (
          <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-surface-container animate-pulse" />
            ))}
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────── */}
        {isError && (
          <div className="p-5 rounded-2xl bg-error-container text-on-error-container
                          flex flex-col items-center gap-2 text-center">
            <span className="material-symbols-outlined text-[28px]">error_outline</span>
            <p className="font-body-sm text-xs">Failed to load the looking list</p>
          </div>
        )}

        {/* ── Empty ───────────────────────────────────────────── */}
        {!isLoading && !isError && data?.items.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px] text-on-surface-variant">
                group_search
              </span>
            </div>
            <div>
              <p className="font-title-sm text-sm font-semibold text-on-surface">
                Nobody is looking yet
              </p>
              <p className="font-body-sm text-xs text-on-surface-variant mt-1">
                Be the first! Toggle &ldquo;Looking for a team&rdquo; on the event page.
              </p>
            </div>
          </div>
        )}

        {/* ── Results ─────────────────────────────────────────── */}
        {!isLoading && data && data.items.length > 0 && (
          <div className="flex flex-col gap-3">
            {/* Count */}
            <p className="font-label-sm text-[10px] text-on-surface-variant">
              {data.items.length} student{data.items.length !== 1 ? 's' : ''} looking
              {data.hasMore ? ` (showing first ${data.items.length})` : ''}
            </p>

            {data.items.map(flag => (
              <article key={flag.id}
                className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20
                           p-4 flex items-start gap-3 hover:shadow-md transition-all">

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <span className="font-headline-sm text-sm font-bold text-primary">
                    {flag.user.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-title-sm text-sm font-semibold text-on-surface truncate">
                      {flag.user.name}
                    </p>
                    <span className="font-label-sm text-[10px] text-on-surface-variant shrink-0">
                      {new Date(flag.since).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short',
                      })}
                    </span>
                  </div>

                  {flag.note && (
                    <p className="font-body-sm text-xs text-on-surface-variant mt-0.5 line-clamp-2">
                      {flag.note}
                    </p>
                  )}

                  {/* Looking badge */}
                  <div className="mt-2 flex items-center gap-1">
                    <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full
                                     bg-primary/10 text-primary font-label-sm text-[9px] font-medium">
                      <span className="material-symbols-outlined text-[11px]">search</span>
                      Looking for a team
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
