import { NextRequest, NextResponse } from "next/server";
import { X402_PAYMENT_ADDRESS } from "@/lib/x402";

/** USDC contract on Base mainnet */
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

/** $0.01 USDC in micro-USDC (6 decimals) */
const PRICE_PER_REQUEST = "10000";

const BASE_URL = (process.env.NEXT_PUBLIC_URL || "https://kol.quest").replace(/\/$/, "");

// ---------------------------------------------------------------------------
// JSON-Schema helpers
// ---------------------------------------------------------------------------

type JsonSchema = Record<string, unknown>;

function strProp(description: string): JsonSchema {
  return { type: "string", description };
}

function intProp(description: string, minimum?: number): JsonSchema {
  return minimum !== undefined
    ? { type: "integer", description, minimum }
    : { type: "integer", description };
}

const PAGINATION_PARAMS: JsonSchema = {
  type: "object",
  properties: {
    page: intProp("Page number (1-based)", 1),
    limit: intProp("Results per page (max 200)", 1),
  },
};

const WALLET_OBJECT: JsonSchema = {
  type: "object",
  properties: {
    address: strProp("Wallet address"),
    name: strProp("Display name"),
    twitter_username: strProp("X/Twitter handle"),
    realized_pnl_30d: { type: "number", description: "Realized PnL last 30 days (USD)" },
    winrate: { type: "number", description: "Win rate 0-1" },
    chain: { type: "string", enum: ["solana", "bsc"], description: "Chain identifier" },
    tags: { type: "array", items: { type: "string" }, description: "Classification tags" },
  },
};

// ---------------------------------------------------------------------------
// Resource definitions
// ---------------------------------------------------------------------------

interface ResourceDef {
  path: string;
  description: string;
  method: "GET" | "POST";
  queryParams?: JsonSchema;
  outputSchema?: JsonSchema;
  tags?: string[];
}

