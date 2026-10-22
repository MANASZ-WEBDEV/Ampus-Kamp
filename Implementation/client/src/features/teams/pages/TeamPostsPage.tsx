import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppBar }               from '@/components/layout/AppBar';
import { useTeamPosts }         from '../hooks/useTeams';
import { TeamPostCard }         from '../components/TeamPostCard';
import { CreateTeamPostForm }   from '../components/CreateTeamPostForm';
import { RequestToJoinModal }   from '../components/RequestToJoinModal';
import type { TeamPost }        from '../types';

/**
 * TeamPostsPage — /events/:eventId/teams
 *
 * Shows all open team posts for a specific event.
 * Students can:
 *   - View existing posts and request to join
 *   - Create their own post (one open post per event)
 */
export default function TeamPostsPage() {
  const { eventId = '' } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const { data: posts, isLoading, isError, refetch } = useTeamPosts(eventId);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [joiningPost,    setJoiningPost]    = useState<TeamPost | null>(null);

  return (
    <div className="min-h-screen bg-background pb-24 pt-14">
      <AppBar title="Team Finder" subtitle="Find your team" />

      <div className="max-w-2xl mx-auto px-4">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="pt-5 pb-4 flex items-center justify-between">
          <div>
            <h1 className="font-headline-lg text-xl text-on-surface font-bold">Team Posts</h1>
            <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
              Find a team or post your own — one request per event
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="team-inbox-btn"
              onClick={() => navigate('/teams/inbox')}
              className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center
                         text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all"
              title="My requests"
            >
              <span className="material-symbols-outlined text-[20px]">inbox</span>
            </button>
            <button
              id="team-create-btn"
              onClick={() => setShowCreateForm(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl
                          font-label-lg text-sm font-medium transition-all
                          ${showCreateForm
                            ? 'bg-surface-container text-on-surface-variant'
                            : 'bg-primary text-on-primary hover:bg-primary/90'
                          }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {showCreateForm ? 'close' : 'add'}
              </span>
              {showCreateForm ? 'Cancel' : 'Post Team'}
            </button>
          </div>
        </div>

        {/* ── Create form (inline slide-in) ───────────────────────────── */}
        {showCreateForm && (
          <div className="mb-5 p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm">
            <h2 className="font-title-md text-base font-semibold text-on-surface mb-4">
              Create Team Post
            </h2>
            <CreateTeamPostForm
              eventId={eventId}
              onSuccess={() => setShowCreateForm(false)}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        )}

        {/* ── Loading ─────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 rounded-2xl bg-surface-container animate-pulse" />
            ))}
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────────── */}
        {isError && (
          <div className="p-5 rounded-2xl bg-error-container text-on-error-container
                          flex flex-col items-center gap-3 text-center">
            <span className="material-symbols-outlined text-[32px]">error_outline</span>
            <p className="font-title-sm text-sm font-semibold">Failed to load team posts</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 rounded-xl bg-error text-on-error font-label-lg text-sm"
            >
              Try Again
            </button>
          </div>
        )}

        {/* ── Empty ───────────────────────────────────────────────────── */}
        {!isLoading && !isError && posts?.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px] text-primary">groups</span>
            </div>
            <div>
              <p className="font-title-md text-base font-semibold text-on-surface">No teams yet</p>
              <p className="font-body-sm text-xs text-on-surface-variant mt-1">
                Be the first to post — others will see your team and can request to join.
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-5 py-2.5 rounded-xl bg-primary text-on-primary
                         font-label-lg text-sm font-medium hover:bg-primary/90 transition-all"
            >
              Post Your Team
            </button>
          </div>
        )}

        {/* ── Team posts list ─────────────────────────────────────────── */}
        {!isLoading && posts && posts.length > 0 && (
          <div className="flex flex-col gap-3">
            {posts.map(post => (
              <TeamPostCard
                key={post.id}
                post={post}
                onRequestToJoin={setJoiningPost}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Request to Join modal ────────────────────────────────────── */}
      {joiningPost && (
        <RequestToJoinModal
          post={joiningPost}
          onClose={() => setJoiningPost(null)}
        />
      )}
    </div>
  );
}
