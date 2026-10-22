import { useRespondMember } from '../hooks/useRegistration';
import type { Registration } from '../types';

interface MemberConfirmBannerProps {
  registration: Registration;
  currentUserId: string;
  eventId: string;
}

/**
 * MemberConfirmBanner — shown when the current user has a pending invite
 * to join a team registration. Displays above the event detail.
 *
 * Only rendered when: user is in the registration's members[] with status='invited'.
 */
export function MemberConfirmBanner({
  registration: reg,
  currentUserId,
  eventId,
}: MemberConfirmBannerProps) {
  const { mutate: respond, isPending, isSuccess } = useRespondMember();

  const myMember = reg.members.find(m => m.userId === currentUserId && m.status === 'invited');
  if (!myMember || isSuccess) return null;

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[18px] text-primary">group_add</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-title-sm text-sm font-semibold text-on-surface">
            Team Invite from {reg.leader.name}
          </p>
          {reg.teamName && (
            <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
              Team: <span className="font-medium text-on-surface">{reg.teamName}</span>
            </p>
          )}
          <p className="font-body-sm text-[10px] text-on-surface-variant mt-0.5">
            {reg.members.filter(m => m.status === 'confirmed').length} member{reg.members.filter(m => m.status === 'confirmed').length !== 1 ? 's' : ''} confirmed so far
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          id={`member-confirm-${reg.id}`}
          onClick={() => respond({
            regId: reg.id,
            uid:   currentUserId,
            input: { action: 'confirm' },
            eventId,
          })}
          disabled={isPending}
          className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary
                     font-label-lg text-sm font-medium hover:bg-primary/90
                     active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isPending ? 'Joining…' : 'Join Team'}
        </button>
        <button
          id={`member-decline-${reg.id}`}
          onClick={() => respond({
            regId: reg.id,
            uid:   currentUserId,
            input: { action: 'decline' },
            eventId,
          })}
          disabled={isPending}
          className="flex-1 py-2.5 rounded-xl border border-outline-variant/40
                     font-label-lg text-sm text-on-surface-variant
                     hover:border-error/40 hover:text-error transition-all disabled:opacity-50"
        >
          Decline
        </button>
      </div>

      <p className="font-label-sm text-[9px] text-on-surface-variant text-center">
        Declining frees your spot — the leader can invite someone else.
      </p>
    </div>
  );
}
