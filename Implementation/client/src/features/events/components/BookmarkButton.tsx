import { useBookmark } from '../hooks/useBookmark';

interface BookmarkButtonProps {
  eventId:      string;
  isBookmarked: boolean;
  className?:   string;
}

/**
 * BookmarkButton — filled bookmark when bookmarked, outline when not.
 * Uses optimistic update so the UI flips instantly.
 */
export function BookmarkButton({ eventId, isBookmarked, className = '' }: BookmarkButtonProps) {
  const { toggle, isPending } = useBookmark(eventId, isBookmarked);

  return (
    <button
      id={`bookmark-btn-${eventId}`}
      aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this event'}
      aria-pressed={isBookmarked}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        toggle();
      }}
      disabled={isPending}
      className={`
        touch-target flex items-center justify-center rounded-full
        transition-all duration-150
        hover:bg-primary/10 active:scale-90
        disabled:opacity-50 disabled:cursor-wait
        ${className}
      `}
    >
      <span
        className="material-symbols-outlined text-[22px] transition-all"
        style={isBookmarked ? { fontVariationSettings: "'FILL' 1", color: 'var(--color-primary)' } : {}}
      >
        {isBookmarked ? 'bookmark' : 'bookmark_border'}
      </span>
    </button>
  );
}
