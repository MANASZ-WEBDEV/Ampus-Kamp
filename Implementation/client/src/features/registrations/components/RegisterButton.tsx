import { useState } from 'react';
import { useCreateRegistration } from '../hooks/useRegistration';
import { MemberPicker }           from './MemberPicker';
import type { PersonCard }        from '../api/people.api';

interface RegisterButtonProps {
  eventId:          string;
  registrationMode: 'in_app' | 'external';
  eventLink?:       string;
  teamSizeMin:      number;
  teamSizeMax:      number;
  /** Whether this student already has an active registration */
  alreadyRegistered: boolean;
}

type Step = 'choose' | 'team' | 'done';

// ── RegisterButton ────────────────────────────────────────────────────────────

export function RegisterButton({
  eventId,
  registrationMode,
  eventLink,
  teamSizeMin,
  teamSizeMax,
  alreadyRegistered,
}: RegisterButtonProps) {
  const [step,        setStep]        = useState<Step>('choose');
  const [teamName,    setTeamName]    = useState('');
  const [members,     setMembers]     = useState<PersonCard[]>([]); // picked via typeahead

  const { mutate: create, isPending, error } = useCreateRegistration(eventId);

  const isTeamEvent = teamSizeMax > 1;
  const requiresTeam = teamSizeMin > 1; // true = individual registration is logically invalid

  // ── External event: just open the link ──────────────────────────────────
  if (registrationMode === 'external') {
    return (
      <a
        id={`register-external-${eventId}`}
        href={eventLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl
                   bg-primary text-on-primary font-label-lg text-sm font-medium
                   hover:bg-primary/90 active:scale-[0.98] transition-all"
      >
        <span className="material-symbols-outlined text-[18px]">open_in_new</span>
        Register Externally
      </a>
    );
  }

  // ── Already registered ────────────────────────────────────────────────────
  if (alreadyRegistered) {
    return (
      <div className="flex items-center gap-2 justify-center py-3 rounded-xl
                      bg-primary/10 border border-primary/20">
        <span className="material-symbols-outlined text-[18px] text-primary"
          style={{ fontVariationSettings: "'FILL' 1" }}>
          how_to_reg
        </span>
        <span className="font-label-lg text-sm text-primary font-medium">Registered</span>
      </div>
    );
  }

  // ── Choose flow ───────────────────────────────────────────────────────────
  if (step === 'choose') {
    return (
      <div className="flex flex-col gap-2">
        {isTeamEvent && (
          <button
            id={`register-team-${eventId}`}
            onClick={() => setStep('team')}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl
                       bg-primary text-on-primary font-label-lg text-sm font-medium
                       hover:bg-primary/90 active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">groups</span>
            Register as a Team
          </button>
        )}

        {/* Solo registration — only shown when teamSizeMin === 1 (solo-eligible events) */}
        {!requiresTeam && (
          <button
            id={`register-solo-${eventId}`}
            onClick={() => {
              create({ type: 'individual' });
              setStep('done');
            }}
            className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl
                        font-label-lg text-sm font-medium transition-all
                        ${isTeamEvent
                          ? 'border border-outline-variant/40 text-on-surface-variant hover:border-outline-variant'
                          : 'bg-primary text-on-primary hover:bg-primary/90 active:scale-[0.98]'}`}
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
            Register Individually
          </button>
        )}

        {/* For team-only events: no team yet? Surface the Looking flow instead */}
        {requiresTeam && (
          <p className="text-center font-label-sm text-[10px] text-on-surface-variant mt-1">
            Don&apos;t have a team yet?{' '}
            <button
              id={`mark-looking-${eventId}`}
              className="underline text-primary font-medium hover:text-primary/80 transition-colors"
              onClick={() => {
                // Delegate to the event page's existing LookingToggle —
                // fires a custom event that the sidebar listens for
                document.dispatchEvent(
                  new CustomEvent('ampus:open-looking-toggle', { detail: { eventId } }),
                );
              }}
            >
              Mark as Looking for Team
            </button>
          </p>
        )}
      </div>
    );
  }

  // ── Team registration form ────────────────────────────────────────────────
  if (step === 'team') {
    // Validate: team name must not look like an email address
    const nameIsEmail  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(teamName.trim());
    const nameIsValid  = teamName.trim().length > 0 && !nameIsEmail;

    return (
      <div className="flex flex-col gap-4 p-4 rounded-2xl border border-outline-variant/20
                      bg-surface-container-lowest">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="font-title-sm text-sm font-semibold text-on-surface">Team Registration</p>
          <button
            onClick={() => setStep('choose')}
            className="font-label-sm text-xs text-on-surface-variant hover:text-on-surface"
          >
            ← Back
          </button>
        </div>

        {/* ── Step 1: Team Name ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-on-primary text-[11px]
                             font-bold flex items-center justify-center shrink-0">
              1
            </span>
            <label
              htmlFor={`team-name-${eventId}`}
              className="font-label-sm text-xs font-semibold text-on-surface"
            >
              Name your team
            </label>
          </div>
          <input
            id={`team-name-${eventId}`}
            type="text"
            maxLength={60}
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
            placeholder="e.g. Ctrl + Alt + Elite"
            className={`w-full px-3 py-2.5 rounded-xl text-on-surface
                       font-body-sm text-sm placeholder:text-on-surface-variant/50
                       focus:outline-none focus:ring-2 transition-all
                       ${nameIsEmail
                         ? 'bg-error-container/20 ring-2 ring-error/40 focus:ring-error/40'
                         : 'bg-surface-container-low focus:ring-primary/30'}`}
          />
          {/* Inline validation: catch email typed in wrong field */}
          {nameIsEmail && (
            <div className="flex items-start gap-1.5 p-2.5 rounded-lg bg-error-container/20
                            border border-error/20">
              <span className="material-symbols-outlined text-[14px] text-error shrink-0 mt-0.5">
                error
              </span>
              <p className="text-xs text-error">
                That looks like an email address. Team names can't be emails —
                use the invite field below to add your friend.
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-outline-variant/30" />
          <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">then</span>
          <div className="flex-1 h-px bg-outline-variant/30" />
        </div>

        {/* ── Step 2: Invite Members ────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-surface-container text-on-surface-variant text-[11px]
                             font-bold flex items-center justify-center shrink-0
                             border border-outline-variant/40">
              2
            </span>
            <p className="font-label-sm text-xs font-semibold text-on-surface">
              Invite members{' '}
              <span className="font-normal text-on-surface-variant">(optional)</span>
            </p>
          </div>
          <MemberPicker
            eventId={eventId}
            teamSizeMax={teamSizeMax}
            onChange={setMembers}
          />
          <p className="font-label-sm text-[9px] text-on-surface-variant mt-1">
            Team size: {teamSizeMin}–{teamSizeMax} members (including you).
            Invited members must confirm before the deadline.
          </p>
        </div>

        {/* Error */}
        {error && (
          <p className="font-body-sm text-xs text-error">
            {(error as Error).message}
          </p>
        )}

        {/* Submit */}
        <button
          id={`team-submit-${eventId}`}
          onClick={() => {
            create({
              type:          'team',
              teamName:      teamName.trim(),
              memberUserIds: members.length ? members.map(m => m.id) : undefined,
            });
            setStep('done');
          }}
          disabled={!nameIsValid || isPending}
          className="w-full py-3 rounded-xl bg-primary text-on-primary font-label-lg text-sm
                     font-medium hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isPending ? 'Creating…' : 'Create Team Draft'}
        </button>
      </div>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex items-center gap-2 justify-center py-3 rounded-xl bg-primary/10 border border-primary/20">
      <span className="material-symbols-outlined text-[18px] text-primary"
        style={{ fontVariationSettings: "'FILL' 1" }}>
        check_circle
      </span>
      <span className="font-label-lg text-sm text-primary font-medium">Registration Created</span>
    </div>
  );
}
