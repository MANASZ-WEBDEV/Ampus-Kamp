import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';

type NavKey = 'home' | 'events' | 'teams' | 'badges' | 'profile';

interface Props {
  active?: NavKey;
}

interface QuickAction {
  id:    string;
  label: string;
  icon:  string;
  to:    string;
  color: string;
  textColor: string;
}

const FACULTY_QUICK_ACTIONS: QuickAction[] = [
  { id: 'qa-post-event',    label: 'Post Event',     icon: 'campaign',       to: '/events/new',  color: 'bg-primary',             textColor: 'text-on-primary' },
  { id: 'qa-my-events',     label: 'My Events',      icon: 'event_note',     to: '/events/my',   color: 'bg-primary-fixed',        textColor: 'text-on-primary-fixed-variant' },
  { id: 'qa-verify-queue',  label: 'Verify Queue',   icon: 'verified_user',  to: '/verify',      color: 'bg-secondary',            textColor: 'text-on-secondary' },
  { id: 'qa-analytics',     label: 'Analytics',      icon: 'bar_chart',      to: '/analytics',   color: 'bg-tertiary',             textColor: 'text-on-tertiary' },
];

const STUDENT_QUICK_ACTIONS: QuickAction[] = [
  { id: 'qa-add-achievement', label: 'Add Certificate', icon: 'add_task',  to: '/achievements/add',    color: 'bg-primary',            textColor: 'text-on-primary' },
  { id: 'qa-bookmarks',       label: 'Saved Events',   icon: 'bookmark',  to: '/events?saved=1',      color: 'bg-primary-container',  textColor: 'text-on-primary' },
  { id: 'qa-browse',          label: 'Browse All',     icon: 'explore',   to: '/events',              color: 'bg-surface-container-high', textColor: 'text-on-surface' },
];

/**
 * BottomNav — fixed mobile bottom navigation.
 *
 * Design references:
 * - Stitch PWA: 5-tab layout with centred FAB (add icon)
 * - New folder desktop: biotech-style icon language, clean labels
 *
 * Layout: [Events] [Teams] [+FAB] [Badges] [Profile]
 * Active: filled icon + primary-colored label + pill indicator dot
 */
export function BottomNav({ active }: Props) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const fabRef    = useRef<HTMLDivElement>(null);

  const [fabOpen, setFabOpen] = useState(false);

  const current    = active ?? (location.pathname.split('/')[1] as NavKey || 'home');
  const isFaculty  = user?.role === 'faculty' || user?.role === 'dept_head' || user?.role === 'admin';
  const quickActions = isFaculty ? FACULTY_QUICK_ACTIONS : STUDENT_QUICK_ACTIONS;

  // Close FAB menu on outside click
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
    <>
      {/* FAB backdrop */}
      {fabOpen && (
        <div
          className="fixed inset-0 z-30 bg-inverse-surface/20 backdrop-blur-[2px]"
          onClick={() => setFabOpen(false)}
        />
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 pb-safe"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* ── Quick-actions dropup ──────────────────────────────────────── */}
        {fabOpen && (
          <div
            className="flex flex-col items-center gap-2.5 pb-4 px-6"
            style={{ animation: 'slideUpFade 180ms ease-out forwards' }}
          >
            {quickActions.map(qa => (
              <button
                key={qa.id}
                id={qa.id}
                onClick={() => { setFabOpen(false); navigate(qa.to); }}
                className={`flex items-center gap-3 w-52 h-12 px-5 rounded-2xl ${qa.color} ${qa.textColor} font-label-lg text-sm font-bold shadow-lg active:scale-95 transition-all`}
              >
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{qa.icon}</span>
                {qa.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Nav bar ───────────────────────────────────────────────────── */}
        <div className="bg-surface/95 backdrop-blur-xl shadow-[0_-4px_16px_rgba(0,0,0,0.05)] border-t border-outline-variant/20">
          <div className="h-16 flex items-stretch justify-around px-1 max-w-2xl mx-auto" ref={fabRef}>

            <NavItem to="/events"  navKey="events"  current={current} icon="explore"      label="Events" />
            <NavItem to="/teams"   navKey="teams"   current={current} icon="group"        label="Teams" />

            {/* Centre FAB */}
            <div className="flex items-center justify-center px-1">
              <button
                id="fab-quick-action"
                aria-label={fabOpen ? 'Close actions' : 'Quick actions'}
                onClick={() => setFabOpen(o => !o)}
                className={`w-[52px] h-[52px] -mt-4 rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(17,94,89,0.35)] transition-all duration-200 active:scale-95 ${
                  fabOpen
                    ? 'bg-error text-on-error rotate-45'
                    : 'bg-primary-container text-on-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[26px] transition-transform duration-200">add</span>
              </button>
            </div>

            <NavItem to="/badges"  navKey="badges"  current={current} icon="military_tech" label="Badges" />
            <NavItem to="/profile" navKey="profile" current={current} icon="person"        label="Profile" />
          </div>
        </div>
      </nav>
    </>
  );
}

// ── NavItem ───────────────────────────────────────────────────────────────────

function NavItem({
  to, navKey, current, icon, label,
}: {
  to: string; navKey: NavKey; current: NavKey;
  icon: string; label: string;
}) {
  const isActive = current === navKey;

  return (
    <Link
      to={to}
      id={`nav-${navKey}`}
      className={`flex flex-col items-center justify-center flex-1 gap-0.5 py-2 transition-colors relative ${
        isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
      }`}
    >
      {/* Active indicator dot */}
      {isActive && (
        <span className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
      )}
      <span
        className="material-symbols-outlined text-[24px] transition-all"
        style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
      >
        {icon}
      </span>
      <span className={`font-label-sm text-[10px] leading-none font-${isActive ? 'bold' : 'medium'}`}>
        {label}
      </span>
    </Link>
  );
}
