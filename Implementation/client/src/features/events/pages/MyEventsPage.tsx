import { useNavigate } from 'react-router-dom';
import { useMyEvents } from '../hooks/useMyEvents';
import { useAuth } from '@/features/auth/context/AuthContext';
import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { EventTypeBadge, DeadlineCountdown } from '../components/EventStatusBadge';
import type { EventCard } from '../types';

/**
 * MyEventsPage — /events/my
 * Faculty-only page listing all events they have posted (all statuses).
 * Reference: CIP FacultyAuditScreen design patterns.
 */
export default function MyEventsPage() {
  const navigate = useNavigate();
  const { user }  = useAuth();

  const { data, isLoading, isError, refetch } = useMyEvents();

  const allEvents = data?.pages.flatMap(p => p.items) ?? [];

  const stats = {
    total:     allEvents.length,
    published: allEvents.filter(e => e.status === 'published').length,
    draft:     allEvents.filter(e => e.status === 'draft').length,
    closed:    allEvents.filter(e => e.status === 'closed').length,
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-14">
      <AppBar title="My Events" subtitle="Faculty Dashboard" />

      <div className="max-w-2xl mx-auto px-4">

        {/* Header */}
        <div className="pt-5 pb-4 flex items-center justify-between">
          <div>
            <h1 className="font-headline-lg text-xl text-on-surface font-bold">My Posted Events</h1>
            <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
              {user?.name} · {stats.total} total event{stats.total !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            id="my-events-post-btn"
            onClick={() => navigate('/events/new')}
            className="h-10 px-4 rounded-xl bg-primary text-on-primary font-label-lg text-xs font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Post New
          </button>
        </div>

        {/* Stats bar */}
        {!isLoading && allEvents.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Published', count: stats.published, color: 'bg-primary-fixed text-on-primary-fixed-variant', icon: 'public' },
              { label: 'Drafts',    count: stats.draft,     color: 'bg-surface-container-high text-on-surface-variant', icon: 'edit_note' },
              { label: 'Closed',    count: stats.closed,    color: 'bg-error-container text-on-error-container', icon: 'lock' },
            ].map(({ label, count, color, icon }) => (
              <div key={label} className="bg-surface-container-lowest rounded-xl p-3 shadow-sm flex flex-col gap-1 border border-outline-variant/20">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
                  <span className="material-symbols-outlined text-[16px]">{icon}</span>
                </div>
                <span className="font-headline-sm text-lg text-on-surface font-bold">{count}</span>
                <span className="font-label-sm text-[10px] text-on-surface-variant">{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col gap-3 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-surface-container rounded-2xl" />
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-outline">error_outline</span>
            <p className="text-on-surface-variant font-body-md">Couldn't load your events.</p>
            <button onClick={() => refetch()} className="btn-secondary">Retry</button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && allEvents.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[32px]">campaign</span>
            </div>
            <h2 className="font-headline-sm text-on-surface font-bold">No events posted yet</h2>
            <p className="text-on-surface-variant font-body-sm text-sm max-w-xs">
              Share a hackathon, workshop, or campus event with students.
            </p>
            <button id="my-events-post-first" onClick={() => navigate('/events/new')} className="btn-primary">
              Post Your First Event
            </button>
          </div>
        )}

        {/* Event rows */}
        {allEvents.map(event => (
          <MyEventRow key={event.id} event={event} onEdit={() => navigate(`/events/${event.id}/edit`)} onView={() => navigate(`/events/${event.id}`)} />
        ))}
      </div>

      <BottomNav active="events" />
    </div>
  );
}

// ── My Event Row card ─────────────────────────────────────────────────────────

interface MyEventRowProps {
  event:  EventCard;
  onEdit: () => void;
  onView: () => void;
}

function MyEventRow({ event, onEdit, onView }: MyEventRowProps) {
  const isDraft     = event.status === 'draft';
  const isPublished = event.status === 'published';
  const isClosed    = event.status === 'closed' || event.status === 'archived';

  const statusConfig = {
    draft:    { label: 'Draft',     bg: 'bg-surface-container-high text-on-surface-variant' },
    published:{ label: 'Live',      bg: 'bg-primary-fixed text-on-primary-fixed-variant' },
    closed:   { label: 'Closed',    bg: 'bg-error-container text-on-error-container' },
    archived: { label: 'Archived',  bg: 'bg-surface-container text-on-surface-variant' },
  };

  const sc = statusConfig[event.status];

  return (
    <article className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30 p-4 flex flex-col gap-3 mb-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <EventTypeBadge type={event.type} />
            <span className={`font-label-sm text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${sc.bg}`}>
              {sc.label}
            </span>
          </div>
          <h3 className="font-headline-sm text-sm text-on-surface font-bold line-clamp-2 mt-0.5">{event.title}</h3>
          {event.organizer && (
            <p className="font-body-sm text-xs text-on-surface-variant">{event.organizer}</p>
          )}
        </div>
        {/* Counters */}
        {isPublished && (
          <div className="flex flex-col items-end gap-1 shrink-0 text-right">
            <span className="font-headline-sm text-lg text-primary font-bold">{event.counters.students}</span>
            <span className="font-label-sm text-[10px] text-on-surface-variant">registered</span>
          </div>
        )}
      </div>

      {/* Deadline */}
      {event.deadline && (
        <div className="flex items-center gap-2">
          <DeadlineCountdown deadline={event.deadline} status={event.status} />
          {event.counters.tracking > 0 && (
            <span className="font-label-sm text-[10px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
              {event.counters.tracking} tracking
            </span>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1 border-t border-surface-container">
        <button
          id={`my-event-view-${event.id}`}
          onClick={onView}
          className="h-9 px-3 rounded-lg bg-surface-container text-on-surface font-label-lg text-xs font-semibold flex items-center gap-1 hover:bg-surface-container-high transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[14px]">visibility</span>
          View
        </button>

        {!isClosed && (
          <button
            id={`my-event-edit-${event.id}`}
            onClick={onEdit}
            className="h-9 px-3 rounded-lg bg-surface-container text-on-surface font-label-lg text-xs font-semibold flex items-center gap-1 hover:bg-surface-container-high transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[14px]">edit</span>
            Edit
          </button>
        )}

        {isDraft && (
          <button
            id={`my-event-publish-${event.id}`}
            onClick={() => {}}
            className="flex-1 h-9 rounded-lg bg-primary text-on-primary font-label-lg text-xs font-bold flex items-center justify-center gap-1 shadow-sm hover:opacity-90 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[14px]">publish</span>
            Publish
          </button>
        )}

        {isPublished && (
          <div className="flex-1 text-right">
            <span className="font-label-sm text-[10px] text-primary font-semibold">
              {event.counters.teams > 0 ? `${event.counters.teams} teams` : 'No teams yet'}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
