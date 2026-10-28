import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';

interface AppBarProps {
  title?: string;
  subtitle?: string;
}

const NAV_LINKS = [
  { label: 'Home',         to: '/home',   path: 'home' },
  { label: 'Events',       to: '/events', path: 'events' },
  { label: 'Team Finder',  to: '/teams',  path: 'teams' },
  { label: 'Profile & Credentials', to: '/profile', path: 'profile' },
];

/**
 * AppBar — top navigation bar.
 *
 * Mobile: CIP logo + title + notifications + avatar (matches Stitch PWA reference)
 * Desktop (lg+): logo + horizontal nav links + search bar + notifications + avatar
 *   (matches New folder desktop reference — INVENTUM Student Incubator style)
 */
export function AppBar({ subtitle = 'Incubator PWA' }: AppBarProps) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuth();
  const [search, setSearch] = useState('');

  const isFaculty = user?.role === 'faculty' || user?.role === 'dept_head' || user?.role === 'admin';

  // Clean initials — strips parentheses/special chars first
  const rawName = user?.name ?? '';
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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-16 max-w-7xl mx-auto px-4 lg:px-8 flex items-center justify-between gap-4">

        {/* ── Left: logo + brand ───────────────────────────────────────── */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Icon — biotech matches desktop reference */}
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-[0_2px_8px_rgba(0,69,65,0.25)]">
            <span className="material-symbols-outlined text-on-primary text-[20px]">biotech</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-headline-sm text-sm text-primary leading-tight tracking-tight font-bold">CIP</span>
            <span className="font-label-sm text-[9px] text-on-surface-variant uppercase tracking-wider hidden sm:block">
              {isFaculty ? 'Faculty Portal' : subtitle}
            </span>
          </div>
        </div>

        {/* ── Centre: desktop horizontal nav (lg+) ─────────────────────── */}
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

        {/* ── Right: search (desktop) + notifications + avatar ─────────── */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Search bar — desktop only */}
          <div className="relative hidden lg:flex items-center">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] select-none">search</span>
            <input
              id="appbar-search"
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && navigate(`/events?q=${encodeURIComponent(search)}`)}
              placeholder="Search events, teams…"
              className="h-10 pl-9 pr-4 rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline text-sm font-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-52 xl:w-64 transition-all"
            />
          </div>

          {/* Notification bell */}
          <button
            id="appbar-notifications"
            aria-label="Notifications"
            className="relative w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            {/* Unread dot */}
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-secondary-container" />
          </button>

          {/* Avatar button */}
          <button
            id="appbar-avatar"
            onClick={() => navigate('/profile')}
            aria-label="Go to profile"
            className={`w-9 h-9 rounded-full flex items-center justify-center shadow-[0_2px_6px_rgba(0,69,65,0.25)] transition-transform active:scale-95 ${
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
