import { readFileSync, existsSync } from "fs";
import { join } from "path";

// --- Types ---
interface KolEntry {
  wallet_address: string;
  name: string;
  telegram: string | null;
  twitter: string | null;
  profit: number;
  wins: number;
  losses: number;
  timeframe: number;
}

interface GmgnWallet {
  wallet_address: string;
  name: string;
  twitter_username: string | null;
  category: string;
  chain: string;
  realized_profit_1d: number;
  realized_profit_7d: number;
  realized_profit_30d: number;
  buy_1d: number;
  buy_7d: number;
  buy_30d: number;
  sell_1d: number;
  sell_7d: number;
  sell_30d: number;
  winrate_7d: number;
  winrate_30d: number;
  tags: string[];
  avatar: string | null;
  balance: number;
  follow_count: number;
  last_active: number;
}

// --- Data Loading ---
const KOLSCAN_URL =
  "https://raw.githubusercontent.com/nirholas/scrape-kolscan-wallets/main/output/kolscan-leaderboard.json";
const SOL_URL =
  "https://raw.githubusercontent.com/nirholas/scrape-kolscan-wallets/main/solwallets.json";
const BSC_URL =
  "https://raw.githubusercontent.com/nirholas/scrape-kolscan-wallets/main/bscwallets.json";

let cachedKolscan: KolEntry[] | null = null;
let cachedSolGmgn: GmgnWallet[] | null = null;
let cachedBscGmgn: GmgnWallet[] | null = null;

async function loadKolscan(): Promise<KolEntry[]> {
  if (cachedKolscan) return cachedKolscan;
  const localPath = join(import.meta.dir, "..", "output", "kolscan-leaderboard.json");
  if (existsSync(localPath)) {
    cachedKolscan = JSON.parse(readFileSync(localPath, "utf-8"));
    return cachedKolscan!;
  }
  const res = await fetch(KOLSCAN_URL);
  if (!res.ok) throw new Error(`Failed to fetch kolscan data: ${res.status}`);
  cachedKolscan = (await res.json()) as KolEntry[];
  return cachedKolscan;
}

function parseGmgnRaw(raw: any, chain: string): GmgnWallet[] {
  const wallets: GmgnWallet[] = [];
  const seen = new Set<string>();
  function add(w: any, category: string) {
    if (!w.wallet_address || seen.has(w.wallet_address)) return;
    seen.add(w.wallet_address);
    wallets.push({
      wallet_address: w.wallet_address,
      name: w.name || w.twitter_name || w.nickname || w.wallet_address.slice(0, 8),
      twitter_username: w.twitter_username || null,
      category,
      chain,
      realized_profit_1d: parseFloat(w.realized_profit_1d) || 0,
      realized_profit_7d: parseFloat(w.realized_profit_7d) || 0,
      realized_profit_30d: parseFloat(w.realized_profit_30d) || 0,
      buy_1d: w.buy_1d || 0, buy_7d: w.buy_7d || 0, buy_30d: w.buy_30d || 0,
      sell_1d: w.sell_1d || 0, sell_7d: w.sell_7d || 0, sell_30d: w.sell_30d || 0,
      winrate_7d: w.winrate_7d || 0, winrate_30d: w.winrate_30d || 0,
      tags: w.tags || [], avatar: w.avatar || null,
      balance: parseFloat(w.balance) || 0,
      follow_count: w.follow_count || 0, last_active: w.last_active || 0,
    });
  }
  if (raw.smartMoney?.wallets) {
    for (const [cat, list] of Object.entries(raw.smartMoney.wallets)) {
      if (Array.isArray(list)) for (const w of list) add(w, cat);
    }
  }
  if (raw.kol?.wallets && Array.isArray(raw.kol.wallets)) {
    for (const w of raw.kol.wallets) add(w, "kol");
  }
  return wallets;
}

