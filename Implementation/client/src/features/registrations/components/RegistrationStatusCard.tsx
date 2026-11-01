import type { Registration, Member } from '../types';

interface RegistrationStatusCardProps {
  registration: Registration;
  currentUserId: string;
  onWithdraw?: () => void;
  /** For draft registrations: submit the registration */
  onConfirm?: () => void;
  /** Min confirmed members required to submit (from event teamSize.min) */
  teamSizeMin?: number;
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
  teamSizeMin = 1,
}: RegistrationStatusCardProps) {
  const cfg             = STATUS_CONFIG[reg.status];
  const isLeader        = reg.leader.id === currentUserId;
  const canWithdraw     = isLeader && ['draft', 'submitted'].includes(reg.status);
  const confirmedCount  = reg.members.filter(m => m.status === 'confirmed').length;
  const pendingCount    = reg.members.filter(m => m.status === 'invited').length;
  // Leader can submit once confirmed members meet the min threshold
  const canSubmit       = isLeader && reg.status === 'draft' && confirmedCount >= teamSizeMin;

  return (
    <div className={`rounded-2xl border border-outline-variant/20 p-4 flex flex-col gap-3 ${cfg.bg}`}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      {/* min-w-0 on left side prevents long team names from squeezing Withdraw off screen */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`material-symbols-outlined text-[20px] shrink-0 ${cfg.color}`}
            style={reg.status === 'submitted' ? { fontVariationSettings: "'FILL' 1" } : {}}
          >
            {cfg.icon}
          </span>
          <div className="min-w-0">
            <p className={`font-label-lg text-sm font-semibold ${cfg.color}`}>{cfg.label}</p>
            <p className="font-body-sm text-xs text-on-surface-variant capitalize truncate">
              {reg.type} registration
              {reg.teamName ? ` · ${reg.teamName}` : ''}
            </p>
          </div>
        </div>

        {/* shrink-0 prevents button from being squeezed or clipped */}
        {canWithdraw && onWithdraw && (
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
        <p className="font-label-sm text-xs text-on-surface-variant">
          Submitted {new Date(reg.submittedAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </p>
      )}

      {/* ── Members ────────────────────────────────────────────────────── */}
      {reg.members.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider">
            Members ({confirmedCount} confirmed)
          </p>
          {reg.members.map(m => (
            <div key={m.userId}
              className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl
                         bg-surface-container-lowest/60">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <span className="font-label-sm text-xs font-bold text-primary">
                    {m.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p className="font-body-sm text-sm text-on-surface truncate">
                  {m.name}
                  {m.userId === reg.leader.id && (
                    <span className="ml-1 text-[11px] text-on-surface-variant">(leader)</span>
                  )}
                </p>
              </div>
              <span className={`shrink-0 px-2 py-0.5 rounded-lg font-label-sm text-[11px] capitalize
                               ${MEMBER_STATUS_COLORS[m.status]}`}>
                {m.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Draft actions (leader only) ─────────────────────────────────── */}
      {reg.status === 'draft' && isLeader && (
        reg.type === 'individual' ? (
          // Individual draft — confirm immediately
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/40 flex flex-col gap-2">
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
          // Team draft — submit when min threshold met; show pending info
          <div className="flex flex-col gap-2">
            {pendingCount > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/40">
                <p className="font-body-sm text-sm text-amber-700">
                  <span className="font-semibold">
                    {pendingCount} invite{pendingCount > 1 ? 's' : ''} pending.
                  </span>{' '}
                  {canSubmit
                    ? 'You can submit now or wait for them to join.'
                    : 'Waiting for members to accept before you can submit.'}
                </p>
              </div>
            )}

            {canSubmit && onConfirm ? (
              <button
                id={`reg-submit-${reg.id}`}
                onClick={onConfirm}
                className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-label-lg
                           text-sm font-medium hover:bg-primary/90 active:scale-[0.98] transition-all
                           flex items-center justify-center gap-2"
              >
                <span
                  className="material-symbols-outlined text-[16px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  how_to_reg
                </span>
                Submit Team Registration
              </button>
            ) : !canSubmit && pendingCount === 0 && (
              // All confirmed but still below min (edge case: no members yet)
              <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/20">
                <p className="font-body-sm text-sm text-on-surface-variant">
                  <span className="font-semibold">Not submitted yet.</span>{' '}
                  Invite members and submit before the deadline.
                </p>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
