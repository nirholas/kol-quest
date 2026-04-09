/**
 * Cache layer types
 */

export interface CacheOptions {
  /** Time to live in seconds */
  ttl: number;
  /** Serve stale while revalidating (seconds after ttl) */
  stale: number;
  /** Tags for selective invalidation */
  tags?: string[];
}

export interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
  staleAt: number;
  version: string;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  staleHits: number;
  errors: number;
  avgLatency: number;
  totalRequests: number;
}

export interface CacheStats {
  memory: {
    size: number;
    maxSize: number;
    hitRate: number;
  };
  redis: {
    connected: boolean;
    keys: number;
  };
  metrics: CacheMetrics;
}

/** Result from a cache get operation */
export type CacheResult<T> =
  | { status: "hit"; data: T; stale: false }
  | { status: "stale"; data: T; stale: true }
  | { status: "miss"; data: null; stale: false };
