import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/layout/BottomNav';
import { AppBar }    from '@/components/layout/AppBar';
import { useAuth }   from '@/features/auth/context/AuthContext';

// ── Helpers ────────────────────────────────────────────────────────────────────
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Dummy data ─────────────────────────────────────────────────────────────────
const DUMMY_EVENTS = [
  {
    id: 'ev1',
    tag: 'SIH-2026',
    tagClass: 'bg-tertiary-fixed text-on-tertiary-fixed',
    timeLeft: '2d left',
    timeClass: 'text-secondary bg-secondary-fixed/50',
    title: 'Smart India Hackathon 2026 — Campus Prelims',
    meta1: 'Faculty Sponsored',
    meta2: 'Hybrid 36-Hr Sprint',
    prizeLabel: 'Bounty Pool',
    prize: '₹1,50,000',
    rosterLabel: 'Squad Locked',
    roster: '3/4 Members',
    rosterDot: 'bg-secondary-container',
    link: 'Problem Statements (14)',
    cta: 'Apply / Form Squad',
    ctaClass: 'bg-primary text-on-primary hover:bg-primary-container',
    accent: 'from-secondary-container via-primary to-primary-container',
  },
  {
    id: 'ev2',
    tag: 'Robotics & Aero',
    tagClass: 'bg-surface-container-high text-on-surface',
    timeLeft: '4d left',
    timeClass: 'text-on-surface-variant bg-surface-container',
    title: 'Inter-College Autonomous Drone Challenge',
    meta1: 'Aero Lab 4',
    meta2: 'Hardware Category',
    prizeLabel: 'Hardware Grant',
    prize: '₹75,000',
    rosterLabel: 'Open Roster',
    roster: '2/4 Members',
    rosterDot: 'bg-emerald-500',
    link: 'View Official Rulebook',
    cta: 'Join Roster',
    ctaClass: 'bg-surface-container text-on-surface hover:bg-surface-container-high',
    accent: 'from-primary-fixed via-primary to-surface-tint',
  },
];

const DUMMY_SQUADS = [
  {
    id: 'sq1',
    initials: 'PN', avatarBg: 'bg-primary-fixed text-on-primary-fixed',
    name: 'AI MedTech Capstone Sprint',
    badge: '1 Spot Left', badgeClass: 'bg-error-container text-on-error-container',
    lead: 'Priya Nair', dept: 'ECE • 3rd Yr', rep: '4.9',
    mentor: 'Dr. K. Rao',
    roles: [
      { label: 'Frontend Dev (React/Tailwind)', primary: true },
      { label: 'Edge AI Lead', primary: false },
    ],
    cta: 'Request to Join', ctaClass: 'bg-primary text-on-primary hover:bg-primary-container',
  },
  {
    id: 'sq2',
    initials: 'DV', avatarBg: 'bg-secondary-fixed text-on-secondary-fixed',
    name: 'Formula Student EV Telemetry',
    badge: '2 Spots Open', badgeClass: 'bg-surface-container text-on-surface',
    lead: 'Devansh Verma', dept: 'Mech • 4th Yr • Firmware Captain', rep: '5.0',
    mentor: null,
    roles: [
      { label: 'Embedded C++', primary: true },
      { label: 'CAN Bus & AWS IoT Core', primary: false },
    ],
    cta: 'Request to Join', ctaClass: 'bg-primary text-on-primary hover:bg-primary-container',
  },
  {
    id: 'sq3',
    initials: 'RK', avatarBg: 'bg-tertiary-fixed text-on-tertiary-fixed',
    name: 'AgriBotics Autonomous Crop Drone',
    badge: 'Pre-Incubated', badgeClass: 'bg-surface-container-high text-on-surface',
    lead: 'Rohan K.', dept: 'CSE • 3rd Yr • Robotics Club', rep: null,
    mentor: 'Patent Pending Node #882',
    roles: [
      { label: 'Computer Vision (PyTorch / YOLOv8)', primary: true },
    ],
    cta: 'Request to Join', ctaClass: 'bg-surface-container text-on-surface hover:bg-surface-container-high',
  },
];

