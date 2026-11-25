import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useEvents } from '../hooks/useEvents';
import { useAuth } from '@/features/auth/context/AuthContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { AppBar } from '@/components/layout/AppBar';
import type { EventType } from '../types';

// ── Category pills config ─────────────────────────────────────────────────────
const CATEGORY_PILLS = [
  { key: 'all',         label: 'All Events',         icon: 'apps',                    iconColor: 'text-on-primary' },
  { key: 'hackathon',   label: 'Hackathons',          icon: 'terminal',                iconColor: 'text-tertiary' },
  { key: 'sports',      label: 'Sports & Athletics',  icon: 'sports_soccer',           iconColor: 'text-secondary' },
  { key: 'workshop',    label: 'Hands-on Workshops',  icon: 'precision_manufacturing', iconColor: 'text-primary' },
  { key: 'seminar',     label: 'Seminars & Talks',    icon: 'record_voice_over',       iconColor: 'text-tertiary' },
  { key: 'other',       label: 'Research Sprints',    icon: 'biotech',                 iconColor: 'text-primary' },
  { key: 'archive',     label: 'Verified Archive',   icon: 'inventory_2',             iconColor: 'text-secondary' },
] as const;

type CategoryKey = typeof CATEGORY_PILLS[number]['key'];

// ── Secondary filter options ──────────────────────────────────────────────────
const BRANCH_OPTIONS = [
  { value: '', label: 'All Branches' },
  { value: 'CSE', label: 'Computer Science (CSE)' },
  { value: 'CSIT', label: 'CS & IT (CSIT)' },
  { value: 'IT', label: 'Information Tech (IT)' },
  { value: 'ECE', label: 'Electronics (ECE)' },
  { value: 'MECH', label: 'Mechanical (Mech)' },
  { value: 'AI/DS', label: 'AI & Data Science' },
  { value: 'CIVIL', label: 'Civil Engineering' },
  { value: 'EEE', label: 'Electrical (EEE)' },
];

const YEAR_OPTIONS = [
  { value: 0, label: 'All Semesters / Years' },
  { value: 1, label: '1st Year' },
  { value: 2, label: '2nd Year' },
  { value: 3, label: '3rd Year' },
  { value: 4, label: '4th Year' },
];

const MODE_OPTIONS = [
  { value: '', label: 'All Modes' },
  { value: 'in_app', label: 'In-App Registration' },
  { value: 'external', label: 'External Portal / Form' },
];



