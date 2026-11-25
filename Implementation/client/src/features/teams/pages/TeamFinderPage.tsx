import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { useEvents } from '@/features/events/hooks/useEvents';
import { useAuth } from '@/features/auth/context/AuthContext';
import { listTeamPosts } from '../api/teams.api';
import { listLooking } from '../api/people.api';
import { teamKeys, useLinks } from '../hooks/useTeams';
import { peopleKeys } from '../hooks/usePeople';
import { getMyRegistration } from '@/features/registrations/api/registrations.api';
import { registrationKeys } from '@/features/registrations/hooks/useRegistration';
import type { Registration } from '@/features/registrations/types';
import { RequestToJoinModal } from '../components/RequestToJoinModal';
import { CreateTeamPostForm } from '../components/CreateTeamPostForm';
import type { TeamPost } from '../types';
import type { LookingCard } from '../types.f5';

interface EnrichedPost {
  post: TeamPost;
  eventTitle: string;
  eventType: string;
  eventDeadline?: string;
}

interface EnrichedLooking {
  item: LookingCard;
  eventId: string;
  eventTitle: string;
}

export default function TeamFinderPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStudent = user?.role === 'student';

  // ── Filter state ──────────────────────────────────────────────────────────
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [activeRole, setActiveRole]           = useState<string | null>(null);
  const [urgentOnly, setUrgentOnly]           = useState(false);
  const [search, setSearch]                   = useState('');
  const [sortBy, setSortBy]                   = useState<'newest' | 'deadline' | 'spots'>('newest');

  // ── Modals / forms ────────────────────────────────────────────────────────
  const [joiningPost, setJoiningPost]         = useState<TeamPost | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createEventId, setCreateEventId]     = useState<string>('');

  // ⌘K focuses search input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('team-finder-search')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── 1. Fetch active team events ───────────────────────────────────────────
  const { data: eventsData, isLoading: eventsLoading } = useEvents({
    type: ['hackathon', 'competition', 'sports'],
  });
  const activeEvents = useMemo(
    () => eventsData?.pages.flatMap(p => p.items) ?? [],
    [eventsData],
  );

  // Default event in Create modal
  useEffect(() => {
    if (!createEventId && activeEvents.length > 0) {
      setCreateEventId(activeEvents[0]!.id);
    }
  }, [activeEvents, createEventId]);

  // ── 2. Fetch real team posts across all active team events ────────────────
  const postQueries = useQueries({
    queries: activeEvents.map(evt => ({
      queryKey: teamKeys.forEvent(evt.id),
      queryFn: () => listTeamPosts(evt.id),
      staleTime: 30_000,
    })),
  });

  // ── 3. Fetch real looking students across all active team events ──────────
  const lookingQueries = useQueries({
    queries: activeEvents.map(evt => ({
      queryKey: peopleKeys.looking(evt.id),
      queryFn: () => listLooking(evt.id),
      staleTime: 20_000,
    })),
  });

  // ── 4. Fetch incoming/outgoing links + my registrations (students only) ───
  const { data: inboxLinks } = useLinks('in');
  const { data: sentLinks }  = useLinks('out');
  const pendingInboxCount = useMemo(
    () => (inboxLinks?.items ?? []).filter(l => l.status === 'pending').length,
    [inboxLinks],
  );

  const regQueries = useQueries({
    queries: isStudent
      ? activeEvents.map(evt => ({
          queryKey: registrationKeys.mine(evt.id),
          queryFn: () => getMyRegistration(evt.id),
          staleTime: 30_000,
        }))
      : [],
  });

  const regByEventId = useMemo(() => {
    const map = new Map<string, Registration>();
    if (!isStudent) return map;
    activeEvents.forEach((evt, idx) => {
      const reg = regQueries[idx]?.data;
      if (reg && reg.status !== 'withdrawn') {
        map.set(evt.id, reg);
      }
    });
    return map;
  }, [isStudent, activeEvents, regQueries]);

  const sentStatusByPostId = useMemo(() => {
    const map = new Map<string, string>();
    for (const link of sentLinks?.items ?? []) {
      if (link.teamPostId && (link.status === 'pending' || link.status === 'accepted')) {
        map.set(link.teamPostId, link.status);
      }
    }
    return map;
  }, [sentLinks]);

  const postsLoading = eventsLoading || postQueries.some(q => q.isLoading);

  // Combine posts with parent event metadata
  const allPosts: EnrichedPost[] = useMemo(() => {
    const list: EnrichedPost[] = [];
    activeEvents.forEach((evt, idx) => {
      const items = postQueries[idx]?.data ?? [];
      for (const post of items) {
        list.push({
          post,
          eventTitle: evt.title,
          eventType: evt.type,
          eventDeadline: evt.deadline,
        });
      }
    });
    return list;
  }, [activeEvents, postQueries]);

  // Combine looking students across events
  const allLooking: EnrichedLooking[] = useMemo(() => {
    const list: EnrichedLooking[] = [];
    activeEvents.forEach((evt, idx) => {
      const items = lookingQueries[idx]?.data?.items ?? [];
      for (const item of items) {
        list.push({ item, eventId: evt.id, eventTitle: evt.title });
      }
    });
    return list;
  }, [activeEvents, lookingQueries]);

  // Unique roles across real posts for quick-filter chips
  const availableRoles = useMemo(() => {
    const counts = new Map<string, number>();
    for (const { post } of allPosts) {
      for (const r of post.rolesNeeded) {
        counts.set(r, (counts.get(r) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([role]) => role);
  }, [allPosts]);

  // Post count per event
  const postCountByEvent = useMemo(() => {
    const map = new Map<string, number>();
    for (const { post } of allPosts) {
      map.set(post.eventId, (map.get(post.eventId) ?? 0) + 1);
    }
    return map;
  }, [allPosts]);

  // ── Filtered & sorted posts ───────────────────────────────────────────────
  const filteredPosts = useMemo(() => {
    let list = allPosts;

    if (selectedEventId !== 'all') {
      list = list.filter(({ post }) => post.eventId === selectedEventId);
    }

    if (activeRole) {
      const roleLower = activeRole.toLowerCase();
      list = list.filter(({ post }) =>
        post.rolesNeeded.some(r => r.toLowerCase() === roleLower),
      );
    }

    if (urgentOnly) {
      list = list.filter(({ post }) => post.status === 'open' && post.spotsLeft <= 1);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(({ post, eventTitle }) =>
        `${post.title} ${post.description} ${post.owner.name} ${post.rolesNeeded.join(' ')} ${eventTitle}`
          .toLowerCase()
          .includes(q),
      );
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'spots') {
        return b.post.spotsLeft - a.post.spotsLeft;
      }
      if (sortBy === 'deadline') {
        const aTime = a.eventDeadline ? new Date(a.eventDeadline).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.eventDeadline ? new Date(b.eventDeadline).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      }
      return new Date(b.post.createdAt).getTime() - new Date(a.post.createdAt).getTime();
    });
  }, [allPosts, selectedEventId, activeRole, urgentOnly, search, sortBy]);

  // Filtered looking students when an event chip is selected
  const visibleLooking = useMemo(() => {
    if (selectedEventId === 'all') return allLooking;
    return allLooking.filter(l => l.eventId === selectedEventId);
  }, [allLooking, selectedEventId]);

  const totalOpenSpots = useMemo(
    () => allPosts.reduce((sum, { post }) => sum + (post.status === 'open' ? post.spotsLeft : 0), 0),
    [allPosts],
  );

  const hasFilters = selectedEventId !== 'all' || activeRole !== null || urgentOnly || search.trim() !== '';

  function resetFilters() {
    setSelectedEventId('all');
    setActiveRole(null);
    setUrgentOnly(false);
    setSearch('');
  }

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased">
      <AppBar subtitle="Team Finder" />

      <main className="w-full pt-16 max-w-7xl mx-auto px-4 lg:px-8 pb-28 lg:pb-12">

        {/* ── Breadcrumb + Quick Action Bar ──────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-4 border-b border-outline-variant/10">
          <nav className="flex items-center gap-1.5 font-label-md text-sm text-on-surface-variant flex-wrap">
            <span>Verified Academic Portal</span>
            <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
            <span className="text-primary font-semibold">Team Finder</span>
            <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
            <span className="text-on-surface font-semibold">Active Squad Recruitments</span>
          </nav>
          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <button
              id="team-my-applications-btn"
              onClick={() => navigate('/teams/inbox')}
              className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-sm shadow-sm transition-all">
              <span className="material-symbols-outlined text-[18px] text-primary">mark_email_unread</span>
              My Squad Applications
              {pendingInboxCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-secondary-container text-on-secondary-fixed text-[10px] font-bold">
                  {pendingInboxCount}
                </span>
              )}
            </button>
            {isStudent && activeEvents.length > 0 && (
              <button
                id="team-post-recruitment-btn"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-lg text-sm shadow-md transition-all hover:scale-[1.01] active:scale-[0.99]">
                <span className="material-symbols-outlined text-[18px]">group_add</span>
                Post Team Recruitment
              </button>
            )}
          </div>
        </div>

        {/* ── Hero + Live KPI Ribbon ──────────────────────────────────────── */}
        <div className="w-full mt-5 p-6 lg:p-8 rounded-xl bg-surface-container-low shadow-sm relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-primary-fixed/30 blur-3xl pointer-events-none" />
          <div className="absolute right-40 -bottom-20 w-64 h-64 rounded-full bg-secondary-fixed/40 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container text-on-surface font-label-sm text-[11px] tracking-wider uppercase mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-bold text-secondary">Live Campus Matchmaking</span>
                <span className="text-outline-variant">•</span>
                <span className="text-on-surface-variant font-medium">{activeEvents.length} Active Team Events</span>
              </div>
              <h1 className="font-headline-xl text-[2rem] lg:text-[2.35rem] text-on-surface tracking-tight font-bold leading-tight">
                Find Your Crew — Squad Matchmaking
              </h1>
              <p className="font-body-md text-sm text-on-surface-variant mt-2 leading-relaxed">
                Browse open team posts across campus hackathons, competitions, and sports leagues, or connect with students actively looking for a team.
              </p>
            </div>

            {/* Live KPI stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto shrink-0">
              {[
                { value: String(allPosts.length), label: 'Active Squads', sub: 'Open & forming', color: 'text-primary', bg: 'bg-surface-container-lowest', icon: 'groups' },
                { value: String(totalOpenSpots), label: 'Open Spots', sub: 'Available roles', color: 'text-tertiary', bg: 'bg-surface-container-lowest', icon: 'person_search' },
                { value: String(allLooking.length), label: 'Looking Students', sub: 'Ready to join', color: 'text-secondary', bg: 'bg-secondary-fixed/40', icon: 'waving_hand' },
                { value: String(activeEvents.length), label: 'Team Events', sub: 'Currently open', color: 'text-primary', bg: 'bg-surface-container-lowest', icon: 'event_available' },
              ].map(k => (
                <div key={k.label} className={`px-4 py-3 rounded-lg ${k.bg} shadow-sm flex flex-col gap-1`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-code-sm text-[1.25rem] font-bold ${k.color}`}>{k.value}</span>
                    <span className="material-symbols-outlined text-outline text-[18px]">{k.icon}</span>
                  </div>
                  <span className="font-label-sm text-[11px] text-on-surface-variant">{k.label}</span>
                  <span className="font-label-sm text-[10px] text-outline">{k.sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Filter Console ──────────────────────────────────────────────── */}
        <div className="w-full mt-5 p-4 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-4">
          {/* Search + Sort row */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
              <input
                id="team-finder-search"
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by team title, role needed, leader name, or event..."
                className="w-full h-11 pl-10 pr-14 rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline font-body-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-surface-container-high text-outline text-[10px] font-code-sm uppercase tracking-wide">
                ⌘K
              </div>
            </div>
            <div className="relative w-full sm:w-56">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as 'newest' | 'deadline' | 'spots')}
                className="w-full h-11 px-3 pr-8 appearance-none rounded-lg bg-surface-container-low text-on-surface font-label-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer">
                <option value="newest">Newest Recruitments</option>
                <option value="deadline">Event Deadline (Soonest)</option>
                <option value="spots">Most Spots Available</option>
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[18px]">expand_more</span>
            </div>
          </div>

          {/* Event chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-label-sm text-[11px] text-outline uppercase tracking-wider mr-1">Event:</span>
            <button
              onClick={() => setSelectedEventId('all')}
              className={`px-3 py-1.5 rounded-full font-label-md text-[11px] transition-all flex items-center gap-1.5 ${
                selectedEventId === 'all'
                  ? 'bg-primary-container text-on-primary shadow-sm'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
              }`}>
              All Events
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                selectedEventId === 'all' ? 'bg-primary/20' : 'bg-surface-container-high'
              }`}>{allPosts.length}</span>
            </button>
            {activeEvents.map(evt => {
              const count = postCountByEvent.get(evt.id) ?? 0;
              const isSelected = selectedEventId === evt.id;
              return (
                <button
                  key={evt.id}
                  onClick={() => setSelectedEventId(evt.id)}
                  className={`px-3 py-1.5 rounded-full font-label-md text-[11px] transition-all flex items-center gap-1.5 max-w-[230px] ${
                    isSelected
                      ? 'bg-primary-container text-on-primary shadow-sm'
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                  }`}>
                  <span className="truncate">{evt.title}</span>
                  {count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      isSelected ? 'bg-primary/20' : 'bg-surface-container-high'
                    }`}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Role track + summary row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-outline-variant/10">
            <div className="flex flex-wrap items-center gap-2">
              {availableRoles.length > 0 && (
                <>
                  <span className="font-label-sm text-[11px] text-outline uppercase tracking-wider mr-1">Role:</span>
                  {availableRoles.map(r => (
                    <button
                      key={r}
                      onClick={() => setActiveRole(rr => rr === r ? null : r)}
                      className={`px-2.5 py-1 rounded-md font-label-md text-[11px] cursor-pointer transition-colors ${
                        activeRole === r
                          ? 'bg-primary-container text-on-primary'
                          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                      }`}>{r}</button>
                  ))}
                  <div className="h-4 w-[1px] bg-outline-variant mx-1 hidden sm:block" />
                </>
              )}
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={urgentOnly}
                  onChange={e => setUrgentOnly(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
                <span className="font-label-md text-[11px] text-on-surface font-medium">Last spot left (1 spot)</span>
              </label>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-label-sm text-[11px] text-on-surface-variant">
                Showing <span className="font-bold text-on-surface">{filteredPosts.length}</span> team post{filteredPosts.length === 1 ? '' : 's'}
              </span>
              {hasFilters && (
                <button onClick={resetFilters} className="font-label-sm text-[11px] text-primary hover:underline font-semibold">
                  Reset Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── 12-col Grid ─────────────────────────────────────────────────── */}
        <div className="w-full mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* LEFT: Live Squad Feed (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4">

            {/* Loading skeletons */}
            {postsLoading && (
              <div className="flex flex-col gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-44 rounded-xl bg-surface-container-high animate-pulse" />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!postsLoading && filteredPosts.length === 0 && (
              <div className="p-8 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[28px] text-primary">groups</span>
                </div>
                <div>
                  <h2 className="font-headline-sm text-base font-bold text-on-surface">
                    {hasFilters ? 'No matching team posts' : 'No open team posts yet'}
                  </h2>
                  <p className="font-body-sm text-xs text-on-surface-variant mt-1 max-w-sm">
                    {hasFilters
                      ? 'Try clearing some filters or switching to another event.'
                      : 'Be the first to post a team recruitment for an upcoming hackathon or competition!'}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {hasFilters && (
                    <button
                      onClick={resetFilters}
                      className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold"
                    >
                      Reset Filters
                    </button>
                  )}
                  {isStudent && activeEvents.length > 0 && (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary/90"
                    >
                      + Post Team Recruitment
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Real TeamPost cards */}
            {!postsLoading && filteredPosts.map(({ post, eventTitle, eventType, eventDeadline }) => {
              const filled = Math.max(0, post.spotsTotal - post.spotsLeft);
              const isFull = post.status === 'full' || post.spotsLeft === 0;
              return (
                <article
                  key={post.id}
                  className="p-5 rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-all flex flex-col gap-3.5 border border-outline-variant/10"
                >
                  {/* Top badges + capacity */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => navigate(`/events/${post.eventId}`)}
                        className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-[10px] uppercase tracking-wider font-bold hover:underline"
                      >
                        {eventType} • {eventTitle}
                      </button>
                      <span className={`px-2.5 py-0.5 rounded-full font-label-sm text-[10px] font-bold flex items-center gap-1 ${
                        isFull
                          ? 'bg-surface-container-high text-on-surface-variant'
                          : post.spotsLeft === 1
                          ? 'bg-secondary-fixed text-on-secondary-fixed'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        <span className="material-symbols-outlined text-[12px]">
                          {isFull ? 'lock' : post.spotsLeft === 1 ? 'local_fire_department' : 'check_circle'}
                        </span>
                        {isFull ? 'Full' : `${post.spotsLeft} spot${post.spotsLeft === 1 ? '' : 's'} left`}
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-on-surface font-code-sm text-[12px]">
                      <span className="material-symbols-outlined text-[15px] text-primary">groups</span>
                      <span className="font-bold">{filled} / {post.spotsTotal}</span> Filled
                    </div>
                  </div>

                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 text-primary font-bold text-sm">
                        {post.owner.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-headline-md text-lg text-on-surface font-bold tracking-tight truncate">
                            {post.title}
                          </h2>
                          {post.isOwner && (
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                              Your Post
                            </span>
                          )}
                        </div>
                        <p className="font-label-md text-xs text-on-surface-variant">
                          Posted by {post.owner.name}
                          {eventDeadline && (
                            <> • Closes {new Date(eventDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {post.description && (
                    <p className="font-body-md text-sm text-on-surface leading-relaxed">
                      {post.description}
                    </p>
                  )}

                  {/* Roles needed */}
                  {post.rolesNeeded.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {post.rolesNeeded.map(role => (
                        <span
                          key={role}
                          className="px-2.5 py-1 rounded-lg bg-surface-container text-on-surface-variant font-label-sm text-[11px] font-medium"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-outline-variant/10">
                    <button
                      onClick={() => navigate(`/events/${post.eventId}/teams`)}
                      className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      <span>Open event team board</span>
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/events/${post.eventId}`)}
                        className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors"
                      >
                        Event Details
                      </button>
                      {!post.isOwner && isStudent && (() => {
                        const myReg = regByEventId.get(post.eventId);
                        if (myReg) {
                          const isInvited = myReg.members.some(
                            m => m.userId === user?.id && m.status === 'invited',
                          );
                          return (
                            <button
                              onClick={() => navigate(`/events/${post.eventId}`)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                                isInvited
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200/60 hover:bg-amber-100'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-emerald-100'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                {isInvited ? 'mail' : 'how_to_reg'}
                              </span>
                              {isInvited ? 'Invite Pending' : 'Already in Team'}
                            </button>
                          );
                        }
                        const sentStatus = sentStatusByPostId.get(post.id);
                        if (sentStatus) {
                          return (
                            <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">check_circle</span>
                              {sentStatus === 'accepted' ? 'Accepted' : 'Request Sent'}
                            </span>
                          );
                        }
                        if (!isFull) {
                          return (
                            <button
                              onClick={() => setJoiningPost(post)}
                              className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold shadow-sm transition-all flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[15px]">send</span>
                              Request to Join
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* RIGHT: Sidebar (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">

            {/* 1. Form a Squad callout */}
            <div className="p-5 rounded-xl bg-primary text-on-primary shadow-md relative overflow-hidden flex flex-col gap-4">
              <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-primary-container blur-xl pointer-events-none" />
              <div className="relative z-10">
                <span className="px-2 py-0.5 rounded bg-primary-container text-on-primary font-label-sm text-[10px] uppercase font-bold tracking-wider">
                  Lead a Team
                </span>
                <h3 className="font-headline-md text-[1.125rem] font-bold mt-2 tracking-tight">Forming a New Squad?</h3>
                <p className="font-body-sm text-[12px] text-on-primary-container mt-1 leading-relaxed">
                  Post open roles for an active hackathon or competition so interested teammates can send join requests.
                </p>
              </div>
              {isStudent && activeEvents.length > 0 ? (
                <button
                  id="sidebar-create-squad-btn"
                  onClick={() => setShowCreateModal(true)}
                  className="relative z-10 w-full py-2.5 rounded-lg bg-secondary-container text-on-secondary-fixed font-label-lg text-[13px] font-bold shadow hover:bg-amber-400 transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  Create Team Recruitment
                </button>
              ) : (
                <button
                  onClick={() => navigate('/events')}
                  className="relative z-10 w-full py-2.5 rounded-lg bg-secondary-container text-on-secondary-fixed font-label-lg text-[13px] font-bold shadow hover:bg-amber-400 transition-all flex items-center justify-center gap-2">
                  Browse Events
                </button>
              )}
            </div>

            {/* 2. Students Looking for a Team (Live) */}
            <div className="rounded-xl bg-surface-container-lowest p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-headline-sm text-[14px] text-on-surface font-semibold">Students Looking for a Team</h2>
                <span className="font-label-sm text-[11px] text-primary font-bold">
                  {visibleLooking.length} active
                </span>
              </div>

              {visibleLooking.length === 0 ? (
                <p className="font-body-sm text-xs text-on-surface-variant">
                  No students have marked themselves as looking yet.
                </p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {visibleLooking.slice(0, 5).map(({ item, eventId, eventTitle }) => (
                    <div key={`${eventId}-${item.id}`} className="flex items-start gap-2.5 p-2 rounded-lg bg-surface-container-low/70">
                      <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-label-md text-xs font-bold shrink-0">
                        {item.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-label-md text-xs text-on-surface font-semibold block truncate">
                          {item.user.name}
                        </span>
                        <span className="font-body-sm text-[11px] text-primary truncate block">
                          {eventTitle}
                        </span>
                        {item.note && (
                          <span className="font-body-sm text-[11px] text-on-surface-variant line-clamp-2 mt-0.5 block">
                            “{item.note}”
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => navigate(`/events/${eventId}/looking`)}
                        className="px-2 py-1 rounded bg-surface-container hover:bg-primary-container hover:text-on-primary text-primary font-label-md text-[11px] font-semibold transition-colors shrink-0">
                        View
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() =>
                  navigate(selectedEventId !== 'all' ? `/events/${selectedEventId}/looking` : '/teams/people')
                }
                className="flex items-center gap-1 text-primary font-label-md text-xs font-semibold hover:underline mt-1">
                {selectedEventId !== 'all' ? 'View all looking for this event' : 'Search all students'}
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </button>
            </div>

            {/* 3. Team Finder Rules */}
            <div className="rounded-xl bg-surface-container-lowest p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-secondary">gavel</span>
                <h2 className="font-headline-sm text-[14px] text-on-surface font-semibold">Team Finder Rules</h2>
              </div>
              <div className="flex flex-col gap-2">
                {[
                  { icon: 'looks_one', title: '1 Open Post per Event', desc: 'Each student can maintain one open recruitment post per event at a time.' },
                  { icon: 'group_add', title: 'Auto-Updated Spots', desc: 'Accepted join requests automatically decrement open spots and mark full posts.' },
                  { icon: 'schedule', title: 'Deadline Expiry', desc: 'Team posts automatically expire when the event registration deadline passes.' },
                ].map(r => (
                  <div key={r.title} className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0 mt-0.5">{r.icon}</span>
                    <div>
                      <span className="font-label-md text-[11px] text-on-surface font-semibold block">{r.title}:</span>
                      <span className="font-body-sm text-[11px] text-on-surface-variant">{r.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ── Create Team Post Modal ────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface-container-lowest p-5 shadow-xl border border-outline-variant/20 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline-sm text-lg font-bold text-on-surface">Post Team Recruitment</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-full hover:bg-surface-container text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="mb-4">
              <label className="block font-label-sm text-xs text-on-surface-variant uppercase tracking-wider mb-1.5">
                Select Event
              </label>
              <select
                value={createEventId}
                onChange={e => setCreateEventId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {activeEvents.map(evt => (
                  <option key={evt.id} value={evt.id}>
                    {evt.title}
                  </option>
                ))}
              </select>
            </div>

            {createEventId && (
              <CreateTeamPostForm
                eventId={createEventId}
                onSuccess={() => setShowCreateModal(false)}
                onCancel={() => setShowCreateModal(false)}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Request to Join Modal ─────────────────────────────────────────── */}
      {joiningPost && (
        <RequestToJoinModal
          post={joiningPost}
          onClose={() => setJoiningPost(null)}
        />
      )}

      <BottomNav />
    </div>
  );
}