const DUMMY_DEADLINES = [
  {
    date: 'Oct 24, 11:59 PM', dateClass: 'text-secondary', dot: 'bg-secondary',
    tag: 'Locking Soon', tagClass: 'bg-secondary-fixed text-on-secondary-fixed',
    title: 'SIH Prelims Squad Roster Lock',
    desc: 'All 4 student IDs must be certified by mentor',
  },
  {
    date: 'Oct 28, 09:00 AM', dateClass: 'text-on-surface-variant', dot: 'bg-primary',
    tag: 'Lab 3', tagClass: 'text-outline',
    title: 'ROS2 Advanced Micro-Bootcamp',
    desc: 'Mandatory check-in for rover hardware sprint',
  },
  {
    date: 'Nov 02, 05:00 PM', dateClass: 'text-on-surface-variant', dot: 'bg-outline-variant',
    tag: 'Academic', tagClass: 'text-outline',
    title: 'Capstone Interim Review Submission',
    desc: 'Upload PDF report & GitHub test coverage log',
  },
];

const DUMMY_MENTORS = [
  { initials: 'VR', name: 'Dr. V. Ramanathan', info: 'Distributed Systems • Office: Thu 3-5 PM' },
  { initials: 'AJ', name: 'Prof. Arvind Joshi', info: 'IoT & Embedded Lab 4 • Walk-ins Open' },
];

