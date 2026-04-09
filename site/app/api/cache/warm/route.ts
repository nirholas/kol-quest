/**
 * Cache warm API
 *
 * POST /api/cache/warm
 *
 * Admin-only endpoint to warm the cache with popular endpoints.
 * Can be called on deploy or periodically via cron.
 */

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { checkOrigin } from "@/lib/assert-origin";
import { cache } from "@/lib/cache";

export async function POST(request: Request) {
  const originErr = checkOrigin(request);
  if (originErr) return originErr;

  // Require admin
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = (session.user as Record<string, unknown>).role;
  if (userRole !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const startTime = Date.now();

  try {
    const result = await cache.warm();

    return NextResponse.json({
      success: true,
      duration: `${Date.now() - startTime}ms`,
      warmed: result.warmed,
      failed: result.failed,
      total: result.warmed.length + result.failed.length,
    });
  } catch (err) {
    console.error("[api/cache/warm] Error:", err);
    return NextResponse.json(
      { error: "Cache warming failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    usage: "POST to warm cache with popular endpoints",
    endpoints: cache.getWarmEndpoints(),
    note: "This can be called on deploy or via cron to pre-populate cache",
  });
}
