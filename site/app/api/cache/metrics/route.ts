/**
 * Cache metrics API
 *
 * GET /api/cache/metrics
 *
 * Admin-only endpoint to view cache performance metrics.
 */

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { cache } from "@/lib/cache";
import { getCacheMetrics, getHitRate, getMissRate, getStaleRate, getErrorRate } from "@/lib/cache/metrics";

export async function GET(request: Request) {
  // Require admin
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = (session.user as Record<string, unknown>).role;
  if (userRole !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [stats, metrics, redisAvailable] = await Promise.all([
      cache.stats(),
      getCacheMetrics(),
      cache.isRedisAvailable(),
    ]);

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      
      // Summary
      summary: {
        hitRate: `${getHitRate(metrics).toFixed(1)}%`,
        missRate: `${getMissRate(metrics).toFixed(1)}%`,
        staleRate: `${getStaleRate(metrics).toFixed(1)}%`,
        errorRate: `${getErrorRate(metrics).toFixed(1)}%`,
        avgLatency: `${metrics.avgLatency.toFixed(0)}ms`,
      },

      // Detailed metrics
      metrics: {
        hits: metrics.hits,
        misses: metrics.misses,
        staleHits: metrics.staleHits,
        errors: metrics.errors,
        totalRequests: metrics.totalRequests,
        avgLatency: metrics.avgLatency,
      },

      // Cache tiers
      tiers: {
        memory: {
          size: stats.memory.size,
          maxSize: stats.memory.maxSize,
          utilization: `${((stats.memory.size / stats.memory.maxSize) * 100).toFixed(1)}%`,
        },
        redis: {
          connected: redisAvailable,
          keys: stats.redis.keys,
        },
      },

      // Configuration
      config: {
        sources: cache.getSourceConfigs(),
        warmEndpoints: cache.getWarmEndpoints(),
      },
    });
  } catch (err) {
    console.error("[api/cache/metrics] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
