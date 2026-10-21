import { useNavigate } from 'react-router-dom';
import { useBookmark } from '../hooks/useBookmark';
import { useAuth } from '@/features/auth/context/AuthContext';
import { DeadlineCountdown } from './EventStatusBadge';
import type { EventCard } from '../types';

// ── Type-color map matching Stitch reference ────────────────────────────────

const TYPE_BADGE_COLOR: Record<string, string> = {
  hackathon:   'bg-tertiary-container text-on-tertiary',
  competition: 'bg-surface-tint text-on-primary',
  sports:      'bg-primary-fixed-dim text-on-primary-fixed-variant',
  workshop:    'bg-primary-fixed text-on-primary-fixed-variant',
  seminar:     'bg-error-container text-on-error-container',
  other:       'bg-surface-container-high text-on-surface-variant',
};

// ── Banner gradient when no image ─────────────────────────────────────────────

const BANNER_GRADIENT: Record<string, string> = {
  hackathon:   'from-[#221eb5]/90 to-[#3e3ecb]/70',
  competition: 'from-[#216963]/90 to-[#004541]/70',
  sports:      'from-green-800/90 to-teal-700/70',
  workshop:    'from-amber-700/90 to-orange-700/70',
  seminar:     'from-rose-700/90 to-pink-700/70',
  other:       'from-slate-700/90 to-slate-500/70',
};

// ── CTA label/icon ────────────────────────────────────────────────────────────

function ctaLabel(event: EventCard): string {
  if (event.status === 'closed' || event.status === 'archived') return 'View Results';
  if (event.type === 'seminar')  return 'RSVP';
  if (event.type === 'workshop') return 'Reserve Spot';
  if (event.type === 'sports')   return 'Register Squad';
  return 'Apply Now';
}

function ctaIcon(event: EventCard): string {
  if (event.status === 'closed' || event.status === 'archived') return 'leaderboard';
  if (event.type === 'seminar')  return 'event_available';
  if (event.type === 'sports')   return 'sports_soccer';
  if (event.type === 'workshop') return 'airplane_ticket';
  return 'arrow_forward';
}

// ── EventCardComponent ────────────────────────────────────────────────────────

interface EventCardProps { event: EventCard }

