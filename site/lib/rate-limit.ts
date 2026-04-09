type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

// Periodically clean up expired entries to prevent memory leaks.
// NOTE: This rate limiter is in-memory and per-instance. On serverless
// platforms (e.g. Vercel), each cold start gets a fresh Map, so limits
// are best-effort, not strict. For strict enforcement, swap to a
// Redis-backed implementation (e.g. Upstash @upstash/ratelimit).
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  cleanup();
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { success: true, remaining: limit - 1, reset: Math.ceil((now + windowMs) / 1000) };
  }

  if (bucket.count >= limit) {
    return { success: false, remaining: 0, reset: Math.ceil(bucket.resetAt / 1000) };
  }

  bucket.count += 1;
  return { success: true, remaining: limit - bucket.count, reset: Math.ceil(bucket.resetAt / 1000) };
}
