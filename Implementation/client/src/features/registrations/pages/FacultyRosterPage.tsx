import { useParams, useNavigate } from 'react-router-dom';
import { useRoster, useDownloadRosterCsv } from '../hooks/useRegistration';
import { AppBar }    from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import type { Registration } from '../types';

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  draft:     'bg-surface-container text-on-surface-variant',
  submitted: 'bg-primary/10 text-primary',
  locked:    'bg-secondary/10 text-secondary',
  withdrawn: 'bg-surface-container text-on-surface-variant/60',
};

function StatusChip({ status }: { status: Registration['status'] }) {
  return (
    <span className={`px-2 py-0.5 rounded-lg font-label-sm text-[10px] capitalize
                      ${STATUS_STYLE[status]}`}>
      {status}
    </span>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

function RosterRow({ reg }: { reg: Registration }) {
  const confirmed = reg.members.filter(m => m.status === 'confirmed').length;
  const pending   = reg.members.filter(m => m.status === 'invited').length;

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-outline-variant/20
                    bg-surface-container-lowest hover:bg-surface-container-low transition-all">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <span className="font-label-sm text-[11px] font-bold text-primary">
              {reg.leader.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-title-sm text-xs font-semibold text-on-surface truncate">
              {reg.type === 'team' ? (reg.teamName ?? 'Unnamed Team') : reg.leader.name}
            </p>
            <p className="font-body-sm text-[9px] text-on-surface-variant">
              {reg.type === 'team'
                ? `Led by ${reg.leader.name}`
                : `Individual · ${reg.leader.name}`}
            </p>
          </div>
        </div>
        <StatusChip status={reg.status} />
      </div>

      {/* Members summary */}
      {reg.type === 'team' && (
        <div className="flex items-center gap-3 px-1">
          <span className="font-label-sm text-[9px] text-primary">
            {confirmed} confirmed
          </span>
          {pending > 0 && (
            <span className="font-label-sm text-[9px] text-amber-600">
              {pending} pending
            </span>
          )}
          <span className="font-label-sm text-[9px] text-on-surface-variant">
            {reg.members.map(m => m.name).join(', ')}
          </span>
        </div>
      )}

      {/* Submit time */}
      {reg.submittedAt && (
        <p className="font-label-sm text-[9px] text-on-surface-variant px-1">
          Submitted {new Date(reg.submittedAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short',
          })} at {new Date(reg.submittedAt).toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit',
          })}
        </p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FacultyRosterPage() {
  const navigate  = useNavigate();
  const { id: eventId = '' } = useParams<{ id: string }>();

  const { data, isLoading, isError } = useRoster(eventId);
  const { mutate: download, isPending: isDownloading } = useDownloadRosterCsv(eventId);

  const submitted = data?.items.filter(r => r.status === 'submitted').length ?? 0;
  const locked    = data?.items.filter(r => r.status === 'locked').length ?? 0;
  const teams     = data?.items.filter(r => r.type === 'team').length ?? 0;
  const total     = data?.items.length ?? 0;

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col pb-20">
      <AppBar />

      {/* Back breadcrumb */}
      <div className="px-4 pt-20 pb-2 flex items-center gap-2">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-on-surface-variant hover:text-primary font-label-sm text-xs transition-all">
          <span className="material-symbols-outlined text-[15px]">arrow_back</span>
          Back
        </button>
        <span className="text-on-surface-variant text-xs">/</span>
        <span className="font-label-sm text-xs text-on-surface font-medium">Event Roster</span>
      </div>

      <main className="flex-1 px-4 pb-4 max-w-lg mx-auto w-full flex flex-col gap-4">

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Total',     value: total,     icon: 'group' },
            { label: 'Submitted', value: submitted,  icon: 'check_circle' },
            { label: 'Locked',    value: locked,     icon: 'lock' },
            { label: 'Teams',     value: teams,      icon: 'groups' },
          ].map(s => (
            <div key={s.label}
              className="flex flex-col items-center gap-0.5 p-2.5 rounded-xl
                         bg-surface-container-lowest border border-outline-variant/20">
              <span className="material-symbols-outlined text-[16px] text-primary">{s.icon}</span>
              <span className="font-title-sm text-sm font-bold text-on-surface">{s.value}</span>
              <span className="font-label-sm text-[8px] text-on-surface-variant">{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── CSV export ─────────────────────────────────────────────────── */}
        <button
          id={`roster-export-${eventId}`}
          onClick={() => download()}
          disabled={isDownloading || total === 0}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
                     border border-outline-variant/40 font-label-lg text-sm text-on-surface-variant
                     hover:border-primary/40 hover:text-primary transition-all disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-[16px]">
            {isDownloading ? 'hourglass_empty' : 'download'}
          </span>
          {isDownloading ? 'Preparing CSV…' : 'Export CSV'}
        </button>

        {/* ── List ───────────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="flex flex-col gap-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-surface-container-low animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <div className="text-center py-10">
            <span className="material-symbols-outlined text-[40px] text-outline">error</span>
            <p className="font-body-sm text-sm text-on-surface-variant mt-2">Failed to load roster.</p>
          </div>
        )}

        {!isLoading && !isError && total === 0 && (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-[48px] text-outline">group_off</span>
            <p className="font-title-sm text-base text-on-surface mt-3">No registrations yet</p>
            <p className="font-body-sm text-sm text-on-surface-variant mt-1">
              Students who register will appear here.
            </p>
          </div>
        )}

        {!isLoading && !isError && total > 0 && (
          <div className="flex flex-col gap-2">
            {data!.items.map(reg => (
              <RosterRow key={reg.id} reg={reg} />
            ))}
            {data!.hasMore && (
              <p className="text-center font-label-sm text-[10px] text-on-surface-variant py-2">
                Scroll — more registrations exist (use CSV export for full data)
              </p>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
