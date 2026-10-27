import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminReports, useReviewReport } from '../hooks/useAdmin';
import type { AdminReport } from '../types';

// ── Status chip ───────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  pending:   'bg-error-container text-on-error-container',
  reviewed:  'bg-tertiary-container text-on-tertiary-container',
  dismissed: 'bg-surface-container-high text-on-surface-variant',
};

// ── Review drawer ─────────────────────────────────────────────────────────────

function ReviewDrawer({
  report,
  onClose,
}: {
  report: AdminReport;
  onClose: () => void;
}) {
  const [action, setAction]   = useState<'reviewed' | 'dismissed'>('reviewed');
  const [notes, setNotes]     = useState('');
  const [userAction, setUserAction] = useState<'warn' | 'suspend' | undefined>();

  const reviewMutation = useReviewReport();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    reviewMutation.mutate(
      { id: report._id, body: { action, notes: notes || undefined, userAction } },
      { onSuccess: onClose },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-surface-container rounded-t-3xl p-6 pb-10 flex flex-col gap-4">
        <div className="w-10 h-1 rounded-full bg-outline-variant mx-auto -mt-1" />

        <h3 className="font-bold text-on-surface text-lg">Review Report</h3>
        <div className="bg-surface-container-high rounded-xl p-3 text-sm text-on-surface">
          <p className="font-medium">{report.reason}</p>
          <p className="text-xs text-on-surface-variant mt-1">
            By {report.reporterId.name}
            {report.targetUserId && ` → Target: ${report.targetUserId.name}`}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Action */}
          <div className="flex gap-2">
            {(['reviewed', 'dismissed'] as const).map((a) => (
              <button
                type="button" key={a}
                onClick={() => setAction(a)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors
                  ${action === a ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}
              >
                {a === 'reviewed' ? 'Take action' : 'Dismiss'}
              </button>
            ))}
          </div>

          {/* User action (only for reviewed) */}
          {action === 'reviewed' && report.targetUserId && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setUserAction(undefined)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors
                  ${!userAction ? 'border-primary text-primary bg-primary/10' : 'border-outline text-on-surface-variant'}`}>
                No account action
              </button>
              <button type="button" onClick={() => setUserAction('warn')}
                className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors
                  ${userAction === 'warn' ? 'border-warning text-warning bg-warning/10' : 'border-outline text-on-surface-variant'}`}>
                Warn user
              </button>
              <button type="button" onClick={() => setUserAction('suspend')}
                className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors
                  ${userAction === 'suspend' ? 'border-error text-error bg-error/10' : 'border-outline text-on-surface-variant'}`}>
                Suspend
              </button>
            </div>
          )}

          {/* Notes */}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Admin notes (optional)"
            className="w-full px-3 py-2.5 rounded-xl bg-surface text-on-surface text-sm
                       placeholder:text-on-surface-variant outline-none focus:ring-2 focus:ring-primary
                       resize-none border border-outline-variant"
          />

          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-outline text-on-surface text-sm font-medium">
              Cancel
            </button>
            <button type="submit" disabled={reviewMutation.isPending}
              className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-medium disabled:opacity-50">
              {reviewMutation.isPending ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Report card ───────────────────────────────────────────────────────────────

function ReportCard({ report }: { report: AdminReport }) {
  const [open, setOpen] = useState(false);
  const date = new Date(report.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <>
      <div className="bg-surface-container rounded-2xl p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-on-surface text-sm leading-snug">
              {report.reason}
            </p>
            <p className="text-xs text-on-surface-variant mt-1">
              {report.reporterId.name} · {date}
            </p>
            {report.targetUserId && (
              <p className="text-xs text-on-surface-variant">
                <span className="material-symbols-rounded text-xs align-middle mr-0.5">person</span>
                {report.targetUserId.name}
              </p>
            )}
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize shrink-0
            ${STATUS_COLOR[report.status] ?? ''}`}>
            {report.status}
          </span>
        </div>

        {report.status === 'pending' && (
          <button
            onClick={() => setOpen(true)}
            className="mt-3 w-full py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium"
          >
            Review
          </button>
        )}
      </div>

      {open && <ReviewDrawer report={report} onClose={() => setOpen(false)} />}
    </>
  );
}

// ── SafetyReportsPage ─────────────────────────────────────────────────────────

const REPORT_FILTERS = [
  { label: 'Pending',   value: 'pending' },
  { label: 'Reviewed',  value: 'reviewed' },
  { label: 'Dismissed', value: 'dismissed' },
  { label: 'All',       value: undefined },
] as const;

export default function SafetyReportsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string | undefined>('pending');
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useAdminReports(statusFilter);

  const reports = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-surface-container-high px-4 pt-14 pb-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/admin')}
            className="material-symbols-rounded text-on-surface-variant">arrow_back</button>
          <h1 className="text-xl font-bold text-on-surface">Safety Reports</h1>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {REPORT_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                ${statusFilter === f.value
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-surface-container animate-pulse" />
            ))
          : reports.length === 0
            ? (
              <div className="text-center py-20">
                <span className="material-symbols-rounded text-5xl text-on-surface-variant/40 block mb-2">
                  flag
                </span>
                <p className="text-on-surface-variant">No {statusFilter ?? ''} reports</p>
              </div>
            )
            : reports.map((r) => <ReportCard key={r._id} report={r} />)
        }

        {hasNextPage && (
          <button
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="py-3 rounded-2xl bg-surface-container text-on-surface-variant text-sm font-medium disabled:opacity-50"
          >
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>
    </div>
  );
}
