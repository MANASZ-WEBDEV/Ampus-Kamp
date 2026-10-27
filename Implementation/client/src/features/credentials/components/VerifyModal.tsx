import { useState } from 'react';
import { useVerifyCredential } from '../hooks/useCredentials';
import type { Credential, Participation } from '../types';

// ── Rejection reasons ────────────────────────────────────────────────────────

const REJECTION_REASONS = [
  'Certificate information does not match student records',
  'Certificate appears to be invalid or forged',
  'Certificate ID already exists with another student',
  'Proof image is illegible or corrupted',
  'Certificate is from an unrecognised or inactive course',
  'Wrong session / year entered',
  'Other (see notes below)',
] as const;

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  item:         Credential | Participation;
  type:         'credential' | 'participation';
  onClose:      () => void;
  /** Injected mutation for participations so we reuse the same modal UI */
  onVerify?:    (id: string, verdict: 'verified' | 'rejected', reason?: string) => Promise<void>;
}

/**
 * VerifyModal
 * Faculty approve/reject modal — shared between credentials and participations.
 * Uses useVerifyCredential internally unless onVerify override is passed (for participations).
 */
export function VerifyModal({ item, type, onClose, onVerify }: Props) {
  const [verdict,      setVerdict]      = useState<'verified' | 'rejected' | ''>('');
  const [reasonPreset, setReasonPreset] = useState('');
  const [reasonExtra,  setReasonExtra]  = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState('');

  const { mutateAsync: verifyCredentialMutate } = useVerifyCredential();

  const isCredential = type === 'credential';
  const cred = item as Credential;

  const needsReason   = verdict === 'rejected';
  const finalReason   = reasonPreset === 'Other (see notes below)'
    ? reasonExtra.trim()
    : reasonPreset;
  const canSubmit = verdict !== '' && (!needsReason || finalReason.length > 0);

  async function handleSubmit() {
    if (!verdict || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      if (onVerify) {
        await onVerify(item._id, verdict, needsReason ? finalReason : undefined);
      } else {
        await verifyCredentialMutate({
          id: item._id,
          input: { verdict, reason: needsReason ? finalReason : undefined },
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-scrim/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-surface shadow-[0_-8px_32px_rgba(0,0,0,0.15)]
                   flex flex-col"
        style={{ animation: 'slideUpFade 200ms ease-out', maxHeight: '92vh' }}
        role="dialog"
        aria-modal
        aria-label="Verify credential"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-outline-variant/40" />
        </div>

        <div className="overflow-y-auto px-5 pb-8 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-start justify-between pt-1">
            <div>
              <h2 className="font-headline-sm text-lg font-bold text-on-surface">
                Verify {isCredential ? 'Certificate' : 'Participation'}
              </h2>
              <p className="text-[12px] text-on-surface-variant mt-0.5">
                {isCredential
                  ? `${cred.issuer} · ${cred.session}`
                  : `${(item as Participation).result} · Event proof`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-surface-container-high transition-colors"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-[22px] text-on-surface-variant">close</span>
            </button>
          </div>

          {/* Credential quick-info */}
          {isCredential && (
            <div className="p-3 rounded-xl bg-surface-container-low flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px] text-primary"
                    style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-on-surface truncate">
                  {cred.otherCourseName ?? cred.issuer}
                </p>
                <p className="text-[11px] text-on-surface-variant">
                  ID: <span className="font-mono">{cred.certificateId}</span>
                  {' · '}
                  <span className="capitalize">{cred.tier.replace('_', ' ')}</span>
                </p>
              </div>
              <a
                href={item.proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl
                           bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary/20 transition-all"
              >
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                View Proof
              </a>
            </div>
          )}

          {/* Evidence from QR (if present) */}
          {isCredential && cred.verification.evidence && (
            <details className="rounded-xl border border-outline-variant/20 overflow-hidden">
              <summary className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant cursor-pointer
                                  hover:bg-surface-container-high transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px]">qr_code_scanner</span>
                QR Evidence (auto-scan result)
              </summary>
              <pre className="px-4 py-3 text-[10px] text-on-surface-variant/80 bg-surface-container-low
                              overflow-x-auto font-mono leading-relaxed">
                {cred.verification.evidence}
              </pre>
            </details>
          )}

          {/* Verdict selector */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
              Your Decision *
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVerdict('verified')}
                className={`flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all
                  ${verdict === 'verified'
                    ? 'border-primary bg-primary/10 shadow-[0_2px_12px_rgba(17,94,89,0.2)]'
                    : 'border-outline-variant/30 hover:border-primary/40 hover:bg-primary/5'
                  }`}
              >
                <span
                  className={`material-symbols-outlined text-[28px] ${verdict === 'verified' ? 'text-primary' : 'text-on-surface-variant'}`}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                <span className={`text-sm font-semibold ${verdict === 'verified' ? 'text-primary' : 'text-on-surface-variant'}`}>
                  Approve
                </span>
              </button>

              <button
                type="button"
                onClick={() => setVerdict('rejected')}
                className={`flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all
                  ${verdict === 'rejected'
                    ? 'border-error bg-error-container/50'
                    : 'border-outline-variant/30 hover:border-error/40 hover:bg-error/5'
                  }`}
              >
                <span
                  className={`material-symbols-outlined text-[28px] ${verdict === 'rejected' ? 'text-error' : 'text-on-surface-variant'}`}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  cancel
                </span>
                <span className={`text-sm font-semibold ${verdict === 'rejected' ? 'text-error' : 'text-on-surface-variant'}`}>
                  Reject
                </span>
              </button>
            </div>
          </div>

          {/* Rejection reason — shown only when rejected */}
          {verdict === 'rejected' && (
            <div className="flex flex-col gap-2" style={{ animation: 'slideUpFade 150ms ease-out' }}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-error">
                Rejection Reason *
              </p>
              <div className="flex flex-col gap-1.5">
                {REJECTION_REASONS.map(reason => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setReasonPreset(reason)}
                    className={`text-left px-4 py-2.5 rounded-xl border transition-all text-sm
                      ${reasonPreset === reason
                        ? 'border-error bg-error-container/40 text-on-error-container font-medium'
                        : 'border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              {/* Extra notes for "Other" */}
              {reasonPreset === 'Other (see notes below)' && (
                <textarea
                  rows={3}
                  value={reasonExtra}
                  onChange={e => setReasonExtra(e.target.value)}
                  placeholder="Describe the reason for rejection…"
                  maxLength={300}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container-low text-on-surface
                             text-sm placeholder:text-on-surface-variant/50 resize-none
                             focus:outline-none focus:ring-2 focus:ring-error/30"
                  style={{ animation: 'slideUpFade 150ms ease-out' }}
                />
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs flex items-start gap-2">
              <span className="material-symbols-outlined text-[14px] shrink-0 mt-px">error</span>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="button"
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
            className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all
              ${verdict === 'rejected'
                ? 'bg-error text-on-error hover:bg-error/90'
                : 'bg-primary text-on-primary hover:bg-primary/90'
              }
              disabled:opacity-40 active:scale-[0.99]`}
          >
            {submitting
              ? 'Saving…'
              : verdict === 'verified'
                ? '✓ Approve Certificate'
                : verdict === 'rejected'
                  ? '✗ Reject Certificate'
                  : 'Select a Decision'}
          </button>
        </div>
      </div>
    </>
  );
}

// Re-export type for participations context
export type { Participation };
