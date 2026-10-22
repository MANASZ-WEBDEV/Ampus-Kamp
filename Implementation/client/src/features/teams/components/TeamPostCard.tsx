import type { TeamPost, TeamPostStatus } from '../types';
import { useUpdateTeamPost } from '../hooks/useTeams';

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  TeamPostStatus,
  { label: string; icon: string; chip: string; ring: string }
> = {
  open:    { label: 'Open',    icon: 'group_add',    chip: 'bg-primary/10 text-primary border-primary/20',   ring: 'border-primary/20' },
  full:    { label: 'Full',    icon: 'group',        chip: 'bg-warning/10 text-warning border-warning/20',   ring: 'border-outline-variant/30' },
  closed:  { label: 'Closed', icon: 'lock',         chip: 'bg-surface-container text-on-surface-variant border-outline-variant/20', ring: 'border-outline-variant/20' },
  expired: { label: 'Expired',icon: 'schedule',     chip: 'bg-error/10 text-error border-error/20',         ring: 'border-outline-variant/20' },
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface TeamPostCardProps {
  post:            TeamPost;
  onRequestToJoin: (post: TeamPost) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TeamPostCard({ post, onRequestToJoin }: TeamPostCardProps) {
  const cfg = STATUS_CONFIG[post.status];
  const { mutate: updatePost, isPending: isClosing } = useUpdateTeamPost(post.id, post.eventId);

  const canRequest = post.status === 'open' && !post.isOwner;
  const spotsBar   = (post.spotsLeft / post.spotsTotal) * 100;

  function handleClose() {
    if (window.confirm('Close this team post? Students will no longer be able to request to join.')) {
      updatePost({ status: 'closed' });
    }
  }

  return (
    <article
      className={`bg-surface-container-lowest rounded-2xl border ${cfg.ring}
                  p-4 flex flex-col gap-3 hover:shadow-md transition-all`}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-title-md text-base font-semibold text-on-surface truncate">
            {post.title}
          </h3>
          <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
            by {post.owner.name}
          </p>
        </div>

        {/* Status chip */}
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border
                          font-label-sm text-[10px] font-medium shrink-0 ${cfg.chip}`}>
          <span className="material-symbols-outlined text-[12px]">{cfg.icon}</span>
          {cfg.label}
        </span>
      </div>

      {/* ── Description ────────────────────────────────────────────────── */}
      {post.description && (
        <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed line-clamp-2">
          {post.description}
        </p>
      )}

      {/* ── Roles ──────────────────────────────────────────────────────── */}
      {post.rolesNeeded.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {post.rolesNeeded.map(role => (
            <span
              key={role}
              className="px-2 py-0.5 rounded-lg bg-secondary/10 text-secondary
                         font-label-sm text-[10px] font-medium"
            >
              {role}
            </span>
          ))}
        </div>
      )}

      {/* ── Spots bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-surface-container rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              post.spotsLeft === 0 ? 'bg-error/60' : 'bg-primary'
            }`}
            style={{ width: `${spotsBar}%` }}
          />
        </div>
        <span className="font-label-sm text-[11px] text-on-surface-variant whitespace-nowrap">
          {post.spotsLeft}/{post.spotsTotal} spot{post.spotsTotal !== 1 ? 's' : ''} left
        </span>
      </div>

      {/* ── Actions ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 pt-1">
        {canRequest && (
          <button
            id={`team-post-join-${post.id}`}
            onClick={() => onRequestToJoin(post)}
            className="flex-1 py-2 rounded-xl bg-primary text-on-primary
                       font-label-lg text-sm font-medium
                       hover:bg-primary/90 active:scale-[0.98] transition-all"
          >
            Request to Join
          </button>
        )}

        {post.isOwner && post.status === 'open' && (
          <button
            id={`team-post-close-${post.id}`}
            onClick={handleClose}
            disabled={isClosing}
            className="px-3 py-2 rounded-xl border border-outline-variant/40
                       font-label-sm text-xs text-on-surface-variant
                       hover:border-error/40 hover:text-error transition-all disabled:opacity-50"
          >
            Close Post
          </button>
        )}

        {post.isOwner && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-container
                           font-label-sm text-[10px] text-on-surface-variant">
            <span className="material-symbols-outlined text-[12px]">person</span>
            Your post
          </span>
        )}
      </div>
    </article>
  );
}
