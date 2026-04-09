/**
 * @fileoverview Aggregates leaderboard data from multiple sources (KolScan + GMGN).
 *
 * Builds a unified LeaderboardEntry[] from available data sources, computes
 * composite scores, and caches the result in the database. The API route
 * uses getLeaderboard() which applies in-memory filtering/pagination.
 */

import { db } from "@/drizzle/db";
import { leaderboardCache } from "@/drizzle/db/schema";
import { eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { getData, getSolGmgnData, getBscGmgnData, getXProfiles, getXProfile } from "@/lib/data";
import type {
  LeaderboardEntry,
  LeaderboardChain,
  LeaderboardQuery,
  LeaderboardResponse,
  LeaderboardSource,
  KolEntry,
  GmgnWallet,
} from "@/lib/types";

const CACHE_KEY = "leaderboard_v1";
const STALE_MS = 15 * 60 * 1000; // 15 minutes

// --- Helpers ---

function twitterUsername(val: string | null | undefined): string | null {
  if (!val) return null;
  const m = val.match(/(?:twitter\.com|x\.com)\/([^/?# ]+)/);
  return m ? m[1] : val.startsWith("@") ? val.slice(1) : val;
}

function gmgnCategories(wallet: GmgnWallet): string[] {
  const s = new Set<string>();
  if (wallet.category) s.add(wallet.category);
  for (const t of wallet.tags) s.add(t);
  if (wallet.twitter_username) s.add("kol");
  return [...s];
}

function calcCompositeScore(entry: LeaderboardEntry): number {
  let score = 0;

  // Rank-based component: rank 1 → 60 pts, rank 500 → 0 pts
  const ranks = (Object.values(entry.rankings) as Array<{ rank: number } | undefined>)
    .filter((r): r is { rank: number } => r != null)
    .map((r) => r.rank);
  if (ranks.length > 0) {
    const avgRank = ranks.reduce((a, b) => a + b, 0) / ranks.length;
    score += Math.max(0, 60 - (avgRank - 1) * 0.12);
  }

  // Multi-source bonus (up to 20 pts)
  score += Math.min(20, entry.verifiedSources.length * 10);

  // Twitter/identity bonus (5 pts)
  if (entry.twitter) score += 5;

  // PnL bonus (log scale, up to 10 pts)
  if (entry.totalPnl > 0) {
    score += Math.min(10, Math.log10(entry.totalPnl / 1000 + 1) * 7);
  }

  // Win rate bonus (up to 5 pts)
  if (entry.avgWinRate > 0.5) {
    score += Math.min(5, (entry.avgWinRate - 0.5) * 10);
  }

  return Math.min(100, Math.max(0, score));
}

// --- Core aggregation ---

async function _buildEntries(): Promise<LeaderboardEntry[]> {
  const [kolscanRaw, gmgnSol, gmgnBsc, xProfiles] = await Promise.all([
    getData(),
    getSolGmgnData(),
    getBscGmgnData(),
    getXProfiles(),
  ]);

  const entryMap = new Map<string, LeaderboardEntry>();

  // ── KolScan ───────────────────────────────────────────────────────────────
  const kolsByAddress = new Map<string, KolEntry[]>();
  for (const e of kolscanRaw) {
    const list = kolsByAddress.get(e.wallet_address) ?? [];
    list.push(e);
    kolsByAddress.set(e.wallet_address, list);
  }
  const kols7d = kolscanRaw
    .filter((e) => e.timeframe === 7)
    .sort((a, b) => b.profit - a.profit);
  const kolRank7d = new Map(kols7d.map((e, i) => [e.wallet_address, i + 1]));

  for (const [addr, list] of kolsByAddress) {
    const d7 = list.find((e) => e.timeframe === 7);
    const rank = kolRank7d.get(addr) ?? 9999;
    const wins7 = d7?.wins ?? 0;
    const losses7 = d7?.losses ?? 0;
    const winrate7 = wins7 + losses7 > 0 ? wins7 / (wins7 + losses7) : 0;
    const pnl7 = d7?.profit ?? 0;
    const twitterUrl = list[0].twitter;
    const uname = twitterUsername(twitterUrl);
    let avatar: string | null = twitterUrl
      ? (getXProfile(xProfiles, twitterUrl)?.avatar ?? null)
      : null;

    entryMap.set(addr, {
      address: addr,
      chain: "solana",
      name: list[0].name,
      avatar,
      ensOrSns: null,
      twitter: uname ? { username: uname, name: list[0].name, avatar } : undefined,
      rankings: {
        kolscan: { rank, pnl: pnl7, winRate: winrate7, trades: wins7 + losses7 },
      },
      compositeScore: 0,
      avgRank: rank,
      totalPnl: pnl7,
      avgWinRate: winrate7,
      lastActive: null,
      totalTrades: wins7 + losses7,
      categories: ["kol"],
      verifiedSources: ["kolscan" as LeaderboardSource],
    });
  }

  // ── GMGN Solana ──────────────────────────────────────────────────────────
  const gmgnSolSorted = [...gmgnSol].sort(
    (a, b) => b.realized_profit_7d - a.realized_profit_7d
  );

  for (let i = 0; i < gmgnSolSorted.length; i++) {
    const w = gmgnSolSorted[i];
    const rank = i + 1;
    const lastActive = w.last_active
      ? new Date(w.last_active * 1000).toISOString()
      : null;
    const uname = w.twitter_username ?? null;
    let avatar = w.avatar;
    if (!avatar && uname) {
      avatar = getXProfile(xProfiles, `https://x.com/${uname}`)?.avatar ?? null;
    }
    const gmgnRanking = {
      rank,
      pnl: w.realized_profit_7d,
      winRate: w.winrate_7d,
      trades: w.txs_7d,
      category: w.category,
    };

    if (entryMap.has(w.wallet_address)) {
      const existing = entryMap.get(w.wallet_address)!;
      existing.rankings.gmgn = gmgnRanking;
      if (!existing.avatar && avatar) existing.avatar = avatar;
      if (!existing.twitter && uname) {
        existing.twitter = { username: uname, name: w.twitter_name ?? uname, avatar };
      }
      existing.ensOrSns = existing.ensOrSns ?? w.sns_id ?? w.ens_name;
      existing.lastActive = existing.lastActive ?? lastActive;
      existing.totalTrades = Math.max(existing.totalTrades, w.txs_7d);
      existing.verifiedSources = [
        ...new Set([...existing.verifiedSources, "gmgn" as LeaderboardSource]),
      ];
      existing.categories = [
        ...new Set([...existing.categories, ...gmgnCategories(w)]),
      ];
    } else {
      entryMap.set(w.wallet_address, {
        address: w.wallet_address,
        chain: "solana",
        name: w.name,
        avatar,
        ensOrSns: w.sns_id ?? w.ens_name,
        twitter: uname
          ? { username: uname, name: w.twitter_name ?? uname, avatar }
          : undefined,
        rankings: { gmgn: gmgnRanking },
        compositeScore: 0,
        avgRank: rank,
        totalPnl: w.realized_profit_7d,
        avgWinRate: w.winrate_7d,
        lastActive,
        totalTrades: w.txs_7d,
        categories: gmgnCategories(w),
        verifiedSources: ["gmgn" as LeaderboardSource],
      });
    }
  }

  // ── GMGN BSC ─────────────────────────────────────────────────────────────
  const gmgnBscSorted = [...gmgnBsc].sort(
    (a, b) => b.realized_profit_7d - a.realized_profit_7d
  );

  for (let i = 0; i < gmgnBscSorted.length; i++) {
    const w = gmgnBscSorted[i];
    const rank = i + 1;
    const lastActive = w.last_active
      ? new Date(w.last_active * 1000).toISOString()
      : null;
    const uname = w.twitter_username ?? null;
    let avatar = w.avatar;
    if (!avatar && uname) {
      avatar = getXProfile(xProfiles, `https://x.com/${uname}`)?.avatar ?? null;
    }
    // Use a chain-prefixed key so BSC wallets with the same address as Solana stay separate
    const key = `bsc:${w.wallet_address}`;
    entryMap.set(key, {
      address: w.wallet_address,
      chain: "bsc",
      name: w.name,
      avatar,
      ensOrSns: w.sns_id ?? w.ens_name,
      twitter: uname
        ? { username: uname, name: w.twitter_name ?? uname, avatar }
        : undefined,
      rankings: {
        gmgn: {
          rank,
          pnl: w.realized_profit_7d,
          winRate: w.winrate_7d,
          trades: w.txs_7d,
          category: w.category,
        },
      },
      compositeScore: 0,
      avgRank: rank,
      totalPnl: w.realized_profit_7d,
      avgWinRate: w.winrate_7d,
      lastActive,
      totalTrades: w.txs_7d,
      categories: gmgnCategories(w),
      verifiedSources: ["gmgn" as LeaderboardSource],
    });
  }

  // ── Finalize scores ───────────────────────────────────────────────────────
  const entries = Array.from(entryMap.values());

  for (const e of entries) {
    const rankValues = (
      Object.values(e.rankings) as Array<{ rank: number } | undefined>
    )
      .filter((r): r is { rank: number } => r != null)
      .map((r) => r.rank);
    e.avgRank =
      rankValues.length > 0
        ? rankValues.reduce((a, b) => a + b, 0) / rankValues.length
        : 9999;

    const pnlValues = (
      Object.values(e.rankings) as Array<{ pnl?: number } | undefined>
    )
      .filter((r): r is { pnl: number } => r?.pnl != null)
      .map((r) => r.pnl);
    e.totalPnl = pnlValues.length > 0 ? Math.max(...pnlValues) : 0;

    const wrValues = (
      Object.values(e.rankings) as Array<{ winRate?: number } | undefined>
    )
      .filter((r): r is { winRate: number } => r?.winRate != null && r.winRate > 0)
      .map((r) => r.winRate);
    e.avgWinRate =
      wrValues.length > 0
        ? wrValues.reduce((a, b) => a + b, 0) / wrValues.length
        : 0;

    e.compositeScore = calcCompositeScore(e);
  }

  entries.sort((a, b) => b.compositeScore - a.compositeScore);
  return entries;
}

// Cached build — revalidates every 15 minutes
const buildEntries = unstable_cache(_buildEntries, ["leaderboard-entries"], {
  revalidate: 900,
});

// --- Public API ---

/** Rebuild leaderboard data and persist to DB cache. Called by cron job. */
export async function refreshLeaderboardData(): Promise<void> {
  const entries = await _buildEntries();
  await db
    .insert(leaderboardCache)
    .values({ key: CACHE_KEY, data: JSON.stringify(entries), lastUpdated: new Date() })
    .onConflictDoUpdate({
      target: leaderboardCache.key,
      set: { data: JSON.stringify(entries), lastUpdated: new Date() },
    });
}

async function loadEntries(): Promise<{
  entries: LeaderboardEntry[];
  lastUpdated: string;
}> {
  // Try DB cache first (avoids rebuilding on every request)
  try {
    const rows = await db
      .select()
      .from(leaderboardCache)
      .where(eq(leaderboardCache.key, CACHE_KEY))
      .limit(1);
    if (rows.length > 0) {
      const row = rows[0];
      const age = Date.now() - row.lastUpdated.getTime();
      if (age < STALE_MS) {
        return {
          entries: JSON.parse(row.data) as LeaderboardEntry[],
          lastUpdated: row.lastUpdated.toISOString(),
        };
      }
    }
  } catch {
    // DB unavailable — fall through to in-process cache
  }

  const entries = await buildEntries();
  return { entries, lastUpdated: new Date().toISOString() };
}

/** Query the leaderboard with filters, sorting, and pagination. */
export async function getLeaderboard(
  query: LeaderboardQuery
): Promise<LeaderboardResponse> {
  const { entries: all, lastUpdated } = await loadEntries();

  let filtered = all;

  if (query.chain && query.chain !== "all") {
    filtered = filtered.filter((e) => e.chain === query.chain);
  }

  if (query.category && query.category !== "overall") {
    const cat = query.category;
    const catAliases: Record<string, string[]> = {
      kol: ["kol"],
      smart_money: ["smart_degen", "smart_money"],
      whale: ["whale"],
      sniper: ["sniper", "snipe_bot"],
      meme: ["meme", "meme_coin"],
      defi: ["defi", "defi_farmer"],
    };
    const matchers = catAliases[cat] ?? [cat];
    filtered = filtered.filter((e) =>
      e.categories.some((c) => matchers.some((m) => c.toLowerCase().includes(m)))
    );
  }

  if (query.search) {
    const q = query.search.toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.address.toLowerCase().includes(q) ||
        (e.twitter?.username.toLowerCase().includes(q) ?? false) ||
        (e.ensOrSns?.toLowerCase().includes(q) ?? false)
    );
  }

  if (query.minPnl !== undefined) {
    filtered = filtered.filter((e) => e.totalPnl >= query.minPnl!);
  }

  if (query.minWinRate !== undefined) {
    // Accept 0-100 or 0-1
    const threshold = query.minWinRate > 1 ? query.minWinRate / 100 : query.minWinRate;
    filtered = filtered.filter((e) => e.avgWinRate >= threshold);
  }

  if (query.activeInDays !== undefined) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - query.activeInDays);
    filtered = filtered.filter(
      (e) => e.lastActive != null && new Date(e.lastActive) >= cutoff
    );
  }

  if (query.verifiedOnly) {
    filtered = filtered.filter((e) => !!e.twitter);
  }

  const sortKey = query.sort ?? "composite";
  const order = query.order ?? "desc";
  filtered = [...filtered].sort((a, b) => {
    if (sortKey === "pnl")
      return order === "asc" ? a.totalPnl - b.totalPnl : b.totalPnl - a.totalPnl;
    if (sortKey === "winrate")
      return order === "asc" ? a.avgWinRate - b.avgWinRate : b.avgWinRate - a.avgWinRate;
    if (sortKey === "trades")
      return order === "asc" ? a.totalTrades - b.totalTrades : b.totalTrades - a.totalTrades;
    if (sortKey === "rank")
      // Lower avgRank number = better; "desc" = best first
      return order === "desc" ? a.avgRank - b.avgRank : b.avgRank - a.avgRank;
    return order === "asc"
      ? a.compositeScore - b.compositeScore
      : b.compositeScore - a.compositeScore;
  });

  const page = query.page ?? 1;
  const limit = query.limit ?? 50;
  const total = filtered.length;

  return {
    entries: filtered.slice((page - 1) * limit, page * limit),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    lastUpdated,
    sources: {
      kolscan: all.some((e) => e.verifiedSources.includes("kolscan")),
      gmgn: all.some((e) => e.verifiedSources.includes("gmgn")),
      dune: false,
      flipside: false,
      polymarket: false,
    },
  };
}
