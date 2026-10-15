import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

// ── Types ─────────────────────────────────────────────────────────────────────

interface HealthData {
  status: string;
  env: string;
  version: string;
  database: 'connected' | 'connecting' | 'disconnecting' | 'disconnected';
  timestamp: string;
  uptime: number;
  jobs: Record<string, string | null>;
}

// ── Data hook ─────────────────────────────────────────────────────────────────

function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: async (): Promise<HealthData> => {
      const res = await apiClient.get<{ data: HealthData }>('/health');
      return res.data.data;
    },
    refetchInterval: 10_000,   // Poll every 10 s
  });
}

// ── Feature list ──────────────────────────────────────────────────────────────

const FEATURES = [
  { id: 'F-0', label: 'Scaffold & Infrastructure', done: true },
  { id: 'F-1', label: 'Authentication & Profiles', done: false },
  { id: 'F-2', label: 'Event Feed & Management', done: false },
  { id: 'F-3', label: 'Paste-to-Post AI Extraction', done: false },
  { id: 'F-4', label: 'Team Finder — Posts & Requests', done: false },
  { id: 'F-5', label: 'Invites, Connect & People Search', done: false },
  { id: 'F-6', label: 'Event Registration', done: false },
  { id: 'F-7', label: 'Credentials & Verification', done: false },
  { id: 'F-8', label: 'Analytics & Department Ranking', done: false },
  { id: 'F-9', label: 'Notifications & Home Feed', done: false },
  { id: 'F-10', label: 'Admin, Settings & Hardening', done: false },
] as const;

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * ScaffoldPage — F-0 placeholder.
 * Rendered at "/" until F-1 (auth) replaces it with the proper home flow.
 * Shows API health, DB state, and feature completion progress.
 */
export function ScaffoldPage() {
  const { data, isLoading, isError, refetch } = useHealth();

  const doneCount = FEATURES.filter((f) => f.done).length;
  const progressPercent = Math.round((doneCount / FEATURES.length) * 100);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-gutter">

      {/* ── Brand header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-level-1">
          <span
            className="material-symbols-outlined text-3xl text-on-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            school
          </span>
        </div>
        <div>
          <h1 className="font-headline text-headline-md text-on-surface leading-tight">
            Campus Innovation Platform
          </h1>
          <span className="font-mono text-code-sm text-on-surface-variant uppercase tracking-widest">
            Engineering Incubator Hub · F-0 Scaffold
          </span>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-4">

        {/* ── API status card ──────────────────────────────────────────────── */}
        {isLoading && <CardSkeleton />}

        {isError && (
          <EmptyState
            icon="cloud_off"
            title="Server Unreachable"
            description="Make sure the backend is running on port 5000. Check your .env file."
            action={{ label: 'Retry', onClick: () => void refetch() }}
          />
        )}

        {data && (
          <div className="card p-6 space-y-4">
            {/* Status pill */}
            <div className="flex items-center justify-between">
              <span className="font-headline text-headline-sm text-on-surface">
                API Status
              </span>
              <span
                className={`chip text-label-sm ${
                  data.status === 'ok'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-700'
                }`}
                id="api-status-badge"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    data.status === 'ok' ? 'bg-emerald-500 animate-ping' : 'bg-red-500'
                  }`}
                />
                {data.status === 'ok' ? 'Operational' : 'Degraded'}
              </span>
            </div>

            {/* Metric rows */}
            <div className="divide-y divide-outline-variant">
              {(
                [
                  { label: 'Environment', value: data.env },
                  { label: 'Version', value: data.version },
                  {
                    label: 'Database',
                    value: data.database,
                    color:
                      data.database === 'connected'
                        ? 'text-emerald-600'
                        : 'text-amber-600',
                  },
                  { label: 'Uptime', value: `${data.uptime}s` },
                ] as Array<{ label: string; value: string; color?: string }>
              ).map(({ label, value, color = 'text-on-surface' }) => (
                <div key={label} className="flex justify-between py-2.5">
                  <span className="text-body-sm text-on-surface-variant">{label}</span>
                  <span className={`font-mono text-code-sm ${color}`}>{value}</span>
                </div>
              ))}
            </div>

            <p className="text-label-sm text-on-surface-variant text-center pt-1 font-mono">
              Awaiting F-1 · Authentication & Profiles
            </p>
          </div>
        )}

        {/* ── Progress card ────────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="font-headline text-headline-sm text-on-surface">
              Feature Progress
            </span>
            <span className="chip text-label-sm bg-primary-container text-on-primary-container">
              {doneCount} / {FEATURES.length}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 w-full rounded-full bg-surface-container-high overflow-hidden mb-4">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>

          <div className="space-y-0.5">
            {FEATURES.map(({ id, label, done }) => (
              <div
                key={id}
                id={`feature-${id.toLowerCase()}`}
                className="flex items-center gap-2.5 py-1.5 px-2 rounded-md hover:bg-surface-container transition-colors"
              >
                <span
                  className={`material-symbols-outlined text-base shrink-0 ${
                    done ? 'text-emerald-600' : 'text-outline'
                  }`}
                  style={{ fontVariationSettings: done ? "'FILL' 1" : "'FILL' 0" }}
                  aria-hidden="true"
                >
                  {done ? 'check_circle' : 'radio_button_unchecked'}
                </span>
                <span
                  className={`text-body-sm ${
                    done ? 'text-emerald-700 font-semibold' : 'text-on-surface-variant'
                  }`}
                >
                  <span className="font-mono text-code-sm mr-1.5">{id}</span>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
