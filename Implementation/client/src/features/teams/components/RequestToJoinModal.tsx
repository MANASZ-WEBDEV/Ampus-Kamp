import { useState, type FormEvent } from 'react';
import { useSendLink } from '../hooks/useTeams';
import type { TeamPost } from '../types';

interface RequestToJoinModalProps {
  post:     TeamPost;
  onClose:  () => void;
}

export function RequestToJoinModal({ post, onClose }: RequestToJoinModalProps) {
  const { mutateAsync: sendLink, isPending } = useSendLink();
  const [message,   setMessage]   = useState('');
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState(false);

  // URL detection (mirrors server-side Zod rule)
  const hasUrl   = /https?:\/\/|www\./i.test(message);
  const overLimit = message.length > 200;
  const canSend  = !hasUrl && !overLimit && !isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await sendLink({
        direction:  'request',
        teamPostId: post.id,
        eventId:    post.eventId,
        message:    message.trim() || undefined,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send request.');
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center
                 bg-black/40 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-surface rounded-3xl shadow-2xl border border-outline-variant/20
                      flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="font-headline-md text-base font-bold text-on-surface">
              Request to Join
            </h2>
            <p className="font-body-sm text-xs text-on-surface-variant mt-0.5 truncate max-w-[260px]">
              {post.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center
                       text-on-surface-variant hover:text-on-surface transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Post summary */}
        <div className="mx-5 mb-4 p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary">group</span>
            <span className="font-body-sm text-xs text-on-surface-variant">
              {post.spotsLeft} spot{post.spotsLeft !== 1 ? 's' : ''} left · by {post.owner.name}
            </span>
          </div>
          {post.rolesNeeded.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {post.rolesNeeded.map(r => (
                <span key={r} className="px-1.5 py-0.5 rounded bg-secondary/10 text-secondary font-label-sm text-[10px]">
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>

        {success ? (
          /* Success state */
          <div className="px-5 pb-6 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px] text-primary">check_circle</span>
            </div>
            <p className="font-title-md text-sm font-semibold text-on-surface">Request Sent!</p>
            <p className="font-body-sm text-xs text-on-surface-variant">
              The team leader will review your request. You'll be notified when they respond.
            </p>
            <button
              onClick={onClose}
              className="mt-1 w-full py-2.5 rounded-xl bg-primary text-on-primary
                         font-label-lg text-sm font-medium hover:bg-primary/90 transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 pb-5 flex flex-col gap-3">

            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl bg-error-container text-on-error-container
                              font-body-sm text-xs flex items-start gap-2">
                <span className="material-symbols-outlined text-[14px] shrink-0">error</span>
                {error}
              </div>
            )}

            {/* Message */}
            <div>
              <label htmlFor="rtj-message" className="font-label-lg text-xs text-on-surface-variant mb-1.5 block">
                Message (optional)
              </label>
              <textarea
                id="rtj-message"
                rows={3}
                maxLength={220}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Introduce yourself — your skills, year, or why you'd be a great fit…"
                className={`w-full px-4 py-2.5 rounded-xl bg-surface-container-low text-on-surface
                            font-body-md text-sm placeholder:text-on-surface-variant/50 resize-none
                            focus:outline-none focus:ring-2 transition-all
                            ${hasUrl || overLimit ? 'ring-1 ring-error/50 focus:ring-error/30' : 'focus:ring-primary/30'}`}
              />
              <div className="flex items-center justify-between mt-0.5">
                {hasUrl ? (
                  <p className="font-label-sm text-[10px] text-error">URLs are not allowed in messages</p>
                ) : (
                  <span />
                )}
                <p className={`font-label-sm text-[10px] ml-auto ${overLimit ? 'text-error' : 'text-on-surface-variant'}`}>
                  {message.length}/200
                </p>
              </div>
            </div>

            {/* Privacy note */}
            <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/15 flex items-start gap-2">
              <span className="material-symbols-outlined text-[14px] text-primary shrink-0 mt-0.5">info</span>
              <p className="font-body-sm text-[10px] text-on-surface-variant">
                Your contact details are only shared after the team leader accepts your request.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant/40
                           font-label-lg text-sm text-on-surface-variant hover:border-outline-variant transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSend}
                className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary
                           font-label-lg text-sm font-medium
                           hover:bg-primary/90 active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {isPending ? 'Sending…' : 'Send Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
