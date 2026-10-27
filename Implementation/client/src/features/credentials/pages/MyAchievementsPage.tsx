import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyCredentials } from '../hooks/useCredentials';
import { CredentialCard }   from '../components/CredentialCard';
import type { Credential }  from '../types';

const TABS = [
  { key: 'all',      label: 'All' },
  { key: 'verified', label: 'Verified' },
  { key: 'pending',  label: 'Pending' },
  { key: 'rejected', label: 'Rejected' },
] as const;

type TabKey = typeof TABS[number]['key'];

/**
 * MyAchievementsPage  /badges
 * Student's credential + badge collection.
 */
export default function MyAchievementsPage() {
  const navigate = useNavigate();
  const { data: credentials = [], isLoading, error, refetch } = useMyCredentials();

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [editTarget, setEditTarget] = useState<Credential | null>(null);

  const filtered = activeTab === 'all'
    ? credentials
    : credentials.filter(c => c.verification.status === activeTab);

  const counts = {
    verified: credentials.filter(c => c.verification.status === 'verified').length,
    pending:  credentials.filter(c => c.verification.status === 'pending').length,
    rejected: credentials.filter(c => c.verification.status === 'rejected').length,
  };

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* ── Hero header ── */}
      <div className="bg-gradient-to-br from-primary/90 to-primary-container/80 px-5 pt-14 pb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-headline-md text-2xl font-bold text-on-primary leading-tight">
              My Achievements
            </h1>
            <p className="text-on-primary/80 text-sm mt-1">
              {credentials.length} credential{credentials.length !== 1 ? 's' : ''} uploaded
            </p>
          </div>
          <span
            className="material-symbols-outlined text-[44px] text-on-primary/30"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            military_tech
          </span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {([
            { label: 'Verified',  value: counts.verified,  color: 'text-on-primary' },
            { label: 'Pending',   value: counts.pending,   color: 'text-on-primary/80' },
            { label: 'Rejected',  value: counts.rejected,  color: 'text-on-primary/60' },
          ]).map(stat => (
            <div key={stat.label}
                 className="bg-on-primary/10 rounded-xl px-3 py-2.5 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-on-primary/70 text-[10px] font-medium uppercase tracking-wide">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur-xl border-b border-outline-variant/20">
        <div className="flex px-4 gap-1 overflow-x-auto scrollbar-hide">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap
                border-b-2 transition-all
                ${activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
            >
              {tab.label}
              {tab.key !== 'all' && counts[tab.key as keyof typeof counts] > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold
                  ${activeTab === tab.key ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                  {counts[tab.key as keyof typeof counts]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {/* Loading */}
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
              <p className="font-semibold">Failed to load credentials</p>
              <button onClick={() => refetch()} className="mt-1 underline text-xs">Retry</button>
            </div>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="w-20 h-20 rounded-full bg-primary/8 flex items-center justify-center">
              <span className="material-symbols-outlined text-[44px] text-primary/40"
                    style={{ fontVariationSettings: "'FILL' 1" }}>
                military_tech
              </span>
            </div>
            <div>
              <p className="font-semibold text-on-surface">
                {activeTab === 'all' ? 'No achievements yet' : `No ${activeTab} credentials`}
              </p>
              <p className="text-sm text-on-surface-variant mt-1">
                {activeTab === 'all'
                  ? 'Upload your first certificate to get started!'
                  : `You don't have any ${activeTab} credentials.`}
              </p>
            </div>
            {activeTab === 'all' && (
              <button
                onClick={() => navigate('/achievements/add')}
                className="px-6 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold
                           hover:bg-primary/90 active:scale-[0.99] transition-all"
              >
                Upload Certificate
              </button>
            )}
          </div>
        )}

        {/* List */}
        {!isLoading && !error && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map(cred => (
              <CredentialCard
                key={cred._id}
                credential={cred}
                onEdit={setEditTarget}
                onResubmit={() => navigate('/achievements/add', { state: { resubmit: cred } })}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB: Add credential */}
      <button
        id="fab-add-achievement"
        onClick={() => navigate('/achievements/add')}
        className="fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-primary text-on-primary
                   shadow-[0_8px_20px_rgba(17,94,89,0.35)] flex items-center justify-center
                   hover:scale-105 active:scale-95 transition-all"
        aria-label="Add certificate"
      >
        <span className="material-symbols-outlined text-[26px]">add</span>
      </button>

      {/* Edit modal placeholder — uses the same form but pre-filled */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="fixed inset-0 bg-scrim/30 backdrop-blur-sm" onClick={() => setEditTarget(null)} />
          <div className="relative z-10 w-full bg-surface rounded-t-3xl p-6"
               style={{ animation: 'slideUpFade 200ms ease-out' }}>
            <h3 className="font-semibold text-on-surface mb-3">Edit pending credential</h3>
            <p className="text-sm text-on-surface-variant">
              Editing a verified credential will reset it back to <em>pending</em> review.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setEditTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant/40 text-sm text-on-surface-variant"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  navigate('/achievements/add', { state: { edit: editTarget } });
                  setEditTarget(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
