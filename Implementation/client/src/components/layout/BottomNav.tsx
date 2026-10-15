import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/events', icon: 'explore', label: 'Events' },
  { path: '/teams', icon: 'group', label: 'Teams' },
  { path: '/profile', icon: 'person', label: 'Profile' },
] as const;

type NavKey = 'events' | 'teams' | 'profile';

interface Props {
  active?: NavKey;
}

export function BottomNav({ active }: Props) {
  const location = useLocation();
  const current = active ?? (location.pathname.split('/')[1] as NavKey);

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 w-full z-50 bg-surface/90 backdrop-blur-xl shadow-[0_-4px_16px_rgba(0,0,0,0.04)]"
    >
      <div className="h-16 px-2 flex items-center justify-around max-w-2xl mx-auto">
        {/* Events */}
        <Link
          to="/events"
          data-path="events"
          aria-label="Events"
          className={`flex flex-col items-center justify-center w-14 h-14 transition-colors gap-0.5 ${current === 'events' ? 'text-primary' : 'text-on-surface-variant'}`}
        >
          <span className="material-symbols-outlined text-[22px]" style={current === 'events' ? { fontVariationSettings: "'FILL' 1" } : {}}>explore</span>
          <span className={`font-label-sm text-label-sm leading-none ${current === 'events' ? 'font-bold' : ''}`}>Events</span>
        </Link>

        {/* Teams */}
        <Link
          to="/teams"
          data-path="teams"
          aria-label="Teams"
          className={`flex flex-col items-center justify-center w-14 h-14 transition-colors gap-0.5 ${current === 'teams' ? 'text-primary' : 'text-on-surface-variant'}`}
        >
          <span className="material-symbols-outlined text-[22px]" style={current === 'teams' ? { fontVariationSettings: "'FILL' 1" } : {}}>group</span>
          <span className={`font-label-sm text-label-sm leading-none ${current === 'teams' ? 'font-bold' : ''}`}>Teams</span>
        </Link>

        {/* Centre FAB */}
        <div className="flex items-center justify-center">
          <Link
            to="/new"
            aria-label="Add Project or Team"
            className="w-12 h-12 -mt-5 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-[0_8px_16px_rgba(17,94,89,0.35)] transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-[26px]">add</span>
          </Link>
        </div>

        {/* Badges (F-4 placeholder) */}
        <Link
          to="/badges"
          data-path="badges"
          aria-label="Badges"
          className={`flex flex-col items-center justify-center w-14 h-14 transition-colors gap-0.5 ${current === 'badges' as string ? 'text-primary' : 'text-on-surface-variant'}`}
        >
          <span className="material-symbols-outlined text-[22px]">military_tech</span>
          <span className="font-label-sm text-label-sm leading-none">Badges</span>
        </Link>

        {/* Profile */}
        <Link
          to="/profile"
          data-path="profile"
          aria-label="Profile"
          className={`flex flex-col items-center justify-center w-14 h-14 transition-colors gap-0.5 ${current === 'profile' ? 'text-primary' : 'text-on-surface-variant'}`}
        >
          <span className="material-symbols-outlined text-[22px]" style={current === 'profile' ? { fontVariationSettings: "'FILL' 1" } : {}}>person</span>
          <span className={`font-label-sm text-label-sm leading-none ${current === 'profile' ? 'font-bold' : ''}`}>Profile</span>
        </Link>
      </div>
    </nav>
  );
}
