import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Adds hover/active state — use for clickable cards */
  interactive?: boolean;
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

const paddingClass = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

/**
 * Card — the fundamental content container.
 * Elevation Level 1 at rest; Level 2 on hover when interactive=true.
 */
export function Card({
  children,
  interactive = false,
  padding = 'md',
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={`
        card ${paddingClass[padding]}
        ${interactive ? 'card-hover' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
