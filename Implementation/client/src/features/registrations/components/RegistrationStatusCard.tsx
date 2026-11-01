import type { Registration, Member } from '../types';

interface RegistrationStatusCardProps {
  registration: Registration;
  currentUserId: string;
  onWithdraw?: () => void;
  /** For individual draft recovery: submit the registration immediately */
  onConfirm?: () => void;
}

const STATUS_CONFIG = {
  draft:     { label: 'Draft',     icon: 'edit_note',    color: 'text-on-surface-variant', bg: 'bg-surface-container' },
  submitted: { label: 'Submitted', icon: 'check_circle', color: 'text-primary',            bg: 'bg-primary/10' },
  locked:    { label: 'Locked',    icon: 'lock',         color: 'text-secondary',          bg: 'bg-secondary/10' },
  withdrawn: { label: 'Withdrawn', icon: 'undo',         color: 'text-on-surface-variant', bg: 'bg-surface-container' },
};

const MEMBER_STATUS_COLORS: Record<Member['status'], string> = {
  confirmed: 'text-primary bg-primary/10',
  invited:   'text-amber-600 bg-amber-50',
  declined:  'text-error bg-error-container/30',
};

export function RegistrationStatusCard({
  registration: reg,
  currentUserId,
  onWithdraw,
  onConfirm,
}: RegistrationStatusCardProps) {
  const cfg       = STATUS_CONFIG[reg.status];
  const isLeader  = reg.leader.id === currentUserId;
  const canWithdraw = isLeader && ['draft', 'submitted'].includes(reg.status);

  return (
    <div className={`rounded-2xl border border-outline-variant/20 p-4 flex flex-col gap-3 ${cfg.bg}`}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      {/* Fix 1: min-w-0 on left side prevents long team names from squeezing Withdraw off screen */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`material-symbols-outlined text-[20px] shrink-0 ${cfg.color}`}
            style={reg.status === 'submitted' ? { fontVariationSettings: "'FILL' 1" } : {}}
          >
            {cfg.icon}
          </span>
          <div className="min-w-0">
            {/* Fix 2: bumped from text-xs → text-sm, subtitle from text-[10px] → text-xs */}
            <p className={`font-label-lg text-sm font-semibold ${cfg.color}`}>{cfg.label}</p>
            <p className="font-body-sm text-xs text-on-surface-variant capitalize truncate">
              {reg.type} registration
              {reg.teamName ? ` · ${reg.teamName}` : ''}
            </p>
          </div>
        </div>

        {canWithdraw && onWithdraw && (
          // Fix 1: shrink-0 prevents button from being squeezed or clipped
          <button
            id={`reg-withdraw-${reg.id}`}
            onClick={onWithdraw}
            className="shrink-0 px-3 py-1.5 rounded-xl border border-error/30
                       font-label-sm text-xs text-error
                       hover:bg-error-container/20 transition-all"
          >
            Withdraw
          </button>
        )}
      </div>

      {/* ── Submitted timestamp ────────────────────────────────────────── */}
      {reg.submittedAt && (
        // Fix 2: text-[10px] → text-xs
        <p className="font-label-sm text-xs text-on-surface-variant">
          Submitted {new Date(reg.submittedAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </p>
      )}

      {/* ── Members ────────────────────────────────────────────────────── */}
      {reg.members.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {/* Fix 2: text-[9px] → text-[11px] */}
          <p className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider">
            Members ({reg.members.filter(m => m.status === 'confirmed').length} confirmed)
          </p>
          {reg.members.map(m => (
            <div key={m.userId}
              className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl
                         bg-surface-container-lowest/60">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  {/* Fix 2: text-[10px] → text-xs */}
                  <span className="font-label-sm text-xs font-bold text-primary">
                    {m.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p className="font-body-sm text-sm text-on-surface truncate">
                  {m.name}
                  {m.userId === reg.leader.id && (
                    // Fix 2: text-[9px] → text-[11px]
                    <span className="ml-1 text-[11px] text-on-surface-variant">(leader)</span>
                  )}
                </p>
              </div>
              {/* Fix 2: badge text-[9px] → text-[11px] */}
              <span className={`shrink-0 px-2 py-0.5 rounded-lg font-label-sm text-[11px] capitalize
                               ${MEMBER_STATUS_COLORS[m.status]}`}>
                {m.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Draft reminder ─────────────────────────────────────────────── */}
      {reg.status === 'draft' && isLeader && (
        reg.type === 'individual' ? (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/40 flex flex-col gap-2">
            {/* Fix 2: text-[10px] → text-sm */}
            <p className="font-body-sm text-sm text-amber-700">
              <span className="font-semibold">Registration not confirmed yet.</span>{' '}
              Confirm below to finalise your spot.
            </p>
            {onConfirm && (
              <button
                id={`reg-confirm-${reg.id}`}
                onClick={onConfirm}
                className="w-full py-2 rounded-xl bg-primary text-on-primary font-label-lg
                           text-sm font-medium hover:bg-primary/90 active:scale-[0.98] transition-all"
              >
                Confirm Registration
              </button>
            )}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/40">
            {/* Fix 2: text-[10px] → text-sm */}
            <p className="font-body-sm text-sm text-amber-700">
              <span className="font-semibold">Not submitted yet.</span>{' '}
              Invite members and submit before the deadline.
            </p>
          </div>
        )
      )}
    </div>
  );
}
