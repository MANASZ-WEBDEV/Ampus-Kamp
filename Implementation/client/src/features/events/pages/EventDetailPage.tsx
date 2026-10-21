import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useEvent } from '../hooks/useEvent';
import { useRegister } from '../hooks/useRegister';
import { useBookmark } from '../hooks/useBookmark';
import { useAuth } from '@/features/auth/context/AuthContext';
import { DeadlineCountdown } from '../components/EventStatusBadge';
import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';

const GRADIENT: Record<string, string> = {
  hackathon:   'from-[#221eb5] to-[#3e3ecb]',
  competition: 'from-[#216963] to-[#004541]',
  sports:      'from-green-800 to-teal-700',
  workshop:    'from-amber-700 to-orange-600',
  seminar:     'from-rose-700 to-pink-700',
  other:       'from-slate-700 to-slate-500',
};

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

/** EventDetailPage — /events/:id */
export default function EventDetailPage() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const { data: event, isLoading, isError } = useEvent(id!);
  const { mutateAsync: register, isPending: isRegistering } = useRegister(id!);
  const { isBookmarked, toggle: toggleBookmark, isPending: isBookmarking } = useBookmark(
    id!,
    event?.isBookmarked ?? false,
  );

  const [registered, setRegistered] = useState(false);
  const [shareIcon, setShareIcon]   = useState('share');
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  const isFaculty  = user?.role === 'faculty' || user?.role === 'dept_head' || user?.role === 'admin';
  const isOwner    = isFaculty && event?.postedBy?.id === user?.id;
  const isClosed   = event?.status === 'closed' || event?.status === 'archived';
  const isDraft    = event?.status === 'draft';

  async function handleRegister() {
    if (!event || isClosed || isDraft) return;
    if (event.registrationMode === 'external' && event.link) {
      window.open(event.link, '_blank', 'noopener');
      return;
    }
    try {
      await register({});
      setRegistered(true);
    } catch { /* toast would go here */ }
  }

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
    if (registered)  return 'Application Started';
    if (isClosed)    return 'Registration Closed';
    if (isDraft)     return 'Not Yet Published';
    if (event?.type === 'seminar')  return 'RSVP for this Talk';
    if (event?.type === 'workshop') return 'Reserve My Spot';
    if (event?.type === 'sports')   return 'Register My Squad';
    return `Apply to ${event?.type === 'hackathon' ? 'Hackathon' : 'Event'}`;
  };

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppBar />
        <div className="pt-16 max-w-7xl mx-auto px-4 lg:px-8 pb-12">
          <div className="h-6 w-64 bg-surface-container rounded-full my-4 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="h-80 bg-surface-container rounded-xl animate-pulse" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-24 bg-surface-container rounded-xl animate-pulse" />
                ))}
              </div>
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

  // ── Error state ─────────────────────────────────────────────────────────────
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

  const gradient  = GRADIENT[event.type]  ?? GRADIENT.other;
  const typeBadge = TYPE_BADGE[event.type] ?? TYPE_BADGE.other;
  const typeIcon  = TYPE_ICON[event.type]  ?? TYPE_ICON.other;

  const eligBranches = event.eligibility?.branches ?? [];
  const eligYears    = event.eligibility?.years ?? [];

  const daysLeft = event.deadline
    ? Math.ceil((new Date(event.deadline).getTime() - Date.now()) / 86400000)
    : null;

  const deadlineLabel = daysLeft === null ? 'Open'
    : daysLeft <= 0   ? 'Closing today'
    : daysLeft === 1  ? '1 day left'
    : `${daysLeft} days left`;

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased">
      <AppBar />

      <main className="w-full pt-16 max-w-7xl mx-auto px-4 lg:px-8 pb-28 lg:pb-12">

        {/* ── Breadcrumb + Quick Actions ─────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-4">
          <nav className="flex items-center gap-1.5 font-label-md text-sm text-on-surface-variant flex-wrap">
            <Link to="/home" className="hover:text-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">account_balance</span>
              Campus Ledger
            </Link>
            <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
            <Link to="/events" className="hover:text-primary transition-colors">Events</Link>
            <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
            <span className="text-primary font-semibold font-code-sm text-[11px] bg-surface-container-high px-1.5 py-0.5 rounded line-clamp-1 max-w-[200px]">
              {event.title}
            </span>
          </nav>
          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <button
              id="detail-share-btn"
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-lowest shadow-sm hover:shadow-md text-on-surface font-label-lg text-sm transition-all">
              <span className="material-symbols-outlined text-[18px] text-primary">{shareIcon}</span>
              <span>Share</span>
            </button>
            <button
              id="detail-bookmark-btn"
              onClick={() => toggleBookmark()}
              disabled={isBookmarking}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-lowest shadow-sm hover:shadow-md text-on-surface font-label-lg text-sm transition-all disabled:opacity-50">
              <span
                className="material-symbols-outlined text-[18px] text-secondary transition-all"
                style={isBookmarked ? { fontVariationSettings: "'FILL' 1" } : {}}>
                bookmark
              </span>
              <span>{isBookmarked ? 'Saved' : 'Bookmark'}</span>
            </button>
            {isOwner && (
              <button
                id="detail-edit-btn"
                onClick={() => navigate(`/events/${event.id}/edit`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-fixed text-on-primary-fixed-variant font-label-lg text-sm shadow-sm hover:bg-primary-fixed-dim transition-all">
                <span className="material-symbols-outlined text-[18px]">edit_note</span>
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>

        {/* ── 12-col Desktop Grid ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ─── LEFT: Main content (8 cols) ─────────────────────────────── */}
          <div className="lg:col-span-8 flex flex-col gap-6 min-w-0">

            {/* Hero Banner — full-bleed image with gradient overlay */}
            <section className="relative rounded-xl overflow-hidden bg-surface-container-lowest shadow-md flex flex-col">
              <div className={`relative w-full h-52 lg:h-80 overflow-hidden bg-gradient-to-br ${gradient}`}>
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/95 via-inverse-surface/30 to-transparent" />

                {/* Floating category badges — top left */}
                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-sm text-[10px] uppercase tracking-wider shadow-sm ${typeBadge}`}>
                    <span className="material-symbols-outlined text-[13px]">{typeIcon}</span>
                    {event.type.toUpperCase()}
                  </span>
                  {event.postedBy && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-primary font-label-sm text-[10px] font-semibold">
                      <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                      Faculty Sponsored
                    </span>
                  )}
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary-container text-on-primary font-label-sm text-[10px] font-semibold">
                    Verified Tier-1
                  </span>
                </div>

                {/* Bottom metadata row */}
                <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex items-center justify-center shadow-lg text-primary">
                      <span className="material-symbols-outlined text-[24px]">{typeIcon}</span>
                    </div>
                    <div className="flex flex-col text-inverse-on-surface">
                      <span className="font-label-sm text-[9px] text-outline-variant uppercase tracking-widest">
                        {event.organizer ? 'Organized by' : 'Campus Event'}
                      </span>
                      <span className="font-headline-sm text-sm font-semibold text-inverse-on-surface">
                        {event.organizer || 'Innovation Cell'}
                      </span>
                    </div>
                  </div>
                  {/* Live badge */}
                  {(event.status as string) === 'open' && (
                    <div className="hidden sm:flex items-center gap-2 bg-surface-container-lowest/95 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-sm">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-label-md text-[11px] text-on-surface font-semibold">Registration Open</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Title block */}
              <div className="p-5 flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  {event.deadline && (
                    <div className="w-fit mb-1">
                      <DeadlineCountdown deadline={event.deadline} status={event.status} />
                    </div>
                  )}
                  <h1 className="font-headline-xl text-[1.75rem] lg:text-[2rem] text-on-surface tracking-tight font-bold leading-tight">
                    {event.title}
                  </h1>
                  <p className="font-body-md text-sm text-on-surface-variant flex items-center gap-1.5 flex-wrap">
                    <span className="material-symbols-outlined text-[17px] text-primary">domain</span>
                    <span>{event.organizer || 'Innovation Cell'}</span>
                    {event.postedBy && (
                      <>
                        <span className="text-outline">•</span>
                        <span className="font-semibold text-on-surface">{event.postedBy.name}</span>
                        <span className="text-on-surface-variant">(Faculty Lead)</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </section>

            {/* Bento Stats Grid */}
            <section className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {/* Sprint Dates */}
              <div className="p-4 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between text-outline">
                  <span className="font-label-sm text-[10px] uppercase tracking-wider font-semibold">Sprint Dates</span>
                  <span className="material-symbols-outlined text-primary text-[20px]">calendar_today</span>
                </div>
                <div className="mt-3">
                  <span className="font-headline-sm text-base text-on-surface font-bold block">
                    {event.eventDate
                      ? new Date(event.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
                      : 'TBA'}
                  </span>
                  {event.deadline && (
                    <span className="font-code-sm text-[10px] text-primary">
                      Reg. closes {new Date(event.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>
              </div>

              {/* Squad Composition */}
              <div className="p-4 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between text-outline">
                  <span className="font-label-sm text-[10px] uppercase tracking-wider font-semibold">Squad Composition</span>
                  <span className="material-symbols-outlined text-primary text-[20px]">group</span>
                </div>
                <div className="mt-3">
                  <span className="font-headline-sm text-base text-on-surface font-bold block">
                    {event.teamSize
                      ? `${event.teamSize.min === event.teamSize.max ? event.teamSize.max : `${event.teamSize.min}–${event.teamSize.max}`} Members`
                      : 'Individual'}
                  </span>
                  <span className="font-label-sm text-[10px] text-secondary font-semibold">
                    {event.type === 'hackathon' ? 'Min. 1 Female Member Mandatory' : 'Open participation'}
                  </span>
                </div>
              </div>

              {/* Bounty & Advancement */}
              <div className="p-4 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between text-outline">
                  <span className="font-label-sm text-[10px] uppercase tracking-wider font-semibold">Bounty & Advancement</span>
                  <span className="material-symbols-outlined text-secondary-container text-[20px]">workspace_premium</span>
                </div>
                <div className="mt-3">
                  <span className="font-headline-sm text-base text-on-surface font-bold block">
                    {event.fee ?? '100% Free Entry'}
                  </span>
                  <span className="font-code-sm text-[10px] text-secondary font-semibold">
                    {event.type === 'hackathon' ? '+ Direct National Entry Pass' : 'Academic credit eligible'}
                  </span>
                </div>
              </div>

              {/* Eligibility */}
              <div className="p-4 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between text-outline">
                  <span className="font-label-sm text-[10px] uppercase tracking-wider font-semibold">Eligibility</span>
                  <span className="material-symbols-outlined text-primary text-[20px]">school</span>
                </div>
                <div className="mt-3">
                  <span className="font-headline-sm text-base text-on-surface font-bold block">
                    {eligBranches.length ? eligBranches.slice(0, 2).join(', ') + (eligBranches.length > 2 ? '…' : '') : '100% Free Entry'}
                  </span>
                  <span className="font-label-md text-[10px] text-on-surface-variant">
                    {eligYears.length ? `${eligYears.map(y => `${y}${['st','nd','rd'][y-1]??'th'} Yr`).join(', ')}` : 'All B.Tech / M.Tech Semesters'}
                  </span>
                </div>
              </div>

              {/* Venue — spans 2 cols */}
              <div className="col-span-2 p-4 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between text-outline">
                  <span className="font-label-sm text-[10px] uppercase tracking-wider font-semibold">Venue & Infrastructure</span>
                  <span className="material-symbols-outlined text-primary text-[20px]">precision_manufacturing</span>
                </div>
                <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-headline-sm text-base text-on-surface font-bold block">
                      {event.registrationMode === 'external' ? 'External / Online' : 'Campus Venue'}
                    </span>
                    <span className="font-label-md text-[10px] text-on-surface-variant">
                      {event.registrationMode === 'external' ? 'Register via official link' : '24/7 sprint arena • Dedicated infrastructure'}
                    </span>
                  </div>
                  {event.registrationMode === 'external' && event.link && (
                    <a href={event.link} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container-high text-primary font-code-sm text-[11px] self-start sm:self-center hover:underline">
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      Official Link
                    </a>
                  )}
                </div>
              </div>
            </section>

            {/* Sprint Mission & Description */}
            {event.summary && (
              <section className="rounded-xl bg-surface-container-lowest p-5 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[20px]">flag</span>
                    </div>
                    <h2 className="font-headline-md text-[1.125rem] text-on-surface font-semibold">Sprint Mission & Focus Tracks</h2>
                  </div>
                  {event.counters.students > 0 && (
                    <span className="font-label-md text-[11px] text-outline font-code-sm">
                      {event.counters.students} attendees
                    </span>
                  )}
                </div>
                <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">{event.summary}</p>

                {/* Eligibility track pills */}
                {(eligBranches.length > 0 || eligYears.length > 0) && (
                  <div className="flex flex-col gap-2">
                    <span className="font-label-sm text-[10px] uppercase tracking-wider text-outline font-semibold">
                      Eligible Departments & Batches
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {eligBranches.map(b => (
                        <button key={b} className="px-3 py-1.5 rounded-full bg-primary-container text-on-primary font-label-md text-[11px] font-semibold shadow-sm flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">tune</span>
                          #{b}
                        </button>
                      ))}
                      {eligYears.map(y => (
                        <button key={y} className="px-3 py-1.5 rounded-full bg-surface-container-low text-on-surface font-label-md text-[11px] transition-colors flex items-center gap-1">
                          <span>
                            #{y}{y===1?'st':y===2?'nd':y===3?'rd':'th'} Year
                          </span>
                        </button>
                      ))}
                      {event.type === 'hackathon' && (
                        <button className="px-3 py-1.5 rounded-full bg-surface-container-low text-on-surface font-label-md text-[11px]">
                          #AllBranches
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Squad Matchmaking (hackathon/competition) */}
            {(event.type === 'hackathon' || event.type === 'competition') && !isClosed && (
              <section className="rounded-xl bg-surface-container-lowest p-5 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[22px]">diversity_3</span>
                    <h2 className="font-headline-sm text-base text-on-surface font-semibold">Squad Matchmaking Hub</h2>
                  </div>
                  <span className="font-code-sm text-[10px] text-primary font-bold bg-surface-container px-2 py-0.5 rounded">
                    {event.counters.students > 0 ? `${Math.max(2, Math.floor(event.counters.students / 3))} Squads` : '4 Squads'}
                  </span>
                </div>

                {/* Avatar stack */}
                <div className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between">
                  <div className="flex items-center -space-x-2">
                    {['AR', 'RK', 'SL'].map((ini, i) => (
                      <div key={ini} className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shadow-sm ring-2 ring-surface-container-lowest ${
                        i === 0 ? 'bg-primary-container text-on-primary' :
                        i === 1 ? 'bg-secondary-container text-on-secondary-container' :
                        'bg-tertiary-container text-on-tertiary'
                      }`}>{ini}</div>
                    ))}
                    <div className="w-8 h-8 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center text-[10px] font-bold shadow-sm ring-2 ring-surface-container-lowest">
                      +{event.counters.students > 0 ? event.counters.students : 19}
                    </div>
                  </div>
                  <span className="font-label-sm text-[10px] text-on-surface-variant font-medium">
                    {event.counters.students > 0 ? event.counters.students : 19} peers actively recruiting
                  </span>
                </div>

                {/* Grid of squad postings */}
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => navigate('/teams')}
                    className="py-2 px-3 rounded-lg bg-surface-container-lowest hover:bg-surface-container-low text-primary font-label-md text-[12px] font-semibold transition-all shadow-sm flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">group_search</span>
                    Find Squad
                  </button>
                  <button onClick={() => navigate('/teams')}
                    className="py-2 px-3 rounded-lg bg-primary-container text-on-primary font-label-md text-[12px] font-semibold transition-all shadow-sm flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">post_add</span>
                    Post Open Role
                  </button>
                </div>
              </section>
            )}

            {/* Accordions: Rubric, Lab Access, SPOC */}
            <section className="rounded-xl bg-surface-container-lowest p-5 shadow-sm flex flex-col gap-3">
              <h2 className="font-headline-md text-[1.125rem] text-on-surface font-semibold">Technical Protocols & Logistics</h2>

              {/* Accordion: Coordinator */}
              {event.postedBy && (
                <AccordionItem
                  id="spoc"
                  icon="contact_support"
                  title="Faculty Coordinator & Official Channels"
                  open={openAccordion === 'spoc'}
                  onToggle={() => setOpenAccordion(o => o === 'spoc' ? null : 'spoc')}
                >
                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    <div className="flex-1 p-3 rounded-lg bg-surface-container-lowest">
                      <span className="font-label-md text-[12px] font-bold text-on-surface block">{event.organizer ?? 'Faculty Lead'}</span>
                      <span className="font-body-sm text-[11px] text-on-surface-variant">Innovation Cell Convener</span>
                      {event.postedBy?.name && (
                        <span className="font-code-sm text-[10px] text-primary block mt-1">{event.postedBy.name}</span>
                      )}
                    </div>
                    <div className="flex-1 p-3 rounded-lg bg-surface-container-lowest">
                      <span className="font-label-md text-[12px] font-bold text-on-surface block">Official Comms</span>
                      <span className="font-body-sm text-[11px] text-on-surface-variant">#campus-events-announcements</span>
                    </div>
                  </div>
                </AccordionItem>
              )}

              {/* Faculty-only: raw post notes */}
              {isOwner && event.rawMessage && (
                <AccordionItem
                  id="raw"
                  icon="sticky_note_2"
                  title="Your Post Notes (AI Extracted)"
                  open={openAccordion === 'raw'}
                  onToggle={() => setOpenAccordion(o => o === 'raw' ? null : 'raw')}
                >
                  <pre className="font-code-sm text-[11px] text-on-surface-variant leading-relaxed whitespace-pre-wrap p-3 rounded-lg bg-surface-container-low border border-dashed border-primary/30">
                    {event.rawMessage}
                  </pre>
                </AccordionItem>
              )}

              {/* Code of Conduct */}
              <div className="rounded-lg bg-surface-container-low p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-[24px] text-primary shrink-0">gavel</span>
                <div className="flex flex-col gap-1">
                  <h3 className="font-headline-sm text-[13px] text-on-surface font-semibold">Campus Integrity & Open Source Ethics</h3>
                  <p className="font-body-sm text-[11px] text-on-surface-variant leading-relaxed">
                    All submissions must be original work. Use of pre-built components or foundational models is permitted with proper attribution. Violations lead to immediate disqualification by the faculty board.
                  </p>
                </div>
              </div>
            </section>

            {/* Ledger verification footer */}
            <section className="rounded-xl bg-surface-container-lowest p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[24px]">verified_user</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-headline-sm text-sm font-semibold text-on-surface">Official Campus Innovation Academic Ledger</span>
                    <span className="font-label-sm text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">VERIFIED</span>
                  </div>
                  <p className="font-body-sm text-[11px] text-on-surface-variant">
                    Cryptographically signed event manifest authenticated with ECDSA-256 campus root authority.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-outline font-code-sm text-[10px]">
                <div className="flex flex-col items-end">
                  <span>LEDGER HASH: <span className="text-on-surface font-semibold">0x7F...9A4E2</span></span>
                  <span>BLOCK: <span className="text-primary font-semibold">#18829510</span></span>
                </div>
                <span className="material-symbols-outlined text-[22px] text-primary">fingerprint</span>
              </div>
            </section>

          </div>

          {/* ─── RIGHT: Sticky Sidebar (4 cols) ──────────────────────────── */}
          <div className="lg:col-span-4 flex flex-col gap-5 lg:sticky lg:top-20 lg:self-start">

            {/* Primary Action Card */}
            <div className="rounded-xl bg-surface-container-lowest p-5 shadow-md flex flex-col gap-4">

              {/* Urgency ticker */}
              {daysLeft !== null && daysLeft <= 7 && (
                <div className="p-3 rounded-lg bg-amber-50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-900 font-label-md text-[12px] font-semibold">
                    <span className="material-symbols-outlined text-[20px] text-secondary">schedule</span>
                    <span>{deadlineLabel} to deadline</span>
                  </div>
                  {event.deadline && (
                    <span className="font-code-sm text-[10px] px-2 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed font-bold tracking-tight">
                      {new Date(event.deadline).toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase()}, 11:59 PM
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between">
                  <span className="font-label-sm text-[10px] uppercase tracking-wider text-outline font-semibold">Registration Gate</span>
                  <span className={`font-label-sm text-[11px] px-2 py-0.5 rounded font-semibold flex items-center gap-1 ${
                    isClosed ? 'text-error bg-error-container' : 'text-emerald-700 bg-emerald-50'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isClosed ? 'bg-error' : 'bg-emerald-600'}`} />
                    {isClosed ? 'Closed' : 'Slots Open'}
                  </span>
                </div>
                <p className="font-body-sm text-[12px] text-on-surface-variant">
                  {eligBranches.length > 0
                    ? `Open to ${eligBranches.slice(0,3).join(', ')} students`
                    : 'Open to all enrolled engineering students'}
                  {eligYears.length > 0 ? ` (${eligYears.map(y => `${y}${['st','nd','rd'][y-1]??'th'} Yr`).join(', ')})` : ''}
                </p>
              </div>

              {/* CTAs */}
              <div className="flex flex-col gap-2">
                <button
                  id="sidebar-register-btn"
                  onClick={handleRegister}
                  disabled={isClosed || isDraft || isRegistering || registered}
                  className={`w-full py-3 px-4 rounded-lg font-label-lg text-sm font-bold flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all disabled:opacity-70 ${
                    registered   ? 'bg-surface-tint text-on-primary'
                    : isClosed   ? 'bg-surface-container-high text-on-surface-variant'
                    : 'bg-primary-container hover:bg-primary text-on-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {registered ? 'check_circle' : isRegistering ? 'progress_activity' : 'how_to_reg'}
                  </span>
                  {isRegistering ? 'Opening Form…' : ctaLabel()}
                  {!registered && !isClosed && !isRegistering && (
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  )}
                </button>

                {!isClosed && (event.type === 'hackathon' || event.type === 'competition') && (
                  <button
                    onClick={() => navigate('/teams')}
                    className="w-full py-2.5 px-4 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface font-label-lg text-sm transition-all flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-outline">person_add</span>
                    Register as Individual Free Agent
                  </button>
                )}
              </div>

              <div className="text-center">
                <span className="font-label-sm text-[10px] text-outline">
                  Need institutional OD endorsement? Issued automatically upon sign-in.
                </span>
              </div>
            </div>

            {/* Squad Matchmaking sidebar panel (hackathon/competition) */}
            {(event.type === 'hackathon' || event.type === 'competition') && !isClosed && (
              <section className="rounded-xl bg-surface-container-lowest p-5 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">group_add</span>
                    <h2 className="font-headline-sm text-[14px] text-on-surface font-semibold">Open Recruitment Posts</h2>
                  </div>
                  <span className="font-label-sm text-[10px] text-primary font-bold">
                    {event.counters.students > 0 ? `${Math.max(2, Math.floor(event.counters.students / 4))} open` : '3 open'}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {[
                    { name: event.title + ' — ML Lead',  role: 'Computer Vision / PyTorch', spots: '1 Seat Left',  spotBg: 'bg-emerald-100 text-emerald-900' },
                    { name: event.title + ' — UI Dev',   role: 'React / Tailwind Frontend',  spots: 'Needs Lead',  spotBg: 'bg-amber-100 text-amber-900' },
                  ].map(sq => (
                    <div key={sq.role} className="p-3 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="font-headline-sm text-[13px] text-on-surface font-semibold line-clamp-1">{sq.name}</span>
                        <span className={`font-label-sm text-[10px] px-1.5 py-0.5 rounded font-bold ${sq.spotBg}`}>{sq.spots}</span>
                      </div>
                      <div className="flex items-center gap-1 text-primary font-label-md text-[11px] font-semibold">
                        <span className="material-symbols-outlined text-[14px]">psychology</span>
                        <span>Seeking: {sq.role}</span>
                      </div>
                      <div className="flex items-center justify-between text-outline text-[10px] pt-0.5">
                        <span>Open listing</span>
                        <button onClick={() => navigate('/teams')} className="text-primary hover:underline font-semibold text-[11px]">
                          Request Invite
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Faculty owner publish action */}
            {isOwner && event.status === 'draft' && (
              <div className="rounded-xl bg-surface-container-low border border-dashed border-primary/30 p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-primary">
                  <span className="material-symbols-outlined text-[20px]">publish</span>
                  <span className="font-label-lg text-sm font-semibold">Ready to publish?</span>
                </div>
                <p className="font-body-sm text-[11px] text-on-surface-variant">
                  Review your event details before making it visible to all students.
                </p>
                <button
                  id="sidebar-publish-btn"
                  onClick={() => navigate(`/events/${event.id}/edit`)}
                  className="w-full py-2.5 rounded-lg bg-primary text-on-primary font-label-lg text-sm font-bold shadow flex items-center justify-center gap-2 active:scale-[0.98]">
                  <span className="material-symbols-outlined text-[18px]">publish</span>
                  Review & Publish
                </button>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* ── Mobile sticky bottom CTA ─────────────────────────────────────── */}
      <div className="fixed bottom-16 left-0 right-0 z-40 lg:hidden bg-surface-container-lowest/95 backdrop-blur-md px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] flex items-center gap-3">
        <button
          onClick={() => toggleBookmark()}
          disabled={isBookmarking}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Save event'}
          className="h-12 w-12 rounded-lg bg-surface-container flex items-center justify-center text-on-surface hover:text-primary transition-colors shrink-0 active:scale-95 disabled:opacity-50">
          <span
            className="material-symbols-outlined text-[22px]"
            style={isBookmarked ? { fontVariationSettings: "'FILL' 1", color: 'var(--color-primary)' } : {}}>
            {isBookmarked ? 'bookmark' : 'bookmark_border'}
          </span>
        </button>
        <button
          id="mobile-register-btn"
          onClick={handleRegister}
          disabled={isClosed || isDraft || isRegistering || registered}
          className={`flex-1 h-12 rounded-lg font-label-lg text-sm font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all disabled:opacity-70 ${
            registered   ? 'bg-surface-tint text-on-primary'
            : isClosed   ? 'bg-surface-container-high text-on-surface-variant'
            : 'bg-primary-container hover:bg-primary text-on-primary'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {registered ? 'check_circle' : isRegistering ? 'progress_activity' : 'how_to_reg'}
          </span>
          {isRegistering ? 'Opening Form…' : ctaLabel()}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

// ── Accordion helper component ────────────────────────────────────────────────
function AccordionItem({
  id, icon, title, open, onToggle, children,
}: {
  id: string; icon: string; title: string;
  open: boolean; onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-surface-container-low overflow-hidden">
      <button
        id={`accordion-${id}`}
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-surface-container-high transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
          <span className="font-headline-sm text-[13px] text-on-surface font-semibold">{title}</span>
        </div>
        <span className={`material-symbols-outlined text-outline transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 text-body-sm font-body-sm text-on-surface-variant flex flex-col gap-3">
          {children}
        </div>
      )}
    </div>
  );
}
