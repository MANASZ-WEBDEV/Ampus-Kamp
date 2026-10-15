import type { ReactNode } from 'react';

// ── Event type taxonomy (matches Event.type enum in F-2 model) ─────────────────

export type BadgeVariant =
  | 'default'
  | 'verified'
  | 'pending'
  | 'rejected'
  // Event types
  | 'hackathon'
  | 'competition'
  | 'workshop'
  | 'seminar'
  | 'sports'
  | 'other';

const variantClass: Record<BadgeVariant, string> = {
  default: 'bg-surface-container text-on-surface-variant',
  verified: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  rejected: 'bg-red-50 text-red-700',
  hackathon: 'bg-indigo-50 text-indigo-700',
  competition: 'bg-purple-50 text-purple-700',
  workshop: 'bg-sky-50 text-sky-700',
  seminar: 'bg-rose-50 text-rose-700',
  sports: 'bg-emerald-50 text-emerald-700',
  other: 'bg-surface-container-high text-on-surface-variant',
};

interface BadgeProps {
  variant?: BadgeVariant;
  icon?: string;   // Material Symbol name
  children: ReactNode;
  className?: string;
}

/**
 * Badge — pill-shaped label for status and taxonomy tags.
 * Used for event types, credential status, team post status, etc.
 */
export function Badge({ variant = 'default', icon, children, className = '' }: BadgeProps) {
  return (
    <span className={`chip text-label-sm ${variantClass[variant]} ${className}`}>
      {icon && (
        <span
          className="material-symbols-outlined text-xs leading-none"
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}
