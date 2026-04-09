// Cache configuration constants and helpers.
// The proxy handler uses an in-memory cache Map directly for simplicity,
// but these configs are exported so individual routes can reference them.

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  stale?: number; // Serve stale for X seconds while revalidating
  tags?: string[]; // For cache invalidation
}

export const CACHE_CONFIGS = {
  realtime: { ttl: 15, stale: 60 },
  frequent: { ttl: 60, stale: 300 },
  standard: { ttl: 300, stale: 3600 },
  static: { ttl: 86400, stale: 604800 },
} satisfies Record<string, CacheConfig>;
