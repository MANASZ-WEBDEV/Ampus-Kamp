import type { EventType, EventStatus } from '../types';

// ── Type badge — matches Stitch reference pill colors ────────────────────────

const TYPE_META: Record<EventType, { label: string; color: string }> = {
  hackathon:   { label: 'Hackathon',    color: 'bg-tertiary-fixed text-on-tertiary-fixed' },
  competition: { label: 'Competition',  color: 'bg-primary-fixed text-on-primary-fixed-variant' },
  sports:      { label: 'Sports',       color: 'bg-primary-fixed-dim text-on-primary-fixed-variant' },
  workshop:    { label: 'Workshop',     color: 'bg-surface-variant text-on-surface-variant' },
  seminar:     { label: 'Seminar',      color: 'bg-secondary-fixed text-on-secondary-fixed' },
  other:       { label: 'Other',        color: 'bg-surface-container text-on-surface-variant' },
};

interface TypeBadgeProps { type: EventType }

export function EventTypeBadge({ type }: TypeBadgeProps) {
  const { label, color } = TYPE_META[type];
  return (
    <span className={`inline-flex items-center font-label-sm text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${color}`}>
      {label}
    </span>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: EventStatus;
  deadline?: string;
}

export function EventStatusBadge({ status, deadline }: StatusBadgeProps) {
  if (status === 'draft') {
    return (
      <span className="inline-flex items-center gap-1 font-label-sm text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant uppercase tracking-wider">
        <span className="material-symbols-outlined text-[12px]">edit_note</span>
        Draft
      </span>
    );
  }
  if (status === 'archived') {
    return (
      <span className="inline-flex items-center gap-1 font-label-sm text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant uppercase tracking-wider">
        <span className="material-symbols-outlined text-[12px]">archive</span>
        Archived
      </span>
    );
  }
  if (status === 'closed') {
    return (
      <span className="inline-flex items-center gap-1 font-label-sm text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container uppercase tracking-wider">
        <span className="material-symbols-outlined text-[12px]">lock</span>
        Registration Closed
      </span>
    );
  }

  // Published — check urgency
  if (deadline) {
    const diff  = new Date(deadline).getTime() - Date.now();
    const hours = diff / (1000 * 60 * 60);
    if (hours > 0 && hours < 48) {
      return (
        <span className="inline-flex items-center gap-1 font-label-sm text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-error text-on-error uppercase tracking-wider animate-pulse">
          <span className="material-symbols-outlined text-[12px]">whatshot</span>
          Closing Soon
        </span>
      );
    }
  }

  return null;
}

// ── Deadline countdown pill — matches Stitch reference ───────────────────────

interface DeadlineProps {
  deadline?: string;
  status?: EventStatus;
  className?: string;
}

export function DeadlineCountdown({ deadline, status, className = '' }: DeadlineProps) {
  if (!deadline) return null;

  const diff  = new Date(deadline).getTime() - Date.now();
  const days  = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (diff < 0 || status === 'closed' || status === 'archived') {
    return (
      <span className={`inline-flex items-center gap-1 font-code-sm text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-sm ${className}`}>
        <span className="material-symbols-outlined text-[13px]">lock</span>
        Closed
      </span>
    );
  }

  const isUrgent = days < 2;
  const label    = days > 0 ? `${days} day${days !== 1 ? 's' : ''} left` : `${hours}h left`;
  const icon     = isUrgent ? 'bolt' : days < 7 ? 'schedule' : 'hourglass_top';

  return (
    <span className={`inline-flex items-center gap-1 font-code-sm text-[11px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-sm shadow-sm ${
      isUrgent
        ? 'bg-secondary-fixed text-on-secondary-fixed animate-pulse'
        : 'bg-secondary-fixed text-on-secondary-fixed'
    } ${className}`}>
      <span className="material-symbols-outlined text-[13px]">{icon}</span>
      <span>{label}</span>
    </span>
  );
}