const RESOURCE_DEFS: ResourceDef[] = [
  {
    path: "/api/wallets",
    description: "List KOL wallets with performance metrics (Solana + BSC)",
    method: "GET",
    queryParams: {
      type: "object",
      properties: {
        ...((PAGINATION_PARAMS.properties) as Record<string, JsonSchema>),
        chain: strProp("Filter by chain: solana | bsc"),
        sort: strProp("Sort field: winrate | realized_pnl_30d | name"),
        order: strProp("Sort direction: asc | desc"),
      },
    },
    outputSchema: {
      type: "object",
      properties: {
        wallets: { type: "array", items: WALLET_OBJECT },
        total: intProp("Total count"),
        page: intProp("Current page"),
        totalPages: intProp("Total pages"),
      },
    },
    tags: ["wallets", "kol", "solana", "bsc"],
  },
  {
    path: "/api/wallets/solana",
    description: "List Solana-only KOL wallets",
    method: "GET",
    queryParams: PAGINATION_PARAMS,
    outputSchema: {
      type: "object",
      properties: {
        wallets: { type: "array", items: WALLET_OBJECT },
        total: intProp("Total count"),
      },
    },
    tags: ["wallets", "kol", "solana"],
  },
  {
    path: "/api/leaderboard",
    description: "KolScan leaderboard rankings of top on-chain influencers",
    method: "GET",
    queryParams: {
      type: "object",
      properties: {
        ...((PAGINATION_PARAMS.properties) as Record<string, JsonSchema>),
        sort: strProp("Sort field"),
        order: strProp("asc | desc"),
      },
    },
    outputSchema: {
      type: "object",
      properties: {
        entries: {
          type: "array",
          items: {
            type: "object",
            properties: {
              rank: intProp("Leaderboard rank"),
              address: strProp("Wallet address"),
              name: strProp("Display name"),
              pnl_7d: { type: "number" },
              pnl_30d: { type: "number" },
              winrate: { type: "number" },
            },
          },
        },
        total: intProp("Total entries"),
      },
    },
    tags: ["leaderboard", "kol", "rankings"],
  },
  {
    path: "/api/trades",
    description: "Recent on-chain trade activity from tracked KOL wallets",
    method: "GET",
    queryParams: {
      type: "object",
      properties: {
        ...((PAGINATION_PARAMS.properties) as Record<string, JsonSchema>),
        wallet: strProp("Filter by wallet address"),
        token: strProp("Filter by token address"),
        chain: strProp("Filter by chain"),
      },
    },
    outputSchema: {
      type: "object",
      properties: {
        trades: {
          type: "array",
          items: {
            type: "object",
            properties: {
              wallet: strProp("Trader wallet address"),
              token: strProp("Token contract address"),
              side: { type: "string", enum: ["buy", "sell"] },
              amount_usd: { type: "number" },
              timestamp: { type: "string", format: "date-time" },
              tx_hash: strProp("Transaction hash"),
            },
          },
        },
        total: intProp("Total trades"),
      },
    },
    tags: ["trades", "on-chain", "activity"],
  },
  {
    path: "/api/x-profiles",
    description: "X/Twitter profiles matched to KOL wallet addresses",
    method: "GET",
    queryParams: {
      type: "object",
      properties: {
        ...((PAGINATION_PARAMS.properties) as Record<string, JsonSchema>),
        sort: strProp("followers | subscribers | handle | name"),
        order: strProp("asc | desc"),
        tag: strProp("Filter by tag"),
      },
    },
    outputSchema: {
      type: "object",
      properties: {
        accounts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              handle: strProp("X/Twitter handle"),
              name: strProp("Display name"),
              followers: intProp("Follower count"),
              avatar: strProp("Avatar image URL"),
              wallet: strProp("Associated wallet address"),
            },
          },
        },
        total: intProp("Total accounts"),
      },
    },
    tags: ["social", "twitter", "profiles"],
  },
  {
    path: "/api/search",
    description: "Search wallets, tokens, and KOL profiles",
    method: "GET",
    queryParams: {
      type: "object",
      required: ["q"],
      properties: {
        q: strProp("Search query — address, name, or token symbol"),
        limit: intProp("Max results", 1),
      },
    },
    outputSchema: {
      type: "object",
      properties: {
        wallets: { type: "array", items: WALLET_OBJECT },
        tokens: { type: "array", items: { type: "object" } },
      },
    },
    tags: ["search"],
  },
  {
    path: "/api/smart-money/feed",
    description: "Live smart money trade feed from top KOL wallets",
    method: "GET",
    queryParams: {
      type: "object",
      properties: {
        limit: intProp("Number of trades (max 100)", 1),
      },
    },
    outputSchema: {
      type: "object",
      properties: {
        trades: { type: "array", items: { type: "object" } },
      },
    },
    tags: ["smart-money", "trades", "live"],
  },
  {
    path: "/api/smart-money/accumulation",
    description: "Token accumulation signals from KOL wallets",
    method: "GET",
    queryParams: {
      type: "object",
      properties: {
        limit: intProp("Number of signals (max 100)", 1),
        min_wallets: intProp("Minimum wallet count threshold", 1),
      },
    },
    outputSchema: {
      type: "object",
      properties: {
        signals: {
          type: "array",
          items: {
            type: "object",
            properties: {
              token: strProp("Token address"),
              symbol: strProp("Token symbol"),
              wallet_count: intProp("Number of KOL wallets accumulating"),
              total_usd: { type: "number", description: "Total USD accumulated" },
            },
          },
        },
      },
    },
    tags: ["smart-money", "accumulation", "signals"],
  },
  {
    path: "/api/token/{chain}/{address}",
    description: "Token details, price, and metadata for any token",
    method: "GET",
    queryParams: {
      type: "object",
      properties: {
        chain: strProp("Chain: solana | eth | base | bsc"),
        address: strProp("Token contract address"),
      },
    },
    outputSchema: {
      type: "object",
      properties: {
        address: strProp("Token contract address"),
        symbol: strProp("Ticker symbol"),
        name: strProp("Token name"),
        price_usd: { type: "number" },
        market_cap: { type: "number" },
        volume_24h: { type: "number" },
        price_change_24h: { type: "number" },
      },
    },
    tags: ["token", "price", "metadata"],
  },
  {
    path: "/api/token/{chain}/{address}/holders",
    description: "Top holders of a token",
    method: "GET",
    queryParams: {
      type: "object",
      properties: {
        limit: intProp("Number of holders (max 100)", 1),
      },
    },
    outputSchema: {
      type: "object",
      properties: {
        holders: {
          type: "array",
          items: {
            type: "object",
            properties: {
              address: strProp("Holder wallet address"),
              balance: { type: "number" },
              percentage: { type: "number" },
            },
          },
        },
      },
    },
    tags: ["token", "holders"],
  },
  {
    path: "/api/token/{chain}/{address}/kol-holdings",
    description: "Which KOL wallets hold a given token",
    method: "GET",
    outputSchema: {
      type: "object",
      properties: {
        kols: {
          type: "array",
          items: {
            type: "object",
            properties: {
              wallet: strProp("KOL wallet address"),
              name: strProp("KOL display name"),
              balance: { type: "number" },
              value_usd: { type: "number" },
            },
          },
        },
        total_kols: intProp("Number of KOLs holding this token"),
      },
    },
    tags: ["token", "kol", "holdings"],
  },
  {
    path: "/api/token/{chain}/{address}/trades",
    description: "Recent trades for a specific token",
    method: "GET",
    queryParams: PAGINATION_PARAMS,
    outputSchema: {
      type: "object",
      properties: {
        trades: { type: "array", items: { type: "object" } },
        total: intProp("Total trade count"),
      },
    },
    tags: ["token", "trades"],
  },
  {
    path: "/api/scanner/{address}",
    description: "Token scanner — risk analysis, KOL check, and holder breakdown",
    method: "GET",
    outputSchema: {
      type: "object",
      properties: {
        address: strProp("Token address"),
        risk_score: { type: "number", description: "Risk score 0-100 (lower is safer)" },
        kol_holders: intProp("Number of KOL wallets holding this token"),
        top_holders_pct: { type: "number", description: "Percentage held by top 10 holders" },
        is_renounced: { type: "boolean" },
        flags: { type: "array", items: { type: "string" }, description: "Risk flag labels" },
      },
    },
    tags: ["scanner", "risk", "analysis"],
  },
  {
    path: "/api/portfolio/{address}",
    description: "Full portfolio breakdown for any EVM wallet address",
    method: "GET",
    outputSchema: {
      type: "object",
      properties: {
        address: strProp("Wallet address"),
        total_usd: { type: "number" },
        tokens: {
          type: "array",
          items: {
            type: "object",
            properties: {
              token: strProp("Token address"),
              symbol: strProp("Token symbol"),
              balance: { type: "number" },
              value_usd: { type: "number" },
            },
          },
        },
      },
    },
    tags: ["portfolio", "evm", "holdings"],
  },
];

// ---------------------------------------------------------------------------
// Build discovery items
// ---------------------------------------------------------------------------

function buildItems() {
  const now = new Date().toISOString();
  return RESOURCE_DEFS.map(({ path, description, method, queryParams, outputSchema, tags }) => {
    const resource = `${BASE_URL}${path}`;
    return {
      resource,
      type: "http" as const,
      x402Version: 1,
      accepts: [
        {
          scheme: "exact",
          network: "base",
          maxAmountRequired: PRICE_PER_REQUEST,
          resource,
          description,
          mimeType: "application/json",
          payTo: X402_PAYMENT_ADDRESS,
          maxTimeoutSeconds: 300,
          asset: USDC_BASE,
          outputSchema: {
            input: {
              type: "http",
              method,
              discoverable: true,
              ...(queryParams ? { queryParams } : {}),
            },
            output: outputSchema ?? { type: "object" },
          },
          extra: { name: "USD Coin", version: "2" },
        },
      ],
      lastUpdated: now,
      metadata: { tags: tags ?? [] },
    };
  });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

  const all = buildItems();
  const total = all.length;
  const items = all.slice(offset, offset + limit);

  return NextResponse.json(
    {
      x402Version: 1,
      items,
      pagination: { limit, offset, total },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