async function loadGmgn(localName: string, remoteUrl: string, chain: string): Promise<GmgnWallet[]> {
  const localPath = join(import.meta.dir, "..", localName);
  if (existsSync(localPath)) {
    return parseGmgnRaw(JSON.parse(readFileSync(localPath, "utf-8")), chain);
  }
  const res = await fetch(remoteUrl);
  if (!res.ok) return [];
  return parseGmgnRaw(await res.json(), chain);
}

async function loadSolGmgn(): Promise<GmgnWallet[]> {
  if (cachedSolGmgn) return cachedSolGmgn;
  cachedSolGmgn = await loadGmgn("solwallets.json", SOL_URL, "sol");
  return cachedSolGmgn;
}

async function loadBscGmgn(): Promise<GmgnWallet[]> {
  if (cachedBscGmgn) return cachedBscGmgn;
  cachedBscGmgn = await loadGmgn("bscwallets.json", BSC_URL, "bsc");
  return cachedBscGmgn;
}

// --- Helpers ---
function uniqueWallets(data: KolEntry[]): string[] {
  return [...new Set(data.map((e) => e.wallet_address))];
}

function filterByTimeframe(data: KolEntry[], timeframe?: number): KolEntry[] {
  if (!timeframe) return data;
  return data.filter((e) => e.timeframe === timeframe);
}

function sortEntries(
  entries: KolEntry[],
  sortBy: string = "profit",
  order: string = "desc"
): KolEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "winrate") {
      const aTotal = a.wins + a.losses;
      const bTotal = b.wins + b.losses;
      const aRate = aTotal > 0 ? a.wins / aTotal : -1;
      const bRate = bTotal > 0 ? b.wins / bTotal : -1;
      return aRate - bRate;
    }
    const aVal = (a as any)[sortBy] ?? 0;
    const bVal = (b as any)[sortBy] ?? 0;
    return aVal - bVal;
  });
  return order === "desc" ? sorted.reverse() : sorted;
}

function paginate<T>(items: T[], page: number, limit: number): { data: T[]; total: number; page: number; totalPages: number } {
  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    total,
    page,
    totalPages,
  };
}

