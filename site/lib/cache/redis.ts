/**
 * Redis cache (second tier)
 *
 * Distributed cache using Upstash Redis.
 * Falls back gracefully if Redis is not configured.
 */

import type { CacheEntry } from "./types";

// Lazy-init Redis client
let redis: RedisClient | null = null;
let initAttempted = false;

interface RedisClient {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, opts?: { ex?: number }): Promise<string | null>;
  del(...keys: string[]): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  setnx(key: string, value: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  hincrby(key: string, field: string, increment: number): Promise<number>;
  hgetall<T extends Record<string, unknown>>(key: string): Promise<T | null>;
  dbsize(): Promise<number>;
  ping(): Promise<string>;
}

async function getRedis(): Promise<RedisClient | null> {
  if (redis) return redis;
  if (initAttempted) return null;

  initAttempted = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn("[cache:redis] Redis not configured, caching disabled");
    return null;
  }

  try {
    const { Redis } = await import("@upstash/redis");
    redis = new Redis({ url, token }) as unknown as RedisClient;
    return redis;
  } catch (err) {
    console.error("[cache:redis] Failed to initialize Redis:", err);
    return null;
  }
}

/**
 * Get entry from Redis cache
 */
export async function getFromRedis<T>(key: string): Promise<CacheEntry<T> | null> {
  const client = await getRedis();
  if (!client) return null;

  try {
    const entry = await client.get<CacheEntry<T>>(key);
    return entry;
  } catch (err) {
    console.error("[cache:redis] Get error:", err);
    return null;
  }
}

/**
 * Set entry in Redis cache
 */
export async function setInRedis<T>(
  key: string,
  entry: CacheEntry<T>,
  ttlSeconds: number
): Promise<void> {
  const client = await getRedis();
  if (!client) return;

  try {
    await client.set(key, entry, { ex: ttlSeconds });
  } catch (err) {
    console.error("[cache:redis] Set error:", err);
  }
}

/**
 * Delete entry from Redis cache
 */
export async function deleteFromRedis(key: string): Promise<boolean> {
  const client = await getRedis();
  if (!client) return false;

  try {
    const deleted = await client.del(key);
    return deleted > 0;
  } catch (err) {
    console.error("[cache:redis] Delete error:", err);
    return false;
  }
}

/**
 * Invalidate all keys matching a pattern
 *
 * WARNING: This uses KEYS which is O(N). Use sparingly in production.
 */
export async function invalidatePattern(pattern: string): Promise<number> {
  const client = await getRedis();
  if (!client) return 0;

  try {
    const keys = await client.keys(pattern);
    if (keys.length === 0) return 0;

    // Delete in batches to avoid command size limits
    const BATCH_SIZE = 100;
    let deleted = 0;

    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
      const batch = keys.slice(i, i + BATCH_SIZE);
      deleted += await client.del(...batch);
    }

    return deleted;
  } catch (err) {
    console.error("[cache:redis] Invalidate pattern error:", err);
    return 0;
  }
}

/**
 * Acquire a distributed lock for background revalidation
 */
export async function acquireLock(
  lockKey: string,
  ttlSeconds: number = 30
): Promise<boolean> {
  const client = await getRedis();
  if (!client) return true; // No Redis = no coordination needed, proceed

  try {
    const acquired = await client.setnx(lockKey, "1");
    if (acquired) {
      await client.expire(lockKey, ttlSeconds);
      return true;
    }
    return false;
  } catch (err) {
    console.error("[cache:redis] Acquire lock error:", err);
    return false;
  }
}

/**
 * Release a distributed lock
 */
export async function releaseLock(lockKey: string): Promise<void> {
  const client = await getRedis();
  if (!client) return;

  try {
    await client.del(lockKey);
  } catch (err) {
    console.error("[cache:redis] Release lock error:", err);
  }
}

/**
 * Increment a metric counter in Redis
 */
export async function incrementMetric(
  metricsKey: string,
  field: string,
  amount: number = 1
): Promise<void> {
  const client = await getRedis();
  if (!client) return;

  try {
    await client.hincrby(metricsKey, field, amount);
  } catch {
    // Silently fail metrics - non-critical
  }
}

/**
 * Get all metrics from a hash
 */
export async function getMetrics(
  metricsKey: string
): Promise<Record<string, number> | null> {
  const client = await getRedis();
  if (!client) return null;

  try {
    const data = await client.hgetall<Record<string, string>>(metricsKey);
    if (!data) return null;

    // Convert string values to numbers
    const metrics: Record<string, number> = {};
    for (const [key, value] of Object.entries(data)) {
      metrics[key] = parseInt(value, 10) || 0;
    }
    return metrics;
  } catch {
    return null;
  }
}

/**
 * Get Redis stats
 */
export async function getRedisStats(): Promise<{
  connected: boolean;
  keys: number;
}> {
  const client = await getRedis();
  if (!client) return { connected: false, keys: 0 };

  try {
    await client.ping();
    const keys = await client.dbsize();
    return { connected: true, keys };
  } catch {
    return { connected: false, keys: 0 };
  }
}

/**
 * Check if Redis is available
 */
export async function isRedisAvailable(): Promise<boolean> {
  const client = await getRedis();
  if (!client) return false;

  try {
    await client.ping();
    return true;
  } catch {
    return false;
  }
}
