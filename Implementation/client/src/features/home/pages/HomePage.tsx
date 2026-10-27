import { useNavigate } from 'react-router-dom';
import { BottomNav }   from '@/components/layout/BottomNav';
import { AppBar }      from '@/components/layout/AppBar';
import { useHome }     from '../hooks/useHome';
import type { EventSummary, TeamPostSummary } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getHoursLeft(deadlineIso: string): number {
  return Math.max(0, Math.round((new Date(deadlineIso).getTime() - Date.now()) / 3_600_000));
}

// ── Skeleton block ────────────────────────────────────────────────────────────

function Skeleton({ h = 'h-24' }: { h?: string }) {
  return (
    <div className={`${h} rounded-2xl bg-surface-container-high animate-pulse`} />
  );
}

// ── Greeting card ─────────────────────────────────────────────────────────────

function GreetingBlock({
  name, branch, year, verifiedBadgeCount, hasUnread,
}: {
  name: string; branch: string; year: number | null;
  verifiedBadgeCount: number; hasUnread: boolean;
}) {
  const navigate = useNavigate();
  return (
    <div
      className="relative rounded-2xl overflow-hidden p-5"
      style={{ background: 'linear-gradient(135deg, #004541 0%, #115e59 60%, #0d9488 100%)' }}
    >
      {/* Unread dot + bell */}
      <button
        id="home-notifications-btn"
        aria-label="Notifications"
        onClick={() => navigate('/notifications')}
        className="absolute top-4 right-4 flex items-center justify-center w-9 h-9 rounded-full bg-white/10 active:scale-95 transition-all"
      >
        <span className="material-symbols-outlined text-white text-[22px]">notifications</span>
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-error border-2 border-[#004541]" />
        )}
      </button>

      <p className="text-teal-100 text-xs font-medium mb-1 uppercase tracking-widest">
        Campus Innovation Platform
      </p>
      <h1 className="text-white text-2xl font-bold leading-tight mb-0.5">
        Hi, {name.split(' ')[0]} 👋
      </h1>
      <p className="text-teal-200 text-sm">
        {branch}{year ? ` · Year ${year}` : ''}
      </p>

      {/* Badge chip */}
      {verifiedBadgeCount > 0 && (
        <button
          id="home-badge-chip"
          onClick={() => navigate('/badges')}
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 text-white text-xs font-semibold active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            military_tech
          </span>
          {verifiedBadgeCount} verified badge{verifiedBadgeCount !== 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}

// ── Pending banner ────────────────────────────────────────────────────────────

function PendingBanner({ count }: { count: number }) {
  const navigate = useNavigate();
  return (
    <button
      id="home-pending-banner"
      onClick={() => navigate('/teams/inbox')}
      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-tertiary-container text-on-tertiary-container active:scale-[.99] transition-all text-left"
    >
      <span
        className="material-symbols-outlined text-[22px] shrink-0"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        group_add
      </span>
      <span className="text-sm font-semibold flex-1">
        {count} pending team request{count !== 1 ? 's' : ''}
      </span>
      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
    </button>
  );
}

// ── Closing soon section ──────────────────────────────────────────────────────

function ClosingSoonSection({ events }: { events: EventSummary[] }) {
  const navigate = useNavigate();
  return (
    <section aria-labelledby="closing-soon-heading">
      <h2
        id="closing-soon-heading"
        className="flex items-center gap-2 text-sm font-bold text-on-surface mb-3"
      >
        <span className="material-symbols-outlined text-[18px] text-error" style={{ fontVariationSettings: "'FILL' 1" }}>
          schedule
        </span>
        Closing Soon
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scroll-smooth snap-x snap-mandatory">
        {events.map(event => {
          const hoursLeft = getHoursLeft(event.deadline);
          return (
            <button
              key={event.id}
              id={`home-event-card-${event.id}`}
              onClick={() => navigate(`/events/${event.id}`)}
              className="flex-shrink-0 snap-start w-48 p-3.5 rounded-xl bg-surface-container border border-outline-variant/30 text-left active:scale-[.98] transition-all"
            >
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[10px] font-bold mb-2">
                <span className="material-symbols-outlined text-[10px]">schedule</span>
                {hoursLeft}h left
              </span>
              <p className="text-sm font-semibold text-on-surface leading-snug line-clamp-2">
                {event.title}
              </p>
              <p className="text-[10px] text-on-surface-variant mt-1 capitalize">{event.type}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ── Matched team posts section ────────────────────────────────────────────────

function MatchedTeamPostsSection({
  posts, hasSkillsMatch,
}: {
  posts: TeamPostSummary[]; hasSkillsMatch?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <section aria-labelledby="team-posts-heading">
      <h2
        id="team-posts-heading"
        className="flex items-center gap-2 text-sm font-bold text-on-surface mb-3"
      >
        <span className="material-symbols-outlined text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
          group
        </span>
        {hasSkillsMatch ? 'Based on your skills' : 'Based on your branch & year'}
      </h2>
      <div className="flex flex-col gap-2">
        {posts.map(post => (
          <button
            key={post.id}
            id={`home-teampost-${post.id}`}
            onClick={() => navigate(`/events/${post.eventId}/teams`)}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-surface-container border border-outline-variant/30 text-left active:scale-[.99] transition-all"
          >
            <span
              className="material-symbols-outlined text-primary text-[22px] shrink-0"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              workspaces
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-on-surface truncate">{post.title}</p>
              {post.requiredSkills.length > 0 && (
                <p className="text-[10px] text-on-surface-variant mt-0.5 truncate">
                  {post.requiredSkills.slice(0, 3).join(' · ')}
                </p>
              )}
            </div>
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0">
              chevron_right
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ── HomePage ──────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { data, isLoading, isError } = useHome();

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <AppBar title="Home" />

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-4 max-w-2xl mx-auto w-full">

        {/* Loading state */}
        {isLoading && (
          <>
            <Skeleton h="h-36" />
            <Skeleton h="h-12" />
            <Skeleton h="h-32" />
            <Skeleton h="h-28" />
          </>
        )}

        {/* Error state */}
        {isError && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-[48px] text-error mb-3">
              cloud_off
            </span>
            <p className="text-on-surface-variant text-sm">
              Couldn't load your home feed. Pull to refresh.
            </p>
          </div>
        )}

        {/* Content */}
        {data && (
          <>
            <GreetingBlock
              name={data.user.name}
              branch={data.user.branch}
              year={data.user.year}
              verifiedBadgeCount={data.user.verifiedBadgeCount}
              hasUnread={data.unreadNotificationsFlag}
            />

            {data.pendingRequestCount != null && data.pendingRequestCount > 0 && (
              <PendingBanner count={data.pendingRequestCount} />
            )}

            {data.closingSoonEvents && data.closingSoonEvents.length > 0 && (
              <ClosingSoonSection events={data.closingSoonEvents} />
            )}

            {data.matchedTeamPosts && data.matchedTeamPosts.length > 0 && (
              <MatchedTeamPostsSection
                posts={data.matchedTeamPosts}
                hasSkillsMatch={data.hasSkillsMatch}
              />
            )}

            {/* All caught up — show only when no dynamic content */}
            {!data.pendingRequestCount &&
              !data.closingSoonEvents?.length &&
              !data.matchedTeamPosts?.length && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span
                  className="material-symbols-outlined text-[52px] text-primary mb-3"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                <p className="text-on-surface font-semibold text-base">All caught up!</p>
                <p className="text-on-surface-variant text-sm mt-1">
                  No events closing soon and no matching team posts right now.
                </p>
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav active="home" />
    </div>
  );
}