function parseIntParam(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = parseInt(value, 10);
  return isNaN(n) || n < 1 ? fallback : n;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function filterGmgnWallets(wallets: GmgnWallet[], params: URLSearchParams) {
  const sort = params.get("sort") || "realized_profit_7d";
  const order = params.get("order") || "desc";
  const page = parseIntParam(params.get("page"), 1);
  const limit = Math.min(parseIntParam(params.get("limit"), 50), 500);
  const search = params.get("search")?.toLowerCase();
  const category = params.get("category");

  let filtered = [...wallets];
  if (category) filtered = filtered.filter((w) => w.category === category);
  if (search) {
    filtered = filtered.filter((w) =>
      w.name.toLowerCase().includes(search) ||
      w.wallet_address.toLowerCase().includes(search) ||
      (w.twitter_username && w.twitter_username.toLowerCase().includes(search))
    );
  }
  filtered.sort((a, b) => {
    const av = (a as any)[sort] ?? 0;
    const bv = (b as any)[sort] ?? 0;
    if (typeof av === "string") return order === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    return order === "asc" ? av - bv : bv - av;
  });
  return paginate(filtered, page, limit);
}

// --- Routes ---
const PORT = parseInt(process.env.API_PORT || "3002", 10);

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (req.method !== "GET") {
      return json({ error: "Method not allowed" }, 405);
    }

    try {
      const data = await loadKolscan();

      // GET /health
      if (path === "/health") {
        const [solG, bscG] = await Promise.all([loadSolGmgn(), loadBscGmgn()]);
        return json({
          status: "ok",
          kolscan: { entries: data.length, wallets: uniqueWallets(data).length },
          gmgn_sol: { wallets: solG.length },
          gmgn_bsc: { wallets: bscG.length },
        });
      }

      // GET /api/leaderboard?timeframe=1&sort=profit&order=desc&page=1&limit=50&search=...
      if (path === "/api/leaderboard") {
        const timeframe = parseIntParam(url.searchParams.get("timeframe"), 0) || undefined;
        const sort = url.searchParams.get("sort") || "profit";
        const order = url.searchParams.get("order") || "desc";
        const page = parseIntParam(url.searchParams.get("page"), 1);
        const limit = Math.min(parseIntParam(url.searchParams.get("limit"), 50), 500);
        const search = url.searchParams.get("search")?.toLowerCase();

        let entries = filterByTimeframe(data, timeframe);
        if (search) {
          entries = entries.filter(
            (e) =>
              e.name.toLowerCase().includes(search) ||
              e.wallet_address.toLowerCase().includes(search)
          );
        }
        entries = sortEntries(entries, sort, order);
        return json(paginate(entries, page, limit));
      }

      // GET /api/wallets — list unique wallets
      if (path === "/api/wallets") {
        const addresses = uniqueWallets(data);
        return json({ wallets: addresses, total: addresses.length });
      }

      // GET /api/wallet/:address
      const walletMatch = path.match(/^\/api\/wallet\/([A-Za-z0-9]+)$/);
      if (walletMatch) {
        const address = walletMatch[1];
        const entries = data.filter((e) => e.wallet_address === address);
        if (entries.length === 0) {
          return json({ error: "Wallet not found" }, 404);
        }

        const name = entries[0].name;
        const twitter = entries[0].twitter;
        const telegram = entries[0].telegram;
        const totalProfit = entries.reduce((s, e) => s + e.profit, 0);
        const totalWins = entries.reduce((s, e) => s + e.wins, 0);
        const totalLosses = entries.reduce((s, e) => s + e.losses, 0);
        const totalTrades = totalWins + totalLosses;
        const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : null;

        // Rankings per timeframe
        const rankings = entries.map((e) => {
          const peers = data
            .filter((d) => d.timeframe === e.timeframe)
            .sort((a, b) => b.profit - a.profit);
          const rank = peers.findIndex((p) => p.wallet_address === address) + 1;
          return {
            timeframe: e.timeframe,
            rank,
            total: peers.length,
            profit: e.profit,
            wins: e.wins,
            losses: e.losses,
          };
        });

        return json({
          wallet_address: address,
          name,
          twitter,
          telegram,
          stats: {
            total_profit: totalProfit,
            total_wins: totalWins,
            total_losses: totalLosses,
            total_trades: totalTrades,
            win_rate: winRate,
          },
          rankings,
          timeframes: entries,
        });
      }

      // GET /api/top?timeframe=1&sort=profit&limit=10
      if (path === "/api/top") {
        const timeframe = parseIntParam(url.searchParams.get("timeframe"), 1);
        const sort = url.searchParams.get("sort") || "profit";
        const limit = Math.min(parseIntParam(url.searchParams.get("limit"), 10), 100);

        let entries = data.filter((e) => e.timeframe === timeframe);
        entries = sortEntries(entries, sort, "desc");
        return json({ timeframe, sort, data: entries.slice(0, limit) });
      }

      // GET /api/stats
      if (path === "/api/stats") {
        const wallets = uniqueWallets(data);
        const daily = data.filter((e) => e.timeframe === 1);
        const topDaily = daily.length > 0
          ? daily.reduce((a, b) => (a.profit > b.profit ? a : b))
          : null;

        return json({
          total_entries: data.length,
          total_wallets: wallets.length,
          timeframes: [1, 7, 30],
          daily_entries: daily.length,
          top_daily: topDaily
            ? { name: topDaily.name, wallet: topDaily.wallet_address, profit: topDaily.profit }
            : null,
        });
      }

      // GET /api/export/gmgn — GMGN import format
      if (path === "/api/export/gmgn") {
        const wallets = uniqueWallets(data);
        const gmgnData = wallets.map((addr) => {
          const entry = data.find((e) => e.wallet_address === addr);
          return { address: addr, label: entry?.name || addr.slice(0, 8) };
        });
        return json(gmgnData);
      }

      // --- GMGN Endpoints ---

      // GET /api/gmgn/sol?sort=realized_profit_7d&order=desc&page=1&limit=50&category=...&search=...
      if (path === "/api/gmgn/sol") {
        let wallets = await loadSolGmgn();
        return json(filterGmgnWallets(wallets, url.searchParams));
      }

      // GET /api/gmgn/bsc?sort=realized_profit_7d&order=desc&page=1&limit=50&category=...&search=...
      if (path === "/api/gmgn/bsc") {
        let wallets = await loadBscGmgn();
        return json(filterGmgnWallets(wallets, url.searchParams));
      }

      // GET /api/gmgn/wallet/:address
      const gmgnWalletMatch = path.match(/^\/api\/gmgn\/wallet\/([A-Za-z0-9x]+)$/);
      if (gmgnWalletMatch) {
        const address = gmgnWalletMatch[1];
        const [sol, bsc] = await Promise.all([loadSolGmgn(), loadBscGmgn()]);
        const wallet = [...sol, ...bsc].find((w) => w.wallet_address === address);
        if (!wallet) return json({ error: "GMGN wallet not found" }, 404);
        return json(wallet);
      }

      // GET /api/gmgn/categories?chain=sol
      if (path === "/api/gmgn/categories") {
        const chain = url.searchParams.get("chain") || "sol";
        const wallets = chain === "bsc" ? await loadBscGmgn() : await loadSolGmgn();
        const cats: Record<string, number> = {};
        for (const w of wallets) cats[w.category] = (cats[w.category] || 0) + 1;
        return json({ chain, categories: cats });
      }

      // GET /api/gmgn/stats
      if (path === "/api/gmgn/stats") {
        const [sol, bsc] = await Promise.all([loadSolGmgn(), loadBscGmgn()]);
        return json({
          sol: { wallets: sol.length, top: sol.sort((a, b) => b.realized_profit_7d - a.realized_profit_7d).slice(0, 3).map((w) => ({ name: w.name, wallet: w.wallet_address, profit_7d: w.realized_profit_7d })) },
          bsc: { wallets: bsc.length, top: bsc.sort((a, b) => b.realized_profit_7d - a.realized_profit_7d).slice(0, 3).map((w) => ({ name: w.name, wallet: w.wallet_address, profit_7d: w.realized_profit_7d })) },
        });
      }

      return json({
        error: "Not found",
        endpoints: [
          "/health",
          "/api/leaderboard", "/api/wallets", "/api/wallet/:address", "/api/top", "/api/stats", "/api/export/gmgn",
          "/api/gmgn/sol", "/api/gmgn/bsc", "/api/gmgn/wallet/:address", "/api/gmgn/categories", "/api/gmgn/stats",
        ],
      }, 404);
    } catch (err) {
      console.error("API error:", err);
      return json({ error: "Internal server error" }, 500);
    }
  },
});

console.log(`\n  KolQuest API running at http://localhost:${server.port}\n`);
console.log("  KolScan Endpoints:");
console.log("    GET /health");
console.log("    GET /api/leaderboard?timeframe=1&sort=profit&order=desc&page=1&limit=50&search=...");
console.log("    GET /api/wallets");
console.log("    GET /api/wallet/:address");
console.log("    GET /api/top?timeframe=1&sort=profit&limit=10");
console.log("    GET /api/stats");
console.log("    GET /api/export/gmgn");
console.log("");
console.log("  GMGN Endpoints:");
console.log("    GET /api/gmgn/sol?sort=realized_profit_7d&category=smart_degen&search=...");
console.log("    GET /api/gmgn/bsc?sort=realized_profit_7d&category=kol&search=...");
console.log("    GET /api/gmgn/wallet/:address");
console.log("    GET /api/gmgn/categories?chain=sol");
console.log("    GET /api/gmgn/stats\n");
