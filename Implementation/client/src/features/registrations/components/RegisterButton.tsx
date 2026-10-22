import { useState } from 'react';
import { useCreateRegistration } from '../hooks/useRegistration';

interface RegisterButtonProps {
  eventId:          string;
  registrationMode: 'in_app' | 'external';
  eventLink?:       string;
  teamSizeMin:      number;
  teamSizeMax:      number;
  /** Whether this student already has an active registration */
  alreadyRegistered: boolean;
}

type Step = 'choose' | 'solo' | 'team' | 'tracking' | 'done';

// ── RegisterButton ────────────────────────────────────────────────────────────

export function RegisterButton({
  eventId,
  registrationMode,
  eventLink,
  teamSizeMin,
  teamSizeMax,
  alreadyRegistered,
}: RegisterButtonProps) {
  const [step,     setStep]     = useState<Step>('choose');
  const [teamName, setTeamName] = useState('');
  const [memberIds, setMemberIds] = useState(''); // newline-separated user IDs

  const { mutate: create, isPending, error } = useCreateRegistration(eventId);

  const isTeamEvent = teamSizeMax > 1;

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
        <button
          id={`register-tracking-${eventId}`}
          onClick={() => setStep('tracking')}
          className="text-center font-label-sm text-[10px] text-on-surface-variant
                     hover:text-on-surface transition-all py-1"
        >
          Already registered externally? Mark it here
        </button>
      </div>
    );
  }

  // ── Team registration form ────────────────────────────────────────────────
  if (step === 'team') {
    const ids = memberIds
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    return (
      <div className="flex flex-col gap-3 p-4 rounded-2xl border border-outline-variant/20
                      bg-surface-container-lowest">
        <div className="flex items-center justify-between">
          <p className="font-title-sm text-sm font-semibold text-on-surface">Team Registration</p>
          <button onClick={() => setStep('choose')}
            className="font-label-sm text-[10px] text-on-surface-variant hover:text-on-surface">
            ← Back
          </button>
        </div>

        <div>
          <label htmlFor={`team-name-${eventId}`}
            className="font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5 block">
            Team Name *
          </label>
          <input
            id={`team-name-${eventId}`}
            type="text"
            maxLength={60}
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
            placeholder="e.g. Ctrl + Alt + Elite"
            className="w-full px-3 py-2 rounded-xl bg-surface-container-low text-on-surface
                       font-body-sm text-sm placeholder:text-on-surface-variant/50
                       focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>

        <div>
          <label htmlFor={`member-ids-${eventId}`}
            className="font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5 block">
            Member User IDs (optional, one per line, max {teamSizeMax - 1})
          </label>
          <textarea
            id={`member-ids-${eventId}`}
            rows={3}
            value={memberIds}
            onChange={e => setMemberIds(e.target.value)}
            placeholder="Paste user IDs from People Search…"
            className="w-full px-3 py-2 rounded-xl bg-surface-container-low text-on-surface
                       font-body-sm text-xs placeholder:text-on-surface-variant/50 resize-none
                       focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
          <p className="font-label-sm text-[9px] text-on-surface-variant mt-0.5">
            Team size: {teamSizeMin}–{teamSizeMax} members (including you). You can add more later.
          </p>
        </div>

        {error && (
          <p className="font-body-sm text-xs text-error">
            {(error as Error).message}
          </p>
        )}

        <button
          id={`team-submit-${eventId}`}
          onClick={() => {
            create({
              type: 'team',
              teamName: teamName.trim(),
              memberUserIds: ids.length ? ids : undefined,
            });
            setStep('done');
          }}
          disabled={!teamName.trim() || isPending}
          className="w-full py-3 rounded-xl bg-primary text-on-primary font-label-lg text-sm
                     font-medium hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isPending ? 'Creating…' : 'Create Team Draft'}
        </button>
      </div>
    );
  }

  // ── External tracking ─────────────────────────────────────────────────────
  if (step === 'tracking') {
    const [extId, setExtId] = useState('');
    return (
      <div className="flex flex-col gap-3 p-4 rounded-2xl border border-outline-variant/20
                      bg-surface-container-lowest">
        <div className="flex items-center justify-between">
          <p className="font-title-sm text-sm font-semibold text-on-surface">External Tracking</p>
          <button onClick={() => setStep('choose')}
            className="font-label-sm text-[10px] text-on-surface-variant hover:text-on-surface">
            ← Back
          </button>
        </div>
        <input
          type="text"
          value={extId}
          maxLength={100}
          onChange={e => setExtId(e.target.value)}
          placeholder="Registration ID from external site (optional)"
          className="w-full px-3 py-2 rounded-xl bg-surface-container-low text-on-surface
                     font-body-sm text-sm placeholder:text-on-surface-variant/50
                     focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          onClick={() => {
            create({ type: 'tracking', externalRegId: extId.trim() || undefined });
            setStep('done');
          }}
          disabled={isPending}
          className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-label-lg text-sm
                     font-medium disabled:opacity-50 transition-all"
        >
          {isPending ? 'Saving…' : 'Mark as Registered'}
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
