/**
 * In-memory LRU cache (first tier)
 *
 * Fast local cache with size-based eviction.
 * Falls back gracefully if lru-cache is not available.
 */

import type { CacheEntry } from "./types";

// Config from environment or defaults
const MAX_ENTRIES = 1000;
const MAX_SIZE_BYTES = parseInt(process.env.CACHE_MAX_MEMORY_MB || "50", 10) * 1_000_000;
const DEFAULT_TTL_MS = 60_000; // 1 minute

// Lazy-init the LRU cache
let cache: LRUCacheInstance | null = null;
let initAttempted = false;

interface LRUCacheInstance {
  get<T>(key: string): CacheEntry<T> | undefined;
  set<T>(key: string, value: CacheEntry<T>): void;
  delete(key: string): boolean;
  clear(): void;
  size: number;
}

async function getCache(): Promise<LRUCacheInstance | null> {
  if (cache) return cache;
  if (initAttempted) return null;

  initAttempted = true;

  try {
    const { LRUCache } = await import("lru-cache");

    cache = new LRUCache<string, CacheEntry<unknown>>({
      max: MAX_ENTRIES,
      maxSize: MAX_SIZE_BYTES,
      sizeCalculation: (value) => {
        try {
          return JSON.stringify(value).length;
        } catch {
          return 1000; // fallback estimate
        }
      },
      ttl: DEFAULT_TTL_MS,
    }) as LRUCacheInstance;

    return cache;
  } catch {
    console.warn("[cache:memory] lru-cache not available, using fallback");
    return null;
  }
}

// Simple Map fallback when lru-cache unavailable
const fallbackCache = new Map<string, { entry: CacheEntry<unknown>; expiresAt: number }>();
const FALLBACK_CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanupFallback() {
  const now = Date.now();
  if (now - lastCleanup < FALLBACK_CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, value] of fallbackCache) {
    if (now > value.expiresAt) fallbackCache.delete(key);
  }

  // Enforce max entries
  if (fallbackCache.size > MAX_ENTRIES) {
    const entries = Array.from(fallbackCache.entries());
    entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    const toRemove = entries.slice(0, fallbackCache.size - MAX_ENTRIES);
    for (const [key] of toRemove) {
      fallbackCache.delete(key);
    }
  }
}

/**
 * Get entry from memory cache
 */
export async function getFromMemory<T>(key: string): Promise<CacheEntry<T> | null> {
  const lru = await getCache();

  if (lru) {
    const entry = lru.get<T>(key);
    return entry ?? null;
  }

  // Fallback
  cleanupFallback();
  const item = fallbackCache.get(key);
  if (!item) return null;

  const now = Date.now();
  if (now > item.expiresAt) {
    fallbackCache.delete(key);
    return null;
  }

  return item.entry as CacheEntry<T>;
}

/**
 * Set entry in memory cache
 */
export async function setInMemory<T>(
  key: string,
  entry: CacheEntry<T>,
  ttlMs?: number
): Promise<void> {
  const lru = await getCache();

  if (lru) {
    lru.set(key, entry);
    return;
  }

  // Fallback
  const expiresAt = entry.expiresAt || Date.now() + (ttlMs ?? DEFAULT_TTL_MS);
  fallbackCache.set(key, { entry: entry as CacheEntry<unknown>, expiresAt });
}

/**
 * Delete entry from memory cache
 */
export async function deleteFromMemory(key: string): Promise<boolean> {
  const lru = await getCache();

  if (lru) {
    return lru.delete(key);
  }

  return fallbackCache.delete(key);
}

/**
 * Clear all entries from memory cache
 */
export async function clearMemoryCache(): Promise<void> {
  const lru = await getCache();

  if (lru) {
    lru.clear();
    return;
  }

  fallbackCache.clear();
}

/**
 * Get memory cache stats
 */
export async function getMemoryStats(): Promise<{
  size: number;
  maxSize: number;
  usingFallback: boolean;
}> {
  const lru = await getCache();

  if (lru) {
    return {
      size: lru.size,
      maxSize: MAX_ENTRIES,
      usingFallback: false,
    };
  }

  return {
    size: fallbackCache.size,
    maxSize: MAX_ENTRIES,
    usingFallback: true,
  };
}
