import { useState, type FormEvent } from 'react';
import { useCreateBlock, useCreateReport } from '../hooks/usePeople';
import type { TeamLink } from '../types';

interface BlockReportMenuProps {
  link:    TeamLink;
  onClose: () => void;
}

type View = 'menu' | 'report' | 'block-confirm';

export function BlockReportMenu({ link, onClose }: BlockReportMenuProps) {
  const [view,   setView]   = useState<View>('menu');
  const [reason, setReason] = useState('');
  const [done,   setDone]   = useState(false);

  const { mutate: block,  isPending: isBlocking  } = useCreateBlock();
  const { mutate: report, isPending: isReporting } = useCreateReport();

  const otherUser = link.from; // BlockReportMenu is always shown on incoming links

  const hasUrl    = /https?:\/\/|www\./i.test(reason);
  const overLimit = reason.length > 500;
  const reasonOk  = reason.trim().length >= 10 && !hasUrl && !overLimit;

  function handleReport(e: FormEvent) {
    e.preventDefault();
    report(
      { targetUserId: otherUser.id, linkId: link.id, reason: reason.trim() },
      {
        onSuccess: () => setDone(true),
      },
    );
  }

  function handleBlock() {
    block(
      { blockedUserId: otherUser.id },
      {
        onSuccess: () => { setDone(true); },
      },
    );
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-surface rounded-t-3xl shadow-2xl border border-outline-variant/20
                      border-b-0 pb-safe overflow-hidden">

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-outline-variant/40" />
        </div>

        {done ? (
          /* ── Done state ─────────────────────────────────────────────── */
          <div className="px-5 py-6 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px] text-primary">check_circle</span>
            </div>
            <p className="font-title-sm text-sm font-semibold text-on-surface">
              {view === 'block-confirm' ? 'User Blocked' : 'Report Submitted'}
            </p>
            <p className="font-body-sm text-xs text-on-surface-variant">
              {view === 'block-confirm'
                ? 'All pending requests between you have been removed.'
                : 'Our admin team will review your report. Thank you for keeping the platform safe.'}
            </p>
            <button onClick={onClose}
              className="mt-1 w-full py-2.5 rounded-xl bg-primary text-on-primary
                         font-label-lg text-sm font-medium">
              Done
            </button>
          </div>

        ) : view === 'menu' ? (
          /* ── Menu ───────────────────────────────────────────────────── */
          <div className="px-4 py-4 flex flex-col gap-1">
            <p className="font-label-lg text-xs text-on-surface-variant px-1 pb-2">
              Actions for <span className="font-semibold text-on-surface">{otherUser.name}</span>
            </p>

            <button
              onClick={() => setView('report')}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-xl
                         text-on-surface hover:bg-surface-container transition-all text-left"
            >
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant">flag</span>
              <div>
                <p className="font-label-lg text-sm font-medium">Report</p>
                <p className="font-body-sm text-[10px] text-on-surface-variant">
                  Report inappropriate message or behaviour
                </p>
              </div>
            </button>

            <button
              onClick={() => setView('block-confirm')}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-xl
                         text-error hover:bg-error-container/30 transition-all text-left"
            >
              <span className="material-symbols-outlined text-[20px]">block</span>
              <div>
                <p className="font-label-lg text-sm font-medium">Block {otherUser.name}</p>
                <p className="font-body-sm text-[10px] text-error/70">
                  Removes all pending requests and prevents future contact
                </p>
              </div>
            </button>

            <button onClick={onClose}
              className="w-full py-2.5 mt-1 rounded-xl border border-outline-variant/30
                         font-label-lg text-sm text-on-surface-variant">
              Cancel
            </button>
          </div>

        ) : view === 'report' ? (
          /* ── Report form ────────────────────────────────────────────── */
          <form onSubmit={handleReport} className="px-5 py-4 flex flex-col gap-3">
            <h2 className="font-headline-sm text-base font-bold text-on-surface">Report User</h2>

            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
              <p className="font-body-sm text-xs text-on-surface-variant">
                Reports are confidential. {otherUser.name} will not know you reported them.
              </p>
            </div>

            <div>
              <label htmlFor="report-reason" className="font-label-sm text-[10px] uppercase tracking-wider
                                                         text-on-surface-variant mb-1.5 block">
                Describe the issue *
              </label>
              <textarea
                id="report-reason"
                rows={4}
                required
                minLength={10}
                maxLength={520}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Describe what happened — e.g. inappropriate message, spam, harassment…"
                className={`w-full px-3 py-2.5 rounded-xl bg-surface-container-low text-on-surface
                            font-body-sm text-xs placeholder:text-on-surface-variant/50 resize-none
                            focus:outline-none focus:ring-2 transition-all
                            ${overLimit || hasUrl ? 'ring-1 ring-error/40 focus:ring-error/30' : 'focus:ring-primary/30'}`}
              />
              <p className={`text-right font-label-sm text-[10px] mt-0.5
                             ${overLimit ? 'text-error' : 'text-on-surface-variant'}`}>
                {reason.length}/500
              </p>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setView('menu')}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant/40
                           font-label-lg text-sm text-on-surface-variant">
                Back
              </button>
              <button
                type="submit"
                disabled={!reasonOk || isReporting}
                className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary
                           font-label-lg text-sm font-medium disabled:opacity-50">
                {isReporting ? 'Submitting…' : 'Submit Report'}
              </button>
            </div>
          </form>

        ) : (
          /* ── Block confirm ──────────────────────────────────────────── */
          <div className="px-5 py-4 flex flex-col gap-4">
            <h2 className="font-headline-sm text-base font-bold text-on-surface">
              Block {otherUser.name}?
            </h2>

            <div className="p-3 rounded-xl bg-error-container/30 border border-error/20 flex flex-col gap-1">
              <p className="font-label-lg text-xs font-semibold text-error">This will:</p>
              <ul className="font-body-sm text-xs text-on-surface-variant space-y-0.5 list-disc list-inside">
                <li>Remove all pending requests between you</li>
                <li>Prevent {otherUser.name} from sending future requests</li>
                <li>Hide them from your people search</li>
              </ul>
            </div>

            <p className="font-body-sm text-xs text-on-surface-variant">
              You can unblock them anytime from Settings.
            </p>

            <div className="flex gap-2">
              <button onClick={() => setView('menu')}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant/40
                           font-label-lg text-sm text-on-surface-variant">
                Cancel
              </button>
              <button
                onClick={handleBlock}
                disabled={isBlocking}
                className="flex-1 py-2.5 rounded-xl bg-error text-on-error
                           font-label-lg text-sm font-medium disabled:opacity-50">
                {isBlocking ? 'Blocking…' : 'Block User'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
