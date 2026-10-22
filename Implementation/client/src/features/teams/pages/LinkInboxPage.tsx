import { useState } from 'react';
import { AppBar }     from '@/components/layout/AppBar';
import { useLinks }   from '../hooks/useTeams';
import { LinkCard }   from '../components/LinkCard';

type Tab = 'in' | 'out';

/**
 * LinkInboxPage — /teams/inbox
 *
 * Two tabs: Incoming (requests I received) and Sent (requests I sent).
 */
export default function LinkInboxPage() {
  const [activeTab, setActiveTab] = useState<Tab>('in');

  const { data: inData,  isLoading: inLoading,  isError: inError  } = useLinks('in');
  const { data: outData, isLoading: outLoading, isError: outError } = useLinks('out');

  const isLoading = activeTab === 'in' ? inLoading  : outLoading;
  const isError   = activeTab === 'in' ? inError    : outError;
  const items     = activeTab === 'in' ? (inData?.items  ?? []) : (outData?.items  ?? []);

  return (
    <div className="min-h-screen bg-background pb-24 pt-14">
      <AppBar title="Requests" subtitle="Team Finder" />

      <div className="max-w-2xl mx-auto px-4">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="pt-5 pb-4">
          <h1 className="font-headline-lg text-xl text-on-surface font-bold">My Requests</h1>
          <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
            Manage join requests you've received and sent
          </p>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <div className="flex gap-1 p-1 bg-surface-container rounded-2xl mb-5">
          {([
            { id: 'in'  as Tab, label: 'Incoming', icon: 'move_to_inbox', count: inData?.items.filter(l => l.status === 'pending').length },
            { id: 'out' as Tab, label: 'Sent',     icon: 'send',          count: outData?.items.filter(l => l.status === 'pending').length },
          ] as const).map(tab => (
            <button
              key={tab.id}
              id={`inbox-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl
                          font-label-lg text-sm font-medium transition-all
                          ${activeTab === tab.id
                            ? 'bg-surface text-on-surface shadow-sm'
                            : 'text-on-surface-variant hover:text-on-surface'
                          }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              {tab.label}
              {(tab.count ?? 0) > 0 && (
                <span className="w-4 h-4 rounded-full bg-primary text-on-primary
                                 font-label-sm text-[10px] flex items-center justify-center">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Loading ─────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-surface-container animate-pulse" />
            ))}
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────────── */}
        {isError && (
          <div className="p-5 rounded-2xl bg-error-container text-on-error-container
                          flex flex-col items-center gap-2 text-center">
            <span className="material-symbols-outlined text-[28px]">error_outline</span>
            <p className="font-body-sm text-xs">Failed to load requests</p>
          </div>
        )}

        {/* ── Empty ───────────────────────────────────────────────────── */}
        {!isLoading && !isError && items.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px] text-on-surface-variant">
                {activeTab === 'in' ? 'move_to_inbox' : 'send'}
              </span>
            </div>
            <div>
              <p className="font-title-sm text-sm font-semibold text-on-surface">
                {activeTab === 'in' ? 'No incoming requests' : 'No sent requests'}
              </p>
              <p className="font-body-sm text-xs text-on-surface-variant mt-1">
                {activeTab === 'in'
                  ? 'Post a team and requests will appear here'
                  : 'Find an open team post and send a request'}
              </p>
            </div>
          </div>
        )}

        {/* ── Links list ──────────────────────────────────────────────── */}
        {!isLoading && items.length > 0 && (
          <div className="flex flex-col gap-3">
            {items.map(link => (
              <LinkCard key={link.id} link={link} box={activeTab} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
