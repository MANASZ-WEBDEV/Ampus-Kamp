import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useEvent }    from '../hooks/useEvent';
import { useBookmark } from '../hooks/useBookmark';
import { useAuth }     from '@/features/auth/context/AuthContext';
import { AppBar }     from '@/components/layout/AppBar';
import { BottomNav }  from '@/components/layout/BottomNav';
import { LookingToggle }          from '@/features/teams/components/LookingToggle';
import { RegisterButton }         from '@/features/registrations/components/RegisterButton';
import { RegistrationStatusCard } from '@/features/registrations/components/RegistrationStatusCard';
import { MemberConfirmBanner }    from '@/features/registrations/components/MemberConfirmBanner';
import { useMyRegistration, useUpdateRegistration } from '@/features/registrations/hooks/useRegistration';

// ── Static maps ───────────────────────────────────────────────────────────────

const GRADIENT: Record<string, string> = {
  hackathon:   'from-[#221eb5] to-[#3e3ecb]',
  competition: 'from-[#216963] to-[#004541]',
  sports:      'from-green-800 to-teal-700',
  workshop:    'from-amber-700 to-orange-600',
  seminar:     'from-rose-700 to-pink-700',
  other:       'from-slate-700 to-slate-500',
};

const DEFAULT_EVENT_IMG =
  'https://images.unsplash.com/photo-1761727799924-ec68d218df5e?q=80&w=1374&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

const TYPE_BADGE: Record<string, string> = {
  hackathon:   'bg-tertiary-container text-on-tertiary',
  competition: 'bg-surface-tint text-on-primary',
  sports:      'bg-primary-fixed-dim text-on-primary-fixed-variant',
  workshop:    'bg-primary-fixed text-on-primary-fixed-variant',
  seminar:     'bg-error-container text-on-error-container',
  other:       'bg-surface-container-high text-on-surface',
};

const TYPE_ICON: Record<string, string> = {
  hackathon:   'bolt',
  competition: 'emoji_events',
  sports:      'sports_soccer',
  workshop:    'precision_manufacturing',
  seminar:     'record_voice_over',
  other:       'event',
};

// Type-aware date label — avoids "Sprint Dates" on a seminar
const DATE_LABEL: Record<string, string> = {
  hackathon:   'Sprint Date',
  competition: 'Event Date',
  sports:      'Match Date',
  workshop:    'Workshop Date',
  seminar:     'Talk Date',
  other:       'Event Date',
};

// Type-aware team size label
const TEAM_LABEL: Record<string, string> = {
  hackathon:   'Team Size',
  competition: 'Team Size',
  sports:      'Squad Size',
  workshop:    'Participation',
  seminar:     'Participation',
  other:       'Team Size',
};

// ── Component ─────────────────────────────────────────────────────────────────

