/**
 * UncertainBadge — "AI uncertain — please verify" chip
 *
 * Displayed next to any field that the LLM returned null/uncertain for.
 * Uses an amber/warning color scheme to draw attention without alarming.
 */

interface UncertainBadgeProps {
  className?: string;
}

export function UncertainBadge({ className = '' }: UncertainBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                  bg-yellow-500/15 text-yellow-600 dark:text-yellow-400
                  border border-yellow-500/30 font-label-sm text-[10px] font-bold
                  ${className}`}
      role="status"
      aria-label="AI uncertain — please verify this field"
    >
      <span className="material-symbols-outlined text-[11px]" aria-hidden="true">warning</span>
      AI uncertain
    </span>
  );
}
