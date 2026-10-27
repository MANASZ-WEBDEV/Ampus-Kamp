import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuditLog } from '../hooks/useAdmin';
import type { AuditEntry } from '../types';

// ── Action icon map ───────────────────────────────────────────────────────────

function actionIcon(action: string): string {
  if (action.startsWith('user_approve'))  return 'check_circle';
  if (action.startsWith('user_suspend'))  return 'person_off';
  if (action.startsWith('report_'))       return 'flag';
  if (action.startsWith('course_alias'))  return 'category';
  if (action.startsWith('credential_'))   return 'workspace_premium';
  if (action.startsWith('deadline_'))     return 'alarm';
  return 'history';
}

function actionColor(action: string): string {
  if (action.startsWith('user_approve'))  return 'text-tertiary';
  if (action.startsWith('user_suspend'))  return 'text-error';
  if (action.startsWith('report_'))       return 'text-warning';
  if (action.startsWith('course_alias'))  return 'text-secondary';
  return 'text-on-surface-variant';
}

// ── Relative time ─────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const delta = (Date.now() - new Date(iso).getTime()) / 1000;
  const rtf   = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (delta < 60)     return rtf.format(-Math.round(delta), 'second');
  if (delta < 3600)   return rtf.format(-Math.round(delta / 60), 'minute');
  if (delta < 86400)  return rtf.format(-Math.round(delta / 3600), 'hour');
  return rtf.format(-Math.round(delta / 86400), 'day');
}

// ── Audit entry row ───────────────────────────────────────────────────────────

function AuditRow({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false);
  const icon  = actionIcon(entry.action);
  const color = actionColor(entry.action);

  return (
    <button
      onClick={() => setExpanded((v) => !v)}
      className="w-full text-left bg-surface-container rounded-2xl p-4 hover:bg-surface-container-high
                 transition-colors"
    >
      <div className="flex items-start gap-3">
        <span className={`material-symbols-rounded text-xl mt-0.5 ${color}`}>{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-on-surface text-sm capitalize">
            {entry.action.replace(/_/g, ' ')}
          </p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {entry.userId.name} ({entry.userId.role}) · {relativeTime(entry.createdAt)}
          </p>

          {expanded && entry.meta && (
            <pre className="mt-2 text-xs text-on-surface-variant bg-surface rounded-xl p-3
                            overflow-x-auto whitespace-pre-wrap break-all">
              {JSON.stringify(entry.meta, null, 2)}
            </pre>
          )}
        </div>
        <span className={`material-symbols-rounded text-on-surface-variant/40 transition-transform
          ${expanded ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </div>
    </button>
  );
}

// ── AuditLogPage ──────────────────────────────────────────────────────────────

export default function AuditLogPage() {
  const navigate = useNavigate();
  const [actionFilter, setActionFilter] = useState('');

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useAuditLog({ action: actionFilter || undefined });

  const entries = data?.pages.flatMap((p) => p.entries) ?? [];

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-surface-container-high px-4 pt-14 pb-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate('/admin')}
            className="material-symbols-rounded text-on-surface-variant">arrow_back</button>
          <h1 className="text-xl font-bold text-on-surface">Audit Log</h1>
        </div>

        {/* Action filter */}
        <div className="relative">
          <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
            search
          </span>
          <input
            type="text"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            placeholder="Filter by action (e.g. user_approve)"
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container rounded-xl text-sm
                       text-on-surface placeholder:text-on-surface-variant outline-none
                       focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-2">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-surface-container animate-pulse" />
            ))
          : entries.length === 0
            ? (
              <div className="text-center py-20">
                <span className="material-symbols-rounded text-5xl text-on-surface-variant/40 block mb-2">
                  history
                </span>
                <p className="text-on-surface-variant">No audit entries found</p>
              </div>
            )
            : entries.map((e) => <AuditRow key={e._id} entry={e} />)
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
