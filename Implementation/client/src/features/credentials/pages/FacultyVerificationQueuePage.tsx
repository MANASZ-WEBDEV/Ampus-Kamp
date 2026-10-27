import { useState } from 'react';
import {
  usePendingCredentials,
  useVerifyParticipation,
} from '../hooks/useCredentials';
import { VerifyModal } from '../components/VerifyModal';
import type { Credential, Participation } from '../types';

type QueueItem =
  | { kind: 'credential';    item: Credential }
  | { kind: 'participation'; item: Participation };

const STATUS_COLOR = {
  pending:  'text-tertiary bg-tertiary/10',
  verified: 'text-primary bg-primary/10',
  rejected: 'text-error bg-error-container/60',
};

/**
 * FacultyVerificationQueuePage  /verify
 * Faculty see pending credentials from their own department, oldest-first.
 */
export default function FacultyVerificationQueuePage() {
  const { data: credentials = [], isLoading, error, refetch } = usePendingCredentials();
  const { mutateAsync: verifyParticipationMutate } = useVerifyParticipation();

  const [selected, setSelected] = useState<QueueItem | null>(null);

  // All credentials come from the same queue endpoint.
  // Separate them by type (Participation items are fetched separately in real use,
  // but the endpoint returns Credential docs only — participations have their own queue endpoint)
  const items: QueueItem[] = credentials.map(c => ({ kind: 'credential' as const, item: c }));

  const count = items.length;

  async function handleVerifyParticipation(
    id: string,
    verdict: 'verified' | 'rejected',
    reason?: string,
  ) {
    await verifyParticipationMutate({ id, input: { verdict, reason } });
  }

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-secondary/80 to-secondary-container/60 px-5 pt-14 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-on-secondary/70 text-xs font-semibold uppercase tracking-wider mb-1">
              Faculty Queue
            </p>
            <h1 className="font-headline-md text-2xl font-bold text-on-secondary">
              Verification Queue
            </h1>
            <p className="text-on-secondary/70 text-sm mt-1">
              {count} item{count !== 1 ? 's' : ''} awaiting review
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2.5 rounded-xl bg-on-secondary/10 hover:bg-on-secondary/20 transition-all"
            aria-label="Refresh queue"
          >
            <span className="material-symbols-outlined text-[22px] text-on-secondary">refresh</span>
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="mx-4 mt-4 p-3 rounded-xl bg-surface-container border border-outline-variant/20
                      flex items-start gap-2.5">
        <span className="material-symbols-outlined text-[16px] text-on-surface-variant shrink-0 mt-px">
          info
        </span>
        <p className="text-[11px] text-on-surface-variant leading-relaxed">
          You can only see credentials from <strong>your department</strong>.
          Verify each certificate by opening the proof and comparing with the form data.
        </p>
      </div>

      <div className="px-4 py-4">
        {/* Loading skeletons */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-36 rounded-2xl bg-surface-container animate-pulse" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 rounded-2xl bg-error-container text-on-error-container text-sm flex items-start gap-3">
            <span className="material-symbols-outlined text-[20px] shrink-0">error</span>
            <div>
              <p className="font-semibold">Failed to load queue</p>
              <button onClick={() => refetch()} className="mt-1 underline text-xs">Retry</button>
            </div>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="w-20 h-20 rounded-full bg-primary/8 flex items-center justify-center">
              <span className="material-symbols-outlined text-[44px] text-primary/40"
                    style={{ fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
            </div>
            <div>
              <p className="font-semibold text-on-surface">Queue is clear!</p>
              <p className="text-sm text-on-surface-variant mt-1">
                No pending credentials for your department.
              </p>
            </div>
          </div>
        )}

        {/* Queue items */}
        {!isLoading && !error && items.length > 0 && (
          <div className="space-y-3">
            {items.map(({ kind, item }) => {
              const cred = item as Credential;
              const submittedAt = new Date(item.createdAt);
              const ageMs = Date.now() - submittedAt.getTime();
              const ageStr = ageMs < 3_600_000
                ? `${Math.floor(ageMs / 60_000)}m ago`
                : ageMs < 86_400_000
                  ? `${Math.floor(ageMs / 3_600_000)}h ago`
                  : `${Math.floor(ageMs / 86_400_000)}d ago`;

              return (
                <article
                  key={item._id}
                  className="rounded-2xl bg-surface-container-low border border-outline-variant/20
                             hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all overflow-hidden"
                >
                  {/* Urgency stripe — red if >48h pending */}
                  <div className={`h-[3px] ${ageMs > 172_800_000 ? 'bg-error' : 'bg-tertiary/50'}`} />

                  <div className="p-4">
                    {/* Top row */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[20px] text-secondary"
                              style={{ fontVariationSettings: "'FILL' 1" }}>
                          {kind === 'credential' ? 'school' : 'emoji_events'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-on-surface truncate">
                          {kind === 'credential'
                            ? (cred.otherCourseName ?? cred.issuer)
                            : 'Participation Record'}
                        </p>
                        {kind === 'credential' && (
                          <p className="text-[11px] text-on-surface-variant mt-0.5">
                            {cred.session} · {cred.year}
                            {' · '}
                            <span className="capitalize">{cred.tier.replace('_', ' ')}</span>
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-[10px] text-on-surface-variant">{ageStr}</span>
                    </div>

                    {/* Cert ID */}
                    {kind === 'credential' && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[13px] text-on-surface-variant">tag</span>
                        <span className="text-[11px] font-mono text-on-surface-variant">
                          {cred.certificateId}
                        </span>
                      </div>
                    )}

                    {/* QR auto-verified status */}
                    {kind === 'credential' && cred.verification.method === 'issuer_qr' && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-tertiary">
                        <span className="material-symbols-outlined text-[13px]">qr_code_scanner</span>
                        QR scan attempted — check evidence below
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-2">
                      {/* Status chip */}
                      <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold
                        ${STATUS_COLOR[item.verification.status as keyof typeof STATUS_COLOR]}`}>
                        <span className="material-symbols-outlined text-[12px]"
                              style={{ fontVariationSettings: "'FILL' 1" }}>
                          {item.verification.status === 'pending' ? 'schedule'
                           : item.verification.status === 'verified' ? 'verified' : 'cancel'}
                        </span>
                        {item.verification.status}
                      </span>

                      {/* Proof link */}
                      <a
                        href={item.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                      >
                        <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                        View Proof
                      </a>

                      {/* Verify button */}
                      <button
                        onClick={() => {
                          const qi: QueueItem = kind === 'credential'
                            ? { kind: 'credential', item: item as Credential }
                            : { kind: 'participation', item: item as Participation };
                          setSelected(qi);
                        }}
                        className="ml-auto px-3.5 py-1.5 rounded-xl bg-primary text-on-primary
                                   text-[12px] font-semibold hover:bg-primary/90 active:scale-[0.99] transition-all"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Verify Modal */}
      {selected && (
        <VerifyModal
          item={selected.item as Credential}
          type={selected.kind}
          onClose={() => setSelected(null)}
          onVerify={selected.kind === 'participation' ? handleVerifyParticipation : undefined}
        />
      )}
    </div>
  );
}
