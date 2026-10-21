import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useEvents } from '../hooks/useEvents';
import { EventCardComponent, EventCardSkeleton } from '../components/EventCard';
import { useAuth } from '@/features/auth/context/AuthContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { AppBar } from '@/components/layout/AppBar';
import type { EventType } from '../types';

const CATEGORY_PILLS = [
  { key: 'all',         label: 'All Events',           icon: 'apps',                   iconColor: 'text-on-primary' },
  { key: 'hackathon',   label: 'Hackathons',            icon: 'terminal',               iconColor: 'text-tertiary' },
  { key: 'competition', label: 'Competitions',          icon: 'emoji_events',           iconColor: 'text-secondary' },
  { key: 'workshop',    label: 'Hands-on Workshops',    icon: 'precision_manufacturing', iconColor: 'text-primary' },
  { key: 'seminar',     label: 'Seminars & Talks',      icon: 'record_voice_over',      iconColor: 'text-tertiary' },
  { key: 'sports',      label: 'Sports & Athletics',    icon: 'sports_soccer',          iconColor: 'text-secondary' },
  { key: 'other',       label: 'Other',                 icon: 'more_horiz',             iconColor: 'text-outline' },
] as const;

type CategoryKey = typeof CATEGORY_PILLS[number]['key'];

/**
 * EventFeedPage — /events
 *
 * Desktop: Breadcrumb + hero title block + powerful filter console (⌘K search,
 * category pills, grid/calendar toggle) + 12-col grid (8-col cards + 4-col sidebar).
 * Mobile: stacked layout with sticky filter console.
 *
 * UI reference: New folder / Screen 3 Events Feed (Desktop View)
 */
