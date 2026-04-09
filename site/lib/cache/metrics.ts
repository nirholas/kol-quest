/**
 * Cache metrics tracking
 *
 * Tracks cache performance for monitoring and optimization.
 */

import { getMetrics, incrementMetric } from "./redis";
import type { CacheMetrics } from "./types";

// In-memory metrics for when Redis isn't available
const localMetrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  staleHits: 0,
  errors: 0,
  avgLatency: 0,
  totalRequests: 0,
};

// Rolling latency measurements
const latencyWindow: number[] = [];
const MAX_LATENCY_SAMPLES = 100;

/**
 * Get the metrics key for today (rotates daily)
 */
function getMetricsKey(): string {
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return `cache:metrics:${date}`;
}

/**
 * Record a cache hit
 */
export async function recordHit(latencyMs: number): Promise<void> {
  localMetrics.hits++;
  localMetrics.totalRequests++;
  recordLatency(latencyMs);

  await incrementMetric(getMetricsKey(), "hits");
  await incrementMetric(getMetricsKey(), "totalRequests");
}

/**
 * Record a cache miss
 */
export async function recordMiss(latencyMs: number): Promise<void> {
  localMetrics.misses++;
  localMetrics.totalRequests++;
  recordLatency(latencyMs);

  await incrementMetric(getMetricsKey(), "misses");
  await incrementMetric(getMetricsKey(), "totalRequests");
}

/**
 * Record a stale cache hit (served stale while revalidating)
 */
export async function recordStaleHit(latencyMs: number): Promise<void> {
  localMetrics.staleHits++;
  localMetrics.totalRequests++;
  recordLatency(latencyMs);

  await incrementMetric(getMetricsKey(), "staleHits");
  await incrementMetric(getMetricsKey(), "totalRequests");
}

/**
 * Record a cache error
 */
export async function recordError(): Promise<void> {
  localMetrics.errors++;
  await incrementMetric(getMetricsKey(), "errors");
}

/**
 * Record latency sample
 */
function recordLatency(ms: number): void {
  latencyWindow.push(ms);
  if (latencyWindow.length > MAX_LATENCY_SAMPLES) {
    latencyWindow.shift();
  }
  localMetrics.avgLatency =
    latencyWindow.reduce((a, b) => a + b, 0) / latencyWindow.length;
}

/**
 * Get current metrics (local + Redis)
 */
export async function getCacheMetrics(): Promise<CacheMetrics> {
  const redisMetrics = await getMetrics(getMetricsKey());

  if (redisMetrics) {
    return {
      hits: redisMetrics.hits || 0,
      misses: redisMetrics.misses || 0,
      staleHits: redisMetrics.staleHits || 0,
      errors: redisMetrics.errors || 0,
      totalRequests: redisMetrics.totalRequests || 0,
      avgLatency: localMetrics.avgLatency, // Local only, not stored in Redis
    };
  }

  return { ...localMetrics };
}

/**
 * Get hit rate percentage
 */
export function getHitRate(metrics: CacheMetrics): number {
  if (metrics.totalRequests === 0) return 0;
  return ((metrics.hits + metrics.staleHits) / metrics.totalRequests) * 100;
}

/**
 * Get stale rate percentage
 */
export function getStaleRate(metrics: CacheMetrics): number {
  if (metrics.totalRequests === 0) return 0;
  return (metrics.staleHits / metrics.totalRequests) * 100;
}

/**
 * Get miss rate percentage
 */
export function getMissRate(metrics: CacheMetrics): number {
  if (metrics.totalRequests === 0) return 0;
  return (metrics.misses / metrics.totalRequests) * 100;
}

/**
 * Get error rate percentage
 */
export function getErrorRate(metrics: CacheMetrics): number {
  if (metrics.totalRequests === 0) return 0;
  return (metrics.errors / metrics.totalRequests) * 100;
}

/**
 * Format metrics for display
 */
export function formatMetrics(metrics: CacheMetrics): string {
  const hitRate = getHitRate(metrics).toFixed(1);
  const staleRate = getStaleRate(metrics).toFixed(1);
  const avgLatency = metrics.avgLatency.toFixed(0);

  return `Hit: ${hitRate}% | Stale: ${staleRate}% | Avg: ${avgLatency}ms | Total: ${metrics.totalRequests}`;
}
