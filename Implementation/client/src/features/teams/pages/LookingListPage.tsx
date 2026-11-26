import { useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppBar } from '@/components/layout/AppBar';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useEvent } from '@/features/events/hooks/useEvent';
import { useLooking } from '../hooks/usePeople';
import { useSendLink, useLinks } from '../hooks/useTeams';
import type { LookingCard } from '../types.f5';

/**
 * LookingListPage — /events/:id/looking
 * Lists all students who have toggled "looking for a team" for this event.
 */
export default function LookingListPage() {
  const { id: eventId = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: event } = useEvent(eventId);
  const { data, isLoading, isError } = useLooking(eventId);
  const { data: sentLinks } = useLinks('out');
  const { mutateAsync: sendLink, isPending: isSending } = useSendLink();

  const [femaleOnly, setFemaleOnly] = useState(false);
  const [targetFlag, setTargetFlag] = useState<LookingCard | null>(null);
  const [message, setMessage] = useState('');
  const [sendError, setSendError] = useState('');

  const filteredItems = (data?.items ?? []).filter(
    flag => !femaleOnly || flag.user.gender === 'female',
  );

  // Map of userId -> link status for active outgoing links on this event
  const sentStatusByUser = new Map<string, string>();
  for (const link of sentLinks?.items ?? []) {
    if (link.eventId === eventId && (link.status === 'pending' || link.status === 'accepted')) {
      sentStatusByUser.set(link.to.id, link.status);
    }
  }

  async function handleConnect(e: FormEvent) {
    e.preventDefault();
    if (!targetFlag) return;
    setSendError('');
    try {
      await sendLink({
        direction: 'connect',
        toUserId: targetFlag.user.id,
        eventId,
        message: message.trim() || undefined,
      });
      setTargetFlag(null);
      setMessage('');
    } catch (err: unknown) {
      const apiMsg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      setSendError(apiMsg ?? (err instanceof Error ? err.message : 'Failed to send request.'));
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-14">
      <AppBar title="Looking for a Team" subtitle="Team Finder" />

      <div className="max-w-2xl mx-auto px-4">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="pt-5 pb-4 flex items-center justify-between">
          <div>
            <h1 className="font-headline-lg text-xl text-on-surface font-bold">
              Seeking Teammates
            </h1>
            <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
              Students who marked themselves as looking for a team for this event
            </p>
          </div>
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-container
                       font-label-lg text-xs text-on-surface-variant hover:text-on-surface transition-all">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back
          </button>
        </div>

        {/* ── Female Quota Banner ─────────────────────────────── */}
        {event?.requiresFemale && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-secondary-fixed/40 border border-secondary/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-on-surface">
              <span className="material-symbols-outlined text-[18px] text-secondary">diversity_3</span>
              <span>
                <strong className="font-semibold">1 female member mandatory</strong> for {event.title}.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setFemaleOnly(v => !v)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors shrink-0 ${femaleOnly
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
                }`}
            >
              {femaleOnly ? 'Showing Female Only' : 'Filter: Female'}
            </button>
          </div>
        )}

        {/* ── Loading ─────────────────────────────────────────── */}
        {isLoading && (
          <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-surface-container animate-pulse" />
            ))}
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────── */}
        {isError && (
          <div className="p-5 rounded-2xl bg-error-container text-on-error-container
                          flex flex-col items-center gap-2 text-center">
            <span className="material-symbols-outlined text-[28px]">error_outline</span>
            <p className="font-body-sm text-xs">Failed to load the looking list</p>
          </div>
        )}

        {/* ── Empty ───────────────────────────────────────────── */}
        {!isLoading && !isError && data?.items.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px] text-on-surface-variant">
                group_search
              </span>
            </div>
            <div>
              <p className="font-title-sm text-sm font-semibold text-on-surface">
                Nobody is looking yet
              </p>
              <p className="font-body-sm text-xs text-on-surface-variant mt-1">
                Be the first! Toggle &ldquo;Looking for a team&rdquo; on the event page.
              </p>
            </div>
          </div>
        )}

        {/* ── Results ─────────────────────────────────────────── */}
        {!isLoading && data && data.items.length > 0 && (
          <div className="flex flex-col gap-3">
            {/* Count + Female filter pill */}
            <div className="flex items-center justify-between gap-2">
              <p className="font-label-sm text-xs text-on-surface-variant">
                {filteredItems.length} student{filteredItems.length !== 1 ? 's' : ''} looking
                {data.hasMore && !femaleOnly ? ` (showing first ${data.items.length})` : ''}
              </p>
              {!event?.requiresFemale && (
                <button
                  type="button"
                  onClick={() => setFemaleOnly(v => !v)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${femaleOnly
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                  Female only
                </button>
              )}
            </div>

            {filteredItems.length === 0 ? (
              <div className="p-8 rounded-2xl bg-surface-container-lowest text-center border border-outline-variant/20">
                <p className="text-sm font-semibold text-on-surface">No female students marked looking yet</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  Students who set their gender to Female in Profile appear here.
                </p>
              </div>
            ) : (
              filteredItems.map(flag => {
                const isSelf = flag.user.id === user?.id;
                const existingStatus = sentStatusByUser.get(flag.user.id);
                const genderBadge =
                  flag.user.gender === 'female' ? 'Female' :
                    flag.user.gender === 'male' ? 'Male' :
                      flag.user.gender === 'other' ? 'Other' : null;

                return (
                  <article key={flag.id}
                    className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20
                             p-4 flex items-start gap-3 hover:shadow-md transition-all">

                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <span className="font-headline-sm text-sm font-bold text-primary">
                        {flag.user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="font-title-sm text-sm font-semibold text-on-surface truncate">
                            {flag.user.name}
                          </p>
                          {genderBadge && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${flag.user.gender === 'female'
                                ? 'bg-secondary-fixed text-on-secondary-fixed'
                                : 'bg-surface-container text-on-surface-variant'
                              }`}>
                              {genderBadge}
                            </span>
                          )}
                          {isSelf && (
                            <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[10px] font-semibold">
                              You
                            </span>
                          )}
                        </div>
                        <span className="font-label-sm text-[11px] text-on-surface-variant shrink-0">
                          {new Date(flag.since).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short',
                          })}
                        </span>
                      </div>

                      {flag.note && (
                        <p className="font-body-sm text-xs text-on-surface-variant mt-0.5 line-clamp-2">
                          {flag.note}
                        </p>
                      )}

                      {/* Badge + Action */}
                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full
                                       bg-primary/10 text-primary font-label-sm text-[11px] font-medium">
                          <span className="material-symbols-outlined text-[12px]">search</span>
                          Looking for a team
                        </span>

                        {!isSelf && user?.role === 'student' && (
                          existingStatus ? (
                            <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">check_circle</span>
                              {existingStatus === 'accepted' ? 'Connected' : 'Request Sent'}
                            </span>
                          ) : (
                            <button
                              id={`looking-connect-${flag.user.id}`}
                              onClick={() => { setTargetFlag(flag); setSendError(''); setMessage(''); }}
                              className="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-semibold
                                       hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">person_add</span>
                              Connect
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── Connect Modal ──────────────────────────────────────────────────── */}
      {targetFlag && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleConnect}
            className="w-full max-w-md rounded-2xl bg-surface-container-lowest p-5 shadow-xl border border-outline-variant/20 flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline-sm text-base font-bold text-on-surface">
                  Connect with {targetFlag.user.name}
                </h2>
                <p className="font-body-sm text-xs text-on-surface-variant">
                  Send a team collaboration request for this event
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTargetFlag(null)}
                className="p-1 rounded-full hover:bg-surface-container text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div>
              <label className="block font-label-sm text-xs text-on-surface-variant uppercase tracking-wider mb-1.5">
                Message (optional)
              </label>
              <textarea
                rows={3}
                maxLength={200}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="e.g. Hey! We're forming a team for this event and need someone with your skills."
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low text-on-surface text-sm
                           placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {sendError && (
              <p className="text-xs text-error bg-error-container/30 px-3 py-2 rounded-xl">
                {sendError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setTargetFlag(null)}
                className="px-4 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSending}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                {isSending ? 'Sending…' : 'Send Request'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