/** EventDetailPage — /events/:id */
export default function EventDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: event, isLoading, isError } = useEvent(id!);
  const { isBookmarked, toggle: toggleBookmark, isPending: isBookmarking } = useBookmark(
    id!,
    event?.isBookmarked ?? false,
  );

  // F-6: Registration
  const { data: myReg }        = useMyRegistration(id!);
  const { mutate: doWithdraw } = useUpdateRegistration(id!);
  const alreadyRegistered      = !!myReg && myReg.status !== 'withdrawn';
  const hasPendingInvite       = myReg?.members.some(
    m => m.userId === user?.id && m.status === 'invited',
  ) ?? false;

  const [shareIcon, setShareIcon] = useState('share');

  const isFaculty  = user?.role === 'faculty' || user?.role === 'dept_head' || user?.role === 'admin';
  const isOwner    = isFaculty && event?.postedBy?.id === user?.id;
  const isClosed   = event?.status === 'closed' || event?.status === 'archived';
  const isDraft    = event?.status === 'draft';
  const isTeamEvent = event?.type === 'hackathon' || event?.type === 'competition' || event?.type === 'sports';
  // Deadline enforcement — derived from timestamp, not just event.status.
  // A published event whose deadline has passed should show "Closed" to students.
  const deadlinePassedMs  = event?.registrationDeadline
    ? new Date(event.registrationDeadline).getTime()
    : null;
  const isDeadlinePassed  = deadlinePassedMs !== null && Date.now() > deadlinePassedMs;
  const isRegClosed       = isClosed || isDeadlinePassed; // gate used for all CTAs

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: event?.title, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
      setShareIcon('done');
      setTimeout(() => setShareIcon('share'), 1600);
    }
  }

  const ctaLabel = () => {
    if (alreadyRegistered)          return 'Registered';
    if (isClosed || isDeadlinePassed) return 'Registration Closed';
    if (isDraft)                    return 'Not Yet Published';
    if (event?.type === 'seminar')  return 'RSVP for this Talk';
    if (event?.type === 'workshop') return 'Reserve My Spot';
    if (event?.type === 'sports')   return 'Register My Squad';
    return `Apply to ${event?.type === 'hackathon' ? 'Hackathon' : 'Event'}`;
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppBar />
        <div className="pt-16 max-w-5xl mx-auto px-4 lg:px-8 pb-12">
          <div className="h-5 w-48 bg-surface-container rounded-full my-4 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="h-64 bg-surface-container rounded-xl animate-pulse" />
              <div className="grid grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 bg-surface-container rounded-xl animate-pulse" />
                ))}
              </div>
              <div className="h-32 bg-surface-container rounded-xl animate-pulse" />
            </div>
            <div className="lg:col-span-4">
              <div className="h-64 bg-surface-container rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (isError || !event) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <span className="material-symbols-outlined text-5xl text-outline">sentiment_dissatisfied</span>
        <p className="text-on-surface-variant font-body-md text-center">Event not found or failed to load.</p>
        <button onClick={() => navigate('/events')}
          className="px-4 py-2 rounded-lg bg-primary text-on-primary font-label-lg text-sm">
          Back to Events
        </button>
      </div>
    );
  }

  // ── Derived values ──────────────────────────────────────────────────────────

  const gradient  = GRADIENT[event.type]  ?? GRADIENT.other;
  const typeBadge = TYPE_BADGE[event.type] ?? TYPE_BADGE.other;
  const typeIcon  = TYPE_ICON[event.type]  ?? TYPE_ICON.other;
  const dateLabel = DATE_LABEL[event.type] ?? 'Event Date';
  const teamLabel = TEAM_LABEL[event.type] ?? 'Team Size';

  const eligBranches = event.eligibility?.branches ?? [];
  const eligYears    = event.eligibility?.years ?? [];
  const eligNotes    = event.eligibility?.notes ?? '';
  const coordinators = event.coordinators ?? [];

  // Deadline — actual date + time from DB, not a hardcoded "11:59 PM"
  // Use registrationDeadline (server field) falling back to deadline (display field)
  const regDeadlineRaw    = event.registrationDeadline ?? event.deadline;
  const deadlineMs        = regDeadlineRaw ? new Date(regDeadlineRaw).getTime() : null;
  const daysLeft          = deadlineMs !== null
    ? Math.ceil((deadlineMs - Date.now()) / 86400000)
    : null;
  const deadlineFormatted = regDeadlineRaw
    ? new Date(regDeadlineRaw).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      })
    : null;
  const isUrgent = daysLeft !== null && daysLeft <= 3 && daysLeft >= 0;

  // At-a-glance tiles — only rendered when the field is non-null in the event
  type Tile = { label: string; icon: string; value: string; sub?: string; subCls?: string };
  const glanceTiles: Tile[] = [
    ...(event.eventDate ? [{
      label: dateLabel,
      icon:  'calendar_today',
      value: new Date(event.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      sub:   regDeadlineRaw
        ? `Reg. closes ${new Date(regDeadlineRaw).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
        : undefined,
      subCls: isDeadlinePassed
        ? 'text-error font-semibold'
        : isUrgent ? 'text-secondary font-semibold' : 'text-on-surface-variant',
    }] : []),
    ...(event.teamSize ? [{
      label: teamLabel,
      icon:  'group',
      value: event.teamSize.min === event.teamSize.max
        ? `${event.teamSize.max} members`
        : `${event.teamSize.min}–${event.teamSize.max} members`,
    }] : []),
    {
      label: 'Entry Fee',
      icon:  'payments',
      value: event.fee ?? 'Free',
    },
    {
      label: 'Mode',
      icon:  event.registrationMode === 'external' ? 'open_in_new' : 'location_on',
      value: event.registrationMode === 'external' ? 'External' : 'In-App',
    },
  ];

  const gridCols =
    glanceTiles.length === 1 ? 'grid-cols-1' :
    glanceTiles.length === 2 ? 'grid-cols-2' :
    glanceTiles.length === 3 ? 'grid-cols-3' :
    'grid-cols-2 md:grid-cols-4';

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased">
      <AppBar />

      <main className="w-full pt-16 max-w-5xl mx-auto px-4 lg:px-8 pb-28 lg:pb-12">

        {/* ── Breadcrumb + Quick Actions ───────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-4">
          <nav className="flex items-center gap-1.5 text-sm text-on-surface-variant flex-wrap">
            <Link to="/events" className="hover:text-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Events
            </Link>
            <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
            <span className="text-on-surface font-medium line-clamp-1 max-w-[240px]">{event.title}</span>
          </nav>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              id="detail-bookmark-btn"
              onClick={() => toggleBookmark()}
              disabled={isBookmarking}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-lowest shadow-sm hover:shadow-md text-on-surface text-sm transition-all disabled:opacity-50"
            >
              <span
                className="material-symbols-outlined text-[18px] text-secondary"
                style={isBookmarked ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                bookmark
              </span>
              {isBookmarked ? 'Saved' : 'Save'}
            </button>

            <button
              id="detail-share-btn"
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-lowest shadow-sm hover:shadow-md text-on-surface text-sm transition-all"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">{shareIcon}</span>
              Share
            </button>

            {isOwner && (
              <button
                id="detail-edit-btn"
                onClick={() => navigate(`/events/${event.id}/edit`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-fixed text-on-primary-fixed-variant text-sm shadow-sm hover:bg-primary-fixed-dim transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">edit_note</span>
                Edit
              </button>
            )}
          </div>
        </div>

        {/* ── Page Grid ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT: Main content */}
          <div className="lg:col-span-8 flex flex-col gap-5 min-w-0">

            {/* Hero */}
            <section className="rounded-xl overflow-hidden shadow-md">
              <div className={`relative w-full h-48 lg:h-72 bg-gradient-to-br ${gradient}`}>
                <img
                  src={event.bannerImageUrl ?? DEFAULT_EVENT_IMG}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/90 via-inverse-surface/20 to-transparent" />

                {/* Type chip — top left */}
                <div className="absolute top-4 left-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-semibold shadow-sm ${typeBadge}`}>
                    <span className="material-symbols-outlined text-[13px]">{typeIcon}</span>
                    {event.type}
                  </span>
                </div>

                {/* Status chip — top right, only when not published */}
                {(isClosed || isDraft) && (
                  <div className="absolute top-4 right-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      isClosed ? 'bg-error-container text-on-error-container' : 'bg-surface-container text-on-surface-variant'
                    }`}>
                      <span className="material-symbols-outlined text-[12px]">{isClosed ? 'lock' : 'visibility_off'}</span>
                      {isClosed ? 'Closed' : 'Draft'}
                    </span>
                  </div>
                )}

                {/* Organizer — bottom left */}
                <div className="absolute bottom-4 left-5 flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-surface-container-lowest/90 flex items-center justify-center shadow-sm text-primary">
                    <span className="material-symbols-outlined text-[20px]">{typeIcon}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-outline-variant uppercase tracking-widest">
                      {event.organizer ? 'Organized by' : 'Campus Event'}
                    </span>
                    <span className="text-sm font-semibold text-inverse-on-surface">
                      {event.organizer || 'Innovation Cell'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Title block */}
              <div className="p-5 bg-surface-container-lowest flex flex-col gap-1.5">
                <h1 className="font-headline-xl text-[1.75rem] lg:text-[2rem] text-on-surface tracking-tight font-bold leading-tight">
                  {event.title}
                </h1>
                <p className="text-sm text-on-surface-variant flex items-center gap-1.5 flex-wrap">
                  <span className="material-symbols-outlined text-[16px] text-primary">domain</span>
                  <span>{event.organizer || 'Innovation Cell'}</span>
                  {event.postedBy && (
                    <>
                      <span className="text-outline">·</span>
                      <span className="font-medium text-on-surface">{event.postedBy.name}</span>
                    </>
                  )}
                </p>
              </div>
            </section>

            {/* At a Glance — only tiles with real data */}
            {glanceTiles.length > 0 && (
              <section className={`grid gap-3 ${gridCols}`}>
                {glanceTiles.map(tile => (
                  <div key={tile.label} className="p-4 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-2">
                    <div className="flex items-center justify-between text-outline">
                      <span className="text-[10px] uppercase tracking-wider font-semibold">{tile.label}</span>
                      <span className="material-symbols-outlined text-[18px] text-primary">{tile.icon}</span>
                    </div>
                    <span className="text-sm text-on-surface font-bold">{tile.value}</span>
                    {tile.sub && (
                      <span className={`text-[10px] ${tile.subCls ?? 'text-on-surface-variant'}`}>{tile.sub}</span>
                    )}
                  </div>
                ))}
              </section>
            )}

            {/* About / Summary */}
            {event.summary && (
              <section className="rounded-xl bg-surface-container-lowest p-5 shadow-sm flex flex-col gap-2">
                <h2 className="text-base text-on-surface font-semibold">About this Event</h2>
                <p className="text-sm text-on-surface-variant leading-relaxed">{event.summary}</p>
              </section>
            )}

            {/* Eligibility */}
            {(eligBranches.length > 0 || eligYears.length > 0 || eligNotes) && (
              <section className="rounded-xl bg-surface-container-lowest p-5 shadow-sm flex flex-col gap-3">
                <h2 className="text-base text-on-surface font-semibold">Eligibility</h2>
                {(eligBranches.length > 0 || eligYears.length > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {eligBranches.map(b => (
                      <span key={b} className="px-3 py-1 rounded-full bg-primary-container text-on-primary text-[11px] font-semibold">
                        {b}
                      </span>
                    ))}
                    {eligYears.map(y => (
                      <span key={y} className="px-3 py-1 rounded-full bg-surface-container-low text-on-surface text-[11px]">
                        {y}{y === 1 ? 'st' : y === 2 ? 'nd' : y === 3 ? 'rd' : 'th'} Year
                      </span>
                    ))}
                  </div>
                )}
                {eligNotes && (
                  <p className="text-[12px] text-on-surface-variant">{eligNotes}</p>
                )}
              </section>
            )}

            {/* External registration link */}
            {event.registrationMode === 'external' && event.link && (
              <section className="rounded-xl bg-surface-container-lowest p-5 shadow-sm flex items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm text-on-surface font-semibold">External Registration</span>
                  <span className="text-[12px] text-on-surface-variant">This event uses an external portal.</span>
                </div>
                <a
                  href={event.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary text-sm shadow-sm hover:bg-primary-container transition-all shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  Register Now
                </a>
              </section>
            )}

            {/* Team Finder — single link, no fake squad cards */}
            {isTeamEvent && !isClosed && (
              <section className="rounded-xl bg-surface-container-lowest p-5 shadow-sm flex items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm text-on-surface font-semibold">
                    {event.type === 'sports' ? 'Squad Board' : 'Team Finder'}
                  </span>
                  <span className="text-[12px] text-on-surface-variant">
                    Browse open roles, post your own, or mark yourself as looking.
                  </span>
                </div>
                <button
                  id="detail-team-finder-btn"
                  onClick={() => navigate(`/events/${id}/teams`)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-sm shadow-sm transition-all shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px] text-primary">group_search</span>
                  View Teams
                </button>
              </section>
            )}

            {/* Looking toggle — students only */}
            {isTeamEvent && !isClosed && user?.role === 'student' && (
              <LookingToggle eventId={id!} isLooking={false} />
            )}

          </div>

          {/* RIGHT: Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">

            {/* Registration card */}
            <div className="rounded-xl bg-surface-container-lowest p-5 shadow-md flex flex-col gap-4">

              {/* Deadline — actual date + time from DB */}
              {deadlineFormatted && (
                <div className={`flex items-start justify-between gap-3 p-3 rounded-lg ${
                  isDeadlinePassed ? 'bg-error-container/30' : isUrgent ? 'bg-amber-50' : 'bg-surface-container-low'
                }`}>
                  <div className="flex items-start gap-2">
                    <span className={`material-symbols-outlined text-[18px] mt-0.5 ${
                      isDeadlinePassed ? 'text-error' : isUrgent ? 'text-amber-700' : 'text-outline'
                    }`}>
                      schedule
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <span className={`text-[10px] uppercase tracking-wider font-semibold ${
                        isDeadlinePassed ? 'text-error' : isUrgent ? 'text-amber-700' : 'text-outline'
                      }`}>
                        Registration Deadline
                      </span>
                      <span className={`text-[13px] font-semibold ${
                        isDeadlinePassed ? 'text-error' : isUrgent ? 'text-amber-900' : 'text-on-surface'
                      }`}>
                        {deadlineFormatted}
                      </span>
                    </div>
                  </div>
                  {daysLeft !== null && (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold shrink-0 ${
                      isDeadlinePassed         ? 'bg-error-container text-on-error-container' :
                      daysLeft === 0           ? 'bg-secondary-fixed text-on-secondary-fixed' :
                      daysLeft <= 3            ? 'bg-secondary-fixed text-on-secondary-fixed' :
                      'bg-surface-container text-on-surface-variant'
                    }`}>
                      {isDeadlinePassed ? 'Passed' : daysLeft === 0 ? 'Today' : daysLeft === 1 ? '1d left' : `${daysLeft}d left`}
                    </span>
                  )}
                </div>
              )}

              {/* Registration status */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-outline font-semibold">Registration</span>
                <span className={`text-[11px] px-2 py-0.5 rounded font-semibold flex items-center gap-1 ${
                  isRegClosed ? 'text-error bg-error-container' :
                  isDraft     ? 'text-outline bg-surface-container' :
                  'text-emerald-700 bg-emerald-50'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    isRegClosed ? 'bg-error' : isDraft ? 'bg-outline' : 'bg-emerald-600'
                  }`} />
                  {isRegClosed ? 'Closed' : isDraft ? 'Not published' : 'Open'}
                </span>
              </div>

              {/* Eligibility note */}
              {(eligBranches.length > 0 || eligYears.length > 0) && (
                <p className="text-[12px] text-on-surface-variant -mt-1">
                  {eligBranches.length > 0
                    ? `Open to ${eligBranches.slice(0, 3).join(', ')}${eligBranches.length > 3 ? ` +${eligBranches.length - 3} more` : ''}`
                    : 'Open to all enrolled students'}
                  {eligYears.length > 0
                    ? ` · ${eligYears.map(y => `${y}${['st', 'nd', 'rd'][y - 1] ?? 'th'} yr`).join(', ')}`
                    : ''}
                </p>
              )}

              {/* F-6: Registration CTAs */}
              <div id="sidebar-reg-section" className="flex flex-col gap-3">

                {hasPendingInvite && myReg && user && (
                  <MemberConfirmBanner
                    registration={myReg}
                    currentUserId={user.id}
                    eventId={id!}
                  />
                )}

                {alreadyRegistered && myReg && user && !hasPendingInvite && (
                  <RegistrationStatusCard
                    registration={myReg}
                    currentUserId={user.id}
                    teamSizeMin={event.teamSize?.min ?? 1}
                    onWithdraw={() => doWithdraw({ regId: myReg.id, input: { action: 'withdraw' } })}
                    onConfirm={
                      myReg.status === 'draft'
                        ? () => doWithdraw({ regId: myReg.id, input: { action: 'submit' } })
                        : undefined
                    }
                  />
                )}

                {!isFaculty && !alreadyRegistered && !isRegClosed && !isDraft && (
                  <RegisterButton
                    eventId={id!}
                    registrationMode={event.registrationMode as 'in_app' | 'external'}
                    eventLink={event.link}
                    teamSizeMin={event.teamSize?.min ?? 1}
                    teamSizeMax={event.teamSize?.max ?? 1}
                    alreadyRegistered={false}
                  />
                )}

                {(isRegClosed || isDraft) && !isFaculty && (
                  <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-container border border-outline-variant/20">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                      {isDeadlinePassed ? 'schedule' : isClosed ? 'lock' : 'visibility_off'}
                    </span>
                    <span className="text-sm text-on-surface-variant">{ctaLabel()}</span>
                  </div>
                )}

                {isFaculty && (
                  <button
                    id="sidebar-roster-btn"
                    onClick={() => navigate(`/events/${id}/roster`)}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-outline-variant/40 text-sm text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">group</span>
                    View Roster
                  </button>
                )}
              </div>
            </div>

            {/* Coordinators — only rendered when event.coordinators[] is non-empty */}
            {coordinators.length > 0 && (
              <div className="rounded-xl bg-surface-container-lowest p-4 shadow-sm flex flex-col gap-3">
                <span className="text-[10px] uppercase tracking-wider text-outline font-semibold">Point of Contact</span>
                {coordinators.map(c => (
                  <div key={c.phone} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary text-[12px] font-bold shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] text-on-surface font-semibold truncate">{c.name}</span>
                      <a href={`tel:${c.phone}`} className="text-[11px] text-primary hover:underline">
                        {c.phone}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Faculty: publish action for own draft */}
            {isOwner && event.status === 'draft' && (
              <div className="rounded-xl bg-surface-container-low border border-dashed border-primary/30 p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-primary">
                  <span className="material-symbols-outlined text-[20px]">publish</span>
                  <span className="text-sm font-semibold">Ready to publish?</span>
                </div>
                <p className="text-[12px] text-on-surface-variant">
                  Review your event details before making it visible to students.
                </p>
                <button
                  id="sidebar-publish-btn"
                  onClick={() => navigate(`/events/${event.id}/edit`)}
                  className="w-full py-2.5 rounded-lg bg-primary text-on-primary text-sm font-bold shadow flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[18px]">publish</span>
                  Review & Publish
                </button>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* ── Mobile sticky CTA ────────────────────────────────────────────── */}
      <div className="fixed bottom-16 left-0 right-0 z-40 lg:hidden bg-surface-container-lowest/95 backdrop-blur-md px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] flex items-center gap-3">
        <button
          onClick={() => toggleBookmark()}
          disabled={isBookmarking}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Save event'}
          className="h-12 w-12 rounded-lg bg-surface-container flex items-center justify-center text-on-surface hover:text-primary transition-colors shrink-0 active:scale-95 disabled:opacity-50"
        >
          <span
            className="material-symbols-outlined text-[22px]"
            style={isBookmarked ? { fontVariationSettings: "'FILL' 1", color: 'var(--color-primary)' } : {}}
          >
            {isBookmarked ? 'bookmark' : 'bookmark_border'}
          </span>
        </button>

        {!isFaculty ? (
          <button
            id="mobile-register-btn"
            onClick={() => document.getElementById('sidebar-reg-section')?.scrollIntoView({ behavior: 'smooth' })}
            disabled={isRegClosed || isDraft}
            className={`flex-1 h-12 rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all disabled:opacity-70 ${
              alreadyRegistered ? 'bg-primary/10 text-primary border border-primary/20'
              : isRegClosed     ? 'bg-surface-container-high text-on-surface-variant'
              : 'bg-primary-container hover:bg-primary text-on-primary'
            }`}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={alreadyRegistered ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {alreadyRegistered ? 'how_to_reg' : isDeadlinePassed ? 'schedule' : isClosed ? 'lock' : 'app_registration'}
            </span>
            {ctaLabel()}
          </button>
        ) : (
          <button
            id="mobile-roster-btn"
            onClick={() => navigate(`/events/${id}/roster`)}
            className="flex-1 h-12 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border border-outline-variant/40 text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">group</span>
            View Roster
          </button>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