// ── Page ───────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate();
  const { user }  = useAuth();

  const isFaculty = user?.role === 'faculty' || user?.role === 'dept_head' || user?.role === 'admin';
  const name = (user?.name ?? '').replace(/[^a-zA-Z\s]/g, ' ').trim().split(/\s+/)[0] || 'there';

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased">
      <AppBar subtitle={isFaculty ? 'Faculty Portal' : 'Student Incubator'} />

      <main className="w-full pt-16 max-w-7xl mx-auto px-6 lg:px-8 pb-24 lg:pb-12">

        {/* ── Breadcrumb rail ────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pt-5 pb-4">
          <div className="flex flex-wrap items-center gap-1 text-on-surface-variant font-label-md text-label-md">
            <span className="hover:text-primary transition-colors cursor-pointer">Campus Ledger</span>
            <span className="text-outline font-code-sm text-code-sm">/</span>
            <span className="hover:text-primary transition-colors cursor-pointer">Student Hub</span>
            <span className="text-outline font-code-sm text-code-sm">/</span>
            <span className="text-on-surface font-label-lg text-label-lg flex items-center gap-1">
              {name}
              <span className="font-code-sm text-code-sm text-outline bg-surface-container px-1.5 py-0.5 rounded">
                UID: {user?.enrollmentNo ?? '22CS0914'}
              </span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-on-surface-variant font-code-sm text-code-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Ledger Node: <strong className="text-on-surface font-medium">INVENTUM-CAMPUS-04 (Synced)</strong></span>
          </div>
        </div>

        {/* ── Welcome Hero Banner ────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm p-6 lg:p-8 mb-5">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary-fixed/30 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 left-1/3 w-80 h-80 rounded-full bg-secondary-fixed/40 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex flex-col gap-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm uppercase tracking-wide">
                  <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  {isFaculty ? 'Faculty Member' : 'Academic Cohort 2022–26'}
                </span>
                {!isFaculty && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container/20 text-secondary font-label-sm text-label-sm">
                    <span className="material-symbols-outlined text-[15px]">trending_up</span>
                    Top 5% Cohort Ranking
                  </span>
                )}
              </div>
              <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
                {greeting()}, {name} 👋
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {isFaculty
                  ? `Welcome back, ${name}. Manage your posted events and review student squad activity.`
                  : 'B.Tech Computer Science & Engineering • 3rd Year (Sem VI) • 4 Verified Credentials • Specialization: Distributed Systems & Edge Robotics'
                }
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {isFaculty ? (
                <>
                  <button id="home-post-event-btn" onClick={() => navigate('/events/new')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg shadow hover:opacity-90 transition-all active:scale-[0.98]">
                    <span className="material-symbols-outlined text-[18px]">add_box</span>
                    Post New Event
                  </button>
                  <button id="home-my-events-btn" onClick={() => navigate('/events/my')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface-container text-on-surface font-label-lg text-label-lg hover:bg-surface-container-high transition-colors">
                    <span className="material-symbols-outlined text-[18px]">event_note</span>
                    My Events
                  </button>
                </>
              ) : (
                <>
                  <button id="home-propose-btn" onClick={() => navigate('/teams')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg shadow hover:opacity-90 transition-all active:scale-[0.98]">
                    <span className="material-symbols-outlined text-[18px]">add_box</span>
                    Propose Team / Idea
                  </button>
                  <button id="home-browse-btn" onClick={() => navigate('/events')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface-container text-on-surface font-label-lg text-label-lg hover:bg-surface-container-high transition-colors">
                    <span className="material-symbols-outlined text-[18px]">explore</span>
                    Browse Sprints
                  </button>
                  <button className="inline-flex items-center justify-center p-2.5 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors" title="Export Academic Transcript">
                    <span className="material-symbols-outlined text-[20px]">file_download</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ── Squad Invitation Alert Strip ──────────────────────────────── */}
        {!isFaculty && (
          <div className="w-full mb-5 rounded-xl bg-gradient-to-r from-secondary-fixed/40 via-surface-container-high to-surface-container-low p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[22px]">group_add</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-headline-sm text-headline-sm text-on-surface">2 Pending Squad Invitations</span>
                  <span className="font-code-sm text-code-sm px-1.5 py-0.5 rounded bg-surface-container-lowest text-secondary font-semibold">⏳ 18h remaining</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  <strong className="text-on-surface">Solaris Rover</strong> (Autonomous Rover Lead) •{' '}
                  <strong className="text-on-surface">Quantum Sprint</strong> (Frontend Architect)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
              <button className="font-label-lg text-label-lg text-on-surface hover:text-primary px-2 py-1.5 rounded-lg transition-colors">Decline</button>
              <button className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg shadow hover:bg-primary-container transition-all">
                Review Invitations <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* ── KPI Metric Grid ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {(isFaculty ? [
            { label: 'Posted Events',   value: '—',   icon: 'campaign',          iconBg: 'bg-primary-fixed',           iconColor: 'text-primary',           extra: null },
            { label: 'Active Students', value: '—',   icon: 'groups',            iconBg: 'bg-surface-container-high',  iconColor: 'text-tertiary',          extra: null },
            { label: 'Pending Review',  value: '—',   icon: 'rate_review',       iconBg: 'bg-secondary-fixed',         iconColor: 'text-secondary',         extra: null },
            { label: 'Department',      value: '—',   icon: 'apartment',         iconBg: 'bg-surface-container',       iconColor: 'text-primary-container', extra: null },
          ] : [
            { label: 'Incubator Points', value: '120', icon: 'workspace_premium', iconBg: 'bg-primary-fixed',           iconColor: 'text-primary',           extra: { type: 'trend', icon: 'arrow_upward', text: '+24 pts this month', color: 'text-emerald-700', sub: 'Lvl 4 Innovator' } },
            { label: 'Active Squads',    value: '1',   icon: 'groups',            iconBg: 'bg-surface-container-high',  iconColor: 'text-tertiary',          extra: { type: 'squad', dot: 'bg-primary', text: 'Solaris Autonomous Rover', sub: '/ 3 Capacity' } },
            { label: 'Saved Competitions', value: '3', icon: 'bookmark',         iconBg: 'bg-secondary-fixed',         iconColor: 'text-secondary',         extra: { type: 'warn', icon: 'warning', text: '2 closing within 48 hours', color: 'text-secondary', sub: 'Bookmarked' } },
            { label: 'Verified Badges',  value: '6',   icon: 'verified_user',    iconBg: 'bg-surface-container',       iconColor: 'text-primary-container', extra: { type: 'tags', tags: ['ROS2', 'PyTorch', 'C++'], sub: 'Endorsements' } },
          ]).map(({ label, value, icon, iconBg, iconColor, extra }: any) => (
            <div key={label} className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">{label}</span>
                <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center ${iconColor}`}>
                  <span className="material-symbols-outlined text-[18px]">{icon}</span>
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="font-headline-xl text-headline-xl text-on-surface font-bold">{value}</span>
                  {extra?.sub && <span className="font-label-sm text-label-sm text-on-surface-variant">{extra.sub}</span>}
                </div>
                {extra?.type === 'trend' && (
                  <div className={`flex items-center gap-1 mt-1 font-label-sm text-label-sm ${extra.color}`}>
                    <span className="material-symbols-outlined text-[14px]">{extra.icon}</span>
                    <span>{extra.text}</span>
                  </div>
                )}
                {extra?.type === 'squad' && (
                  <div className="flex items-center gap-1 mt-1 text-on-surface-variant font-label-sm text-label-sm">
                    <span className={`w-2 h-2 rounded-full ${extra.dot}`} />
                    <span className="text-on-surface font-medium truncate">{extra.text}</span>
                  </div>
                )}
                {extra?.type === 'warn' && (
                  <div className={`flex items-center gap-1 mt-1 font-label-sm text-label-sm ${extra.color}`}>
                    <span className="material-symbols-outlined text-[14px]">{extra.icon}</span>
                    <span>{extra.text}</span>
                  </div>
                )}
                {extra?.type === 'tags' && (
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {extra.tags.map((t: string) => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface font-code-sm text-code-sm">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Main 12-col grid ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT COLUMN (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-8">

            {/* Section A: Closing Soon */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-headline-md text-headline-md text-on-surface">Closing Soon ⏳</h2>
                    <span className="px-2 py-0.5 rounded-full bg-secondary-container/20 text-secondary font-code-sm text-code-sm font-semibold">Urgent Actions</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                    Campus sprints and ministry challenges with registration lock in under 48 hours
                  </p>
                </div>
                <button onClick={() => navigate('/events')}
                  className="font-label-lg text-label-lg text-primary hover:text-primary-container flex items-center gap-0.5 transition-colors whitespace-nowrap">
                  View All 8 <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DUMMY_EVENTS.map(ev => (
                  <div key={ev.id} className="group bg-surface-container-lowest rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden cursor-pointer">
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${ev.accent}`} />
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded font-label-sm text-label-sm ${ev.tagClass}`}>{ev.tag}</span>
                        <span className={`font-code-sm text-code-sm px-1.5 py-0.5 rounded font-semibold flex items-center gap-1 ${ev.timeClass}`}>
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          {ev.timeLeft}
                        </span>
                      </div>
                      <h3 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors leading-snug">{ev.title}</h3>
                      <div className="flex items-center gap-2 mt-1.5 text-on-surface-variant font-label-sm text-label-sm">
                        <span className="flex items-center gap-1 text-emerald-700">
                          <span className="material-symbols-outlined text-[13px]">verified</span>{ev.meta1}
                        </span>
                        <span>•</span><span>{ev.meta2}</span>
                      </div>
                      <div className="mt-3 bg-surface-container-low p-2.5 rounded-lg flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="font-label-sm text-label-sm text-on-surface-variant">{ev.prizeLabel}</span>
                          <span className="font-headline-sm text-headline-sm font-bold text-primary">{ev.prize}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="font-label-sm text-label-sm text-on-surface-variant">{ev.rosterLabel}</span>
                          <div className="flex items-center gap-1">
                            <span className="font-code-sm text-code-sm font-bold text-on-surface">{ev.roster}</span>
                            <span className={`w-2 h-2 rounded-full ${ev.rosterDot}`} />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 mt-2">
                      <button className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface underline">{ev.link}</button>
                      <button className={`px-3 py-1.5 rounded-lg font-label-md text-label-md transition-colors shadow-sm ${ev.ctaClass}`}>{ev.cta}</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Section B: Teammates Needed */}
            {!isFaculty && (
              <section className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-headline-md text-headline-md text-on-surface">Teammates Needed</h2>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm">
                        <span className="material-symbols-outlined text-[14px]">tune</span>98% Profile Match
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                      Matched for your verified stack:{' '}
                      {['React', 'Python', 'ROS2', 'IoT'].map(s => (
                        <span key={s} className="font-code-sm text-code-sm text-primary font-semibold">{s} </span>
                      ))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button className="px-2.5 py-1 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors">Filter by Lab</button>
                    <button className="px-2.5 py-1 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors">Semester</button>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  {DUMMY_SQUADS.map(sq => (
                    <div key={sq.id} className="bg-surface-container-lowest rounded-xl p-4 shadow-sm hover:shadow transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-headline-sm text-headline-sm font-bold ${sq.avatarBg}`}>
                          {sq.initials}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-headline-sm text-headline-sm text-on-surface">{sq.name}</h4>
                            <span className={`px-2 py-0.5 rounded font-label-sm text-label-sm font-bold ${sq.badgeClass}`}>{sq.badge}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm mt-1">
                            <span>Lead: <strong className="text-on-surface">{sq.lead}</strong> ({sq.dept})</span>
                            {sq.rep && (
                              <><span>•</span>
                              <span className="flex items-center gap-0.5 text-secondary">
                                <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                {sq.rep} Rep
                              </span></>
                            )}
                            {sq.mentor && (
                              <><span>•</span>
                              <span className="text-emerald-700 font-medium">
                                {sq.rep ? `Faculty Mentor: ${sq.mentor}` : sq.mentor}
                              </span></>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="font-label-sm text-label-sm text-on-surface-variant">Role needed:</span>
                            {sq.roles.map(r => (
                              <span key={r.label} className={`px-1.5 py-0.5 rounded font-code-sm text-code-sm ${r.primary ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container text-on-surface'}`}>{r.label}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        <button className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors" title="Message Lead">
                          <span className="material-symbols-outlined text-[20px]">chat</span>
                        </button>
                        <button className={`px-4 py-1.5 rounded-lg font-label-lg text-label-lg transition-colors shadow-sm ${sq.ctaClass}`}>
                          {sq.cta} ⮞
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Section C: Launchpad / Faculty CTA */}
            <section className="rounded-xl bg-primary text-on-primary p-6 relative overflow-hidden shadow-md">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#abefe8_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="max-w-xl flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm text-primary-fixed uppercase tracking-wider font-semibold">
                    {isFaculty ? 'AMPUS FACULTY PORTAL • EVENT MANAGEMENT' : 'AMPUS LAUNCHPAD • FAST-TRACK PROPOSALS'}
                  </span>
                  <h3 className="font-headline-lg text-headline-lg text-on-primary tracking-tight">
                    {isFaculty ? 'Have an announcement to post?' : 'Building something bold this term?'}
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-primary-container">
                    {isFaculty
                      ? 'Use the AI parser to convert department circulars into structured event cards in seconds. Reach all eligible students instantly.'
                      : 'Post an incubator recruitment listing. Find verified campus collaborators across Computer Science, Mechanical, Electronics, and Product Design with institutional lab access.'
                    }
                  </p>
                </div>
                <div className="shrink-0">
                  <button
                    id={isFaculty ? 'home-faculty-post-btn' : 'home-launchpad-btn'}
                    onClick={() => navigate(isFaculty ? '/events/new' : '/teams')}
                    className="px-5 py-3 rounded-lg bg-surface-container-lowest text-primary font-label-lg text-label-lg hover:bg-primary-fixed transition-colors shadow active:scale-[0.98]">
                    {isFaculty ? '+ Post Event via AI Parser' : '+ Post Squad Recruitment'}
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-5 lg:sticky lg:top-20 lg:self-start">

            {/* Widget 1: Active Squad */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-surface-container-high">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">rocket_launch</span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">Active Squad</h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-code-sm text-code-sm font-semibold">PRIMARY SPRINT</span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Solaris Autonomous Rover</h4>
                  <span className="font-label-sm text-label-sm text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">On Track</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Team role: <strong className="text-on-surface">Sensor Fusion & ROS2 Telemetry Lead</strong>
                </p>
                <div className="mt-1 flex flex-col gap-1">
                  <div className="flex justify-between font-label-sm text-label-sm">
                    <span className="text-on-surface font-medium">Stage 2: Sensor Fusion Telemetry</span>
                    <span className="text-primary font-code-sm text-code-sm font-bold">65%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: '65%' }} />
                  </div>
                </div>
                <div className="mt-2 p-2.5 rounded-lg bg-surface-container-low flex items-start gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">event</span>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface font-semibold">Next Lab Sprint Meet</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Tomorrow, 4:30 PM • Robotics FabLab 02</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 mt-1 font-label-md text-label-md">
                  <a href="#" className="text-primary hover:underline flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">terminal</span> GitHub Repo
                  </a>
                  <span className="text-outline">•</span>
                  <a href="#" className="text-primary hover:underline flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">forum</span> Slack / Room
                  </a>
                  <span className="text-outline">•</span>
                  <a href="#" className="text-primary hover:underline flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">task_alt</span> Board
                  </a>
                </div>
              </div>
            </div>

            {/* Widget 2: Campus Deadlines */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-surface-container-high">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[20px]">calendar_clock</span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">Campus Deadlines</h3>
                </div>
                <span className="font-code-sm text-code-sm text-on-surface-variant">Fall 2026</span>
              </div>
              <div className="relative pl-5 flex flex-col gap-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container">
                {DUMMY_DEADLINES.map((dl, i) => (
                  <div key={i} className="relative flex flex-col">
                    <div className={`absolute -left-[1.375rem] top-1 w-3 h-3 rounded-full ring-4 ring-surface-container-lowest ${dl.dot}`} />
                    <div className="flex items-center justify-between">
                      <span className={`font-code-sm text-code-sm font-bold ${dl.dateClass}`}>{dl.date}</span>
                      <span className={`font-label-sm text-label-sm px-1.5 py-0.5 rounded ${dl.tagClass}`}>{dl.tag}</span>
                    </div>
                    <h5 className="font-headline-sm text-headline-sm text-on-surface text-[15px] mt-0.5">{dl.title}</h5>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">{dl.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Widget 3: Faculty Mentors */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-surface-container-high">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">school</span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">Faculty Mentors</h3>
                </div>
                <a href="#" className="font-label-md text-label-md text-primary hover:underline">Directory</a>
              </div>
              <div className="flex flex-col gap-2">
                {DUMMY_MENTORS.map(m => (
                  <div key={m.initials} className="p-2.5 rounded-lg bg-surface-container-low flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 text-on-surface font-semibold text-[14px]">
                        {m.initials}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-headline-sm text-headline-sm text-on-surface text-[15px]">{m.name}</span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">{m.info}</span>
                      </div>
                    </div>
                    <button className="p-1.5 rounded bg-surface-container-lowest text-primary hover:bg-primary-fixed transition-colors shrink-0" title="Book Slot">
                      <span className="material-symbols-outlined text-[18px]">calendar_add_on</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Widget 4: Institutional Trust Ledger */}
            <div className="rounded-xl bg-surface-container p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-on-surface font-label-md text-label-md">
                <span className="material-symbols-outlined text-primary text-[18px]">security</span>
                <span className="font-semibold">Institutional Trust Ledger</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                All team invitations, code attestations, and hackathon milestones are signed via university hardware nodes (ECDSA-256).
              </p>
              <div className="flex items-center justify-between pt-1 font-code-sm text-code-sm text-outline">
                <span>TX-BLOCK: #082914-V</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Validated
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-surface-container-low mt-12 py-8 hidden lg:block">
        <div className="max-w-7xl mx-auto px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-headline-sm text-headline-sm text-primary">AMPUS</span>
            <span className="font-label-md text-label-md text-on-surface-variant">Campus Innovation Platform • Division of Student Research</span>
          </div>
          <div className="flex items-center gap-6">
            {['Honor Code', 'IP Policy', 'Incubator Terms'].map(l => (
              <a key={l} href="#" className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors">{l}</a>
            ))}
            <span className="font-label-md text-label-md text-outline">© 2026</span>
          </div>
        </div>
      </footer>

      <BottomNav active="home" />
    </div>
  );
}