// ── EventFeedPage ─────────────────────────────────────────────────────────────
export default function EventFeedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isFaculty = user?.role === 'faculty' || user?.role === 'dept_head' || user?.role === 'admin';

  const [searchQuery, setSearchQuery]       = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedYear, setSelectedYear]     = useState<number>(0);
  const [selectedMode, setSelectedMode]     = useState<string>('');
  const [closingSoonOnly, setClosingSoonOnly] = useState<boolean>(false);
  const [openDropdown, setOpenDropdown]     = useState<'branch' | 'year' | 'mode' | null>(null);
  const [viewMode, setViewMode]             = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy]                 = useState('deadline');

  // Close filter dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest('.filter-dropdown-container')) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
  const apiType = activeCategory === 'all' || activeCategory === 'archive' ? undefined : [activeCategory as EventType];
  const apiBranch = selectedBranch ? [selectedBranch] : undefined;
  const apiYear = selectedYear > 0 ? [selectedYear] : undefined;
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useEvents({
    type: apiType,
    branch: apiBranch,
    year: apiYear,
  });
  const allEvents = data?.pages.flatMap(p => p.items) ?? [];

  // Archived events
  const [isArchiveExpanded, setIsArchiveExpanded] = useState(true);
  const { data: archivedData } = useEvents({ status: ['archived'] });
  const archivedEvents = archivedData?.pages.flatMap(p => p.items) ?? [];

  const filteredArchivedEvents = useMemo(() => {
    let result = archivedEvents;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(evt =>
        `${evt.title} ${evt.organizer ?? ''} ${evt.type} ${evt.summary ?? ''}`.toLowerCase().includes(q)
      );
    }
    if (selectedBranch) {
      result = result.filter(evt => {
        const branches = evt.eligibility?.branches ?? [];
        return branches.length === 0 || branches.includes(selectedBranch);
      });
    }
    if (selectedYear > 0) {
      result = result.filter(evt => {
        const years = evt.eligibility?.years ?? [];
        return years.length === 0 || years.includes(selectedYear);
      });
    }
    if (selectedMode) {
      result = result.filter(evt => evt.registrationMode === selectedMode);
    }
    return [...result].sort((a, b) => {
      if (sortBy === 'deadline') {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
      }
      if (sortBy === 'recent') {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      }
      return 0;
    });
  }, [archivedEvents, searchQuery, selectedBranch, selectedYear, selectedMode, sortBy]);

  const filteredEvents = useMemo(() => {
    let result = allEvents;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(evt =>
        `${evt.title} ${evt.organizer ?? ''} ${evt.type} ${evt.summary ?? ''}`.toLowerCase().includes(q)
      );
    }

    // Branch filter
    if (selectedBranch) {
      result = result.filter(evt => {
        const branches = evt.eligibility?.branches ?? [];
        return branches.length === 0 || branches.includes(selectedBranch);
      });
    }

    // Year filter
    if (selectedYear > 0) {
      result = result.filter(evt => {
        const years = evt.eligibility?.years ?? [];
        return years.length === 0 || years.includes(selectedYear);
      });
    }

    // Mode filter
    if (selectedMode) {
      result = result.filter(evt => evt.registrationMode === selectedMode);
    }

    // Closing soon toggle
    if (closingSoonOnly) {
      const now = Date.now();
      result = result.filter(evt => {
        if (!evt.deadline) return false;
        const d = Math.ceil((new Date(evt.deadline).getTime() - now) / 86400000);
        return d >= 0 && d <= 2;
      });
    }

    // Sort by
    return [...result].sort((a, b) => {
      if (sortBy === 'deadline') {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (sortBy === 'recent') {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      }
      if (sortBy === 'prize') {
        const aFee = a.fee ? 1 : 0;
        const bFee = b.fee ? 1 : 0;
        return bFee - aFee;
      }
      return 0;
    });
  }, [allEvents, searchQuery, selectedBranch, selectedYear, selectedMode, closingSoonOnly, sortBy]);

  const hasFilters =
    searchQuery.trim() !== '' ||
    activeCategory !== 'all' ||
    selectedBranch !== '' ||
    selectedYear !== 0 ||
    selectedMode !== '' ||
    closingSoonOnly;

  const clearAll = useCallback(() => {
    setSearchQuery('');
    setActiveCategory('all');
    setSelectedBranch('');
    setSelectedYear(0);
    setSelectedMode('');
    setClosingSoonOnly(false);
    setOpenDropdown(null);
  }, []);

  const isArchiveCategory = activeCategory === 'archive';
  const displayEvents = isArchiveCategory ? filteredArchivedEvents : filteredEvents;

  // Closing Soon count
  const closingSoonCount = useMemo(() => {
    const now = Date.now();
    return allEvents.filter(evt => {
      if (!evt.deadline) return false;
      const d = Math.ceil((new Date(evt.deadline).getTime() - now) / 86400000);
      return d >= 0 && d <= 2;
    }).length;
  }, [allEvents]);

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased">
      <AppBar subtitle={isFaculty ? 'Faculty Portal' : 'Student Incubator'} />

      <main className="w-full pt-16 max-w-7xl mx-auto px-6 lg:px-8 pb-28 lg:pb-12">

        {/* ── Breadcrumb ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 font-label-md text-label-md text-on-surface-variant pt-4 pb-3">
          <Link to="/home" className="hover:text-primary transition-colors">Verified Academic Portal</Link>
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
              Browse active hackathons, research lab sprints, robotics bootcamps, and inter-department leagues across campus labs.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button id="events-subscribed-btn"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-lg text-label-lg shadow-sm transition-all">
              <span className="material-symbols-outlined text-[18px] text-primary">bookmark_manager</span>
              <span>Subscribed Feeds</span>
            </button>
            <button id="propose-event-btn" onClick={() => navigate(isFaculty ? '/events/paste' : '/events/new')}
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
                </button>
              );
            })}
          </div>

          {/* Secondary filter row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              {/* Branch Filter Dropdown */}
              <div className="relative inline-block filter-dropdown-container">
                <button
                  type="button"
                  id="filter-branch-btn"
                  onClick={() => setOpenDropdown(prev => prev === 'branch' ? null : 'branch')}
                  className={`h-9 px-3 rounded-lg flex items-center gap-1.5 font-label-sm text-label-sm transition-all cursor-pointer ${
                    selectedBranch
                      ? 'bg-primary-container text-on-primary-container font-semibold ring-1 ring-primary/40'
                      : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
                  }`}
                >
                  <span className="text-outline">Branch:</span>
                  <span className="font-semibold">
                    {BRANCH_OPTIONS.find(b => b.value === selectedBranch)?.label.split(' ')[0] || 'All'}
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-outline">
                    {openDropdown === 'branch' ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
                {openDropdown === 'branch' && (
                  <div className="absolute left-0 top-11 z-50 w-56 py-1 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 font-label-sm text-label-sm text-outline border-b border-outline-variant/20 uppercase font-semibold">
                      Filter by Branch
                    </div>
                    {BRANCH_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setSelectedBranch(opt.value); setOpenDropdown(null); }}
                        className={`w-full px-3 py-2 text-left font-label-md text-label-md flex items-center justify-between transition-colors ${
                          selectedBranch === opt.value
                            ? 'bg-primary-container/40 text-primary font-semibold'
                            : 'hover:bg-surface-container-low text-on-surface'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {selectedBranch === opt.value && (
                          <span className="material-symbols-outlined text-[16px] text-primary">check</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Eligibility / Year Dropdown */}
              <div className="relative inline-block filter-dropdown-container">
                <button
                  type="button"
                  id="filter-year-btn"
                  onClick={() => setOpenDropdown(prev => prev === 'year' ? null : 'year')}
                  className={`h-9 px-3 rounded-lg flex items-center gap-1.5 font-label-sm text-label-sm transition-all cursor-pointer ${
                    selectedYear > 0
                      ? 'bg-primary-container text-on-primary-container font-semibold ring-1 ring-primary/40'
                      : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
                  }`}
                >
                  <span className="text-outline">Year:</span>
                  <span className="font-semibold">
                    {selectedYear > 0 ? `${selectedYear}${selectedYear === 1 ? 'st' : selectedYear === 2 ? 'nd' : selectedYear === 3 ? 'rd' : 'th'} Year` : 'All Years'}
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-outline">
                    {openDropdown === 'year' ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
                {openDropdown === 'year' && (
                  <div className="absolute left-0 top-11 z-50 w-52 py-1 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 font-label-sm text-label-sm text-outline border-b border-outline-variant/20 uppercase font-semibold">
                      Eligible Year
                    </div>
                    {YEAR_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setSelectedYear(opt.value); setOpenDropdown(null); }}
                        className={`w-full px-3 py-2 text-left font-label-md text-label-md flex items-center justify-between transition-colors ${
                          selectedYear === opt.value
                            ? 'bg-primary-container/40 text-primary font-semibold'
                            : 'hover:bg-surface-container-low text-on-surface'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {selectedYear === opt.value && (
                          <span className="material-symbols-outlined text-[16px] text-primary">check</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Mode Dropdown */}
              <div className="relative inline-block filter-dropdown-container">
                <button
                  type="button"
                  id="filter-mode-btn"
                  onClick={() => setOpenDropdown(prev => prev === 'mode' ? null : 'mode')}
                  className={`h-9 px-3 rounded-lg flex items-center gap-1.5 font-label-sm text-label-sm transition-all cursor-pointer ${
                    selectedMode
                      ? 'bg-primary-container text-on-primary-container font-semibold ring-1 ring-primary/40'
                      : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
                  }`}
                >
                  <span className="text-outline">Mode:</span>
                  <span className="font-semibold">
                    {selectedMode === 'in_app' ? 'In-App' : selectedMode === 'external' ? 'External' : 'All Modes'}
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-outline">
                    {openDropdown === 'mode' ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
                {openDropdown === 'mode' && (
                  <div className="absolute left-0 top-11 z-50 w-52 py-1 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 font-label-sm text-label-sm text-outline border-b border-outline-variant/20 uppercase font-semibold">
                      Registration Mode
                    </div>
                    {MODE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setSelectedMode(opt.value); setOpenDropdown(null); }}
                        className={`w-full px-3 py-2 text-left font-label-md text-label-md flex items-center justify-between transition-colors ${
                          selectedMode === opt.value
                            ? 'bg-primary-container/40 text-primary font-semibold'
                            : 'hover:bg-surface-container-low text-on-surface'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {selectedMode === opt.value && (
                          <span className="material-symbols-outlined text-[16px] text-primary">check</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Closing Soon Toggle */}
              <button
                type="button"
                id="filter-closing-soon-btn"
                onClick={() => setClosingSoonOnly(prev => !prev)}
                className={`h-9 px-3 rounded-lg flex items-center gap-1.5 font-label-sm text-label-sm transition-all cursor-pointer ${
                  closingSoonOnly
                    ? 'bg-secondary text-on-secondary font-semibold shadow-sm ring-1 ring-secondary'
                    : 'bg-secondary-fixed/50 hover:bg-secondary-fixed text-on-secondary-fixed'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${closingSoonOnly ? 'bg-on-secondary animate-pulse' : 'bg-secondary'}`} />
                <span className="font-semibold">Closing Soon ({closingSoonCount})</span>
                {closingSoonOnly && <span className="material-symbols-outlined text-[16px]">close</span>}
              </button>
            </div>

            {/* Sort by Select */}
            <div className="flex items-center gap-2">
              <span className="text-outline font-label-sm text-label-sm">Sort by:</span>
              <select
                id="events-sort-select"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="bg-surface-container-low text-on-surface rounded-lg px-2.5 py-1.5 focus:outline-none font-label-md text-label-md cursor-pointer border-0"
              >
                <option value="deadline">Deadline (Soonest first)</option>
                <option value="recent">Recently Added</option>
                <option value="prize">Prizes / Bounties</option>
              </select>
            </div>
          </div>

          {/* Active filter summary strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-surface-container-low/60 font-label-md text-label-md text-on-surface-variant">
            <div className="flex flex-wrap items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-primary">filter_alt</span>
              <span>
                {isArchiveCategory ? (
                  <>Showing <strong className="text-on-surface">{filteredArchivedEvents.length} archived record(s)</strong> in Verified Academic Archive</>
                ) : (
                  <>
                    Showing <strong className="text-on-surface">{filteredEvents.length} events</strong> across campus labs &amp; sports arena
                    {closingSoonCount > 0 && (
                      <>
                        {' '}•{' '}
                        <span className="text-secondary font-semibold">{closingSoonCount} closing in &lt;48h</span>
                      </>
                    )}
                  </>
                )}
              </span>
              {/* Active Filter Badges */}
              {selectedBranch && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-container text-on-primary-container font-label-sm text-label-sm font-semibold">
                  Branch: {selectedBranch}
                  <button type="button" onClick={() => setSelectedBranch('')} className="hover:text-error flex items-center">
                    <span className="material-symbols-outlined text-[13px]">close</span>
                  </button>
                </span>
              )}
              {selectedYear > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-container text-on-primary-container font-label-sm text-label-sm font-semibold">
                  Year: {selectedYear}
                  <button type="button" onClick={() => setSelectedYear(0)} className="hover:text-error flex items-center">
                    <span className="material-symbols-outlined text-[13px]">close</span>
                  </button>
                </span>
              )}
              {selectedMode && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-container text-on-primary-container font-label-sm text-label-sm font-semibold">
                  Mode: {selectedMode === 'in_app' ? 'In-App' : 'External'}
                  <button type="button" onClick={() => setSelectedMode('')} className="hover:text-error flex items-center">
                    <span className="material-symbols-outlined text-[13px]">close</span>
                  </button>
                </span>
              )}
              {closingSoonOnly && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-on-secondary font-label-sm text-label-sm font-semibold">
                  Closing Soon
                  <button type="button" onClick={() => setClosingSoonOnly(false)} className="hover:text-error flex items-center">
                    <span className="material-symbols-outlined text-[13px]">close</span>
                  </button>
                </span>
              )}
            </div>
            {hasFilters && (
              <button onClick={clearAll} className="text-primary hover:underline font-label-sm text-label-sm cursor-pointer shrink-0">
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* ── Propose Event inline banner (full-width, compact) ─────────── */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary-container/10 to-secondary-container/10 border border-primary/15 mb-6">
          <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[20px] text-primary">campaign</span>
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-label-lg text-label-lg text-on-surface font-semibold">Have an Idea for a Campus Event?</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant ml-2 hidden sm:inline">Pitch directly to the Innovation Council for lab grants &amp; duty leaves.</span>
          </div>
          <button id="submit-proposal-btn" onClick={() => navigate(isFaculty ? '/events/paste' : '/events/new')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md shadow-sm transition-all active:scale-[0.98] shrink-0">
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            <span>{isFaculty ? 'Post Event' : 'Submit Proposal'}</span>
          </button>
        </div>

        {/* ── Event cards (full-width) ───────────────────────────────────── */}
        <div className="flex flex-col gap-5">

          {/* Event content column */}
          <div className="flex flex-col gap-5">

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
            {!isLoading && !isError && displayEvents.length > 0 && (
              <>
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'flex flex-col gap-4'}>
                  {displayEvents.map(event => (
                    <article
                      key={event.id}
                      onClick={() => navigate(`/events/${event.id}`)}
                      className="group bg-surface-container-lowest rounded-xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden cursor-pointer flex flex-col justify-between">
                      <div className={`absolute top-0 left-0 right-0 h-1 ${isArchiveCategory || event.status === 'archived' ? 'bg-secondary' : 'bg-gradient-to-r from-primary via-primary-container to-secondary-container'}`} />
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm uppercase ${isArchiveCategory || event.status === 'archived' ? 'bg-surface-dim text-on-surface-variant font-semibold' : 'bg-tertiary-fixed text-on-tertiary-fixed'}`}>
                            {event.type}
                          </span>
                          {isArchiveCategory || event.status === 'archived' ? (
                            <span className="font-code-sm text-code-sm text-secondary bg-secondary-fixed/40 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">inventory_2</span>
                              Verified Archive
                            </span>
                          ) : event.deadline && (() => {
                            const d = Math.ceil((new Date(event.deadline).getTime() - Date.now()) / 86400000);
                            if (d < 0) {
                              return (
                                <span className="font-code-sm text-code-sm text-outline bg-surface-container-high px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">event_busy</span>
                                  Past Deadline
                                </span>
                              );
                            }
                            return (
                              <span className="font-code-sm text-code-sm text-secondary bg-secondary-fixed/50 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">schedule</span>
                                {d === 0 ? 'Closing today' : `${d}d left`}
                              </span>
                            );
                          })()}
                        </div>
                        <h2 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors leading-snug">{event.title}</h2>
                        {event.organizer && <p className="font-label-md text-label-md text-on-surface-variant mt-1">{event.organizer}</p>}
                      </div>
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-surface-container-high">
                        <button className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface underline" onClick={e => { e.stopPropagation(); navigate(`/events/${event.id}`); }}>Details &amp; Guidelines</button>
                        {isArchiveCategory || event.status === 'archived' ? (
                          <button className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-container-highest text-primary font-label-md text-label-md shadow-sm transition-colors flex items-center gap-1" onClick={e => { e.stopPropagation(); navigate(`/events/${event.id}`); }}>
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                            View Details
                          </button>
                        ) : (
                          <button className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors shadow-sm flex items-center gap-1" onClick={e => { e.stopPropagation(); navigate(`/events/${event.id}`); }}>
                            Apply Now <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
                {hasNextPage && !searchQuery && !isArchiveCategory && (
                  <button id="events-load-more-btn" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}
                    className="w-full py-3 rounded-lg bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-label-lg text-label-lg hover:bg-surface-container-low transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-60">
                    {isFetchingNextPage
                      ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Loading…</>
                      : <><span className="material-symbols-outlined text-[18px]">expand_more</span>Load more events</>
                    }
                  </button>
                )}

                {/* ── Archived & Concluded Events (Collapsible section on main feed) ── */}
                {!isArchiveCategory && archivedEvents.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-surface-container-high space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-[22px]">inventory_2</span>
                        <div>
                          <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                            Verified Academic Archive &amp; Concluded Events
                            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-normal">
                              {archivedEvents.length}
                            </span>
                          </h3>
                          <p className="text-xs text-on-surface-variant">
                            Historical sprints, closed tournaments, and verified competition outcomes.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveCategory('archive')}
                          className="text-primary hover:underline font-label-sm text-label-sm hidden sm:inline"
                        >
                          View Full Archive
                        </button>
                        <button
                          onClick={() => setIsArchiveExpanded(prev => !prev)}
                          className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant flex items-center gap-1 font-label-sm text-label-sm"
                          aria-label={isArchiveExpanded ? 'Collapse archive' : 'Expand archive'}
                        >
                          <span>{isArchiveExpanded ? 'Hide' : 'Show'}</span>
                          <span className="material-symbols-outlined text-[18px]">
                            {isArchiveExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                        </button>
                      </div>
                    </div>
                    {isArchiveExpanded && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {archivedEvents.map(evt => (
                          <article
                            key={evt.id}
                            onClick={() => navigate(`/events/${evt.id}`)}
                            className="flex flex-col justify-between bg-surface-container-low/70 rounded-xl p-4 opacity-90 hover:opacity-100 hover:bg-surface-container-low transition-all cursor-pointer border border-outline-variant/20 shadow-sm"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="px-2.5 py-0.5 rounded-full bg-surface-dim text-on-surface-variant font-label-sm text-label-sm uppercase font-semibold">
                                  Concluded • {evt.deadline ? new Date(evt.deadline).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Archive'}
                                </span>
                                <span className="font-code-sm text-code-sm text-outline flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">verified</span> Verified Archive
                                </span>
                              </div>
                              <h4 className="font-headline-sm text-headline-sm text-on-surface leading-snug">{evt.title}</h4>
                              {evt.organizer && <p className="font-label-md text-label-md text-on-surface-variant mt-1">{evt.organizer}</p>}
                            </div>
                            <div className="flex items-center justify-between pt-3 mt-3 border-t border-surface-container-high/60">
                              <span className="font-label-sm text-label-sm text-outline uppercase">{evt.type}</span>
                              <button
                                className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-container-highest text-primary font-label-sm text-label-sm shadow-sm transition-colors flex items-center gap-1 shrink-0"
                                onClick={e => { e.stopPropagation(); navigate(`/events/${evt.id}`); }}
                              >
                                <span className="material-symbols-outlined text-[16px]">visibility</span>
                                <span>View Details</span>
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Empty state (no results) */}
            {!isLoading && !isError && displayEvents.length === 0 && (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <div className={`w-16 h-16 rounded-full ${isArchiveCategory ? 'bg-secondary-fixed' : 'bg-primary-fixed'} flex items-center justify-center mb-2`}>
                  <span className={`material-symbols-outlined ${isArchiveCategory ? 'text-secondary' : 'text-primary'} text-[32px]`}>
                    {isArchiveCategory ? 'inventory_2' : 'radar'}
                  </span>
                </div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  {isArchiveCategory ? 'No archived events found' : 'No matching events'}
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">
                  {isArchiveCategory
                    ? 'No archived or concluded records match your filters.'
                    : 'Try removing some filters or broadening your search.'}
                </p>
                <button id="events-clear-filters-btn" onClick={clearAll}
                  className="px-4 py-2 rounded-lg bg-surface-container text-on-surface font-label-lg text-label-lg hover:bg-surface-container-high transition-colors">Clear filters</button>
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomNav active="events" />
    </div>
  );
}
