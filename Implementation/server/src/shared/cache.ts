import NodeCache from 'node-cache';

// ── Singleton cache ────────────────────────────────────────────────────────────
// stdTTL: 300s (5 min) — matches the analytics cache window.
// useClones: false      — skip deep-clone overhead; callers must not mutate values.

const cache = new NodeCache({ stdTTL: 300, useClones: false });

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * getCache — retrieve a cached value.
 * Returns undefined on miss (never throws).
 */
export function getCache<T>(key: string): T | undefined {
  return cache.get<T>(key);
}

/**
 * setCache — store a value with an optional TTL override.
 * @param ttlSeconds  0 = use stdTTL; > 0 = override for this key.
 */
export function setCache<T>(key: string, value: T, ttlSeconds = 0): void {
  cache.set(key, value, ttlSeconds);
}

/**
 * invalidateCache — delete a single key.
 * No-op if key does not exist.
 */
export function invalidateCache(key: string): void {
  cache.del(key);
}

/**
 * invalidateCachePrefix — delete all keys whose name starts with `prefix`.
 * Used to wipe an entire feature's cache namespace without enumerating every key.
 *
 * @example
 *   invalidateCachePrefix('analytics:')
 *   // deletes analytics:ranking:2026, analytics:summary:2026, etc.
 */
export function invalidateCachePrefix(prefix: string): void {
  const keys = cache.keys().filter(k => k.startsWith(prefix));
  if (keys.length > 0) cache.del(keys);
}
