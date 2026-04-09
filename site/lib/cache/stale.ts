/**
 * Stale-while-revalidate pattern
 *
 * Returns cached data immediately and refreshes in background when stale.
 * Prevents thundering herd with distributed locks.
 */

import { generateLockKey } from "./keys";
import { getFromMemory, setInMemory } from "./memory";
import {
  getFromRedis,
  setInRedis,
  acquireLock,
  releaseLock,
} from "./redis";
import { recordHit, recordMiss, recordStaleHit, recordError } from "./metrics";
import type { CacheEntry, CacheOptions, CacheResult } from "./types";

/** Version string for cache entries (for invalidation) */
const CACHE_VERSION = "v1";

/**
 * Get data with stale-while-revalidate pattern
 *
 * Flow:
 * 1. Check memory cache → return if fresh
 * 2. Check Redis cache → return if fresh, populate memory
 * 3. If stale in either tier → return stale, trigger background revalidation
 * 4. If miss → fetch fresh data
 */
export async function getWithSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions
): Promise<T> {
  const startTime = Date.now();

  try {
    // Check memory cache first (fastest)
    const memoryEntry = await getFromMemory<T>(key);
    if (memoryEntry) {
      const result = evaluateEntry(memoryEntry);

      if (result.status === "hit") {
        await recordHit(Date.now() - startTime);
        return result.data;
      }

      if (result.status === "stale") {
        // Return stale immediately, revalidate in background
        revalidateInBackground(key, fetcher, options).catch(console.error);
        await recordStaleHit(Date.now() - startTime);
        return result.data;
      }
    }

    // Check Redis cache
    const redisEntry = await getFromRedis<T>(key);
    if (redisEntry) {
      // Populate memory cache for future requests
      await setInMemory(key, redisEntry);

      const result = evaluateEntry(redisEntry);

      if (result.status === "hit") {
        await recordHit(Date.now() - startTime);
        return result.data;
      }

      if (result.status === "stale") {
        // Return stale immediately, revalidate in background
        revalidateInBackground(key, fetcher, options).catch(console.error);
        await recordStaleHit(Date.now() - startTime);
        return result.data;
      }
    }

    // Cache miss - fetch fresh data
    const fresh = await fetchAndCache(key, fetcher, options);
    await recordMiss(Date.now() - startTime);
    return fresh;
  } catch (err) {
    await recordError();
    throw err;
  }
}

/**
 * Evaluate if a cache entry is fresh, stale, or expired
 */
function evaluateEntry<T>(entry: CacheEntry<T>): CacheResult<T> {
  const now = Date.now();

  // Check version (force refresh on version mismatch)
  if (entry.version !== CACHE_VERSION) {
    return { status: "miss", data: null, stale: false };
  }

  // Fresh: within TTL
  if (now < entry.expiresAt) {
    return { status: "hit", data: entry.data, stale: false };
  }

  // Stale: past TTL but within stale grace period
  if (now < entry.staleAt) {
    return { status: "stale", data: entry.data, stale: true };
  }

  // Expired: past stale grace period
  return { status: "miss", data: null, stale: false };
}

/**
 * Fetch data and cache it
 */
async function fetchAndCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions
): Promise<T> {
  const data = await fetcher();
  const entry = createEntry(data, options);

  // Write to both caches
  await setInMemory(key, entry);
  await setInRedis(key, entry, options.ttl + options.stale);

  return data;
}

/**
 * Revalidate cache in background with distributed locking
 *
 * Prevents thundering herd: only one instance revalidates at a time.
 */
async function revalidateInBackground<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions
): Promise<void> {
  const lockKey = generateLockKey(key);

  // Try to acquire lock
  const locked = await acquireLock(lockKey, 30);
  if (!locked) {
    // Another instance is already revalidating
    return;
  }

  try {
    const data = await fetcher();
    const entry = createEntry(data, options);

    // Write to both caches
    await setInMemory(key, entry);
    await setInRedis(key, entry, options.ttl + options.stale);
  } finally {
    await releaseLock(lockKey);
  }
}

/**
 * Create a cache entry with timestamps
 */
function createEntry<T>(data: T, options: CacheOptions): CacheEntry<T> {
  const now = Date.now();
  return {
    data,
    cachedAt: now,
    expiresAt: now + options.ttl * 1000,
    staleAt: now + (options.ttl + options.stale) * 1000,
    version: CACHE_VERSION,
  };
}

/**
 * Force refresh a cache entry (bypass stale-while-revalidate)
 */
export async function forceRefresh<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions
): Promise<T> {
  return fetchAndCache(key, fetcher, options);
}
