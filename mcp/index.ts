#!/usr/bin/env node
/**
 * KolQuest MCP Server
 *
 * Exposes wallet intelligence data via the Model Context Protocol (MCP).
 * Supports both KolScan and GMGN data sources across Solana and BSC chains.
 *
 * Run: bun mcp/index.ts
 * Or with npx: npx -y @anthropic-ai/sdk mcp run -- bun mcp/index.ts
 */

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
  balance: number;
  follow_count: number;
}

// --- Data Loading ---
const ROOT = join(import.meta.dir, "..");

function loadKolscan(): KolEntry[] {
  const p = join(ROOT, "output", "kolscan-leaderboard.json");
  if (existsSync(p)) return JSON.parse(readFileSync(p, "utf-8"));
  return [];
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
      tags: w.tags || [], balance: parseFloat(w.balance) || 0,
      follow_count: w.follow_count || 0,
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

function loadGmgn(filename: string, chain: string): GmgnWallet[] {
  const p = join(ROOT, filename);
  if (existsSync(p)) return parseGmgnRaw(JSON.parse(readFileSync(p, "utf-8")), chain);
  return [];
}

// Preload data
const kolscanData = loadKolscan();
const solGmgn = loadGmgn("solwallets.json", "sol");
const bscGmgn = loadGmgn("bscwallets.json", "bsc");

// --- MCP Protocol (JSON-RPC over stdio) ---
interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: any;
}

function respond(id: number | string, result: any) {
  const msg = JSON.stringify({ jsonrpc: "2.0", id, result });
  process.stdout.write(msg + "\n");
}

function respondError(id: number | string, code: number, message: string) {
  const msg = JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } });
  process.stdout.write(msg + "\n");
}

// Tool definitions
const TOOLS = [
  {
    name: "kolscan_leaderboard",
    description: "Get KolScan KOL leaderboard. Returns wallets ranked by profit, win rate, or other metrics for a given timeframe (1=daily, 7=weekly, 30=monthly).",
    inputSchema: {
      type: "object" as const,
      properties: {
        timeframe: { type: "number", description: "Timeframe: 1 (daily), 7 (weekly), 30 (monthly)", default: 1 },
        sort: { type: "string", description: "Sort field: profit, wins, losses, winrate, name", default: "profit" },
        order: { type: "string", description: "Sort order: asc or desc", default: "desc" },
        limit: { type: "number", description: "Max results (1-100)", default: 20 },
        search: { type: "string", description: "Search by name or wallet address" },
      },
    },
  },
  {
    name: "kolscan_wallet",
    description: "Get detailed KolScan data for a specific wallet address. Returns stats, rankings, and PnL across all timeframes.",
    inputSchema: {
      type: "object" as const,
      properties: {
        address: { type: "string", description: "Wallet address to look up" },
      },
      required: ["address"],
    },
  },
  {
    name: "gmgn_wallets",
    description: "Get GMGN smart money wallets. Supports Solana and BSC chains with category filtering (smart_degen, kol, snipe_bot, launchpad_smart, fresh_wallet, etc.)",
    inputSchema: {
      type: "object" as const,
      properties: {
        chain: { type: "string", description: "Chain: sol or bsc", default: "sol" },
        category: { type: "string", description: "Filter by category (smart_degen, kol, snipe_bot, launchpad_smart, fresh_wallet, live, top_followed, top_renamed)" },
        sort: { type: "string", description: "Sort field: realized_profit_7d, realized_profit_1d, realized_profit_30d, winrate_7d, buy_7d", default: "realized_profit_7d" },
        order: { type: "string", description: "Sort order: asc or desc", default: "desc" },
        limit: { type: "number", description: "Max results (1-100)", default: 20 },
        search: { type: "string", description: "Search by name, address, or twitter" },
      },
    },
  },
  {
    name: "gmgn_wallet_detail",
    description: "Get detailed GMGN data for a specific wallet address. Returns profit, buys/sells, win rates, tags, category across all timeframes.",
    inputSchema: {
      type: "object" as const,
      properties: {
        address: { type: "string", description: "Wallet address to look up" },
      },
      required: ["address"],
    },
  },
  {
    name: "wallet_stats",
    description: "Get aggregate statistics across all data sources — total wallets, top performers, category breakdowns.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "search_wallets",
    description: "Search across all data sources (KolScan + GMGN Solana + GMGN BSC) by name, address, or twitter handle.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query" },
        limit: { type: "number", description: "Max results", default: 20 },
      },
      required: ["query"],
    },
  },
];

