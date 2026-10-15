interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * EmptyState — used when a list or page has no content.
 * Every screen that renders a list must handle this state.
 */
export function EmptyState({ icon = 'inbox', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4">
        <span
          className="material-symbols-outlined text-3xl text-on-surface-variant"
          style={{ fontVariationSettings: "'FILL' 0" }}
        >
          {icon}
        </span>
      </div>
      <h3 className="font-headline text-headline-sm text-on-surface mb-1">{title}</h3>
      {description && (
        <p className="text-body-sm text-on-surface-variant max-w-xs">{description}</p>
      )}
      {action && (
        <button
          id={`empty-state-action-${title.toLowerCase().replace(/\s+/g, '-')}`}
          onClick={action.onClick}
          className="btn-primary mt-4 text-label-lg px-5 h-11"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
