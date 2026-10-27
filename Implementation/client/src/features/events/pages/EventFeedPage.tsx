import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useEvents } from '../hooks/useEvents';
import { useAuth } from '@/features/auth/context/AuthContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { AppBar } from '@/components/layout/AppBar';
import type { EventType } from '../types';

// ── Category pills config ─────────────────────────────────────────────────────
const CATEGORY_PILLS = [
  { key: 'all',         label: 'All Events',         count: 24, icon: 'apps',                    iconColor: 'text-on-primary' },
  { key: 'hackathon',   label: 'Hackathons',          count: 8,  icon: 'terminal',                iconColor: 'text-tertiary' },
  { key: 'sports',      label: 'Sports & Athletics',  count: 4,  icon: 'sports_soccer',           iconColor: 'text-secondary' },
  { key: 'workshop',    label: 'Hands-on Workshops',  count: 6,  icon: 'precision_manufacturing', iconColor: 'text-primary' },
  { key: 'seminar',     label: 'Seminars & Talks',    count: 4,  icon: 'record_voice_over',       iconColor: 'text-tertiary' },
  { key: 'other',       label: 'Research Sprints',    count: 2,  icon: 'biotech',                 iconColor: 'text-primary' },
] as const;

type CategoryKey = typeof CATEGORY_PILLS[number]['key'];

// ── Dummy sidebar data ────────────────────────────────────────────────────────
const DUMMY_DEADLINES = [
  { day: 'Fri', date: 24, title: 'SIH Prelims Squad Locks',      sub: '11:59 PM • Mandatory Submission', urgent: true },
  { day: 'Tue', date: 28, title: 'ROS2 Bootcamp Check-in',       sub: '09:00 AM • Mechatronics Lab B-204', urgent: false },
  { day: 'Thu', date: 30, title: 'Football Roster Registration',  sub: '05:00 PM • HOD Seal Required',   urgent: false },
];

const DUMMY_SQUAD_OPENINGS = [
  { team: 'Team NeuralNexus (SIH \'26)', role: 'ML Engineer',     roleClass: 'bg-tertiary-fixed text-on-tertiary-fixed', desc: 'Needs PyTorch / FastAPI specialist for edge pipeline.',              confirmed: '3/6' },
  { team: 'AeroNav Labs (Drone Camp)',   role: 'Hardware Tech',    roleClass: 'bg-primary-fixed text-on-primary-fixed',   desc: 'Seeking partner with STM32 / solder bench experience.',           confirmed: '1/2' },
  { team: 'Mech Titans (7-a-Side)',      role: 'Goalkeeper',       roleClass: 'bg-secondary-fixed text-on-secondary-fixed', desc: 'Mechanical Dept squad seeking starting goalkeeper.',            confirmed: '8/10' },
];

