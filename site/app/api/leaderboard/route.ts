import { NextRequest, NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { leaderboardCache } from "@/drizzle/db/schema";
import { and, asc, desc, eq, gte, lte, ilike, sql } from "drizzle-orm";
import type {
  LeaderboardResponse,
  LeaderboardQuery,
  LeaderboardEntry,
  LeaderboardChain,
} from "@/lib/types";
import { assertOrigin } from "@/lib/assert-origin";

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

  const whereClauses = [];
  if (query.chain && query.chain !== "all") {
    whereClauses.push(eq(leaderboardCache.chain, query.chain));
  }
  if (query.timeframe) {
    whereClauses.push(eq(leaderboardCache.timeframe, query.timeframe));
  }
  if (query.category && query.category !== "overall") {
    whereClauses.push(sql`'${query.category}' = ANY(${leaderboardCache.categories})`);
  }
  if (query.search) {
    whereClauses.push(
      sql`${leaderboardCache.name} ILIKE ${"%" + query.search + "%"} OR ${
        leaderboardCache.address
      } ILIKE ${"%" + query.search + "%"} OR ${leaderboardCache.twitterUsername} ILIKE ${
        "%" + query.search + "%"
      }`
    );
  }
  if (query.minPnl !== undefined) {
    whereClauses.push(gte(leaderboardCache.totalPnl, query.minPnl));
  }
  if (query.minWinRate !== undefined) {
    whereClauses.push(gte(leaderboardCache.avgWinRate, query.minWinRate));
  }
  if (query.activeInDays !== undefined) {
    const d = new Date();
    d.setDate(d.getDate() - query.activeInDays);
    whereClauses.push(gte(leaderboardCache.lastActive, d.toISOString()));
  }
  if (query.verifiedOnly) {
    whereClauses.push(sql`${leaderboardCache.twitterUsername} IS NOT NULL`);
  }

  const where = and(...whereClauses);

  const totalEntries = await db
    .select({ count: sql`count(*)` })
    .from(leaderboardCache)
    .where(where);
  const total = Number(totalEntries[0].count);

  const sortColumn = {
    pnl: leaderboardCache.totalPnl,
    winrate: leaderboardCache.avgWinRate,
    trades: leaderboardCache.totalTrades,
    composite: leaderboardCache.compositeScore,
    rank: leaderboardCache.avgRank,
  }[query.sort || "composite"];

  const orderBy = query.order === "asc" ? asc(sortColumn) : desc(sortColumn);

  const results = await db
    .select()
    .from(leaderboardCache)
    .where(where)
    .orderBy(orderBy)
    .limit(query.limit!)
    .offset((query.page! - 1) * query.limit!);

  const entries: LeaderboardEntry[] = results.map((r) => ({
    address: r.address,
    chain: r.chain as LeaderboardChain,
    name: r.name,
    avatar: r.avatar,
    ensOrSns: r.ensOrSns,
    twitter: r.twitterUsername
      ? {
          username: r.twitterUsername,
          name: r.twitterName || "",
          avatar: r.twitterAvatar,
        }
      : undefined,
    rankings: r.rankings as any,
    compositeScore: r.compositeScore,
    avgRank: r.avgRank,
    totalPnl: r.totalPnl,
    avgWinRate: r.avgWinRate,
    lastActive: r.lastActive,
    totalTrades: r.totalTrades,
    categories: r.categories,
    verifiedSources: r.verifiedSources as any,
    rankChange: r.rankChange,
  }));

  const lastUpdated = results.length > 0 ? results[0].updatedAt : new Date().toISOString();

  // For now, hardcode sources until dynamic source detection is added
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
      page: query.page!,
      limit: query.limit!,
      total,
      totalPages: Math.ceil(total / query.limit!),
    },
    lastUpdated,
    sources,
  };

  return NextResponse.json(response);
}

// Example of how a POST would work to refresh the cache
// This would be called by a cron job, not a user
// Requires some form of auth (e.g., secret key)
export async function POST(req: NextRequest) {
  assertOrigin(req);
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: Call the leaderboard aggregator and update the cache
  // await aggregateAndCacheLeaderboard();

  return NextResponse.json({ success: true, message: "Leaderboard cache updated." });
}