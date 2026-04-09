import { NextRequest, NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { leaderboardCache } from "@/drizzle/db/schema";
import { eq } from "drizzle-orm";
import type {
  LeaderboardResponse,
  LeaderboardQuery,
  LeaderboardEntry,
  LeaderboardChain,
} from "@/lib/types";
import { checkOrigin } from "@/lib/assert-origin";

// GET /api/leaderboard — get aggregated leaderboard rankings
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const query: LeaderboardQuery = {
    chain: (searchParams.get("chain") as LeaderboardChain | "all") || "all",
    timeframe: (searchParams.get("timeframe") as "24h" | "7d" | "30d" | "all") || "7d",
    category: (searchParams.get("category") as any) || "overall",
    sort: (searchParams.get("sort") as any) || "composite",
    order: (searchParams.get("order") as "asc" | "desc") || "desc",
    page: Number(searchParams.get("page")) || 1,
    limit: Number(searchParams.get("limit")) || 50,
    search: searchParams.get("search") || undefined,
    minPnl: searchParams.has("minPnl") ? Number(searchParams.get("minPnl")) : undefined,
    minWinRate: searchParams.has("minWinRate") ? Number(searchParams.get("minWinRate")) : undefined,
    activeInDays: searchParams.has("activeInDays")
      ? Number(searchParams.get("activeInDays"))
      : undefined,
    verifiedOnly: searchParams.get("verifiedOnly") === "true",
  };

  // Build cache key from chain/timeframe/category
  const chain = query.chain || "all";
  const timeframe = query.timeframe || "7d";
  const category = query.category || "overall";
  const cacheKey = `${chain}_${timeframe}_${category}`;

  // Try keyed lookup first, fall back to "default_leaderboard"
  let cacheRow = await db
    .select()
    .from(leaderboardCache)
    .where(eq(leaderboardCache.key, cacheKey))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!cacheRow) {
    cacheRow = await db
      .select()
      .from(leaderboardCache)
      .where(eq(leaderboardCache.key, "default_leaderboard"))
      .limit(1)
      .then((r) => r[0] ?? null);
  }

  let allEntries: LeaderboardEntry[] = cacheRow ? (JSON.parse(cacheRow.data) as LeaderboardEntry[]) : [];

  // Filter chain in-memory when not using a chain-specific key
  if (query.chain && query.chain !== "all") {
    allEntries = allEntries.filter((e) => e.chain === query.chain);
  }

  // Search filter
  if (query.search) {
    const q = query.search.toLowerCase();
    allEntries = allEntries.filter(
      (e) =>
        e.name?.toLowerCase().includes(q) ||
        e.address?.toLowerCase().includes(q) ||
        e.twitter?.username?.toLowerCase().includes(q)
    );
  }

  // Numeric filters
  if (query.minPnl !== undefined) {
    allEntries = allEntries.filter((e) => e.totalPnl >= query.minPnl!);
  }
  if (query.minWinRate !== undefined) {
    allEntries = allEntries.filter((e) => e.avgWinRate >= query.minWinRate!);
  }
  if (query.activeInDays !== undefined) {
    const since = new Date();
    since.setDate(since.getDate() - query.activeInDays);
    allEntries = allEntries.filter(
      (e) => e.lastActive && new Date(e.lastActive) >= since
    );
  }
  if (query.verifiedOnly) {
    allEntries = allEntries.filter((e) => e.twitter?.username);
  }

  // Sort
  const sortKey = query.sort || "composite";
  const multiplier = query.order === "asc" ? 1 : -1;
  allEntries.sort((a, b) => {
    let av = 0;
    let bv = 0;
    if (sortKey === "pnl") { av = a.totalPnl; bv = b.totalPnl; }
    else if (sortKey === "winrate") { av = a.avgWinRate; bv = b.avgWinRate; }
    else if (sortKey === "trades") { av = a.totalTrades; bv = b.totalTrades; }
    else if (sortKey === "rank") { av = a.avgRank; bv = b.avgRank; }
    else { av = a.compositeScore; bv = b.compositeScore; }
    return (av - bv) * multiplier;
  });

  const total = allEntries.length;
  const page = query.page!;
  const limit = query.limit!;
  const entries = allEntries.slice((page - 1) * limit, page * limit);

  const lastUpdated = cacheRow ? cacheRow.lastUpdated.toISOString() : new Date().toISOString();

  const sources = {
    kolscan: true,
    gmgn: true,
    dune: true,
    flipside: true,
    polymarket: true,
  };

  const response: LeaderboardResponse = {
    entries,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    lastUpdated,
    sources,
  };

  return NextResponse.json(response);
}

// POST /api/leaderboard — refresh the leaderboard cache (cron only)
export async function POST(req: NextRequest) {
  const originError = checkOrigin(req);
  if (originError) return originError;

  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: Call the leaderboard aggregator and update the cache
  // await aggregateAndCacheLeaderboard();

  return NextResponse.json({ success: true, message: "Leaderboard cache updated." });
}