export function EventCardComponent({ event }: EventCardProps) {
  const navigate = useNavigate();
  const { user }  = useAuth();
  const { isBookmarked, toggle, isPending } = useBookmark(event.id, event.isBookmarked);

  const isFaculty = user?.role === 'faculty' || user?.role === 'dept_head' || user?.role === 'admin';
  const isClosed  = event.status === 'closed' || event.status === 'archived';

  const badgeClass = TYPE_BADGE_COLOR[event.type] ?? TYPE_BADGE_COLOR.other;
  const gradient   = BANNER_GRADIENT[event.type]  ?? BANNER_GRADIENT.other;

  // Does this event have a media banner area (all hackathons + competitions get one)
  const hasHeroBanner = event.type === 'hackathon' || event.type === 'competition' || event.type === 'sports';

  return (
    <article
      className="w-full bg-surface-container-lowest rounded-xl shadow-md flex flex-col overflow-hidden transition-all duration-200 hover:shadow-xl"
    >

      {/* ── Hero image/gradient banner ─────────────────────────────────────── */}
      {hasHeroBanner && (
        <div
          className={`relative w-full h-36 bg-gradient-to-br ${gradient} cursor-pointer`}
          onClick={() => navigate(`/events/${event.id}`)}
          role="button"
          tabIndex={0}
          aria-label={`View ${event.title}`}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

          {/* Category badge — top left */}
          <div className="absolute top-2.5 left-2.5 z-10">
            <span className={`px-2.5 py-0.5 rounded-full font-label-sm text-[10px] uppercase tracking-wider font-bold shadow-sm ${badgeClass}`}>
              {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
            </span>
          </div>

          {/* Bookmark — top right */}
          <button
            id={`bookmark-${event.id}`}
            onClick={e => { e.stopPropagation(); toggle(); }}
            disabled={isPending}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark event'}
            className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50"
          >
            <span
              className="material-symbols-outlined text-[18px] transition-all"
              style={isBookmarked ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {isBookmarked ? 'bookmark' : 'bookmark_border'}
            </span>
          </button>

          {/* Deadline pill — bottom left */}
          <div className="absolute bottom-2.5 left-2.5 z-10">
            <DeadlineCountdown deadline={event.deadline} status={event.status} />
          </div>

          {/* Faculty verified — bottom right */}
          {event.postedBy && (
            <span className="absolute bottom-2.5 right-2.5 z-10 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-primary font-label-sm text-[10px] shadow-sm">
              <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              Faculty Sponsored
            </span>
          )}
        </div>
      )}

      {/* ── Card body ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 p-4">

        {/* Top: badge + date pill (for non-hero cards) OR status row (all) */}
        {!hasHeroBanner ? (
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full font-label-sm text-[10px] uppercase tracking-wider font-bold ${badgeClass}`}>
                {event.type === 'workshop' ? 'Hands-on Workshop'
                  : event.type === 'seminar' ? 'Seminar & Talk'
                  : event.type.charAt(0).toUpperCase() + event.type.slice(1)}
              </span>
              {event.eventDate && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-[10px]">
                  <span className="material-symbols-outlined text-[12px]">calendar_month</span>
                  {new Date(event.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
            <button
              id={`bookmark-${event.id}`}
              onClick={e => { e.stopPropagation(); toggle(); }}
              disabled={isPending}
              aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
              className="text-outline hover:text-primary transition-colors p-1 shrink-0 disabled:opacity-50"
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={isBookmarked ? { fontVariationSettings: "'FILL' 1", color: 'var(--color-primary)' } : {}}
              >
                {isBookmarked ? 'bookmark' : 'bookmark_border'}
              </span>
            </button>
          </div>
        ) : (
          /* For hero cards — show verified badge inline if present */
          event.postedBy && (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-[10px]">
                <span className="material-symbols-outlined text-[11px]">verified</span>
                Faculty Sponsored
              </span>
            </div>
          )
        )}

        {/* Title + organizer */}
        <div
          className="flex flex-col gap-0.5 cursor-pointer"
          onClick={() => navigate(`/events/${event.id}`)}
        >
          <h3 className="font-headline-sm text-[15px] text-on-surface font-bold leading-tight line-clamp-2 hover:text-primary transition-colors">
            {event.title}
          </h3>
          {event.organizer && (
            <p className="font-body-sm text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-[14px] text-primary">apartment</span>
              {event.organizer}
            </p>
          )}
        </div>

        {/* Summary (non-hero cards only) */}
        {!hasHeroBanner && event.summary && (
          <p className="font-body-sm text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
            {event.summary}
          </p>
        )}

        {/* ── Metadata pills ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-1.5 text-xs">
          {/* Team size */}
          {event.teamSize && (event.teamSize.min > 0 || event.teamSize.max > 0) && (
            <div className="flex items-center gap-1 bg-surface-container-low px-2.5 py-1 rounded-md text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px] text-outline">
                {event.type === 'sports' ? 'groups' : 'group'}
              </span>
              <span>
                {event.teamSize.min === event.teamSize.max
                  ? `${event.teamSize.max} member${event.teamSize.max !== 1 ? 's' : ''}/team`
                  : `${event.teamSize.min}–${event.teamSize.max} members`}
              </span>
            </div>
          )}

          {/* Fee / Prize */}
          {event.fee && (
            <div className="flex items-center gap-1 bg-secondary-fixed/50 px-2.5 py-1 rounded-md text-on-secondary-fixed font-bold">
              <span className="material-symbols-outlined text-[14px] text-secondary">trophy</span>
              <span>{event.fee}</span>
            </div>
          )}

          {/* Registrations */}
          {event.counters.students > 0 && (
            <div className="flex items-center gap-1 bg-surface-container-low px-2.5 py-1 rounded-md text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px] text-surface-tint">check_circle</span>
              <span>{event.counters.students} attending</span>
            </div>
          )}

          {/* External link */}
          {event.registrationMode === 'external' && (
            <div className="flex items-center gap-1 bg-surface-container-low px-2.5 py-1 rounded-md text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px] text-outline">open_in_new</span>
              <span>External</span>
            </div>
          )}
        </div>

        {/* ── Eligibility notice (non-hero) ─────────────────────────────── */}
        {!hasHeroBanner && event.eligibility && (
          (() => {
            const branches = event.eligibility.branches ?? [];
            const years    = event.eligibility.years ?? [];
            if (!branches.length && !years.length) return null;
            const label = [
              branches.length ? branches.join(', ') : 'All branches',
              years.length ? `${years.map(y => `${y}${['th','st','nd','rd'][y] ?? 'th'} Yr`).join(' & ')}` : '',
            ].filter(Boolean).join(' • ');
            return (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-container-low">
                <span className="material-symbols-outlined text-outline text-[14px]">info</span>
                <span className="font-body-sm text-[11px] text-on-surface-variant">{label}</span>
              </div>
            );
          })()
        )}

        {/* ── Team matchmaking strip (hackathons/competitions) ───────────── */}
        {(event.type === 'hackathon' || event.type === 'competition') && !isClosed && event.teamSize && (
          <div className="flex items-center justify-between bg-surface-container-low px-3 py-2 rounded-lg">
            <div className="flex items-center gap-2">
              {/* Avatar stack placeholders */}
              <div className="flex -space-x-2">
                {['AR', 'RK', 'SL'].map(initials => (
                  <div key={initials} className={`w-6 h-6 rounded-full flex items-center justify-center font-label-sm text-[9px] font-bold ring-2 ring-white ${
                    initials === 'AR' ? 'bg-primary-fixed text-on-primary-fixed-variant' :
                    initials === 'RK' ? 'bg-secondary-fixed text-on-secondary-fixed' :
                    'bg-tertiary-fixed text-on-tertiary-fixed'
                  }`}>
                    {initials}
                  </div>
                ))}
              </div>
              <span className="font-label-sm text-[10px] text-on-surface-variant">
                Need <span className="font-bold text-secondary">2 more members</span>
              </span>
            </div>
            <button
              onClick={() => navigate(`/events/${event.id}`)}
              className="font-label-sm text-[11px] text-primary font-bold hover:underline flex items-center"
            >
              Find Squad <span className="material-symbols-outlined text-[13px]">chevron_right</span>
            </button>
          </div>
        )}

        {/* ── CTA row ────────────────────────────────────────────────────── */}
        <div className={`flex items-center gap-2 ${hasHeroBanner ? 'pt-1 border-t border-surface-container' : 'pt-0'}`}>

          {/* Faculty edit shortcut */}
          {isFaculty && !isClosed && (
            <button
              id={`event-edit-${event.id}`}
              onClick={() => navigate(`/events/${event.id}/edit`)}
              className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-label-lg text-xs font-semibold hover:bg-surface-container transition-all flex items-center justify-center gap-1 active:scale-95"
            >
              <span className="material-symbols-outlined text-[15px]">edit</span>
              Edit
            </button>
          )}

          {/* Details */}
          <button
            id={`event-details-${event.id}`}
            onClick={() => navigate(`/events/${event.id}`)}
            className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-label-lg text-xs font-semibold hover:bg-surface-container transition-all flex items-center justify-center active:scale-95"
          >
            Details
          </button>

          {/* Primary CTA */}
          <button
            id={`event-cta-${event.id}`}
            onClick={() => {
              if (event.registrationMode === 'external' && event.link && !isClosed) {
                window.open(event.link, '_blank', 'noopener');
              } else {
                navigate(`/events/${event.id}`);
              }
            }}
            className={`flex-1 h-11 px-4 rounded-lg font-label-lg text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
              isClosed
                ? 'bg-surface-container text-on-surface-variant'
                : 'bg-primary-container text-on-primary hover:opacity-95'
            }`}
          >
            <span>{ctaLabel(event)}</span>
            <span className="material-symbols-outlined text-[15px]">{ctaIcon(event)}</span>
          </button>
        </div>
      </div>
    </article>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function EventCardSkeleton() {
  return (
    <div className="w-full bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm animate-pulse">
      <div className="w-full h-36 bg-surface-container" />
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="h-5 bg-surface-container rounded-full w-20" />
          <div className="h-5 bg-surface-container rounded-full w-14" />
        </div>
        <div className="h-4 bg-surface-container rounded-full w-3/4" />
        <div className="h-3.5 bg-surface-container rounded-full w-1/2" />
        <div className="flex gap-2 mt-1">
          <div className="h-6 bg-surface-container rounded-md w-24" />
          <div className="h-6 bg-surface-container rounded-md w-20" />
        </div>
        <div className="flex gap-2 pt-2 border-t border-surface-container">
          <div className="h-11 bg-surface-container rounded-lg w-20" />
          <div className="h-11 bg-surface-container rounded-lg flex-1" />
        </div>
      </div>
    </div>
  );
}
