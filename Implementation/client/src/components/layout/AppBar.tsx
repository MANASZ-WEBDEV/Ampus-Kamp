import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useHome } from '@/features/home/hooks/useHome';

interface AppBarProps {
  title?:    string;
  subtitle?: string;
}

const NAV_LINKS = [
  { label: 'Home',               to: '/home',    path: 'home'    },
  { label: 'Events',             to: '/events',  path: 'events'  },
  { label: 'Team Finder',        to: '/teams',   path: 'teams'   },
  { label: 'Profile & Credentials', to: '/profile', path: 'profile' },
];

interface QuickAction {
  id:        string;
  label:     string;
  icon:      string;
  to:        string;
}

const FACULTY_QUICK_ACTIONS: QuickAction[] = [
  { id: 'qa-d-post-event',   label: 'Post Event',    icon: 'campaign',             to: '/events/new' },
  { id: 'qa-d-my-events',    label: 'My Events',     icon: 'event_note',           to: '/events/my'  },
  { id: 'qa-d-verify-queue', label: 'Verify Queue',  icon: 'verified_user',        to: '/verify'     },
  { id: 'qa-d-analytics',    label: 'Analytics',     icon: 'bar_chart',            to: '/analytics'  },
];

const ADMIN_QUICK_ACTIONS: QuickAction[] = [
  { id: 'qa-d-post-event',   label: 'Post Event',    icon: 'campaign',             to: '/events/new' },
  { id: 'qa-d-verify-queue', label: 'Verify Queue',  icon: 'verified_user',        to: '/verify'     },
  { id: 'qa-d-analytics',    label: 'Analytics',     icon: 'bar_chart',            to: '/analytics'  },
  { id: 'qa-d-admin',        label: 'Admin Panel',   icon: 'admin_panel_settings', to: '/admin'      },
];

const STUDENT_QUICK_ACTIONS: QuickAction[] = [
  { id: 'qa-d-add-achievement', label: 'Add Certificate', icon: 'add_task', to: '/achievements/add' },
  { id: 'qa-d-browse',          label: 'Browse Events',   icon: 'explore',  to: '/events'           },
  { id: 'qa-d-find-team',       label: 'Find a Squad',    icon: 'groups',   to: '/teams'            },
];

/**
 * AppBar — top navigation bar.
 *
 * Mobile: logo + subtitle + notifications + avatar
 * Desktop (lg+): logo + horizontal nav links + search + [+] FAB dropdown + notifications + avatar
 *
 * The [+] button on desktop mirrors the centre FAB in BottomNav (which is hidden on lg+).
 * This ensures the quick-action shortcut is always reachable regardless of viewport.
 */