// ── Dummy event articles (reference-style rich cards) ─────────────────────────
const DUMMY_ARTICLES = [
  {
    id: 'art1',
    type: 'featured',
    tags: [
      { label: 'Hackathon • SIH-26 Prelims', icon: 'flag', cls: 'bg-tertiary-fixed text-on-tertiary-fixed' },
      { label: 'Faculty Sponsored',           icon: 'verified', cls: 'bg-primary-fixed text-on-primary-fixed' },
    ],
    urgency: { label: '2 days left (Closes Fri 11:59 PM)', icon: 'timer', cls: 'bg-secondary-fixed text-on-secondary-fixed animate-pulse' },
    title: 'Smart India Hackathon 2026 – Campus Prelims',
    org: 'Dept. of Computer Science & Innovation Council',
    mentor: 'Lead Mentor: Dr. V. Ramanathan',
    desc: 'The official campus qualifying phase for SIH 2026. Top 3 shortlisted student squads receive institutional hardware sponsorships, rapid prototyping lab access, and direct entry to the national ministry track.',
    specs: [
      { label: 'Team Size', value: '6 members', valueClass: 'text-on-surface' },
      { label: 'Prize Bounty', value: '₹1,50,000', valueClass: 'text-secondary' },
      { label: 'Location / Venue', value: 'Main Auditorium', valueClass: 'text-on-surface' },
      { label: 'Format', value: 'Hybrid 36-Hr Sprint', valueClass: 'text-on-surface' },
    ],
    squadAvatars: ['AK', 'SN'],
    squadText: '14 squads forming now',
    ctaLink: 'Details & Guidelines',
    cta: 'Apply Now',
    accent: 'from-primary via-primary-container to-secondary-container',
  },
  {
    id: 'art2',
    type: 'workshop',
    tags: [
      { label: 'Hands-on Workshop • Oct 28', icon: 'psychology', cls: 'bg-primary-fixed-dim/40 text-primary' },
      { label: 'Mechatronics Lab B-204', icon: null, cls: 'bg-surface-container text-on-surface-variant' },
    ],
    urgency: { label: '4 spots remaining', icon: 'circle', cls: 'bg-error-container text-on-error-container font-semibold', ping: true },
    title: 'ROS2 & Autonomous Drone Navigation Bootcamp',
    org: 'Robotics & Automation Club • Division of Mechatronics Research',
    mentor: null,
    desc: 'Intensive 2-day session covering micro-ROS telemetry, SLAM point-cloud mapping, and PX4 autopilot configuration. Dev-kits and quadcopter testbeds provided for all participants.',
    ribbon: [
      { icon: 'groups', label: 'Solo or Pairs', cls: 'text-primary' },
      { icon: 'card_membership', label: 'Lab Certification Issued', cls: 'text-tertiary' },
      { icon: 'memory', label: 'Hardware dev-kit provided', cls: 'text-secondary' },
      { icon: 'check_circle', label: 'Free for Enrolled Students', cls: 'text-primary' },
    ],
    prereq: 'Prerequisites: C++ or Python basics',
    ctaLink: 'View Syllabus',
    cta: 'Reserve Spot',
    ctaIcon: 'airplane_ticket',
  },
  {
    id: 'art3',
    type: 'sports',
    tags: [
      { label: 'Sports & Athletics • League', icon: 'sports_soccer', cls: 'bg-secondary-fixed text-on-secondary-fixed' },
      { label: 'South Sports Arena (Floodlights)', icon: null, cls: 'bg-surface-container text-on-surface-variant' },
    ],
    urgency: { label: '5 days left to register', icon: 'schedule', cls: 'bg-surface-container-high text-on-surface', ping: false },
    title: 'Inter-Department 7-a-Side Football Tournament',
    org: 'Campus Sports Council & Division of Physical Education',
    mentor: null,
    desc: 'Annual inter-branch knockout championship. Open exclusively to official branch-endorsed squads. Refereed by regional football federation officials with live drone streaming on the campus portal.',
    specs: [
      { label: 'Squad Roster', value: '7–10 Players', valueClass: 'text-on-surface' },
      { label: 'Prize', value: 'Rolling Trophy + Medals', valueClass: 'text-secondary' },
      { label: 'Fixtures', value: 'Nov 2–4', valueClass: 'text-on-surface' },
      { label: 'Entry Cap', value: '16 Branches', valueClass: 'text-on-surface' },
    ],
    findLink: 'Find Players & Open Tryouts',
    ctaLink: 'Tournament Rules',
    cta: 'Register Squad',
    ctaIcon: 'sports_soccer',
  },
  {
    id: 'art4',
    type: 'seminar',
    tags: [
      { label: 'Seminar & Keynote • Tomorrow, 2:00 PM', icon: 'podium', cls: 'bg-tertiary-fixed text-on-tertiary-fixed' },
      { label: 'Seminar Hall 1 • AC Block', icon: null, cls: 'bg-surface-container text-on-surface-variant' },
    ],
    urgency: { label: '142 students registered', icon: 'group', cls: 'text-on-surface-variant', plain: true },
    title: 'From Campus Capstone to Seed Funding: Alumni Talk',
    org: 'Hosted by E-Cell & Department of ECE • Speaker: Tanya Rao (Co-founder, Kinesis AI, Batch of \'22)',
    mentor: null,
    desc: 'A raw retrospective on converting institutional final-year engineering projects into institutional IP, securing angels, surviving pre-seed rounds, and working with university incubators.',
    perks: [
      { icon: 'coffee', label: 'High Tea & Networking' },
      { icon: 'school', label: '3rd & 4th Year Priority' },
    ],
    ctaLink: 'Add to Calendar',
    ctaLinkIcon: 'calendar_add_on',
    cta: 'RSVP Attending',
    ctaIcon: 'check',
  },
];

