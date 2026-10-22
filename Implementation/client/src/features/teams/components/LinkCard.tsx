import { useRespondLink } from '../hooks/useTeams';
import type { TeamLink } from '../types';
import { isContactReveal } from '../types';

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<TeamLink['status'], { label: string; icon: string; color: string }> = {
  pending:   { label: 'Pending',   icon: 'schedule',      color: 'text-on-surface-variant' },
  accepted:  { label: 'Accepted',  icon: 'check_circle',  color: 'text-primary' },
  declined:  { label: 'Declined',  icon: 'cancel',        color: 'text-error' },
  withdrawn: { label: 'Withdrawn', icon: 'undo',          color: 'text-on-surface-variant' },
  expired:   { label: 'Expired',   icon: 'timer_off',     color: 'text-on-surface-variant' },
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface LinkCardProps {
  link: TeamLink;
  /** 'in' = I received this; 'out' = I sent this */
  box:  'in' | 'out';
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LinkCard({ link, box }: LinkCardProps) {
  const { mutate: respond, isPending } = useRespondLink();
  const cfg = STATUS_LABELS[link.status];

  const otherPerson = box === 'in' ? link.from : link.to;
  const canAccept   = box === 'in' && link.status === 'pending';
  const canDecline  = box === 'in' && link.status === 'pending';
  const canWithdraw = box === 'out' && link.status === 'pending';

  return (
    <article className={`bg-surface-container-lowest rounded-2xl border border-outline-variant/20
                         p-4 flex flex-col gap-3 transition-all
                         ${link.status === 'accepted' ? 'border-primary/20 bg-primary/5' : ''}`}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[16px] text-primary">person</span>
            </div>
            <div>
              <p className="font-title-sm text-sm font-semibold text-on-surface">
                {otherPerson.name}
              </p>
              <p className="font-body-sm text-[10px] text-on-surface-variant">
                {box === 'in' ? 'wants to join your team' : 'your request'}
                {' · '}{new Date(link.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Status chip */}
        <span className={`flex items-center gap-1 font-label-sm text-[10px] ${cfg.color} shrink-0`}>
          <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>
          {cfg.label}
        </span>
      </div>

      {/* ── Message ────────────────────────────────────────────────────── */}
      {link.message && (
        <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/20">
          <p className="font-body-sm text-xs text-on-surface-variant italic">
            "{link.message}"
          </p>
        </div>
      )}

      {/* ── Contact reveal (accepted only) ──────────────────────────── */}
      {link.status === 'accepted' && link.contact && (
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary shrink-0">
            {isContactReveal(link.contact) ? 'phone' : 'info'}
          </span>
          <div>
            <p className="font-label-lg text-xs font-semibold text-primary">
              {isContactReveal(link.contact) ? 'Contact Revealed' : 'Contact Info'}
            </p>
            <p className="font-body-sm text-xs text-on-surface mt-0.5">
              {isContactReveal(link.contact) ? link.contact.phone : link.contact.hint}
            </p>
          </div>
        </div>
      )}

      {/* ── Expiry warning ────────────────────────────────────────────── */}
      {link.status === 'pending' && (() => {
        const daysLeft = Math.ceil((new Date(link.expiresAt).getTime() - Date.now()) / 86_400_000);
        return daysLeft <= 2 ? (
          <p className="font-label-sm text-[10px] text-warning flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">warning</span>
            Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
          </p>
        ) : null;
      })()}

      {/* ── Actions ────────────────────────────────────────────────────── */}
      {(canAccept || canDecline || canWithdraw) && (
        <div className="flex gap-2 pt-1">
          {canAccept && (
            <button
              id={`link-accept-${link.id}`}
              onClick={() => respond({ id: link.id, action: 'accept' })}
              disabled={isPending}
              className="flex-1 py-2 rounded-xl bg-primary text-on-primary
                         font-label-lg text-sm font-medium
                         hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              Accept
            </button>
          )}
          {canDecline && (
            <button
              id={`link-decline-${link.id}`}
              onClick={() => respond({ id: link.id, action: 'decline' })}
              disabled={isPending}
              className="flex-1 py-2 rounded-xl border border-outline-variant/40
                         font-label-lg text-sm text-on-surface-variant
                         hover:border-error/40 hover:text-error transition-all disabled:opacity-50"
            >
              Decline
            </button>
          )}
          {canWithdraw && (
            <button
              id={`link-withdraw-${link.id}`}
              onClick={() => respond({ id: link.id, action: 'withdraw' })}
              disabled={isPending}
              className="flex-1 py-2 rounded-xl border border-outline-variant/40
                         font-label-lg text-sm text-on-surface-variant
                         hover:border-outline-variant transition-all disabled:opacity-50"
            >
              Withdraw
            </button>
          )}
        </div>
      )}
    </article>
  );
}