export function AppBar({ subtitle = 'Incubator PWA' }: AppBarProps) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuth();
  const [search, setSearch] = useState('');
  const [fabOpen, setFabOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  const isFaculty = user?.role === 'faculty' || user?.role === 'dept_head' || user?.role === 'admin';
  const isAdmin   = user?.role === 'admin';

  const quickActions = isAdmin   ? ADMIN_QUICK_ACTIONS
    : isFaculty ? FACULTY_QUICK_ACTIONS
    : STUDENT_QUICK_ACTIONS;

  // Unread flag for notification bell
  const { data: homeData } = useHome();
  const hasUnread = homeData?.unreadNotificationsFlag ?? false;

  // Clean initials
  const rawName  = user?.name ?? '';
  const initials = rawName
    .replace(/[^a-zA-Z\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();

  const currentPath = location.pathname.split('/')[1] || 'home';

  // Close FAB dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setFabOpen(false);
      }
    }
    if (fabOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [fabOpen]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50
                       bg-surface/90 backdrop-blur-xl
                       shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-16 max-w-7xl mx-auto px-4 lg:px-8 flex items-center justify-between gap-4">

        {/* ── Left: logo + brand ──────────────────────────────────────────── */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center
                          shadow-[0_2px_8px_rgba(0,69,65,0.25)]">
            <span className="material-symbols-outlined text-on-primary text-[20px]">biotech</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-headline-sm text-sm text-primary leading-tight tracking-tight font-bold">
              CIP
            </span>
            <span className="font-label-sm text-[9px] text-on-surface-variant uppercase tracking-wider hidden sm:block">
              {isFaculty ? 'Faculty Portal' : subtitle}
            </span>
          </div>
        </div>

        {/* ── Centre: desktop horizontal nav (lg+) ──────────────────────── */}
        <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
          {NAV_LINKS.map(({ label, to, path }) => {
            const active = currentPath === path;
            return (
              <Link
                key={path}
                to={to}
                className={`px-4 py-2 rounded-lg font-label-lg text-sm transition-all ${
                  active
                    ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* ── Right: search + FAB + notifications + avatar (desktop) ──────── */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Search bar — desktop only */}
          <div className="relative hidden lg:flex items-center">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2
                             text-outline text-[18px] select-none">
              search
            </span>
            <input
              id="appbar-search"
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && navigate(`/events?q=${encodeURIComponent(search)}`)}
              placeholder="Search events, teams…"
              className="h-10 pl-9 pr-4 rounded-lg bg-surface-container-low text-on-surface
                         placeholder:text-outline text-sm font-body-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/20
                         w-52 xl:w-64 transition-all"
            />
          </div>

          {/* ── Desktop FAB [+] — mirrors mobile centre FAB ──────────────── */}
          <div className="relative hidden lg:block" ref={fabRef}>
            <button
              id="appbar-fab"
              aria-label={fabOpen ? 'Close actions' : 'Quick actions'}
              onClick={() => setFabOpen(o => !o)}
              className={`h-9 px-3 rounded-lg flex items-center gap-1.5 font-label-lg text-sm
                          transition-all duration-200 active:scale-95 shadow-sm ${
                            fabOpen
                              ? 'bg-error text-on-error'
                              : 'bg-primary text-on-primary hover:opacity-90'
                          }`}
            >
              <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${
                fabOpen ? 'rotate-45' : ''
              }`}>
                add
              </span>
              <span className="hidden xl:inline">Quick Add</span>
            </button>

            {/* Dropdown panel */}
            {fabOpen && (
              <div
                className="absolute right-0 top-[calc(100%+8px)] w-52 bg-surface-container-lowest
                           rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.14)]
                           border border-surface-container-high/60 overflow-hidden z-50"
                style={{ animation: 'slideUpFade 150ms ease-out both' }}
              >
                {quickActions.map((qa, i) => (
                  <button
                    key={qa.id}
                    id={qa.id}
                    onClick={() => { setFabOpen(false); navigate(qa.to); }}
                    className={`flex items-center gap-3 w-full px-4 py-3 text-left
                                font-label-lg text-sm text-on-surface
                                hover:bg-surface-container transition-colors ${
                                  i !== 0 ? 'border-t border-surface-container-high/40' : ''
                                }`}
                  >
                    <span className="material-symbols-outlined text-[18px] text-primary"
                          style={{ fontVariationSettings: "'FILL' 1" }}>
                      {qa.icon}
                    </span>
                    {qa.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notification bell */}
          <button
            id="appbar-notifications"
            aria-label="Notifications"
            onClick={() => navigate('/notifications')}
            className="relative w-10 h-10 flex items-center justify-center rounded-full
                       text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface
                       transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            {hasUnread && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-error
                               border border-surface" />
            )}
          </button>

          {/* Avatar */}
          <button
            id="appbar-avatar"
            onClick={() => navigate('/profile')}
            aria-label="Go to profile"
            className={`w-9 h-9 rounded-full flex items-center justify-center
                        shadow-[0_2px_6px_rgba(0,69,65,0.25)]
                        transition-transform active:scale-95 ${
                          isFaculty ? 'bg-primary' : 'bg-primary-container'
                        }`}
          >
            {initials ? (
              <span className="text-on-primary font-bold text-sm leading-none">{initials}</span>
            ) : (
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            )}
          </button>
        </div>

      </div>
    </header>
  );
}