const DUMMY_ARCHIVED = {
  tag: 'Registration Concluded • Oct 12',
  type: 'Competitive Coding',
  title: 'ACM-ICPC Regional Warm-up Contest',
  meta: 'Dept of CSE & Algorithmic Society • 64 Teams competed • Final ranklist verified',
};

// ── EventFeedPage ─────────────────────────────────────────────────────────────
export default function EventFeedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isFaculty = user?.role === 'faculty' || user?.role === 'dept_head' || user?.role === 'admin';

  const [searchQuery, setSearchQuery]       = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');
  const [viewMode, setViewMode]             = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy]                 = useState('deadline');

  // ⌘K focus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('events-search-input')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // API data (real events, if any)
  const apiType = activeCategory === 'all' ? undefined : [activeCategory as EventType];
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useEvents({ type: apiType });
  const allEvents = data?.pages.flatMap(p => p.items) ?? [];
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return allEvents;
    const q = searchQuery.toLowerCase();
    return allEvents.filter(evt => `${evt.title} ${evt.organizer ?? ''} ${evt.type}`.toLowerCase().includes(q));
  }, [allEvents, searchQuery]);
  const hasFilters = searchQuery.trim() !== '' || activeCategory !== 'all';
  const clearAll = useCallback(() => { setSearchQuery(''); setActiveCategory('all'); }, []);

  // Show dummy articles when API returns no events (no backend data)
  const showDummy = !isLoading && filteredEvents.length === 0 && !hasFilters;

  // Typed dummy article refs — destructure to avoid TS18048 noUncheckedIndexedAccess
  const [art1, art2, art3, art4] = DUMMY_ARTICLES as [
    typeof DUMMY_ARTICLES[0],
    typeof DUMMY_ARTICLES[1],
    typeof DUMMY_ARTICLES[2],
    typeof DUMMY_ARTICLES[3],
  ];
  const art1specs   = art1.specs        ?? [];
  const art1avatars = art1.squadAvatars ?? [];
  const art2ribbon  = art2.ribbon       ?? [];
  const art3specs   = art3.specs        ?? [];
  const art4perks   = art4.perks        ?? [];

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased">
      <AppBar subtitle={isFaculty ? 'Faculty Portal' : 'Student Incubator'} />

      <main className="w-full pt-16 max-w-7xl mx-auto px-6 lg:px-8 pb-28 lg:pb-12">

        {/* ── Breadcrumb ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 font-label-md text-label-md text-on-surface-variant pt-4 pb-3">
          <Link to="/home" className="hover:text-primary transition-colors">Campus Ledger</Link>
          <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
          <Link to="/events" className="hover:text-primary transition-colors">Events</Link>
          <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
          <span className="text-primary font-semibold">All Campus Opportunities</span>
        </div>

        {/* ── Title + action bar ────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5">
          <div className="space-y-1 max-w-3xl">
            <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
              Explore Campus Opportunities &amp; Tech Sprints
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Browse 24 active hackathons, research lab sprints, robotics bootcamps, and inter-department leagues across campus labs.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button id="events-subscribed-btn"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-lg text-label-lg shadow-sm transition-all">
              <span className="material-symbols-outlined text-[18px] text-primary">bookmark_manager</span>
              <span>Subscribed Feeds</span>
              <span className="px-1.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-code-sm text-code-sm">3</span>
            </button>
            <button id="propose-event-btn" onClick={() => navigate('/events/new')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg shadow-md transition-all active:scale-[0.98]">
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              <span>{isFaculty ? 'Post Event' : 'Propose Event'}</span>
            </button>
            <div className="flex items-center p-1 rounded-lg bg-surface-container-low shadow-sm">
              <button title="Grid View" onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
              </button>
              <button title="Calendar View" onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>
                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Filter Console ────────────────────────────────────────────── */}
        <div className="w-full flex flex-col gap-3 p-4 rounded-xl bg-surface-container-lowest shadow-sm mb-6">

          {/* Search bar */}
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[22px]">search</span>
            <input
              id="events-search-input"
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by title, department, lab code, faculty sponsor, or tech stack..."
              className="w-full h-12 pl-12 pr-28 rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline font-body-md text-body-md focus:outline-none focus:bg-surface-container-lowest shadow-inner transition-all focus:ring-2 focus:ring-primary/20"
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery ? (
                <button onClick={() => setSearchQuery('')} className="p-1 text-outline hover:text-on-surface" aria-label="Clear">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              ) : (
                <>
                  <kbd className="px-2 py-0.5 rounded bg-surface text-on-surface-variant font-code-sm text-code-sm shadow-sm">⌘K</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-surface text-on-surface-variant font-code-sm text-code-sm shadow-sm">/</kbd>
                </>
              )}
            </div>
          </div>

          {/* Category pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORY_PILLS.map(pill => {
              const isActive = pill.key === activeCategory;
              return (
                <button key={pill.key} id={`filter-${pill.key}`} onClick={() => setActiveCategory(pill.key)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-label-md text-label-md transition-all active:scale-95 whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
                      : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
                  }`}>
                  <span className={`material-symbols-outlined text-[16px] ${isActive ? 'text-on-primary' : pill.iconColor}`}>{pill.icon}</span>
                  <span>{pill.label}</span>
                  <span className={`font-code-sm text-code-sm ${isActive ? '' : 'text-outline'}`}>{pill.count}</span>
                </button>
              );
            })}
          </div>

          {/* Secondary filter row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { label: 'Branch:', value: 'CSE, ECE, Mech, IT, AI/DS' },
                { label: 'Eligibility:', value: 'All Semesters / 2nd & 3rd Yr' },
                { label: 'Mode:', value: 'In-Person & Hybrid' },
              ].map(f => (
                <button key={f.label} className="h-9 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center gap-1.5 font-label-sm text-label-sm transition-colors">
                  <span className="text-outline">{f.label}</span>
                  <span className="font-semibold">{f.value}</span>
                  <span className="material-symbols-outlined text-[16px] text-outline">expand_more</span>
                </button>
              ))}
              <button className="h-9 px-3 rounded-lg bg-secondary-fixed/50 hover:bg-secondary-fixed text-on-secondary-fixed flex items-center gap-1.5 font-label-sm text-label-sm transition-colors">
                <span className="w-2 h-2 rounded-full bg-secondary" />
                <span className="font-semibold">Closing Soon (3)</span>
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-outline font-label-sm text-label-sm">Sort by:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="bg-surface-container-low text-on-surface rounded-lg px-2.5 py-1.5 focus:outline-none font-label-md text-label-md cursor-pointer border-0">
                <option value="deadline">Deadline (Soonest first)</option>
                <option value="prize">Prize Pool / Bounty</option>
                <option value="recent">Recently Added</option>
              </select>
            </div>
          </div>

          {/* Active filter summary strip */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-container-low/60 font-label-md text-label-md text-on-surface-variant">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-primary">filter_alt</span>
              <span>
                Showing <strong className="text-on-surface">24 events</strong> across campus labs &amp; sports arena •{' '}
                <span className="text-secondary font-semibold">3 closing in &lt;48h</span>
              </span>
            </div>
            <button onClick={clearAll} className="text-primary hover:underline font-label-sm text-label-sm cursor-pointer">Reset Filters</button>
          </div>
        </div>

        {/* ── 12-col grid ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT: Event cards (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-5">

            {/* Loading */}
            {isLoading && (
              <div className="flex flex-col gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-48 rounded-xl bg-surface-container-high animate-pulse" />
                ))}
              </div>
            )}

            {/* Error */}
            {isError && !isLoading && (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <span className="material-symbols-outlined text-5xl text-outline">wifi_off</span>
                <p className="font-body-md text-body-md text-on-surface-variant">Couldn't load events. Please check your connection.</p>
                <button id="events-retry-btn" onClick={() => refetch()}
                  className="px-4 py-2 rounded-lg bg-surface-container text-on-surface font-label-lg text-label-lg hover:bg-surface-container-high transition-colors">Retry</button>
              </div>
            )}

            {/* Real API event cards */}
            {!isLoading && !isError && filteredEvents.length > 0 && (
              <>
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'flex flex-col gap-4'}>
                  {filteredEvents.map(event => (
                    <article
                      key={event.id}
                      onClick={() => navigate(`/events/${event.id}`)}
                      className="group bg-surface-container-lowest rounded-xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden cursor-pointer flex flex-col justify-between">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary-container to-secondary-container" />
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm uppercase">{event.type}</span>
                          {event.deadline && (() => {
                            const d = Math.ceil((new Date(event.deadline).getTime() - Date.now()) / 86400000);
                            return (
                              <span className="font-code-sm text-code-sm text-secondary bg-secondary-fixed/50 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">schedule</span>
                                {d <= 0 ? 'Closing today' : `${d}d left`}
                              </span>
                            );
                          })()}
                        </div>
                        <h2 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors leading-snug">{event.title}</h2>
                        {event.organizer && <p className="font-label-md text-label-md text-on-surface-variant mt-1">{event.organizer}</p>}
                      </div>
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-surface-container-high">
                        <button className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface underline" onClick={e => { e.stopPropagation(); navigate(`/events/${event.id}`); }}>Details & Guidelines</button>
                        <button className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors shadow-sm flex items-center gap-1" onClick={e => { e.stopPropagation(); navigate(`/events/${event.id}`); }}>
                          Apply Now <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                {hasNextPage && !searchQuery && (
                  <button id="events-load-more-btn" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}
                    className="w-full py-3 rounded-lg bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-label-lg text-label-lg hover:bg-surface-container-low transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-60">
                    {isFetchingNextPage
                      ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Loading…</>
                      : <><span className="material-symbols-outlined text-[18px]">expand_more</span>Load more events</>
                    }
                  </button>
                )}
              </>
            )}

            {/* Dummy reference-style articles (shown when no real data) */}
            {showDummy && (
              <>
                {/* Article 1: Featured hero */}
                <article className="flex flex-col bg-surface-container-lowest rounded-xl p-6 shadow-md hover:shadow-xl transition-all relative overflow-hidden group">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-primary-container to-secondary-container" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {art1.tags.map(t => (
                        <span key={t.label} className={`px-3 py-0.5 rounded-full font-label-sm text-label-sm uppercase tracking-wide flex items-center gap-1 ${t.cls}`}>
                          <span className="material-symbols-outlined text-[14px]">{t.icon}</span>{t.label}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-code-sm text-code-sm self-start sm:self-auto shadow-sm animate-pulse">
                      <span className="material-symbols-outlined text-[16px] text-secondary">timer</span>
                      <span>{art1.urgency.label}</span>
                    </div>
                  </div>
                  <div className="mb-4">
                    <h2 className="font-headline-lg text-headline-lg text-on-surface group-hover:text-primary transition-colors">{art1.title}</h2>
                    <div className="flex items-center gap-2 mt-1 text-on-surface-variant font-label-md text-label-md">
                      <span className="material-symbols-outlined text-[18px] text-primary">domain</span>
                      <span>{art1.org}</span>
                      <span className="text-outline">•</span>
                      <span className="text-on-surface font-semibold">{art1.mentor}</span>
                    </div>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant mb-4">{art1.desc}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-surface-container-low mb-4">
                    {art1specs.map(s => (
                      <div key={s.label} className="flex flex-col">
                        <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">{s.label}</span>
                        <span className={`font-headline-sm text-headline-sm ${s.valueClass}`}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-1">
                    <div className="flex items-center gap-3 px-2 py-2 pr-4 rounded-lg bg-surface-container-high/60">
                      <div className="flex -space-x-2">
                        {art1avatars.map((av, i) => (
                          <div key={i} className={`w-7 h-7 rounded-full ${i === 0 ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-secondary-fixed text-on-secondary-fixed'} flex items-center justify-center font-label-sm text-label-sm shadow-sm`}>{av}</div>
                        ))}
                        <div className="w-7 h-7 rounded-full bg-surface-container-highest flex items-center justify-center text-outline shadow-sm">
                          <span className="material-symbols-outlined text-[16px]">person_add</span>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-label-sm text-label-sm text-on-surface font-semibold">{art1.squadText}</span>
                        <span className="font-label-sm text-label-sm text-primary hover:underline cursor-pointer">Find or Post Squad →</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                      <button className="px-4 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-lg text-label-lg transition-colors">{art1.ctaLink}</button>
                      <button className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg shadow-md transition-all active:scale-[0.98] flex items-center gap-1.5">
                        <span>{art1.cta}</span>
                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </article>

                {/* Article 2: Workshop */}
                <article className="flex flex-col bg-surface-container-lowest rounded-xl p-6 shadow-sm hover:shadow-md transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {art2.tags.map(t => (
                        <span key={t.label} className={`px-3 py-0.5 rounded-full font-label-sm text-label-sm uppercase tracking-wide flex items-center gap-1 ${t.cls}`}>
                          {t.icon && <span className="material-symbols-outlined text-[14px]">{t.icon}</span>}{t.label}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container font-code-sm text-code-sm font-semibold self-start sm:self-auto">
                      <span className="w-2 h-2 rounded-full bg-error animate-ping" />
                      <span>{art2.urgency.label}</span>
                    </div>
                  </div>
                  <div className="mb-3">
                    <h2 className="font-headline-md text-headline-md text-on-surface">{art2.title}</h2>
                    <span className="font-label-md text-label-md text-on-surface-variant">{art2.org}</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mb-4 line-clamp-2">{art2.desc}</p>
                  <div className="flex flex-wrap items-center gap-4 text-on-surface-variant font-label-sm text-label-sm py-2 border-y border-outline/10 mb-4">
                    {art2ribbon.map(r => (
                      <div key={r.label} className="flex items-center gap-1">
                        <span className={`material-symbols-outlined text-[16px] ${r.cls}`}>{r.icon}</span>
                        <span className={r.icon === 'check_circle' ? 'text-primary font-semibold' : ''}>{r.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5 text-outline font-label-sm text-label-sm">
                      <span className="material-symbols-outlined text-[16px]">history_edu</span>
                      <span>{art2.prereq}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="px-4 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-lg text-label-lg transition-colors">{art2.ctaLink}</button>
                      <button className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm transition-all flex items-center gap-1.5">
                        <span>{art2.cta}</span>
                        <span className="material-symbols-outlined text-[18px]">{art2.ctaIcon}</span>
                      </button>
                    </div>
                  </div>
                </article>

                {/* Article 3: Sports */}
                <article className="flex flex-col bg-surface-container-lowest rounded-xl p-6 shadow-sm hover:shadow-md transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {art3.tags.map(t => (
                        <span key={t.label} className={`px-3 py-0.5 rounded-full font-label-sm text-label-sm uppercase tracking-wide flex items-center gap-1 ${t.cls}`}>
                          {t.icon && <span className="material-symbols-outlined text-[14px]">{t.icon}</span>}{t.label}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface font-code-sm text-code-sm self-start sm:self-auto">
                      <span className="material-symbols-outlined text-[16px] text-secondary">schedule</span>
                      <span>{art3.urgency.label}</span>
                    </div>
                  </div>
                  <div className="mb-3">
                    <h2 className="font-headline-md text-headline-md text-on-surface">{art3.title}</h2>
                    <span className="font-label-md text-label-md text-on-surface-variant">{art3.org}</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mb-4 line-clamp-2">{art3.desc}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-surface-container-low mb-4 text-center">
                    {art3specs.map(s => (
                      <div key={s.label}>
                        <div className="font-label-sm text-label-sm text-outline">{s.label}</div>
                        <div className={`font-headline-sm text-headline-sm ${s.valueClass}`}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <button className="flex items-center gap-1.5 text-primary hover:underline font-label-md text-label-md">
                      <span className="material-symbols-outlined text-[18px]">group_search</span>
                      <span>{art3.findLink}</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <button className="px-4 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-lg text-label-lg transition-colors">{art3.ctaLink}</button>
                      <button className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm transition-all flex items-center gap-1.5">
                        <span>{art3.cta}</span>
                        <span className="material-symbols-outlined text-[18px]">{art3.ctaIcon}</span>
                      </button>
                    </div>
                  </div>
                </article>

                {/* Article 4: Seminar */}
                <article className="flex flex-col bg-surface-container-lowest rounded-xl p-6 shadow-sm hover:shadow-md transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {art4.tags.map(t => (
                        <span key={t.label} className={`px-3 py-0.5 rounded-full font-label-sm text-label-sm uppercase tracking-wide flex items-center gap-1 ${t.cls}`}>
                          {t.icon && <span className="material-symbols-outlined text-[14px]">{t.icon}</span>}{t.label}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
                      <span className="material-symbols-outlined text-[16px] text-tertiary">group</span>
                      <span>{art4.urgency.label}</span>
                    </div>
                  </div>
                  <div className="mb-3">
                    <h2 className="font-headline-md text-headline-md text-on-surface">{art4.title}</h2>
                    <span className="font-label-md text-label-md text-on-surface-variant">{art4.org}</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">{art4.desc}</p>
                  <div className="flex items-center justify-between gap-4 pt-1">
                    <div className="flex items-center gap-4 font-label-sm text-label-sm text-on-surface-variant">
                      {art4perks.map(p => (
                        <span key={p.label} className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px] text-primary">{p.icon}</span>{p.label}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="px-4 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-lg text-label-lg transition-colors flex items-center gap-1">
                        <span className="material-symbols-outlined text-[18px]">{art4.ctaLinkIcon}</span>
                        <span>{art4.ctaLink}</span>
                      </button>
                      <button className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm transition-all flex items-center gap-1">
                        <span className="material-symbols-outlined text-[18px]">{art4.ctaIcon}</span>
                        <span>{art4.cta}</span>
                      </button>
                    </div>
                  </div>
                </article>

                {/* Archived event */}
                <article className="flex flex-col bg-surface-container-low/70 rounded-xl p-4 opacity-85 hover:opacity-100 transition-opacity">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-0.5 rounded-full bg-surface-dim text-on-surface-variant font-label-sm text-label-sm uppercase font-semibold">{DUMMY_ARCHIVED.tag}</span>
                      <span className="text-outline font-label-sm text-label-sm">{DUMMY_ARCHIVED.type}</span>
                    </div>
                    <span className="font-code-sm text-code-sm text-outline">Verified Archive</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                      <h3 className="font-headline-sm text-headline-sm text-on-surface">{DUMMY_ARCHIVED.title}</h3>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">{DUMMY_ARCHIVED.meta}</span>
                    </div>
                    <button className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-container-highest text-primary font-label-sm text-label-sm shadow-sm transition-colors flex items-center gap-1 shrink-0">
                      <span className="material-symbols-outlined text-[16px]">leaderboard</span>
                      <span>View Leaderboard</span>
                    </button>
                  </div>
                </article>

                {/* Pagination */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container-lowest shadow-sm">
                  <span className="font-label-md text-label-md text-on-surface-variant">Showing 1 to 5 of 24 active events</span>
                  <div className="flex items-center gap-1.5">
                    <button disabled className="px-4 py-1.5 rounded-lg bg-surface-container-low text-outline font-label-md text-label-md cursor-not-allowed">Previous</button>
                    {[1, 2, 3].map(n => (
                      <button key={n} className={`px-3 py-1.5 rounded-lg font-label-md text-label-md ${n === 1 ? 'bg-primary text-on-primary' : 'bg-surface-container-low hover:bg-surface-container text-on-surface'}`}>{n}</button>
                    ))}
                    <button className="px-4 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md">Next →</button>
                  </div>
                </div>
              </>
            )}

            {/* Empty state (filtered, no results) */}
            {!isLoading && !isError && !showDummy && filteredEvents.length === 0 && (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-primary text-[32px]">radar</span>
                </div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">No matching events</h2>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">Try removing some filters or broadening your search.</p>
                <button id="events-clear-filters-btn" onClick={clearAll}
                  className="px-4 py-2 rounded-lg bg-surface-container text-on-surface font-label-lg text-label-lg hover:bg-surface-container-high transition-colors">Clear filters</button>
              </div>
            )}
          </div>

          {/* RIGHT: Sticky sidebar (4 cols) */}
          <aside className="lg:col-span-4 hidden lg:flex flex-col gap-5 sticky top-20 self-start">

            {/* Propose Event banner */}
            <div className="flex flex-col p-5 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center mb-4 backdrop-blur-sm">
                <span className="material-symbols-outlined text-[24px] text-primary-fixed">campaign</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm font-semibold mb-1">Have an Idea for a Campus Event?</h3>
              <p className="font-body-sm text-body-sm text-on-primary-container mb-4">
                Pitch a departmental hackathon, hardware sprint, or sports tournament directly to the Innovation Council for lab grants &amp; duty leaves.
              </p>
              <button id="submit-proposal-btn" onClick={() => navigate('/events/new')}
                className="w-full py-2.5 px-4 rounded-lg bg-surface-container-lowest text-primary font-label-lg text-label-lg shadow-sm hover:bg-surface transition-all flex items-center justify-center gap-1.5">
                <span>Submit Event Proposal</span>
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
              </button>
            </div>

            {/* Upcoming Deadlines */}
            <div className="flex flex-col p-5 rounded-xl bg-surface-container-lowest shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-outline/10 mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-primary">calendar_month</span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">Upcoming Deadlines</h3>
                </div>
                <span className="font-code-sm text-code-sm text-on-surface-variant font-medium">October 2026</span>
              </div>
              <div className="flex flex-col gap-4">
                {DUMMY_DEADLINES.map(dl => (
                  <div key={dl.date} className="flex items-start gap-3">
                    <div className={`flex flex-col items-center flex-shrink-0 w-12 py-1 rounded ${dl.urgent ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-surface-container-low text-on-surface'}`}>
                      <span className="font-label-sm text-label-sm uppercase leading-none">{dl.day}</span>
                      <span className="font-headline-sm text-headline-sm font-bold">{dl.date}</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-md text-label-md text-on-surface font-semibold truncate">{dl.title}</span>
                      <span className={`font-label-sm text-label-sm ${dl.urgent ? 'text-secondary font-medium' : 'text-on-surface-variant'}`}>{dl.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button className="mt-4 pt-4 border-t border-outline/10 text-center font-label-md text-label-md text-primary hover:underline flex items-center justify-center gap-1">
                <span>Sync with Google Calendar</span>
                <span className="material-symbols-outlined text-[16px]">sync</span>
              </button>
            </div>

            {/* Squad Openings */}
            <div className="flex flex-col p-5 rounded-xl bg-surface-container-lowest shadow-sm">
              <div className="flex items-center justify-between pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-tertiary">person_search</span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">Squad Openings</h3>
                </div>
                <span className="font-label-sm text-label-sm text-primary hover:underline cursor-pointer">View All</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-3">Teams competing in active campus events seeking urgent roster additions:</p>
              <div className="flex flex-col gap-2">
                {DUMMY_SQUAD_OPENINGS.map(sq => (
                  <div key={sq.team} className="p-3 rounded-lg bg-surface-container-low flex flex-col gap-1 hover:bg-surface-container transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-label-md text-label-md text-on-surface font-semibold">{sq.team}</span>
                      <span className={`px-2 py-0.5 rounded font-code-sm text-code-sm font-semibold ${sq.roleClass}`}>{sq.role}</span>
                    </div>
                    <span className="font-body-sm text-body-sm text-on-surface-variant text-[13px]">{sq.desc}</span>
                    <div className="flex items-center justify-between pt-1 font-label-sm text-label-sm text-outline">
                      <span>{sq.confirmed} Confirmed</span>
                      <span className="text-primary hover:underline font-semibold cursor-pointer">Quick Apply →</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Autonomous Event Ledger */}
            <div className="p-4 rounded-xl bg-surface-container-low/70 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[20px] text-on-primary-fixed">verified_user</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-md text-label-md text-on-surface font-semibold">Autonomous Event Ledger</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">All hackathon prizes and certificates are cryptographically verified and mirrored to your Student Transcript.</span>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <BottomNav active="events" />
    </div>
  );
}
