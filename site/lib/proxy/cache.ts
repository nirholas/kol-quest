
import { kv } from "@vercel/kv";

interface CacheConfig {
  ttl: number; // Time to live in seconds
  stale?: number; // Serve stale for X seconds while revalidating
  tags?: string[]; // For cache invalidation
}

export const CACHE_CONFIGS = {
  realtime: { ttl: 15, stale: 60 },
  frequent: { ttl: 60, stale: 300 },
  standard: { ttl: 300, stale: 3600 },
  static: { ttl: 86400, stale: 604800 },
};

export async function getFromCache<T>(key: string): Promise<T | null> {
  return kv.get(key);
}

export async function setToCache<T>(key: string, value: T, config: CacheConfig) {
  return kv.set(key, value, { ex: config.ttl });
}
