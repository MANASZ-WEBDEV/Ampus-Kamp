import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToggleLooking } from '../hooks/usePeople';

interface LookingToggleProps {
  eventId:    string;
  isLooking:  boolean;     // current state from parent (EventDetailPage)
  lookingCount?: number;   // optional count badge
}

export function LookingToggle({ eventId, isLooking, lookingCount }: LookingToggleProps) {
  const { mutate: toggle, isPending } = useToggleLooking(eventId);
  const [note, setNote]     = useState('');
  const [expanded, setExpanded] = useState(false);

  function handleToggle() {
    if (isLooking) {
      // Already looking — just un-toggle, no note needed
      toggle(undefined);
    } else {
      // If note panel not shown yet, expand it
      if (!expanded) {
        setExpanded(true);
      } else {
        toggle(note.trim() || undefined);
        setExpanded(false);
        setNote('');
      }
    }
  }

  return (
    <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 overflow-hidden">
      {/* ── Toggle row ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center
                           transition-all ${isLooking ? 'bg-primary/15' : 'bg-surface-container'}`}>
            <span className={`material-symbols-outlined text-[18px] transition-all
                              ${isLooking ? 'text-primary' : 'text-on-surface-variant'}`}
              style={isLooking ? { fontVariationSettings: "'FILL' 1" } : {}}>
              group_search
            </span>
          </div>
          <div>
            <p className="font-title-sm text-sm font-semibold text-on-surface">
              {isLooking ? 'You\'re looking for a team' : 'Looking for a team?'}
            </p>
            <p className="font-body-sm text-[10px] text-on-surface-variant">
              {isLooking
                ? 'Others can see you\'re available — tap to stop looking'
                : 'Let others know you need teammates'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Count / link to LookingListPage */}
          <Link
            to={`/events/${eventId}/looking`}
            className="px-2.5 py-1 rounded-full bg-surface-container hover:bg-surface-container-high
                       text-on-surface font-label-md text-xs font-medium transition-colors
                       flex items-center gap-1"
            title="View students looking for a team"
          >
            <span>
              {(lookingCount ?? 0) > 0
                ? `${lookingCount} ${lookingCount === 1 ? 'student' : 'students'} looking`
                : 'View looking list'}
            </span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>

          {/* Toggle pill */}
          <button
            id={`looking-toggle-${eventId}`}
            onClick={handleToggle}
            disabled={isPending}
            aria-pressed={isLooking}
            aria-label={isLooking ? 'Turn off looking for a team' : 'Turn on looking for a team'}
            className={`w-12 h-6 rounded-full transition-all duration-300 relative disabled:opacity-60 border ${
              isLooking
                ? 'bg-primary border-primary'
                : 'bg-slate-300 border-slate-400/60 hover:bg-slate-400/70'
            }`}
          >
            <span className={`absolute top-[1px] w-5 h-5 rounded-full bg-white shadow-md ring-1 ring-black/10
                              transition-all duration-300 ${isLooking ? 'left-6' : 'left-[1px]'}`} />
          </button>
        </div>
      </div>

      {/* ── Note input (shown before confirming "looking") ───────────── */}
      {!isLooking && expanded && (
        <div className="border-t border-outline-variant/15 px-4 pb-4 pt-3 flex flex-col gap-2">
          <label htmlFor={`looking-note-${eventId}`}
            className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider">
            Short note (optional)
          </label>
          <input
            id={`looking-note-${eventId}`}
            type="text"
            maxLength={120}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. CSE 3rd yr · ML & React · have an idea"
            className="w-full px-3 py-2 rounded-xl bg-surface-container-low text-on-surface
                       font-body-sm text-xs placeholder:text-on-surface-variant/50
                       focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
          <div className="flex items-center justify-between">
            <button onClick={() => { setExpanded(false); setNote(''); }}
              className="font-label-sm text-xs text-on-surface-variant hover:text-on-surface transition-all">
              Cancel
            </button>
            <button
              onClick={() => { toggle(note.trim() || undefined); setExpanded(false); setNote(''); }}
              disabled={isPending}
              className="px-4 py-1.5 rounded-xl bg-primary text-on-primary
                         font-label-lg text-xs font-medium hover:bg-primary/90 transition-all disabled:opacity-50">
              {isPending ? 'Saving…' : 'Mark as Looking'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