// Tool execution
function executeTool(name: string, args: any): any {
  switch (name) {
    case "kolscan_leaderboard": {
      const tf = args.timeframe || 1;
      const sort = args.sort || "profit";
      const order = args.order || "desc";
      const limit = Math.min(args.limit || 20, 100);
      const search = args.search?.toLowerCase();

      let entries = kolscanData.filter((e) => e.timeframe === tf);
      if (search) {
        entries = entries.filter((e) =>
          e.name.toLowerCase().includes(search) ||
          e.wallet_address.toLowerCase().includes(search)
        );
      }
      entries = [...entries].sort((a, b) => {
        if (sort === "winrate") {
          const ar = (a.wins + a.losses) > 0 ? a.wins / (a.wins + a.losses) : -1;
          const br = (b.wins + b.losses) > 0 ? b.wins / (b.wins + b.losses) : -1;
          return order === "asc" ? ar - br : br - ar;
        }
        const av = sort === "name" ? 0 : (a as any)[sort] ?? 0;
        const bv = sort === "name" ? 0 : (b as any)[sort] ?? 0;
        if (sort === "name") return order === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        return order === "asc" ? av - bv : bv - av;
      });

      return {
        timeframe: tf,
        total: entries.length,
        data: entries.slice(0, limit).map((e, i) => ({
          rank: i + 1,
          name: e.name,
          wallet: e.wallet_address,
          profit: e.profit,
          wins: e.wins,
          losses: e.losses,
          winrate: (e.wins + e.losses) > 0 ? `${((e.wins / (e.wins + e.losses)) * 100).toFixed(1)}%` : "N/A",
          twitter: e.twitter,
        })),
      };
    }

    case "kolscan_wallet": {
      const entries = kolscanData.filter((e) => e.wallet_address === args.address);
      if (entries.length === 0) return { error: "Wallet not found in KolScan data" };

      const totalProfit = entries.reduce((s, e) => s + e.profit, 0);
      const totalWins = entries.reduce((s, e) => s + e.wins, 0);
      const totalLosses = entries.reduce((s, e) => s + e.losses, 0);

      return {
        name: entries[0].name,
        wallet: args.address,
        twitter: entries[0].twitter,
        total_profit: totalProfit,
        total_wins: totalWins,
        total_losses: totalLosses,
        win_rate: (totalWins + totalLosses) > 0 ? `${((totalWins / (totalWins + totalLosses)) * 100).toFixed(1)}%` : "N/A",
        timeframes: entries.map((e) => ({
          timeframe: e.timeframe === 1 ? "daily" : e.timeframe === 7 ? "weekly" : "monthly",
          profit: e.profit,
          wins: e.wins,
          losses: e.losses,
        })),
        links: {
          kolscan: `https://kolscan.io/${args.address}`,
          gmgn: `https://gmgn.ai/sol/address/${args.address}`,
          solscan: `https://solscan.io/account/${args.address}`,
        },
      };
    }

    case "gmgn_wallets": {
      const chain = args.chain || "sol";
      const wallets = chain === "bsc" ? [...bscGmgn] : [...solGmgn];
      const sort = args.sort || "realized_profit_7d";
      const order = args.order || "desc";
      const limit = Math.min(args.limit || 20, 100);
      const search = args.search?.toLowerCase();
      const category = args.category;

      let filtered = wallets;
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
        return order === "asc" ? av - bv : bv - av;
      });

      return {
        chain,
        total: filtered.length,
        data: filtered.slice(0, limit).map((w, i) => ({
          rank: i + 1,
          name: w.name,
          wallet: w.wallet_address,
          category: w.category,
          tags: w.tags,
          profit_1d: w.realized_profit_1d,
          profit_7d: w.realized_profit_7d,
          profit_30d: w.realized_profit_30d,
          buys_7d: w.buy_7d,
          sells_7d: w.sell_7d,
          winrate_7d: w.winrate_7d > 0 ? `${(w.winrate_7d * 100).toFixed(1)}%` : "N/A",
          twitter: w.twitter_username ? `https://x.com/${w.twitter_username}` : null,
        })),
      };
    }

    case "gmgn_wallet_detail": {
      const all = [...solGmgn, ...bscGmgn];
      const wallet = all.find((w) => w.wallet_address === args.address);
      if (!wallet) return { error: "Wallet not found in GMGN data" };

      return {
        name: wallet.name,
        wallet: wallet.wallet_address,
        chain: wallet.chain,
        category: wallet.category,
        tags: wallet.tags,
        twitter: wallet.twitter_username ? `https://x.com/${wallet.twitter_username}` : null,
        balance: wallet.balance,
        follow_count: wallet.follow_count,
        profit: {
          "1d": wallet.realized_profit_1d,
          "7d": wallet.realized_profit_7d,
          "30d": wallet.realized_profit_30d,
        },
        trades: {
          buys: { "1d": wallet.buy_1d, "7d": wallet.buy_7d, "30d": wallet.buy_30d },
          sells: { "1d": wallet.sell_1d, "7d": wallet.sell_7d, "30d": wallet.sell_30d },
        },
        winrate: {
          "7d": wallet.winrate_7d > 0 ? `${(wallet.winrate_7d * 100).toFixed(1)}%` : "N/A",
          "30d": wallet.winrate_30d > 0 ? `${(wallet.winrate_30d * 100).toFixed(1)}%` : "N/A",
        },
        links: {
          gmgn: `https://gmgn.ai/${wallet.chain === "bsc" ? "bsc" : "sol"}/address/${wallet.wallet_address}`,
          explorer: wallet.chain === "bsc"
            ? `https://bscscan.com/address/${wallet.wallet_address}`
            : `https://solscan.io/account/${wallet.wallet_address}`,
        },
      };
    }

    case "wallet_stats": {
      const kolAddresses = new Set(kolscanData.map((e) => e.wallet_address));

      const solCategories: Record<string, number> = {};
      for (const w of solGmgn) solCategories[w.category] = (solCategories[w.category] || 0) + 1;

      const bscCategories: Record<string, number> = {};
      for (const w of bscGmgn) bscCategories[w.category] = (bscCategories[w.category] || 0) + 1;

      return {
        kolscan: {
          unique_wallets: kolAddresses.size,
          total_entries: kolscanData.length,
          timeframes: [1, 7, 30],
        },
        gmgn_sol: {
          wallets: solGmgn.length,
          categories: solCategories,
        },
        gmgn_bsc: {
          wallets: bscGmgn.length,
          categories: bscCategories,
        },
        combined_solana: new Set([...kolAddresses, ...solGmgn.map((w) => w.wallet_address)]).size,
        total_all: kolAddresses.size + solGmgn.length + bscGmgn.length,
      };
    }

    case "search_wallets": {
      const q = (args.query || "").toLowerCase();
      const limit = Math.min(args.limit || 20, 100);
      if (!q) return { error: "Query is required" };

      const results: any[] = [];

      // Search KolScan
      const kolMatches = kolscanData
        .filter((e) => e.timeframe === 1)
        .filter((e) => e.name.toLowerCase().includes(q) || e.wallet_address.toLowerCase().includes(q));
      for (const e of kolMatches.slice(0, limit)) {
        results.push({
          source: "kolscan",
          chain: "sol",
          name: e.name,
          wallet: e.wallet_address,
          profit: e.profit,
          twitter: e.twitter,
        });
      }

      // Search GMGN SOL
      const solMatches = solGmgn.filter((w) =>
        w.name.toLowerCase().includes(q) ||
        w.wallet_address.toLowerCase().includes(q) ||
        (w.twitter_username && w.twitter_username.toLowerCase().includes(q))
      );
      for (const w of solMatches.slice(0, limit)) {
        results.push({
          source: "gmgn",
          chain: "sol",
          name: w.name,
          wallet: w.wallet_address,
          category: w.category,
          profit_7d: w.realized_profit_7d,
          twitter: w.twitter_username ? `https://x.com/${w.twitter_username}` : null,
        });
      }

      // Search GMGN BSC
      const bscMatches = bscGmgn.filter((w) =>
        w.name.toLowerCase().includes(q) ||
        w.wallet_address.toLowerCase().includes(q) ||
        (w.twitter_username && w.twitter_username.toLowerCase().includes(q))
      );
      for (const w of bscMatches.slice(0, limit)) {
        results.push({
          source: "gmgn",
          chain: "bsc",
          name: w.name,
          wallet: w.wallet_address,
          category: w.category,
          profit_7d: w.realized_profit_7d,
          twitter: w.twitter_username ? `https://x.com/${w.twitter_username}` : null,
        });
      }

      return { query: q, total: results.length, results: results.slice(0, limit) };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// --- Main: JSON-RPC over stdio ---
async function handleMessage(msg: JsonRpcRequest) {
  switch (msg.method) {
    case "initialize":
      respond(msg.id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: {
          name: "kolquest",
          version: "1.0.0",
        },
      });
      break;

    case "notifications/initialized":
      // No response needed for notifications
      break;

    case "tools/list":
      respond(msg.id, { tools: TOOLS });
      break;

    case "tools/call": {
      const { name, arguments: args } = msg.params;
      try {
        const result = executeTool(name, args || {});
        respond(msg.id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        });
      } catch (err: any) {
        respond(msg.id, {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        });
      }
      break;
    }

    default:
      respondError(msg.id, -32601, `Method not found: ${msg.method}`);
  }
}

// Read JSON-RPC from stdin (newline-delimited)
let buffer = "";

process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk: string) => {
  buffer += chunk;
  const lines = buffer.split("\n");
  buffer = lines.pop() || "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const msg = JSON.parse(trimmed);
      handleMessage(msg);
    } catch {
      // Skip malformed JSON
    }
  }
});

process.stderr.write("KolQuest MCP server started\n");
process.stderr.write(`Data loaded: ${kolscanData.length} KolScan entries, ${solGmgn.length} SOL GMGN wallets, ${bscGmgn.length} BSC GMGN wallets\n`);
process.stderr.write(`Tools available: ${TOOLS.map(t => t.name).join(", ")}\n`);
