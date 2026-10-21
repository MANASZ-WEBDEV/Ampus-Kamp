import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { useEvents } from '@/features/events/hooks/useEvents';
import { EventCardSkeleton } from '@/features/events/components/EventCard';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function StudentHomePage() {
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const isFaculty = user?.role === 'faculty' || user?.role === 'dept_head' || user?.role === 'admin';

  // Fetch closing-soon events (deadline within 48h)
  const { data: closingPage, isLoading: closingLoading } = useEvents({ limit: 4 });
  const closingSoon = closingPage?.pages?.[0]?.items ?? [];

  const name = (user?.name ?? '').replace(/[^a-zA-Z\s]/g, ' ').trim().split(/\s+/)[0] || 'there';

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased">
      <AppBar subtitle={isFaculty ? 'Faculty Portal' : 'Student Incubator'} />

      <main className="w-full pt-16 max-w-7xl mx-auto px-4 lg:px-8 pb-24 lg:pb-12">

        {/* ── Breadcrumb rail ───────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pt-6 pb-4">
          <div className="flex flex-wrap items-center gap-1 text-on-surface-variant font-label-md text-sm">
            <span className="hover:text-primary transition-colors cursor-pointer">Campus Ledger</span>
            <span className="text-outline text-xs">/</span>
            <span className="hover:text-primary transition-colors cursor-pointer">Student Hub</span>
            <span className="text-outline text-xs">/</span>
            <span className="text-on-surface font-semibold flex items-center gap-1">
              {name}
              <span className="font-code-sm text-[10px] text-outline bg-surface-container px-1.5 py-0.5 rounded">
                {user?.enrollmentNo ?? user?.role?.toUpperCase()}
              </span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-on-surface-variant font-code-sm text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Ledger Node: <strong className="text-on-surface font-medium">INVENTUM-CAMPUS-04 (Synced)</strong></span>
          </div>
        </div>

        {/* ── Welcome Hero Panel ────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm p-6 lg:p-8 mb-6">
          {/* Background glow orbs */}
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary-fixed/30 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 left-1/3 w-80 h-80 rounded-full bg-secondary-fixed/40 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex flex-col gap-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-[10px] uppercase tracking-wide">
                  <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  {isFaculty ? 'Faculty Member' : 'Academic Cohort 2022–26'}
                </span>
                {!isFaculty && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container/20 text-secondary font-label-sm text-[10px]">
                    <span className="material-symbols-outlined text-[14px]">trending_up</span>
                    Top 5% Cohort Ranking
                  </span>
                )}
              </div>
              <h1 className="font-headline-xl text-[2rem] lg:text-[2.25rem] text-on-surface tracking-tight font-bold">
                {greeting()}, {name} 👋
              </h1>
              <p className="font-body-md text-on-surface-variant">
                {isFaculty
                  ? `Welcome back, ${name}. Manage your posted events and review student squad activity.`
                  : `Browse active hackathons, workshops, and competitions across campus. ${closingSoon.length > 0 ? `${closingSoon.length} events closing soon.` : ''}`
                }
              </p>
            </div>

            {/* Quick action buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {isFaculty ? (
                <>
                  <button
                    id="home-post-event-btn"
                    onClick={() => navigate('/events/new')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-on-primary font-label-lg text-sm font-bold shadow hover:opacity-90 transition-all active:scale-[0.98]">
                    <span className="material-symbols-outlined text-[18px]">add_box</span>
                    Post New Event
                  </button>
                  <button
                    id="home-my-events-btn"
                    onClick={() => navigate('/events/my')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface-container text-on-surface font-label-lg text-sm hover:bg-surface-container-high transition-colors">
                    <span className="material-symbols-outlined text-[18px]">event_note</span>
                    My Events
                  </button>
                </>
              ) : (
                <>
                  <button
                    id="home-browse-btn"
                    onClick={() => navigate('/events')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-on-primary font-label-lg text-sm font-bold shadow hover:opacity-90 transition-all active:scale-[0.98]">
                    <span className="material-symbols-outlined text-[18px]">explore</span>
                    Browse Sprints
                  </button>
                  <button
                    id="home-teams-btn"
                    onClick={() => navigate('/teams')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface-container text-on-surface font-label-lg text-sm hover:bg-surface-container-high transition-colors">
                    <span className="material-symbols-outlined text-[18px]">group_add</span>
                    Find Squad
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ── KPI Metric Grid ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {(isFaculty ? [
            { label: 'Posted Events',   value: '—',  sub: 'Published to feed',       icon: 'campaign',      iconBg: 'bg-primary-fixed', iconColor: 'text-primary' },
            { label: 'Active Students', value: '—',  sub: 'Registered across events', icon: 'groups',        iconBg: 'bg-surface-container-high', iconColor: 'text-tertiary' },
            { label: 'Pending Review',  value: '—',  sub: 'Awaiting your action',    icon: 'rate_review',   iconBg: 'bg-secondary-fixed', iconColor: 'text-secondary' },
            { label: 'Department',      value: '—',  sub: 'Your affiliation',        icon: 'apartment',     iconBg: 'bg-surface-container', iconColor: 'text-primary-container' },
          ] : [
            { label: 'Incubator Points', value: '120', sub: '+24 pts this month • Lvl 4', icon: 'workspace_premium', iconBg: 'bg-primary-fixed', iconColor: 'text-primary' },
            { label: 'Active Squads',    value: '1 / 3', sub: 'Solaris Autonomous Rover', icon: 'groups',           iconBg: 'bg-surface-container-high', iconColor: 'text-tertiary' },
            { label: 'Saved Events',     value: '3',   sub: '2 closing within 48h',    icon: 'bookmark',           iconBg: 'bg-secondary-fixed', iconColor: 'text-secondary' },
            { label: 'Verified Badges',  value: '6',   sub: 'ROS2 • PyTorch • C++',    icon: 'verified_user',      iconBg: 'bg-surface-container', iconColor: 'text-primary-container' },
          ]).map(({ label, value, sub, icon, iconBg, iconColor }) => (
            <div key={label} className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="font-label-md text-[10px] text-on-surface-variant uppercase tracking-wider">{label}</span>
                <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center ${iconColor}`}>
                  <span className="material-symbols-outlined text-[18px]">{icon}</span>
                </div>
              </div>
              <div>
                <span className="font-headline-xl text-[2rem] text-on-surface font-bold block leading-none">{value}</span>
                <span className="font-label-sm text-[10px] text-on-surface-variant mt-1 block">{sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main 12-col grid ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ─── LEFT: Primary workflows (8 cols) ──────────────────────── */}
          <div className="lg:col-span-8 flex flex-col gap-8">

            {/* Section A: Closing Soon */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-headline-md text-[1.25rem] text-on-surface font-semibold">Closing Soon ⏳</h2>
                    <span className="px-2 py-0.5 rounded-full bg-secondary-container/20 text-secondary font-code-sm text-[10px] font-semibold">
                      Urgent Actions
                    </span>
                  </div>
                  <p className="font-body-sm text-sm text-on-surface-variant mt-0.5">
                    Campus sprints and ministry challenges with registration lock in under 48 hours
                  </p>
                </div>
                <button
                  onClick={() => navigate('/events')}
                  className="font-label-lg text-sm text-primary hover:text-primary-container flex items-center gap-0.5 transition-colors whitespace-nowrap">
                  View All
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {closingLoading ? (
                  Array.from({ length: 2 }).map((_, i) => <EventCardSkeleton key={i} />)
                ) : closingSoon.length === 0 ? (
                  <div className="col-span-2 text-center py-8 text-on-surface-variant font-body-sm text-sm">
                    No events closing soon. <button onClick={() => navigate('/events')} className="text-primary underline">Browse all events</button>
                  </div>
                ) : (
                  closingSoon.map(event => (
                    <div
                      key={event.id}
                      className="group bg-surface-container-lowest rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden cursor-pointer"
                      onClick={() => navigate(`/events/${event.id}`)}
                    >
                      {/* Top accent stripe */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary-container via-primary to-primary-container" />
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-[10px] uppercase tracking-wide">
                            {event.type}
                          </span>
                          <span className="font-code-sm text-[10px] text-secondary bg-secondary-fixed/50 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">schedule</span>
                            {event.deadline ? (() => {
                              const diff = Math.ceil((new Date(event.deadline).getTime() - Date.now()) / 86400000);
                              return diff <= 0 ? 'Closing today' : `${diff}d left`;
                            })() : 'Open'}
                          </span>
                        </div>
                        <h3 className="font-headline-sm text-[1rem] text-on-surface group-hover:text-primary transition-colors leading-snug font-semibold">
                          {event.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5 text-on-surface-variant font-label-sm text-[11px]">
                          {event.postedBy && (
                            <span className="flex items-center gap-1 text-emerald-700">
                              <span className="material-symbols-outlined text-[12px]">verified</span> Faculty Sponsored
                            </span>
                          )}
                          {event.teamSize && (
                            <span>• {event.teamSize.min}–{event.teamSize.max} Members</span>
                          )}
                        </div>
                        {event.fee && (
                          <div className="mt-3 bg-surface-container-low p-2.5 rounded-lg flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="font-label-sm text-[10px] text-on-surface-variant">Bounty Pool</span>
                              <span className="font-headline-sm text-base font-bold text-primary">{event.fee}</span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="font-label-sm text-[10px] text-on-surface-variant">Status</span>
                              <span className="font-code-sm text-[10px] font-bold text-on-surface capitalize">{event.status}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-3 mt-2">
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/events/${event.id}`); }}
                          className="font-label-md text-[11px] text-on-surface-variant hover:text-on-surface underline">
                          View Details
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/events/${event.id}`); }}
                          className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-label-md text-[11px] hover:bg-primary-container transition-colors shadow-sm">
                          Apply / Register
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Section B: Faculty — My Events CTA; Students — Launchpad */}
            {isFaculty ? (
              <section className="rounded-xl bg-primary text-on-primary p-6 relative overflow-hidden shadow-md">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#abefe8_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="max-w-xl flex flex-col gap-1">
                    <span className="font-label-sm text-[10px] text-primary-fixed uppercase tracking-wider font-semibold">
                      INVENTUM FACULTY PORTAL • EVENT MANAGEMENT
                    </span>
                    <h3 className="font-headline-lg text-[1.5rem] text-on-primary tracking-tight font-bold">
                      Have an announcement to post?
                    </h3>
                    <p className="font-body-sm text-sm text-on-primary-container">
                      Use the AI parser to convert department circulars into structured event cards in seconds. Reach all eligible students instantly.
                    </p>
                  </div>
                  <div className="shrink-0">
                    <button
                      id="home-faculty-post-btn"
                      onClick={() => navigate('/events/new')}
                      className="px-5 py-3 rounded-lg bg-surface-container-lowest text-primary font-label-lg text-sm font-bold hover:bg-primary-fixed transition-colors shadow active:scale-[0.98]">
                      + Post Event via AI Parser
                    </button>
                  </div>
                </div>
              </section>
            ) : (
              <section className="rounded-xl bg-primary text-on-primary p-6 relative overflow-hidden shadow-md">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#abefe8_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="max-w-xl flex flex-col gap-1">
                    <span className="font-label-sm text-[10px] text-primary-fixed uppercase tracking-wider font-semibold">
                      INVENTUM LAUNCHPAD • FAST-TRACK PROPOSALS
                    </span>
                    <h3 className="font-headline-lg text-[1.5rem] text-on-primary tracking-tight font-bold">
                      Building something bold this term?
                    </h3>
                    <p className="font-body-sm text-sm text-on-primary-container">
                      Post an incubator recruitment listing. Find verified campus collaborators across CS, Mech, ECE, and Product Design with institutional lab access.
                    </p>
                  </div>
                  <div className="shrink-0">
                    <button
                      id="home-launchpad-btn"
                      onClick={() => navigate('/teams')}
                      className="px-5 py-3 rounded-lg bg-surface-container-lowest text-primary font-label-lg text-sm font-bold hover:bg-primary-fixed transition-colors shadow active:scale-[0.98]">
                      + Post Squad Recruitment
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Browse all CTA */}
            <div
              id="home-browse-all"
              className="flex items-center gap-4 p-4 rounded-xl bg-surface-container-lowest shadow-sm cursor-pointer hover:shadow-md transition-all group"
              onClick={() => navigate('/events')}
            >
              <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-primary group-hover:bg-primary-fixed transition-colors">
                <span className="material-symbols-outlined text-[26px]">radar</span>
              </div>
              <div className="flex-1">
                <p className="font-headline-sm text-base text-on-surface font-semibold">Looking for something specific?</p>
                <p className="font-body-sm text-sm text-on-surface-variant">Explore 10+ active hackathons, workshops, and competitions across all departments.</p>
              </div>
              <span className="font-label-lg text-sm text-primary flex items-center gap-0.5 whitespace-nowrap">
                Browse All Events
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </span>
            </div>
          </div>

          {/* ─── RIGHT: Sticky sidebar (4 cols) ────────────────────────── */}
          <div className="lg:col-span-4 flex flex-col gap-5 lg:sticky lg:top-20 lg:self-start">

            {/* Active Squad (students) / Quick-stats (faculty) */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">{isFaculty ? 'campaign' : 'rocket_launch'}</span>
                  <h3 className="font-headline-sm text-base text-on-surface font-semibold">{isFaculty ? 'Recent Posts' : 'Active Squad'}</h3>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-code-sm text-[10px] font-semibold">
                  {isFaculty ? 'FACULTY' : 'PRIMARY SPRINT'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-surface-container-low text-center text-on-surface-variant font-body-sm text-sm">
                {isFaculty
                  ? 'Your posted events will appear here.'
                  : 'Join a squad to track your progress here.'
                }
              </div>
              <div className="flex items-center justify-center gap-4 pt-3 mt-2 font-label-md text-[11px]">
                <button onClick={() => navigate(isFaculty ? '/events/my' : '/teams')} className="text-primary hover:underline flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">{isFaculty ? 'event_note' : 'group_search'}</span>
                  {isFaculty ? 'My Events' : 'Find Squad'}
                </button>
                <span className="text-outline">•</span>
                <button onClick={() => navigate('/profile')} className="text-primary hover:underline flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">person</span>
                  Profile
                </button>
              </div>
            </div>

            {/* Campus Deadlines Timeline */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[20px]">calendar_clock</span>
                  <h3 className="font-headline-sm text-base text-on-surface font-semibold">Campus Deadlines</h3>
                </div>
                <span className="font-code-sm text-[10px] text-on-surface-variant">
                  {new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div className="relative pl-5 flex flex-col gap-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container">
                {closingSoon.slice(0, 3).map((event, i) => (
                  <div key={event.id} className="relative flex flex-col">
                    <div className={`absolute -left-[1.375rem] top-1 w-3 h-3 rounded-full ring-4 ring-surface-container-lowest ${i === 0 ? 'bg-secondary' : 'bg-primary'}`} />
                    <div className="flex items-center justify-between">
                      <span className={`font-code-sm text-[10px] font-bold ${i === 0 ? 'text-secondary' : 'text-on-surface-variant'}`}>
                        {event.deadline ? new Date(event.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'TBA'}
                      </span>
                      {i === 0 && (
                        <span className="font-label-sm text-[10px] px-1.5 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed">Locking Soon</span>
                      )}
                    </div>
                    <h5 className="font-headline-sm text-[13px] text-on-surface font-semibold mt-0.5 line-clamp-1">{event.title}</h5>
                    <span className="font-body-sm text-[11px] text-on-surface-variant">{event.organizer || 'Campus Event'}</span>
                  </div>
                ))}
                {closingSoon.length === 0 && (
                  <p className="text-on-surface-variant font-body-sm text-sm text-center py-2">No upcoming deadlines.</p>
                )}
              </div>
              <button
                onClick={() => navigate('/events')}
                className="mt-3 pt-3 border-t border-outline/10 w-full text-center font-label-md text-[11px] text-primary hover:underline flex items-center justify-center gap-1">
                View All Events
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>

            {/* Institutional Trust Stamp */}
            <div className="rounded-xl bg-surface-container p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-on-surface font-label-md text-sm">
                <span className="material-symbols-outlined text-primary text-[18px]">security</span>
                <span className="font-semibold">Institutional Trust Ledger</span>
              </div>
              <p className="font-body-sm text-[11px] text-on-surface-variant">
                All team invitations, code attestations, and hackathon milestones are signed via university hardware nodes (ECDSA-256).
              </p>
              <div className="flex items-center justify-between pt-1 font-code-sm text-[10px] text-outline">
                <span>TX-BLOCK: #082914-V</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Validated
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <BottomNav active="home" />
    </div>
  );
}
