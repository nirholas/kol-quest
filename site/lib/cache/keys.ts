/**
 * Cache key generation utilities
 *
 * Generates deterministic, short cache keys using hashing.
 */

import { createHash } from "crypto";

/**
 * Generate a cache key from source, endpoint, and params.
 *
 * Keys are deterministic: same inputs always produce the same key.
 */
export function generateCacheKey(
  source: string,
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  // Normalize and sort params for consistency
  const normalizedParams = normalizeParams(params);

  const raw = `${source}:${endpoint}:${normalizedParams}`;
  const hash = createHash("md5").update(raw).digest("hex").slice(0, 12);

  return `cache:${source}:${hash}`;
}

/**
 * Generate a tag-based key for cache invalidation
 */
export function generateTagKey(tag: string): string {
  return `cache:tag:${tag}`;
}

/**
 * Generate a lock key for background revalidation
 */
export function generateLockKey(cacheKey: string): string {
  return `lock:${cacheKey}`;
}

/**
 * Normalize params to a deterministic string
 */
function normalizeParams(
  params?: Record<string, string | number | boolean | undefined>
): string {
  if (!params) return "";

  return Object.keys(params)
    .filter((k) => params[k] !== undefined)
    .sort()
    .map((k) => `${k}=${String(params[k])}`)
    .join("&");
}

/**
 * Parse a cache key back into components (for debugging)
 */
export function parseCacheKey(key: string): {
  prefix: string;
  source: string;
  hash: string;
} | null {
  const match = key.match(/^cache:([^:]+):([a-f0-9]+)$/);
  if (!match) return null;
  return { prefix: "cache", source: match[1], hash: match[2] };
}
