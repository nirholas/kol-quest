/**
 * Cache invalidation API
 *
 * POST /api/cache/invalidate
 *
 * Admin-only endpoint to invalidate cached data.
 */

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { checkOrigin } from "@/lib/assert-origin";
import { cache } from "@/lib/cache";

const InvalidateSchema = z.object({
  /** Invalidation strategy */
  type: z.enum(["pattern", "source", "tag", "all"]),
  /** Pattern, source name, or tag depending on type */
  value: z.string().optional(),
});

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

  // Parse and validate request
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = InvalidateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { type, value } = parsed.data;
  let deleted = 0;

  try {
    switch (type) {
      case "pattern":
        if (!value) {
          return NextResponse.json(
            { error: "Pattern required for type 'pattern'" },
            { status: 400 }
          );
        }
        deleted = await cache.invalidate(value);
        break;

      case "source":
        if (!value) {
          return NextResponse.json(
            { error: "Source name required for type 'source'" },
            { status: 400 }
          );
        }
        deleted = await cache.invalidateSource(value);
        break;

      case "tag":
        if (!value) {
          return NextResponse.json(
            { error: "Tag required for type 'tag'" },
            { status: 400 }
          );
        }
        deleted = await cache.invalidateByTag(value);
        break;

      case "all":
        deleted = await cache.invalidate("cache:*");
        break;
    }

    return NextResponse.json({
      success: true,
      deleted,
      type,
      value: value ?? null,
    });
  } catch (err) {
    console.error("[api/cache/invalidate] Error:", err);
    return NextResponse.json(
      { error: "Invalidation failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    usage: "POST with { type, value }",
    types: {
      pattern: "Invalidate by pattern (e.g., 'cache:helius:*')",
      source: "Invalidate all entries for a source (e.g., 'helius')",
      tag: "Invalidate by tag (e.g., 'price')",
      all: "Invalidate entire cache (careful!)",
    },
    examples: [
      { type: "source", value: "helius" },
      { type: "pattern", value: "cache:birdeye:*" },
      { type: "tag", value: "price" },
      { type: "all" },
    ],
  });
}
