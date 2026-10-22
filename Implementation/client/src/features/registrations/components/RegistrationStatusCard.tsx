import type { Registration, Member } from '../types';

interface RegistrationStatusCardProps {
  registration: Registration;
  currentUserId: string;
  onWithdraw?: () => void;
}

const STATUS_CONFIG = {
  draft:     { label: 'Draft',     icon: 'edit_note',       color: 'text-on-surface-variant', bg: 'bg-surface-container' },
  submitted: { label: 'Submitted', icon: 'check_circle',    color: 'text-primary',            bg: 'bg-primary/10' },
  locked:    { label: 'Locked',    icon: 'lock',            color: 'text-secondary',           bg: 'bg-secondary/10' },
  withdrawn: { label: 'Withdrawn', icon: 'undo',            color: 'text-on-surface-variant', bg: 'bg-surface-container' },
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
}: RegistrationStatusCardProps) {
  const cfg       = STATUS_CONFIG[reg.status];
  const isLeader  = reg.leader.id === currentUserId;
  const canWithdraw = isLeader && ['draft', 'submitted'].includes(reg.status);

  return (
    <div className={`rounded-2xl border border-outline-variant/20 p-4 flex flex-col gap-3
                     ${cfg.bg} overflow-hidden`}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`material-symbols-outlined text-[18px] ${cfg.color}`}
            style={reg.status === 'submitted' ? { fontVariationSettings: "'FILL' 1" } : {}}>
            {cfg.icon}
          </span>
          <div>
            <p className={`font-label-lg text-xs font-semibold ${cfg.color}`}>{cfg.label}</p>
            <p className="font-body-sm text-[10px] text-on-surface-variant capitalize">
              {reg.type} registration
              {reg.teamName ? ` · ${reg.teamName}` : ''}
            </p>
          </div>
        </div>

        {canWithdraw && onWithdraw && (
          <button
            id={`reg-withdraw-${reg.id}`}
            onClick={onWithdraw}
            className="px-3 py-1.5 rounded-xl border border-error/30 font-label-sm text-[10px]
                       text-error hover:bg-error-container/20 transition-all"
          >
            Withdraw
          </button>
        )}
      </div>

      {/* ── Submitted timestamp ────────────────────────────────────────── */}
      {reg.submittedAt && (
        <p className="font-label-sm text-[10px] text-on-surface-variant">
          Submitted {new Date(reg.submittedAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </p>
      )}

      {/* ── Members (team + individual with self) ─────────────────────── */}
      {reg.members.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="font-label-sm text-[9px] text-on-surface-variant uppercase tracking-wider">
            Members ({reg.members.filter(m => m.status === 'confirmed').length} confirmed)
          </p>
          {reg.members.map(m => (
            <div key={m.userId}
              className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl
                         bg-surface-container-lowest/60">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <span className="font-label-sm text-[10px] font-bold text-primary">
                    {m.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p className="font-body-sm text-xs text-on-surface truncate">
                  {m.name}
                  {m.userId === reg.leader.id && (
                    <span className="ml-1 text-[9px] text-on-surface-variant">(leader)</span>
                  )}
                </p>
              </div>
              <span className={`px-1.5 py-0.5 rounded-lg font-label-sm text-[9px] capitalize
                               ${MEMBER_STATUS_COLORS[m.status]}`}>
                {m.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Draft reminder ─────────────────────────────────────────────── */}
      {reg.status === 'draft' && isLeader && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/40">
          <p className="font-body-sm text-[10px] text-amber-700">
            <span className="font-semibold">Not submitted yet.</span> Invite members and submit before the deadline.
          </p>
        </div>
      )}
    </div>
  );
}
