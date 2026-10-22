import { useSendLink } from '../hooks/useTeams';
import { useCreateBlock } from '../hooks/usePeople';
import type { Person } from '../types.f5';

interface StudentCardProps {
  person:  Person;
  eventId?: string;   // present when navigated from an event
  onReport: (person: Person) => void;
}

export function StudentCard({ person, eventId, onReport }: StudentCardProps) {
  const { mutate: sendLink, isPending: isSending } = useSendLink();
  const { mutate: block,    isPending: isBlocking } = useCreateBlock();

  const canInvite = person.allowInvites;

  function handleInvite() {
    sendLink({
      direction: 'invite',
      toUserId:  person.id,
      eventId,
    });
  }

  function handleConnect() {
    sendLink({
      direction: 'connect',
      toUserId:  person.id,
    });
  }

  function handleBlock() {
    if (window.confirm(`Block ${person.name}? This will also remove any pending requests between you.`)) {
      block({ blockedUserId: person.id });
    }
  }

  return (
    <article className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20
                        p-4 flex flex-col gap-3 hover:shadow-md transition-all">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <span className="font-headline-sm text-sm font-bold text-primary">
              {person.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-title-sm text-sm font-semibold text-on-surface">{person.name}</p>
            <p className="font-body-sm text-[10px] text-on-surface-variant">
              {person.department.code}
              {person.year ? ` · ${person.year}${['st','nd','rd'][person.year-1]??'th'} Year` : ''}
            </p>
          </div>
        </div>

        {/* isLooking badge */}
        {person.isLooking && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full
                           bg-primary/10 text-primary border border-primary/20
                           font-label-sm text-[10px] font-medium shrink-0">
            <span className="material-symbols-outlined text-[12px]">search</span>
            Looking
          </span>
        )}
      </div>

      {/* ── Skills ─────────────────────────────────────────────────────── */}
      {person.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {person.skills.slice(0, 6).map(skill => (
            <span
              key={skill}
              className="px-2 py-0.5 rounded-lg bg-secondary/10 text-secondary
                         font-label-sm text-[10px] font-medium"
            >
              {skill}
            </span>
          ))}
          {person.skills.length > 6 && (
            <span className="px-2 py-0.5 rounded-lg bg-surface-container
                             text-on-surface-variant font-label-sm text-[10px]">
              +{person.skills.length - 6}
            </span>
          )}
        </div>
      )}

      {/* ── Actions ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 pt-1">
        {canInvite ? (
          <>
            {eventId ? (
              <button
                id={`student-invite-${person.id}`}
                onClick={handleInvite}
                disabled={isSending}
                className="flex-1 py-2 rounded-xl bg-primary text-on-primary
                           font-label-lg text-sm font-medium
                           hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                Invite to Team
              </button>
            ) : (
              <button
                id={`student-connect-${person.id}`}
                onClick={handleConnect}
                disabled={isSending}
                className="flex-1 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20
                           font-label-lg text-sm font-medium
                           hover:bg-primary/20 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                Connect
              </button>
            )}
          </>
        ) : (
          <span className="flex-1 py-2 text-center rounded-xl bg-surface-container
                           font-label-sm text-xs text-on-surface-variant">
            Not accepting invites
          </span>
        )}

        {/* Report */}
        <button
          id={`student-report-${person.id}`}
          onClick={() => onReport(person)}
          className="w-8 h-8 rounded-xl border border-outline-variant/30 flex items-center justify-center
                     text-on-surface-variant hover:text-error hover:border-error/30 transition-all"
          title="Report"
        >
          <span className="material-symbols-outlined text-[16px]">flag</span>
        </button>

        {/* Block */}
        <button
          id={`student-block-${person.id}`}
          onClick={handleBlock}
          disabled={isBlocking}
          className="w-8 h-8 rounded-xl border border-outline-variant/30 flex items-center justify-center
                     text-on-surface-variant hover:text-error hover:border-error/30 transition-all disabled:opacity-40"
          title="Block"
        >
          <span className="material-symbols-outlined text-[16px]">block</span>
        </button>
      </div>
    </article>
  );
}
