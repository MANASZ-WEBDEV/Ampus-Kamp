import { Setting, getSetting } from '@/models/setting.model';
import { invalidateCachePrefix } from '@/shared/cache';
import type { SettingsDto } from './setting.schema';

// ── KEY_MAP ───────────────────────────────────────────────────────────────────
//
// Maps each SettingsDto field to its Setting document key and default value.
// Defaults must mirror what all feature services assume when the key is absent.
// Single source of truth — if a default changes here, it changes everywhere.

const KEY_MAP: Record<
  keyof SettingsDto,
  { key: string; default: unknown }
> = {
  uploadsPer24h:       { key: 'credentialUploadPerDay',  default: 5 },
  pendingCap:          { key: 'credentialMaxPending',     default: 15 },
  linksPerDay:         { key: 'linksPerDay',              default: 10 },
  linkExpiryDays:      { key: 'linkExpiryDays',           default: 7 },
  declineCooldownDays: { key: 'declineCooldownDays',      default: 30 },
  spotCheckPercent:    { key: 'spotCheckPercent',         default: 10 },
  extractionsPerDay:   { key: 'extractionsPerDay',        default: 20 },
  rankingMetric:       { key: 'rankingMetric',            default: 'participation_rate' },
  tierPoints: {
    key:     'tierPoints',
    default: { pass: 1, elite: 2, elite_silver: 3, elite_gold: 4 },
  },
};

// ── getAllSettings ─────────────────────────────────────────────────────────────

/**
 * Reads all 9 Setting keys in parallel and assembles the SettingsDto.
 * Missing keys fall back to the KEY_MAP defaults — safe in any environment.
 */
export async function getAllSettings(): Promise<SettingsDto> {
  const entries = Object.entries(KEY_MAP) as [
    keyof SettingsDto,
    { key: string; default: unknown },
  ][];

  const values = await Promise.all(
    entries.map(([, { key, default: def }]) => getSetting(key, def)),
  );

  const dto = {} as SettingsDto;
  entries.forEach(([field], i) => {
    // biome-ignore lint/suspicious/noExplicitAny: heterogeneous values assembled dynamically
    (dto as any)[field] = values[i];
  });

  return dto;
}

// ── updateSettings ─────────────────────────────────────────────────────────────

/**
 * Upserts only the fields present in `body`.
 * After writing, invalidates the analytics cache prefix — tierPoints and
 * rankingMetric changes directly affect ranking output.
 * Returns the full fresh SettingsDto after the write.
 */
export async function updateSettings(
  body: Partial<SettingsDto>,
): Promise<SettingsDto> {
  const writes = (Object.entries(body) as [keyof SettingsDto, unknown][])
    .map(([field, value]) => {
      const { key } = KEY_MAP[field];
      return Setting.findOneAndUpdate(
        { key },
        { $set: { value } },
        { upsert: true, new: true },
      ).lean();
    });

  // Run all upserts in parallel
  await Promise.all(writes);

  // Any settings change may affect analytics output (tierPoints, rankingMetric)
  invalidateCachePrefix('analytics:');

  return getAllSettings();
}
