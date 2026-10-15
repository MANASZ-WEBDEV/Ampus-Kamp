import type { ButtonHTMLAttributes, ReactNode } from 'react';

// ── Variant map — matches design system spec ──────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'destructive' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

const variantClass: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  accent: 'btn-accent',
  destructive: 'btn-destructive',
  ghost:
    'btn text-on-surface-variant hover:bg-surface-container hover:text-on-surface px-3 h-10 text-label-lg',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-label-md rounded-md gap-1.5',
  md: 'h-11 px-5 text-label-lg rounded-lg gap-2',
  lg: 'h-13 px-6 text-label-lg rounded-lg gap-2',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  children: ReactNode;
}

/**
 * Button — the primary interactive element.
 * All sizes respect the 44px touch target minimum.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  iconLeft,
  iconRight,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={`${variantClass[variant]} ${sizeClass[size]} ${className}`}
      disabled={isDisabled}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <span
          className="material-symbols-outlined animate-spin text-base"
          aria-hidden="true"
        >
          progress_activity
        </span>
      ) : (
        iconLeft
      )}
      {children}
      {!loading && iconRight}
    </button>
  );
}
