import { useState, useMemo } from 'react';
import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
  usePendingCredentials,
  useVerifyParticipation,
} from '../hooks/useCredentials';
import { VerifyModal } from '../components/VerifyModal';
import type { Credential, Participation } from '../types';

type QueueItem =
  | { kind: 'credential'; item: Credential }
  | { kind: 'participation'; item: Participation };

const TIER_LABELS: Record<Credential['tier'], string> = {
  pass: 'Pass',
  elite: 'Elite',
  elite_silver: 'Elite + Silver',
  elite_gold: 'Elite + Gold',
};

export default function FacultyVerificationQueuePage() {
  const { user } = useAuth();
  const { data: credentials = [], isLoading, isError, refetch } = usePendingCredentials();
  const { mutateAsync: verifyParticipationMut } = useVerifyParticipation();

  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [search, setSearch]     = useState('');
  const [issuerFilter, setIssuerFilter] = useState<string>('all');

  const issuers = useMemo(() => {
    const set = new Set<string>();
    for (const c of credentials) {
      if (c.issuer) set.add(c.issuer);
    }
    return [...set].sort();
  }, [credentials]);

  const filtered = useMemo(() => {
    let list = credentials;
    if (issuerFilter !== 'all') {
      list = list.filter(c => c.issuer === issuerFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        `${c.otherCourseName ?? ''} ${c.issuer} ${c.certificateId} ${c.session} ${c.year}`
          .toLowerCase()
          .includes(q),
      );
    }
    return list;
  }, [credentials, issuerFilter, search]);

  async function handleVerifyParticipation(id: string, verdict: 'verified' | 'rejected', reason?: string) {
    await verifyParticipationMut({ id, input: { verdict, reason } });
  }

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased">
      <AppBar subtitle="Verification Queue" />

      <main className="w-full pt-16 max-w-5xl mx-auto px-4 lg:px-8 pb-28 lg:pb-12">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="py-5 border-b border-outline-variant/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-1">
              <span>Verified Academic Portal</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-primary font-semibold">Faculty Verification Queue</span>
            </div>
            <h1 className="font-headline-lg text-2xl font-bold text-on-surface">
              Credential Verification Queue
            </h1>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Review student certificate submissions for {typeof user?.department === 'object' ? user.department.code : (user?.department ?? 'your department')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold">
              {credentials.length} pending
            </span>
            <button
              onClick={() => refetch()}
              className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-colors"
              title="Refresh queue"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
            </button>
          </div>
        </div>

        {/* ── Search & Issuer Filter ──────────────────────────────────────── */}
        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
              search
            </span>
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by course name, issuer, certificate ID, or session..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface-container-lowest border border-outline-variant/20
                         text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {issuers.length > 0 && (
            <select
              value={issuerFilter}
              onChange={e => setIssuerFilter(e.target.value)}
              className="h-10 px-3 rounded-xl bg-surface-container-lowest border border-outline-variant/20
                         text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Issuers ({credentials.length})</option>
              {issuers.map(iss => (
                <option key={iss} value={iss}>{iss}</option>
              ))}
            </select>
          )}
        </div>

        {/* ── Loading ─────────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="mt-5 flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-surface-container-high animate-pulse" />
            ))}
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {isError && !isLoading && (
          <div className="mt-6 p-6 rounded-2xl bg-error-container/30 border border-error/20 flex flex-col items-center gap-3 text-center">
            <span className="material-symbols-outlined text-[32px] text-error">error_outline</span>
            <p className="text-sm font-semibold text-on-surface">Couldn&apos;t load pending credentials.</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Empty State ─────────────────────────────────────────────────── */}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className="mt-8 p-10 rounded-2xl bg-surface-container-lowest border border-outline-variant/15 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px] text-emerald-600">task_alt</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-base font-bold text-on-surface">
                {credentials.length === 0 ? 'Verification queue is clear' : 'No matching submissions'}
              </h2>
              <p className="text-xs text-on-surface-variant mt-1 max-w-sm">
                {credentials.length === 0
                  ? 'All student credential submissions for your department have been reviewed.'
                  : 'Try clearing your search or issuer filter.'}
              </p>
            </div>
            {(search || issuerFilter !== 'all') && (
              <button
                onClick={() => { setSearch(''); setIssuerFilter('all'); }}
                className="px-4 py-2 rounded-xl bg-surface-container text-xs font-semibold text-on-surface hover:bg-surface-container-high"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* ── Real Pending Credentials List ───────────────────────────────── */}
        {!isLoading && !isError && filtered.length > 0 && (
          <div className="mt-5 flex flex-col gap-3">
            {filtered.map(cred => (
              <article
                key={cred._id}
                className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/20
                           shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
                      {cred.issuer}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed/60 text-on-secondary-fixed text-[11px] font-semibold">
                      {TIER_LABELS[cred.tier] ?? cred.tier}
                    </span>
                    <span className="text-[11px] text-on-surface-variant">
                      {cred.session} {cred.year}
                    </span>
                  </div>

                  <h2 className="font-headline-sm text-base font-bold text-on-surface truncate">
                    {cred.otherCourseName || 'Course Certificate'}
                  </h2>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-on-surface-variant">
                    <span className="font-code-sm">Cert ID: {cred.certificateId}</span>
                    <span>•</span>
                    <span>
                      Submitted {new Date(cred.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {cred.proofUrl && (
                    <a
                      href={cred.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high
                                 text-on-surface text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                      View Proof
                    </a>
                  )}
                  <button
                    id={`verify-cred-${cred._id}`}
                    onClick={() => setSelected({ kind: 'credential', item: cred })}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary
                               text-xs font-semibold shadow-sm transition-all flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">fact_check</span>
                    Review &amp; Verify
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {selected && (
        <VerifyModal
          item={selected.item}
          type={selected.kind}
          onClose={() => setSelected(null)}
          onVerify={
            selected.kind === 'participation'
              ? handleVerifyParticipation
              : undefined
          }
        />
      )}

      <BottomNav />
    </div>
  );
}
