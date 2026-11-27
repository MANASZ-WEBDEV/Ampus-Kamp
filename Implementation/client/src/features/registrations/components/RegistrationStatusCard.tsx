import { useState } from 'react';
import type { Registration, Member } from '../types';
import type { PersonCard } from '../api/people.api';
import { MemberPicker } from './MemberPicker';

interface RegistrationStatusCardProps {
  registration: Registration;
  currentUserId: string;
  onWithdraw?: () => void;
  /** For draft registrations: submit the registration */
  onConfirm?: () => void;
  /** For team draft registrations: update invited memberUserIds (excluding confirmed) */
  onUpdateMembers?: (memberUserIds: string[]) => Promise<unknown> | void;
  isUpdatingMembers?: boolean;
  updateMembersError?: string | null;
  /** Min confirmed members required to submit (from event teamSize.min) */
  teamSizeMin?: number;
  /** Max total members allowed (from event teamSize.max) */
  teamSizeMax?: number;
  /** Whether at least 1 confirmed female member is required */
  requiresFemale?: boolean;
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
  onUpdateMembers,
  isUpdatingMembers = false,
  updateMembersError = null,
  teamSizeMin = 1,
  teamSizeMax = 1,
  requiresFemale = false,
}: RegistrationStatusCardProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pendingAdds, setPendingAdds] = useState<PersonCard[]>([]);
  const [pickerKey, setPickerKey] = useState(0);

  const cfg             = STATUS_CONFIG[reg.status];
  const isLeader        = reg.leader.id === currentUserId;
  const canWithdraw     = isLeader && ['draft', 'submitted'].includes(reg.status);
  const confirmedCount  = reg.members.filter(m => m.status === 'confirmed').length;
  const pendingCount    = reg.members.filter(m => m.status === 'invited').length;
  const hasFemaleMember = !requiresFemale || reg.members.some(
    m => m.status === 'confirmed' && m.gender === 'female',
  );
  // Leader can submit once confirmed members meet the min threshold AND female quota (if any)
  const canSubmit       = isLeader && reg.status === 'draft' && confirmedCount >= teamSizeMin && hasFemaleMember;

  const isTeamDraft     = reg.type === 'team' && reg.status === 'draft' && isLeader;
  const remainingSlots  = Math.max(0, teamSizeMax - reg.members.length);
  const existingIds     = reg.members.map(m => m.userId);
  const invitedIds      = reg.members.filter(m => m.status === 'invited').map(m => m.userId);

  async function handleSendInvites() {
    if (!onUpdateMembers || pendingAdds.length === 0) return;
    try {
      await onUpdateMembers([...invitedIds, ...pendingAdds.map(p => p.id)]);
      setPendingAdds([]);
      setPickerKey(k => k + 1);
      setInviteOpen(false);
    } catch {
      // Error is surfaced via updateMembersError prop
    }
  }

  async function handleRemoveInvite(userId: string) {
    if (!onUpdateMembers || isUpdatingMembers) return;
    try {
      await onUpdateMembers(invitedIds.filter(id => id !== userId));
    } catch {
      // Error is surfaced via updateMembersError prop
    }
  }

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

      {/* ── Female-quota warning on legacy submitted teams ─────────────── */}
      {reg.status === 'submitted' && reg.type === 'team' && requiresFemale && !hasFemaleMember && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/60 flex items-start gap-2">
          <span className="material-symbols-outlined text-[18px] text-amber-700 shrink-0 mt-0.5">warning</span>
          <p className="font-body-sm text-sm text-amber-800">
            <span className="font-semibold">1 female member mandatory.</span>{' '}
            This team currently has no confirmed female member. Withdraw to add a female teammate.
          </p>
        </div>
      )}

      {/* ── Members ────────────────────────────────────────────────────── */}
      {reg.members.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider">
              Members ({reg.type === 'team' && teamSizeMax > 1
                ? `${reg.members.length}/${teamSizeMax} · ${confirmedCount} confirmed`
                : `${confirmedCount} confirmed`})
            </p>
          </div>
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
              <div className="flex items-center gap-1 shrink-0">
                <span className={`px-2 py-0.5 rounded-lg font-label-sm text-[11px] capitalize
                                 ${MEMBER_STATUS_COLORS[m.status]}`}>
                  {m.status}
                </span>
                {isTeamDraft && onUpdateMembers && m.status === 'invited' && (
                  <button
                    type="button"
                    disabled={isUpdatingMembers}
                    onClick={() => handleRemoveInvite(m.userId)}
                    aria-label={`Cancel invite for ${m.name}`}
                    title="Cancel invite"
                    className="p-0.5 rounded-full text-on-surface-variant hover:text-error
                               hover:bg-error-container/20 transition-colors disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[15px]">close</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Invite more members (team draft, leader, slots remaining) ──── */}
      {isTeamDraft && onUpdateMembers && remainingSlots > 0 && (
        <div className="flex flex-col gap-2">
          {!inviteOpen ? (
            <button
              type="button"
              id={`reg-invite-toggle-${reg.id}`}
              onClick={() => setInviteOpen(true)}
              className="w-full py-2 px-3 rounded-xl border border-dashed border-primary/40
                         text-primary font-label-md text-xs font-semibold
                         hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              Invite more members ({remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} left)
            </button>
          ) : (
            <div className="p-3 rounded-xl bg-surface-container-lowest/80 border border-outline-variant/25 flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-label-md text-xs font-semibold text-on-surface">
                  Invite teammates ({remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} left)
                </span>
                <button
                  type="button"
                  onClick={() => { setInviteOpen(false); setPendingAdds([]); setPickerKey(k => k + 1); }}
                  className="text-xs text-on-surface-variant hover:text-on-surface"
                >
                  Cancel
                </button>
              </div>
              <MemberPicker
                key={pickerKey}
                eventId={reg.eventId}
                teamSizeMax={teamSizeMax}
                maxInvites={remainingSlots}
                excludeIds={existingIds}
                onChange={setPendingAdds}
              />
              {updateMembersError && (
                <p className="text-xs text-error bg-error-container/20 rounded-lg px-2.5 py-1.5">
                  {updateMembersError}
                </p>
              )}
              <button
                type="button"
                id={`reg-send-invites-${reg.id}`}
                disabled={pendingAdds.length === 0 || isUpdatingMembers}
                onClick={handleSendInvites}
                className="w-full py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-semibold
                           hover:bg-primary/90 active:scale-[0.98] transition-all
                           disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">send</span>
                {isUpdatingMembers
                  ? 'Sending…'
                  : `Send Invite${pendingAdds.length > 1 ? `s (${pendingAdds.length})` : ''}`}
              </button>
            </div>
          )}
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
          // Team draft — submit when min threshold + female quota met; show pending info
          <div className="flex flex-col gap-2">
            {requiresFemale && !hasFemaleMember && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/60 flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] text-amber-700 shrink-0 mt-0.5">warning</span>
                <p className="font-body-sm text-sm text-amber-800">
                  <span className="font-semibold">1 female member mandatory.</span>{' '}
                  At least 1 confirmed female teammate is required before you can submit this team.
                </p>
              </div>
            )}

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
