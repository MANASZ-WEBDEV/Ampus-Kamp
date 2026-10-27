import type { Credential } from '../types';

// ── Tier config ───────────────────────────────────────────────────────────────

const TIER_CONFIG = {
  pass:         { label: 'Pass',         color: 'bg-surface-container text-on-surface-variant',     icon: 'check_circle' },
  elite:        { label: 'Elite',        color: 'bg-tertiary/10 text-tertiary',                     icon: 'star' },
  elite_silver: { label: 'Elite Silver', color: 'bg-secondary/10 text-secondary',                   icon: 'stars' },
  elite_gold:   { label: 'Elite Gold',   color: 'bg-[#b8860b]/10 text-[#b8860b]',                  icon: 'workspace_premium' },
} as const;

const STATUS_CONFIG = {
  pending:  { label: 'Under Review', color: 'bg-tertiary/10 text-tertiary',     icon: 'schedule' },
  verified: { label: 'Verified',     color: 'bg-primary/10 text-primary',        icon: 'verified' },
  rejected: { label: 'Rejected',     color: 'bg-error-container text-on-error-container', icon: 'cancel' },
} as const;

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  credential:  Credential;
  /** Called when student taps "Resubmit" on a rejected credential */
  onResubmit?: (credential: Credential) => void;
  /** Called when student taps "Edit" on a pending credential */
  onEdit?:     (credential: Credential) => void;
}

/**
 * CredentialCard
 * Displays a single credential in the student's Achievements list.
 * Shows: course/issuer, tier badge, status chip, proof link, action button.
 */
export function CredentialCard({ credential, onResubmit, onEdit }: Props) {
  const tier   = TIER_CONFIG[credential.tier]   ?? TIER_CONFIG.pass;
  const status = STATUS_CONFIG[credential.verification.status] ?? STATUS_CONFIG.pending;

  const courseName = credential.otherCourseName ?? credential.issuer;
  const proofFilename = credential.proofUrl.split('/').pop();

  return (
    <article
      className="relative rounded-2xl bg-surface-container-low border border-outline-variant/20
                 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all duration-200 overflow-hidden"
      aria-label={`Credential: ${courseName}`}
    >
      {/* Coloured accent bar based on status */}
      <div
        className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl ${
          credential.verification.status === 'verified' ? 'bg-primary' :
          credential.verification.status === 'rejected' ? 'bg-error' :
          'bg-tertiary/40'
        }`}
      />

      <div className="p-4 pt-5">
        {/* Header row: course name + tier badge */}
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <span
              className="material-symbols-outlined text-[22px] text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {tier.icon}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            {/* Course / issuer */}
            <p className="text-sm font-semibold text-on-surface truncate leading-tight">
              {credential.otherCourseName
                ? credential.otherCourseName
                : credential.issuer}
            </p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              {credential.session} · {credential.year}
            </p>
          </div>

          {/* Tier chip */}
          <span className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide ${tier.color}`}>
            <span className="material-symbols-outlined text-[12px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}>
              {tier.icon}
            </span>
            {tier.label}
          </span>
        </div>

        {/* Certificate ID */}
        <div className="mt-3 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
            tag
          </span>
          <span className="text-[11px] text-on-surface-variant font-mono">
            {credential.certificateId}
          </span>
        </div>

        {/* Divider */}
        <div className="my-3 h-px bg-outline-variant/20" />

        {/* Status + proof row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Status chip */}
          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${status.color}`}>
            <span className="material-symbols-outlined text-[13px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}>
              {status.icon}
            </span>
            {status.label}
          </span>

          {/* Proof link */}
          <a
            href={credential.proofUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-primary hover:underline"
            aria-label="View proof document"
          >
            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            {proofFilename?.length && proofFilename.length > 20
              ? `${proofFilename.slice(0, 17)}…`
              : proofFilename ?? 'View Proof'}
          </a>
        </div>

        {/* Rejection reason */}
        {credential.verification.status === 'rejected' && credential.verification.reason && (
          <div className="mt-3 p-3 rounded-xl bg-error-container/60 flex items-start gap-2">
            <span className="material-symbols-outlined text-[14px] text-on-error-container shrink-0 mt-px">
              info
            </span>
            <p className="text-[11px] text-on-error-container leading-relaxed">
              {credential.verification.reason}
            </p>
          </div>
        )}

        {/* QR auto-verified note */}
        {credential.verification.status === 'verified' &&
          credential.verification.method === 'issuer_qr' && (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-on-surface-variant/70">
            <span className="material-symbols-outlined text-[12px]">qr_code_scanner</span>
            Auto-verified via issuer QR
          </div>
        )}

        {/* Action buttons */}
        {(onEdit || onResubmit) && (
          <div className="mt-3 flex gap-2">
            {credential.verification.status === 'pending' && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(credential)}
                className="flex-1 py-2 rounded-xl border border-outline-variant/40
                           text-sm text-on-surface-variant font-medium
                           hover:border-primary/40 hover:text-primary transition-all"
              >
                Edit
              </button>
            )}
            {credential.verification.status === 'rejected' && onResubmit && (
              <button
                type="button"
                onClick={() => onResubmit(credential)}
                className="flex-1 py-2 rounded-xl bg-primary text-on-primary
                           text-sm font-medium hover:bg-primary/90 active:scale-[0.99] transition-all"
              >
                Resubmit
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
