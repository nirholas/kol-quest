/**
 * Cache layer for API proxy
 *
 * Multi-tier caching with:
 * - Memory (LRU) - first tier, fastest
 * - Redis (Upstash) - second tier, distributed
 * - Stale-while-revalidate - serve stale data while refreshing
 *
 * @example
 * ```typescript
 * import { cache } from "@/lib/cache";
 *
 * // Simple usage
 * const data = await cache.get<WalletData>("cache:helius:abc123", async () => {
 *   return fetchFromHelius(address);
 * }, { ttl: 60, stale: 300 });
 *
 * // With source/endpoint key generation
 * const key = cache.key("helius", "/balances", { address });
 * const balances = await cache.get(key, fetcher, cache.config("helius"));
 * ```
 */

import { generateCacheKey, parseCacheKey } from "./keys";
import { setInMemory, deleteFromMemory, clearMemoryCache, getMemoryStats } from "./memory";
import { setInRedis, deleteFromRedis, invalidatePattern, getRedisStats, isRedisAvailable } from "./redis";
import { getWithSWR, forceRefresh } from "./stale";
import { getCacheConfig, getAllSourceConfigs, DEFAULT_CACHE_OPTIONS } from "./config";
import { getCacheMetrics, getHitRate, formatMetrics } from "./metrics";
import { warmCache, getWarmEndpoints } from "./warm";
import type { CacheOptions, CacheEntry, CacheStats, CacheMetrics } from "./types";

// Re-export types
export type { CacheOptions, CacheEntry, CacheStats, CacheMetrics };

/**
 * Main cache manager
 */
class CacheManager {
  /**
   * Get data with caching
   *
   * Uses stale-while-revalidate pattern for optimal performance.
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = DEFAULT_CACHE_OPTIONS
  ): Promise<T> {
    return getWithSWR(key, fetcher, options);
  }

  /**
   * Force refresh a cache entry
   */
  async refresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = DEFAULT_CACHE_OPTIONS
  ): Promise<T> {
    return forceRefresh(key, fetcher, options);
  }

  /**
   * Set a value directly in cache (both tiers)
   */
  async set<T>(
    key: string,
    data: T,
    options: CacheOptions = DEFAULT_CACHE_OPTIONS
  ): Promise<void> {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      cachedAt: now,
      expiresAt: now + options.ttl * 1000,
      staleAt: now + (options.ttl + options.stale) * 1000,
      version: "v1",
    };

    await setInMemory(key, entry);
    await setInRedis(key, entry, options.ttl + options.stale);
  }

  /**
   * Delete a cache entry (both tiers)
   */
  async delete(key: string): Promise<void> {
    await deleteFromMemory(key);
    await deleteFromRedis(key);
  }

  /**
   * Invalidate cache entries matching a pattern
   *
   * WARNING: Pattern matching uses KEYS which is O(N). Use sparingly.
   */
  async invalidate(pattern: string): Promise<number> {
    // Clear all memory cache (can't pattern match)
    await clearMemoryCache();

    // Pattern delete from Redis
    return invalidatePattern(pattern);
  }

  /**
   * Invalidate cache entries by tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    // Tags are stored as prefixes
    const pattern = `cache:*:${tag}:*`;
    return this.invalidate(pattern);
  }

  /**
   * Invalidate all cache entries for a source
   */
  async invalidateSource(source: string): Promise<number> {
    const pattern = `cache:${source}:*`;
    return this.invalidate(pattern);
  }

  /**
   * Generate a cache key
   */
  key(
    source: string,
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>
  ): string {
    return generateCacheKey(source, endpoint, params);
  }

  /**
   * Get cache config for a source/endpoint
   */
  config(source: string, endpoint?: string): CacheOptions {
    return getCacheConfig(source, endpoint);
  }

  /**
   * Get cache statistics
   */
  async stats(): Promise<CacheStats> {
    const [memoryStats, redisStats, metrics] = await Promise.all([
      getMemoryStats(),
      getRedisStats(),
      getCacheMetrics(),
    ]);

    return {
      memory: {
        size: memoryStats.size,
        maxSize: memoryStats.maxSize,
        hitRate: getHitRate(metrics),
      },
      redis: redisStats,
      metrics,
    };
  }

  /**
   * Get formatted metrics string
   */
  async metricsString(): Promise<string> {
    const metrics = await getCacheMetrics();
    return formatMetrics(metrics);
  }

  /**
   * Warm cache with popular endpoints
   */
  async warm(): Promise<{ warmed: string[]; failed: string[] }> {
    return warmCache();
  }

  /**
   * Check if Redis is available
   */
  async isRedisAvailable(): Promise<boolean> {
    return isRedisAvailable();
  }

  /**
   * Get all source configurations
   */
  getSourceConfigs(): Record<string, CacheOptions> {
    return getAllSourceConfigs();
  }

  /**
   * Get endpoints configured for cache warming
   */
  getWarmEndpoints(): Array<{ source: string; endpoint: string }> {
    return getWarmEndpoints();
  }

  /**
   * Parse a cache key into components
   */
  parseKey(key: string): { prefix: string; source: string; hash: string } | null {
    return parseCacheKey(key);
  }
}

/** Singleton cache manager instance */
export const cache = new CacheManager();

// Default export for convenience
export default cache;

// Re-export utilities
export { generateCacheKey, getCacheConfig, getCacheMetrics };