export default function EventFeedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isFaculty = user?.role === 'faculty' || user?.role === 'dept_head' || user?.role === 'admin';

  // ── Filter state ────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]     = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');
  const [viewMode, setViewMode]           = useState<'grid' | 'list'>('grid');

  // ⌘K / Ctrl+K focus search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('events-search-input')?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── API query ───────────────────────────────────────────────────────────────
  const apiType = activeCategory === 'all' ? undefined : [activeCategory as EventType];

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useEvents({ type: apiType });

  const allEvents = data?.pages.flatMap(p => p.items) ?? [];

  // ── Client-side search filter ───────────────────────────────────────────────
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return allEvents;
    const q = searchQuery.toLowerCase();
    return allEvents.filter(evt =>
      `${evt.title} ${evt.organizer ?? ''} ${evt.type}`.toLowerCase().includes(q)
    );
  }, [allEvents, searchQuery]);

  const hasFilters = searchQuery.trim() !== '' || activeCategory !== 'all';

  const clearAll = useCallback(() => {
    setSearchQuery('');
    setActiveCategory('all');
  }, []);

  const totalEventCount = (data?.pages[0] as any)?.total ?? allEvents.length;

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased">
      <AppBar subtitle={isFaculty ? 'Faculty Portal' : 'Incubator PWA'} />

      <main className="w-full pt-16 max-w-7xl mx-auto px-4 lg:px-8 pb-28 lg:pb-12">

        {/* ── Breadcrumb ───────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 font-label-md text-sm text-on-surface-variant pt-4 pb-3">
          <Link to="/home" className="hover:text-primary transition-colors">Campus Ledger</Link>
          <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
          <Link to="/events" className="hover:text-primary transition-colors">Events</Link>
          <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
          <span className="text-primary font-semibold">All Campus Opportunities</span>
        </div>

        {/* ── Page title + action bar ──────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5">
          <div className="space-y-1 max-w-3xl">
            <h1 className="font-headline-xl text-[2rem] lg:text-[2.25rem] text-on-surface tracking-tight font-bold">
              Explore Campus Opportunities & Tech Sprints
            </h1>
            <p className="font-body-md text-sm text-on-surface-variant">
              Browse {totalEventCount > 0 ? totalEventCount : 'active'} hackathons, research lab sprints, robotics bootcamps, and inter-department leagues across campus labs.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Subscribed Feeds */}
            <button
              id="events-subscribed-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-lg text-sm shadow-sm transition-all">
              <span className="material-symbols-outlined text-[18px] text-primary">bookmark_manager</span>
              <span>Subscribed Feeds</span>
              <span className="px-1.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-code-sm text-[10px]">3</span>
            </button>

            {/* Faculty: Post Event */}
            {isFaculty && (
              <button
                id="post-event-btn"
                onClick={() => navigate('/events/new')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-lg text-sm shadow-md transition-all active:scale-[0.98]">
                <span className="material-symbols-outlined text-[20px]">add_circle</span>
                Post Event
              </button>
            )}

            {/* View toggle */}
            <div className="flex items-center p-1 rounded-lg bg-surface-container-low shadow-sm">
              <button
                title="Grid View"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
              </button>
              <button
                title="List View"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>
                <span className="material-symbols-outlined text-[18px]">view_list</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Powerful Filter Console (Screen 3 reference) ────────────────── */}
        <div className="w-full flex flex-col gap-3 p-4 rounded-xl bg-surface-container-lowest shadow-sm mb-6">
          {/* Search bar with ⌘K shortcut */}
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[22px]">search</span>
            <input
              id="events-search-input"
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by title, department, lab code, faculty sponsor, or tech stack..."
              className="w-full h-12 pl-12 pr-28 rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline font-body-md text-sm focus:outline-none focus:bg-surface-container-lowest shadow-inner transition-all focus:ring-2 focus:ring-primary/20"
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-outline hover:text-on-surface transition-colors"
                  aria-label="Clear">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              ) : (
                <>
                  <kbd className="px-2 py-0.5 rounded bg-surface text-on-surface-variant font-code-sm text-[11px] shadow-sm">⌘K</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-surface text-on-surface-variant font-code-sm text-[11px] shadow-sm">/</kbd>
                </>
              )}
            </div>
          </div>

          {/* Category pill segments */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORY_PILLS.map(pill => {
              const isActive = pill.key === activeCategory;
              const count = pill.key === 'all'
                ? totalEventCount
                : allEvents.filter(e => e.type === pill.key).length;

              return (
                <button
                  key={pill.key}
                  id={`filter-${pill.key}`}
                  onClick={() => setActiveCategory(pill.key)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-label-md text-sm transition-all active:scale-95 whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
                      : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[16px] ${isActive ? 'text-on-primary' : pill.iconColor}`}>
                    {pill.icon}
                  </span>
                  <span>{pill.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full font-code-sm text-[10px] ${
                    isActive ? 'bg-surface-container-lowest/20' : 'text-outline'
                  }`}>
                    {count > 0 ? count : ''}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active filters summary */}
          {hasFilters && (
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse" />
                <span className="font-body-sm text-xs text-on-surface-variant">
                  Showing <span className="font-bold text-on-surface">{filteredEvents.length}</span> events (filtered)
                </span>
              </div>
              <button
                onClick={clearAll}
                className="font-label-sm text-[11px] text-primary font-semibold hover:underline">
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* ── 12-col grid layout (8-col cards + 4-col sidebar) ────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ─── Event cards (8 cols) ─────────────────────────────────────── */}
          <div className="lg:col-span-8">

            {/* Loading skeletons */}
            {isLoading && (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'flex flex-col gap-3'}>
                {[...Array(4)].map((_, i) => <EventCardSkeleton key={i} />)}
              </div>
            )}

            {/* Error state */}
            {isError && !isLoading && (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <span className="material-symbols-outlined text-5xl text-outline">wifi_off</span>
                <p className="font-body-md text-sm text-on-surface-variant">Couldn't load events. Please check your connection.</p>
                <button id="events-retry-btn" onClick={() => refetch()}
                  className="px-4 py-2 rounded-lg bg-surface-container text-on-surface font-label-lg text-sm hover:bg-surface-container-high transition-colors">
                  Retry
                </button>
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !isError && filteredEvents.length === 0 && (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-primary text-[32px]">radar</span>
                </div>
                <h2 className="font-headline-sm text-on-surface font-bold">
                  {hasFilters ? 'No matching events' : 'No events yet'}
                </h2>
                <p className="font-body-md text-sm text-on-surface-variant max-w-xs">
                  {hasFilters
                    ? 'Try removing some filters or broadening your search.'
                    : isFaculty
                      ? 'Be the first to post an event for students.'
                      : 'No events match your profile right now. Check back soon.'}
                </p>
                {hasFilters && (
                  <button id="events-clear-filters-btn" onClick={clearAll}
                    className="px-4 py-2 rounded-lg bg-surface-container text-on-surface font-label-lg text-sm">
                    Clear filters
                  </button>
                )}
                {isFaculty && !hasFilters && (
                  <button id="events-post-first-btn" onClick={() => navigate('/events/new')}
                    className="px-4 py-2 rounded-lg bg-primary text-on-primary font-label-lg text-sm font-bold shadow">
                    Post an event
                  </button>
                )}
              </div>
            )}

            {/* Event cards */}
            {!isLoading && !isError && filteredEvents.length > 0 && (
              <>
                <div className={viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                  : 'flex flex-col gap-3'
                }>
                  {filteredEvents.map(event => (
                    <EventCardComponent key={event.id} event={event} />
                  ))}
                </div>

                {/* Load more */}
                {hasNextPage && !searchQuery && (
                  <button
                    id="events-load-more-btn"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="mt-6 w-full py-3 rounded-lg bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-label-lg text-sm hover:bg-surface-container-low transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-60">
                    {isFetchingNextPage
                      ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Loading…</>
                      : <><span className="material-symbols-outlined text-[18px]">expand_more</span>Load more events</>
                    }
                  </button>
                )}

                {/* Faculty: view my events link */}
                {isFaculty && (
                  <div className="mt-4 text-center">
                    <button id="events-my-events-link" onClick={() => navigate('/events/my')}
                      className="font-label-md text-[12px] text-primary hover:underline flex items-center justify-center gap-1 mx-auto">
                      <span className="material-symbols-outlined text-[16px]">event_note</span>
                      View my posted events
                    </button>
                  </div>
                )}

                {/* Student: Suggest Event CTA */}
                {!isFaculty && (
                  <div className="mt-6 p-5 rounded-xl bg-primary text-on-primary relative overflow-hidden shadow-md">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#abefe8_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <p className="font-label-sm text-[10px] text-primary-fixed uppercase tracking-wider font-semibold">
                          INVENTUM LAUNCHPAD • PROPOSALS
                        </p>
                        <h4 className="font-headline-sm text-base text-on-primary font-bold mt-0.5">
                          Have an idea for a campus event?
                        </h4>
                        <p className="font-body-sm text-[12px] text-on-primary-container mt-0.5">
                          Pitch a technical hackathon, club workshop, or department league to the Innovation Council.
                        </p>
                      </div>
                      <button
                        id="suggest-event-btn"
                        onClick={() => navigate('/events/new')}
                        className="shrink-0 px-4 py-2.5 rounded-lg bg-surface-container-lowest text-primary font-label-lg text-sm font-bold hover:bg-primary-fixed transition-colors shadow active:scale-[0.98]">
                        + Submit Event Proposal
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ─── Right sidebar (4 cols, sticky) ───────────────────────────── */}
          <aside className="lg:col-span-4 hidden lg:flex flex-col gap-4 sticky top-20 self-start">

            {/* Quick stats */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-primary text-[20px]">insights</span>
                <h3 className="font-headline-sm text-sm text-on-surface font-semibold">Feed Overview</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Total Events', value: totalEventCount, icon: 'event', color: 'bg-primary-fixed text-primary' },
                  { label: 'Closing Soon', value: allEvents.filter(e => {
                    if (!e.deadline) return false;
                    const diff = Math.ceil((new Date(e.deadline).getTime() - Date.now()) / 86400000);
                    return diff >= 0 && diff <= 3;
                  }).length, icon: 'timer', color: 'bg-secondary-fixed text-secondary' },
                ].map(({ label, value, icon, color }) => (
                  <div key={label} className="bg-surface-container-low p-3 rounded-lg flex flex-col gap-1">
                    <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center mb-1`}>
                      <span className="material-symbols-outlined text-[16px]">{icon}</span>
                    </div>
                    <span className="font-headline-sm text-xl text-on-surface font-bold">{value}</span>
                    <span className="font-label-sm text-[10px] text-on-surface-variant">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Closing soon list */}
            {allEvents.filter(e => e.deadline && Math.ceil((new Date(e.deadline).getTime() - Date.now()) / 86400000) <= 3).length > 0 && (
              <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-secondary text-[20px]">schedule</span>
                  <h3 className="font-headline-sm text-sm text-on-surface font-semibold">Closing Within 48h</h3>
                </div>
                <div className="flex flex-col gap-2">
                  {allEvents
                    .filter(e => e.deadline && Math.ceil((new Date(e.deadline).getTime() - Date.now()) / 86400000) <= 3)
                    .slice(0, 3)
                    .map(e => {
                      const d = Math.ceil((new Date(e.deadline!).getTime() - Date.now()) / 86400000);
                      return (
                        <button
                          key={e.id}
                          onClick={() => navigate(`/events/${e.id}`)}
                          className="p-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-left transition-colors flex items-start gap-2">
                          <span className="w-2 h-2 rounded-full bg-secondary mt-1.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-label-lg text-[12px] text-on-surface font-semibold line-clamp-1">{e.title}</p>
                            <p className="font-code-sm text-[10px] text-secondary font-bold">
                              {d <= 0 ? 'Closes today' : `${d}d left`}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Trust ledger stamp */}
            <div className="rounded-xl bg-surface-container p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-on-surface font-label-md text-sm">
                <span className="material-symbols-outlined text-primary text-[18px]">security</span>
                <span className="font-semibold">Institutional Trust Ledger</span>
              </div>
              <p className="font-body-sm text-[11px] text-on-surface-variant">
                All events are faculty-certified and logged on campus infrastructure with ECDSA-256 signature nodes.
              </p>
              <div className="flex items-center justify-between pt-1 font-code-sm text-[10px] text-outline">
                <span>TX-BLOCK: #082914-V</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Validated
                </span>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <BottomNav active="events" />
    </div>
  );
}
