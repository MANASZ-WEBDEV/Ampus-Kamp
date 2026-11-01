import { useNavigate }  from 'react-router-dom';
import { useAuth }      from '@/features/auth/context/AuthContext';
import { useHome }      from '@/features/home/hooks/useHome';
import { AppBar }       from '@/components/layout/AppBar';
import { BottomNav }    from '@/components/layout/BottomNav';
import type { EventSummary, TeamPostSummary } from '@/features/home/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function timeLeft(isoDeadline: string): string {
  const diff = new Date(isoDeadline).getTime() - Date.now();
  if (diff <= 0) return 'Closed';
  const h = Math.floor(diff / 3_600_000);
  if (h < 24) return `${h}h left`;
  return `${Math.floor(h / 24)}d left`;
}

function isUrgent(isoDeadline: string): boolean {
  const diff = new Date(isoDeadline).getTime() - Date.now();
  return diff > 0 && diff < 12 * 3_600_000;
}

function ordinal(n: number): string {
  return `${n}${['st', 'nd', 'rd'][n - 1] ?? 'th'}`;
}

// ── Shimmer skeleton ──────────────────────────────────────────────────────────

function Shimmer({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface-container ${className}`} />;
}

// ── Event card ────────────────────────────────────────────────────────────────

function EventCard({ ev }: { ev: EventSummary }) {
  const navigate = useNavigate();
  const left     = timeLeft(ev.deadline);
  const urgent   = isUrgent(ev.deadline);

  return (
    <button
      onClick={() => navigate('/events')}
      className="group w-full text-left bg-surface-container-lowest rounded-2xl p-5 shadow-sm
                 hover:shadow-md active:scale-[0.99] transition-all duration-200 relative overflow-hidden
                 border border-surface-container-high/60 hover:border-primary/30 cursor-pointer"
    >
      {/* accent stripe */}
      <div className="absolute top-0 left-0 right-0 h-[3px]
                      bg-gradient-to-r from-primary via-secondary to-primary-fixed rounded-t-2xl" />

      <div className="flex items-start justify-between gap-3 mt-1">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                         bg-surface-container text-on-surface-variant font-label-sm text-label-sm capitalize">
          <span className="material-symbols-outlined text-[13px]">sell</span>
          {ev.type}
        </span>
        <span className={`flex items-center gap-1 font-code-sm text-code-sm px-2 py-0.5
                          rounded-full font-semibold shrink-0
                          ${urgent
                            ? 'bg-error-container/60 text-error'
                            : 'bg-secondary-container/30 text-secondary'
                          }`}>
          <span className="material-symbols-outlined text-[13px]">schedule</span>
          {left}
        </span>
      </div>

      <h3 className="font-headline-sm text-headline-sm text-on-surface
                     group-hover:text-primary transition-colors leading-snug mt-2.5
                     overflow-hidden"
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {ev.title}
      </h3>

      <div className="mt-4 flex items-center justify-between">
        <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">calendar_today</span>
          {new Date(ev.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </span>
        <span className="font-label-md text-label-md text-primary flex items-center gap-0.5
                         group-hover:gap-1.5 transition-all">
          View details
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </span>
      </div>
    </button>
  );
}

// ── Team post row ─────────────────────────────────────────────────────────────

function TeamPostRow({ post }: { post: TeamPostSummary }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/teams')}
      className="group w-full text-left bg-surface-container-lowest rounded-2xl p-4 shadow-sm
                 hover:shadow-md active:scale-[0.99] transition-all duration-200
                 border border-surface-container-high/60 hover:border-secondary/30 cursor-pointer
                 flex items-center justify-between gap-4"
    >
      <div className="flex flex-col gap-1.5 min-w-0">
        <h4 className="font-headline-sm text-headline-sm text-on-surface
                       group-hover:text-secondary transition-colors overflow-hidden"
            style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
          {post.title}
        </h4>
        {post.requiredSkills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.requiredSkills.slice(0, 3).map(s => (
              <span key={s}
                className="px-1.5 py-0.5 rounded-md bg-primary-fixed/40 text-on-primary-fixed
                           font-code-sm text-[11px]">
                {s}
              </span>
            ))}
            {post.requiredSkills.length > 3 && (
              <span className="px-1.5 py-0.5 rounded-md bg-surface-container text-on-surface-variant
                               font-code-sm text-[11px]">
                +{post.requiredSkills.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
      <span className="material-symbols-outlined text-[20px] text-on-surface-variant
                       group-hover:text-secondary transition-colors shrink-0">
        chevron_right
      </span>
    </button>
  );
}

// ── Quick action tile ─────────────────────────────────────────────────────────

interface QuickTileProps {
  id:        string;
  icon:      string;
  label:     string;
  sub:       string;
  onClick:   () => void;
  accentBg:  string;
  iconColor: string;
}

function QuickTile({ id, icon, label, sub, onClick, accentBg, iconColor }: QuickTileProps) {
  return (
    <button
      id={id}
      onClick={onClick}
      className="flex flex-col items-start gap-3 p-4 rounded-2xl bg-surface-container-lowest
                 shadow-sm hover:shadow-md active:scale-[0.98] border border-surface-container-high/50
                 hover:border-primary/20 transition-all duration-200 text-left group w-full"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                       ${accentBg} ${iconColor}
                       group-hover:scale-110 transition-transform duration-200`}>
        <span className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}>
          {icon}
        </span>
      </div>
      <div>
        <p className="font-label-lg text-label-lg text-on-surface
                      group-hover:text-primary transition-colors">
          {label}
        </p>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{sub}</p>
      </div>
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const { data, isLoading } = useHome();

  const isFaculty = user?.role === 'faculty' || user?.role === 'dept_head' || user?.role === 'admin';
  const firstName = (user?.name ?? '').replace(/[^a-zA-Z\s]/g, ' ').trim().split(/\s+/)[0] || 'there';

  const dept           = typeof user?.department === 'object' ? user.department.name : (user?.department ?? '');
  const year           = user?.year;
  const pendingCount   = data?.pendingRequestCount  ?? 0;
  const closingEvents  = data?.closingSoonEvents    ?? [];
  const matchedPosts   = data?.matchedTeamPosts     ?? [];
  const hasSkillsMatch = data?.hasSkillsMatch       ?? false;
  const badgeCount     = data?.user.verifiedBadgeCount ?? 0;

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased">
      <AppBar subtitle={isFaculty ? 'Faculty Portal' : 'Student Incubator'} />

      <main className="w-full pt-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-28 lg:pb-12">

        {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-5 pb-4">
          <div className="flex flex-wrap items-center gap-1 text-on-surface-variant
                          font-label-md text-label-md">
            <span className="text-on-surface font-label-lg text-label-lg flex items-center gap-1.5">
              {firstName}
              {user?.enrollmentNo && (
                <span className="font-code-sm text-code-sm text-outline bg-surface-container
                                 px-1.5 py-0.5 rounded-md">
                  {user.enrollmentNo}
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-on-surface-variant font-code-sm text-code-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-700 font-medium hidden sm:inline">Live</span>
          </div>
        </div>

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-2xl bg-surface-container-lowest
                            shadow-sm p-6 lg:p-8 mb-5 border border-surface-container-high/40">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full
                          bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 left-1/4 w-64 h-64 rounded-full
                          bg-secondary/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center
                          justify-between gap-6">
            <div className="flex flex-col gap-2">

              {/* Verified credentials chip — real, conditional */}
              {!isLoading && badgeCount > 0 && (
                <span className="self-start inline-flex items-center gap-1.5 px-2.5 py-0.5
                                 rounded-full bg-primary-fixed text-on-primary-fixed
                                 font-label-sm text-label-sm">
                  <span className="material-symbols-outlined text-[14px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}>
                    verified
                  </span>
                  {badgeCount} Verified Credential{badgeCount !== 1 ? 's' : ''}
                </span>
              )}

              <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
                {greeting()}, {firstName} 👋
              </h1>

              {/* Real detail line from auth context */}
              <p className="font-body-md text-body-md text-on-surface-variant">
                {isFaculty
                  ? `Manage your posted events and review squad activity.`
                  : [
                      dept || null,
                      year ? `${ordinal(year)} Year` : null,
                      user?.skills?.length ? user.skills.slice(0, 3).join(' · ') : null,
                    ].filter(Boolean).join(' · ') || 'Update your profile to personalise this.'
                }
              </p>
            </div>

            {/* Primary CTAs */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {isFaculty ? (
                <>
                  <button id="home-post-event-btn" onClick={() => navigate('/events/new')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                               bg-primary text-on-primary font-label-lg text-label-lg
                               shadow-sm hover:opacity-90 active:scale-[0.98] transition-all">
                    <span className="material-symbols-outlined text-[18px]">add_box</span>
                    Post New Event
                  </button>
                  <button id="home-my-events-btn" onClick={() => navigate('/events/my')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                               bg-surface-container text-on-surface font-label-lg text-label-lg
                               hover:bg-surface-container-high transition-colors">
                    <span className="material-symbols-outlined text-[18px]">event_note</span>
                    My Events
                  </button>
                </>
              ) : (
                <>
                  <button id="home-propose-btn" onClick={() => navigate('/teams')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                               bg-primary text-on-primary font-label-lg text-label-lg
                               shadow-sm hover:opacity-90 active:scale-[0.98] transition-all">
                    <span className="material-symbols-outlined text-[18px]">add_box</span>
                    Propose Team
                  </button>
                  <button id="home-browse-btn" onClick={() => navigate('/events')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                               bg-surface-container text-on-surface font-label-lg text-label-lg
                               hover:bg-surface-container-high transition-colors">
                    <span className="material-symbols-outlined text-[18px]">explore</span>
                    Browse Events
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ── Pending requests — only when real count > 0 ──────────────────── */}
        {!isLoading && pendingCount > 0 && (
          <div className="mb-5 rounded-2xl border border-secondary/30
                          bg-gradient-to-r from-secondary-fixed/20 via-surface-container-high/60
                          to-surface-container-low p-4 flex flex-col sm:flex-row
                          sm:items-center justify-between gap-4 shadow-sm"
               style={{ animation: 'slideUpFade 0.3s ease-out both' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary-container text-on-secondary-container
                              flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">group_add</span>
              </div>
              <div>
                <p className="font-headline-sm text-headline-sm text-on-surface">
                  {pendingCount} Pending Team Request{pendingCount !== 1 ? 's' : ''}
                </p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Someone wants to collaborate — review before they expire.
                </p>
              </div>
            </div>
            <button
              id="home-review-requests-btn"
              onClick={() => navigate('/teams')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl
                         bg-secondary text-on-secondary font-label-lg text-label-lg
                         shadow hover:opacity-90 active:scale-[0.98] transition-all
                         shrink-0 self-end sm:self-auto">
              Review
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        )}

        {/* ── Quick Actions ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <QuickTile
            id="home-quick-events"
            icon="calendar_month"
            label="Events"
            sub="Browse & apply"
            onClick={() => navigate('/events')}
            accentBg="bg-primary-fixed"
            iconColor="text-primary"
          />
          <QuickTile
            id="home-quick-teams"
            icon="groups"
            label="Teams"
            sub="Find or form a squad"
            onClick={() => navigate('/teams')}
            accentBg="bg-secondary-fixed"
            iconColor="text-secondary"
          />
          <QuickTile
            id="home-quick-badges"
            icon="verified_user"
            label="Credentials"
            sub="Your verified stack"
            onClick={() => navigate('/badges')}
            accentBg="bg-surface-container-high"
            iconColor="text-tertiary"
          />
          <QuickTile
            id="home-quick-profile"
            icon="person"
            label="Profile"
            sub="Skills & settings"
            onClick={() => navigate('/profile')}
            accentBg="bg-surface-container"
            iconColor="text-on-surface-variant"
          />
        </div>

        {/* ── Closing Soon ─────────────────────────────────────────────────── */}
        {isLoading ? (
          <section className="mb-8">
            <Shimmer className="h-6 w-44 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Shimmer className="h-40" />
              <Shimmer className="h-40" />
            </div>
          </section>
        ) : closingEvents.length > 0 ? (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-headline-md text-headline-md text-on-surface">
                    Closing Soon ⏳
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-error-container/40 text-error
                                   font-label-sm text-label-sm font-semibold">
                    {closingEvents.length}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Registration closes within 48 hours
                </p>
              </div>
              <button
                onClick={() => navigate('/events')}
                className="font-label-lg text-label-lg text-primary hover:text-primary-container
                           flex items-center gap-0.5 transition-colors whitespace-nowrap">
                View all
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {closingEvents.slice(0, 4).map(ev => (
                <EventCard key={ev.id} ev={ev} />
              ))}
            </div>
          </section>
        ) : null}

        {/* ── Skill/dept matched team posts ────────────────────────────────── */}
        {isLoading ? (
          <section>
            <Shimmer className="h-6 w-52 mb-4" />
            <div className="flex flex-col gap-3">
              <Shimmer className="h-20" />
              <Shimmer className="h-20" />
            </div>
          </section>
        ) : !isFaculty && matchedPosts.length > 0 ? (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-headline-md text-headline-md text-on-surface">
                    Looking for Teammates
                  </h2>
                  {hasSkillsMatch && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                                     bg-primary-fixed text-on-primary-fixed
                                     font-label-sm text-label-sm">
                      <span className="material-symbols-outlined text-[13px]">tune</span>
                      Skill match
                    </span>
                  )}
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  {hasSkillsMatch
                    ? 'Squads that need exactly what you know'
                    : 'Open squads from your department'}
                </p>
              </div>
              <button
                onClick={() => navigate('/teams')}
                className="font-label-lg text-label-lg text-primary hover:text-primary-container
                           flex items-center gap-0.5 transition-colors whitespace-nowrap">
                Explore
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {matchedPosts.slice(0, 4).map(post => (
                <TeamPostRow key={post.id} post={post} />
              ))}
            </div>
          </section>
        ) : null}

        {/* ── Empty state ───────────────────────────────────────────────────── */}
        {!isLoading && closingEvents.length === 0 && matchedPosts.length === 0 && (
          <div className="rounded-2xl bg-surface-container-lowest border border-surface-container-high/40
                          p-10 flex flex-col items-center gap-4 text-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-primary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px] text-primary"
                    style={{ fontVariationSettings: "'FILL' 1" }}>
                rocket_launch
              </span>
            </div>
            <div>
              <p className="font-headline-sm text-headline-sm text-on-surface">All clear for now</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 max-w-xs">
                No events closing soon and no open squads matched yet.
                Browse events or explore teams to get started.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <button
                onClick={() => navigate('/events')}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg
                           hover:opacity-90 active:scale-[0.98] transition-all shadow-sm">
                Browse Events
              </button>
              <button
                onClick={() => navigate('/teams')}
                className="px-4 py-2 rounded-xl bg-surface-container text-on-surface
                           font-label-lg text-label-lg hover:bg-surface-container-high transition-colors">
                Find a Squad
              </button>
            </div>
          </div>
        )}

      </main>

      <BottomNav active="home" />
    </div>
  );
}
