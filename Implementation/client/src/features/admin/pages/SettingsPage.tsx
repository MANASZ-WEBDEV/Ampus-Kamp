import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings, useUpdateSettings } from '../hooks/useAdmin';
import type { SettingsDto } from '../types';

// ── Number field ──────────────────────────────────────────────────────────────

function NumberField({
  label,
  description,
  value,
  min,
  max,
  onChange,
}: {
  label:       string;
  description: string;
  value:       number;
  min:         number;
  max:         number;
  onChange:    (v: number) => void;
}) {
  return (
    <div className="bg-surface-container rounded-2xl p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-on-surface text-sm">{label}</p>
          <p className="text-xs text-on-surface-variant mt-0.5">{description}</p>
        </div>
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-20 px-2 py-1.5 rounded-xl bg-surface text-on-surface text-sm text-right
                     outline-none focus:ring-2 focus:ring-primary border border-outline-variant"
        />
      </div>
    </div>
  );
}

// ── SettingsPage ──────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const navigate = useNavigate();
  const { data: settings, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();

  const [local, setLocal] = useState<Partial<SettingsDto>>({});
  const [saved, setSaved] = useState(false);

  // Merge server settings with local (uncommitted) changes
  const merged: SettingsDto | undefined = settings
    ? { ...settings, ...local }
    : undefined;

  function update<K extends keyof SettingsDto>(key: K, value: SettingsDto[K]) {
    setLocal((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function updateTierPoints(tier: keyof SettingsDto['tierPoints'], value: number) {
    setLocal((prev) => ({
      ...prev,
      tierPoints: {
        ...(merged?.tierPoints ?? { pass: 1, elite: 2, elite_silver: 3, elite_gold: 4 }),
        ...prev.tierPoints,
        [tier]: value,
      },
    }));
    setSaved(false);
  }

  async function handleSave() {
    if (Object.keys(local).length === 0) return;
    await updateMutation.mutateAsync(local);
    setLocal({});
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const isDirty  = Object.keys(local).length > 0;
  const isBusy   = updateMutation.isPending;

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Header */}
      <div className="bg-surface-container-high px-4 pt-14 pb-4 sticky top-0 z-10
                      flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin')}
            className="material-symbols-rounded text-on-surface-variant">arrow_back</button>
          <h1 className="text-xl font-bold text-on-surface">Platform Settings</h1>
        </div>
        {isDirty && (
          <span className="text-xs text-warning font-medium">Unsaved changes</span>
        )}
      </div>

      {isLoading || !merged ? (
        <div className="px-4 py-4 flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-surface-container animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="px-4 py-4 flex flex-col gap-4">

          {/* ── Upload limits ──────────────────────────────────────────────── */}
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide px-1 mt-2">
            Upload & Rate Limits
          </p>
          <NumberField
            label="Uploads per 24h"
            description="Max credential uploads per student per day"
            value={merged.uploadsPer24h} min={1} max={50}
            onChange={(v) => update('uploadsPer24h', v)}
          />
          <NumberField
            label="Pending cap"
            description="Max unverified credentials a student can have at once"
            value={merged.pendingCap} min={1} max={100}
            onChange={(v) => update('pendingCap', v)}
          />
          <NumberField
            label="Links per day"
            description="Max team link requests a student can send per day"
            value={merged.linksPerDay} min={1} max={50}
            onChange={(v) => update('linksPerDay', v)}
          />
          <NumberField
            label="Link expiry (days)"
            description="How many days before a pending link auto-expires"
            value={merged.linkExpiryDays} min={1} max={90}
            onChange={(v) => update('linkExpiryDays', v)}
          />
          <NumberField
            label="Decline cooldown (days)"
            description="How long before a declined student can send another link to same person"
            value={merged.declineCooldownDays} min={0} max={365}
            onChange={(v) => update('declineCooldownDays', v)}
          />
          <NumberField
            label="Extractions per day"
            description="Max AI paste-to-post extractions per faculty member per day"
            value={merged.extractionsPerDay} min={1} max={200}
            onChange={(v) => update('extractionsPerDay', v)}
          />

          {/* ── Spot check ─────────────────────────────────────────────────── */}
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide px-1 mt-2">
            Verification
          </p>
          <NumberField
            label="Spot-check %"
            description="% of verified credentials randomly selected for monthly spot-check"
            value={merged.spotCheckPercent} min={1} max={100}
            onChange={(v) => update('spotCheckPercent', v)}
          />

          {/* ── Ranking metric ─────────────────────────────────────────────── */}
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide px-1 mt-2">
            Analytics
          </p>
          <div className="bg-surface-container rounded-2xl p-4">
            <p className="font-medium text-on-surface text-sm mb-3">Default ranking metric</p>
            <div className="flex flex-col gap-2">
              {(
                [
                  { value: 'participation_rate', label: 'Participation Rate', desc: '% of students with at least 1 verified credential' },
                  { value: 'per_hundred',        label: 'Per 100 Students',   desc: 'Total verified credentials per 100 students' },
                  { value: 'weighted_points',    label: 'Weighted Points',    desc: 'Tier-weighted sum of points per 100 students' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => update('rankingMetric', opt.value)}
                  className={`text-left px-3 py-2.5 rounded-xl border transition-colors
                    ${merged.rankingMetric === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-outline-variant text-on-surface'
                    }`}
                >
                  <p className="font-medium text-sm">{opt.label}</p>
                  <p className="text-xs opacity-70 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* ── Tier points ────────────────────────────────────────────────── */}
          <div className="bg-surface-container rounded-2xl p-4">
            <p className="font-medium text-on-surface text-sm mb-3">Tier point values</p>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { tier: 'pass',         label: 'Pass' },
                  { tier: 'elite',        label: 'Elite' },
                  { tier: 'elite_silver', label: 'Elite Silver' },
                  { tier: 'elite_gold',   label: 'Elite Gold' },
                ] as const
              ).map(({ tier, label }) => (
                <div key={tier} className="flex flex-col gap-1">
                  <label className="text-xs text-on-surface-variant">{label}</label>
                  <input
                    type="number"
                    min={0}
                    value={merged.tierPoints[tier]}
                    onChange={(e) => updateTierPoints(tier, Number(e.target.value))}
                    className="px-2 py-1.5 rounded-xl bg-surface text-on-surface text-sm text-center
                               outline-none focus:ring-2 focus:ring-primary border border-outline-variant"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-3 bg-surface border-t border-outline-variant">
        <button
          onClick={() => void handleSave()}
          disabled={!isDirty || isBusy}
          className="w-full py-3 rounded-2xl bg-primary text-on-primary font-semibold
                     disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
        >
          {isBusy ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-on-primary/30 border-t-on-primary animate-spin" />
              Saving…
            </>
          ) : saved ? (
            <>
              <span className="material-symbols-rounded text-lg">check_circle</span>
              Saved
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </div>
  );
}
