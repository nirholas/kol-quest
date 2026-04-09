import { NextResponse } from "next/server";

// OpenAPI 3.0 specification for KolQuest API
const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "KolQuest API",
    version: "1.0.0",
    description:
      "Unified crypto wallet intelligence API — aggregates KOL/smart money data from KolScan, GMGN, and on-chain sources.",
    contact: {
      name: "KolQuest",
      url: "https://kol.quest",
    },
  },
  servers: [
    {
      url: "https://kol.quest/api",
      description: "Production",
    },
    {
      url: "http://localhost:3000/api",
      description: "Local development",
    },
  ],
  paths: {
    "/wallets": {
      get: {
        summary: "List all wallets",
        description:
          "Unified wallet listing across KolScan and GMGN data sources. Supports filtering by chain, source, category, and search.",
        operationId: "listWallets",
        tags: ["Wallets"],
        parameters: [
          {
            name: "chain",
            in: "query",
            schema: { type: "string", enum: ["sol", "bsc", "all"], default: "all" },
            description: "Filter by blockchain",
          },
          {
            name: "source",
            in: "query",
            schema: { type: "string", enum: ["kolscan", "gmgn", "all"], default: "all" },
            description: "Filter by data source",
          },
          {
            name: "category",
            in: "query",
            schema: { type: "string" },
            description: "Filter by wallet category (kol, smart_degen, snipe_bot, etc.)",
          },
          {
            name: "search",
            in: "query",
            schema: { type: "string" },
            description: "Search by name, address, or twitter handle",
          },
          {
            name: "sort",
            in: "query",
            schema: {
              type: "string",
              enum: ["profit_1d", "profit_7d", "profit_30d", "winrate_7d", "buys_7d", "name"],
              default: "profit_7d",
            },
            description: "Sort field",
          },
          {
            name: "order",
            in: "query",
            schema: { type: "string", enum: ["asc", "desc"], default: "desc" },
            description: "Sort order",
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1, default: 1 },
            description: "Page number",
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
            description: "Results per page",
          },
          {
            name: "minProfit",
            in: "query",
            schema: { type: "number" },
            description: "Minimum 7-day profit threshold",
          },
          {
            name: "tag",
            in: "query",
            schema: { type: "string" },
            description: "Filter by tag (e.g., 'kolscan')",
          },
        ],
        responses: {
          200: {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    wallets: {
                      type: "array",
                      items: { $ref: "#/components/schemas/UnifiedWallet" },
                    },
                    total: { type: "integer" },
                    page: { type: "integer" },
                    limit: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/wallets/{address}": {
      get: {
        summary: "Get wallet details",
        description: "Detailed wallet data including profit/loss, win rates, and trade history.",
        operationId: "getWallet",
        tags: ["Wallets"],
        parameters: [
          {
            name: "address",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Wallet address",
          },
        ],
        responses: {
          200: {
            description: "Wallet data",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WalletDetail" },
              },
            },
          },
          404: {
            description: "Wallet not found",
          },
        },
      },
    },
    "/trending": {
      get: {
        summary: "Get trending tokens",
        description:
          "Tokens trending based on smart money activity. Aggregates data from multiple sources.",
        operationId: "getTrending",
        tags: ["Tokens"],
        parameters: [
          {
            name: "source",
            in: "query",
            schema: { type: "string", enum: ["aggregated", "db"], default: "aggregated" },
            description: "Data source — 'aggregated' for external APIs, 'db' for tracked wallet activity",
          },
          {
            name: "chain",
            in: "query",
            schema: { type: "string", enum: ["sol", "bsc", "eth"] },
            description: "Filter by blockchain",
          },
          {
            name: "category",
            in: "query",
            schema: { type: "string" },
            description: "Token category filter",
          },
          {
            name: "timeframe",
            in: "query",
            schema: { type: "string", enum: ["1h", "24h", "7d"], default: "24h" },
            description: "Trending timeframe",
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
            description: "Number of results",
          },
          {
            name: "minLiquidity",
            in: "query",
            schema: { type: "number" },
            description: "Minimum liquidity filter ($USD)",
          },
          {
            name: "hideRugs",
            in: "query",
            schema: { type: "boolean", default: false },
            description: "Hide tokens flagged as potential rugs",
          },
        ],
        responses: {
          200: {
            description: "Trending tokens",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    tokens: {
                      type: "array",
                      items: { $ref: "#/components/schemas/TrendingToken" },
                    },
                    sources: {
                      type: "object",
                      description: "Source availability status",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/token": {
      get: {
        summary: "Get token activity",
        description: "Smart money trading activity for a specific token.",
        operationId: "getToken",
        tags: ["Tokens"],
        parameters: [
          {
            name: "token",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Token contract address",
          },
          {
            name: "chain",
            in: "query",
            schema: { type: "string", enum: ["sol", "bsc"], default: "sol" },
            description: "Blockchain",
          },
        ],
        responses: {
          200: {
            description: "Token activity data",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TokenActivity" },
              },
            },
          },
          400: {
            description: "Token param required",
          },
        },
      },
    },
    "/token/{chain}/{address}": {
      get: {
        summary: "Get token details",
        description: "Comprehensive token data — price, holders, trading history.",
        operationId: "getTokenDetails",
        tags: ["Tokens"],
        parameters: [
          {
            name: "chain",
            in: "path",
            required: true,
            schema: { type: "string", enum: ["sol", "bsc", "eth"] },
            description: "Blockchain",
          },
          {
            name: "address",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Token contract address",
          },
        ],
        responses: {
          200: {
            description: "Token details",
          },
          404: {
            description: "Token not found",
          },
        },
      },
    },
    "/token/{chain}/{address}/security": {
      get: {
        summary: "Token security analysis",
        description: "Security scan: honeypot detection, holder distribution, contract risks.",
        operationId: "getTokenSecurity",
        tags: ["Tokens"],
        parameters: [
          {
            name: "chain",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "address",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Security analysis",
          },
        },
      },
    },
    "/trades": {
      get: {
        summary: "Get trade feed",
        description: "Recent trades from tracked smart money wallets.",
        operationId: "getTrades",
        tags: ["Trades"],
        parameters: [
          {
            name: "chain",
            in: "query",
            schema: { type: "string", enum: ["sol", "bsc"] },
          },
          {
            name: "wallet",
            in: "query",
            schema: { type: "string" },
            description: "Filter by wallet address",
          },
          {
            name: "token",
            in: "query",
            schema: { type: "string" },
            description: "Filter by token address",
          },
          {
            name: "type",
            in: "query",
            schema: { type: "string", enum: ["buy", "sell"] },
            description: "Filter by trade type",
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 50 },
          },
          {
            name: "since",
            in: "query",
            schema: { type: "string", format: "date-time" },
            description: "ISO timestamp — trades after this time",
          },
        ],
        responses: {
          200: {
            description: "Trade feed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    trades: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Trade" },
                    },
                    count: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/search": {
      get: {
        summary: "Global search",
        description: "Search wallets and tokens across all data sources.",
        operationId: "search",
        tags: ["Search"],
        parameters: [
          {
            name: "q",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Search query",
          },
          {
            name: "type",
            in: "query",
            schema: { type: "string", enum: ["wallet", "token", "all"], default: "all" },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20 },
          },
        ],
        responses: {
          200: {
            description: "Search results",
          },
        },
      },
    },
    "/x-tracker": {
      get: {
        summary: "X/Twitter tracker",
        description: "KOLs tracked via GMGN's X tracker — smart money linked to X accounts.",
        operationId: "getXTracker",
        tags: ["Social"],
        responses: {
          200: {
            description: "X tracker data",
          },
        },
      },
    },
    "/x-profiles": {
      get: {
        summary: "X/Twitter profiles",
        description: "X profile metadata for tracked KOLs.",
        operationId: "getXProfiles",
        tags: ["Social"],
        responses: {
          200: {
            description: "X profiles",
          },
        },
      },
    },
    "/health": {
      get: {
        summary: "Health check",
        description: "API health status with data source availability.",
        operationId: "healthCheck",
        tags: ["System"],
        responses: {
          200: {
            description: "Healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string" },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/watchlist": {
      get: {
        summary: "Get user watchlist",
        description: "Authenticated user's watched wallets.",
        operationId: "getWatchlist",
        tags: ["User"],
        security: [{ cookieAuth: [] }],
        responses: {
          200: {
            description: "Watchlist",
          },
          401: {
            description: "Unauthorized",
          },
        },
      },
      post: {
        summary: "Add to watchlist",
        description: "Add a wallet to the user's watchlist.",
        operationId: "addToWatchlist",
        tags: ["User"],
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["walletAddress", "chain"],
                properties: {
                  walletAddress: { type: "string" },
                  chain: { type: "string" },
                  label: { type: "string" },
                  groupName: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Added",
          },
          401: {
            description: "Unauthorized",
          },
        },
      },
      delete: {
        summary: "Remove from watchlist",
        operationId: "removeFromWatchlist",
        tags: ["User"],
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["walletAddress"],
                properties: {
                  walletAddress: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Removed",
          },
        },
      },
    },
    "/submissions": {
      get: {
        summary: "List wallet submissions",
        description: "Community-submitted wallets awaiting approval.",
        operationId: "listSubmissions",
        tags: ["Community"],
        responses: {
          200: {
            description: "Submissions list",
          },
        },
      },
      post: {
        summary: "Submit a wallet",
        description: "Submit a new wallet for community review.",
        operationId: "createSubmission",
        tags: ["Community"],
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["walletAddress", "chain", "label"],
                properties: {
                  walletAddress: { type: "string" },
                  chain: { type: "string" },
                  label: { type: "string" },
                  notes: { type: "string" },
                  twitter: { type: "string" },
                  telegram: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Created",
          },
          401: {
            description: "Unauthorized",
          },
        },
      },
    },
    "/submissions/{id}/vouch": {
      post: {
        summary: "Vouch for submission",
        description: "Vouch for a pending wallet submission.",
        operationId: "vouchSubmission",
        tags: ["Community"],
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Vouched",
          },
        },
      },
    },
    "/feedback": {
      post: {
        summary: "Submit feedback",
        description: "Submit feedback or a wallet removal request.",
        operationId: "submitFeedback",
        tags: ["Feedback"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["message"],
                properties: {
                  type: { type: "string", enum: ["feedback", "removal_request"] },
                  message: { type: "string" },
                  walletAddress: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Submitted",
          },
        },
      },
    },
  },
  components: {
    schemas: {
      UnifiedWallet: {
        type: "object",
        properties: {
          wallet_address: { type: "string" },
          name: { type: "string" },
          twitter: { type: "string", nullable: true },
          avatar: { type: "string", nullable: true },
          chain: { type: "string" },
          source: { type: "string", enum: ["kolscan", "gmgn"] },
          category: { type: "string", nullable: true },
          tags: { type: "array", items: { type: "string" } },
          profit_1d: { type: "number" },
          profit_7d: { type: "number" },
          profit_30d: { type: "number" },
          winrate_7d: { type: "number" },
          buys_7d: { type: "integer" },
          sells_7d: { type: "integer" },
        },
      },
      WalletDetail: {
        type: "object",
        properties: {
          wallet: { $ref: "#/components/schemas/UnifiedWallet" },
          trades: {
            type: "array",
            items: { $ref: "#/components/schemas/Trade" },
          },
          pnl: {
            type: "object",
            properties: {
              realized: { type: "number" },
              unrealized: { type: "number" },
            },
          },
        },
      },
      TrendingToken: {
        type: "object",
        properties: {
          address: { type: "string" },
          symbol: { type: "string" },
          name: { type: "string" },
          logo: { type: "string", nullable: true },
          chain: { type: "string" },
          price: { type: "number" },
          priceChange24h: { type: "number" },
          volume24h: { type: "number" },
          liquidity: { type: "number" },
          buyCount: { type: "integer" },
          uniqueBuyers: { type: "integer" },
          smartMoneyScore: { type: "number" },
        },
      },
      TokenActivity: {
        type: "object",
        properties: {
          token: {
            type: "object",
            properties: {
              address: { type: "string" },
              symbol: { type: "string" },
              name: { type: "string" },
              logo: { type: "string", nullable: true },
              chain: { type: "string" },
            },
          },
          totalTrades: { type: "integer" },
          uniqueWallets: { type: "integer" },
          totalBuyVolume: { type: "number" },
          totalSellVolume: { type: "number" },
          wallets: {
            type: "array",
            items: {
              type: "object",
              properties: {
                address: { type: "string" },
                label: { type: "string", nullable: true },
                buys: { type: "integer" },
                sells: { type: "integer" },
                totalBuyUsd: { type: "number" },
                totalSellUsd: { type: "number" },
                realizedProfit: { type: "number" },
              },
            },
          },
        },
      },
      Trade: {
        type: "object",
        properties: {
          id: { type: "string" },
          walletAddress: { type: "string" },
          walletLabel: { type: "string", nullable: true },
          chain: { type: "string" },
          type: { type: "string", enum: ["buy", "sell"] },
          tokenAddress: { type: "string" },
          tokenSymbol: { type: "string" },
          tokenName: { type: "string" },
          tokenLogo: { type: "string", nullable: true },
          amountUsd: { type: "number" },
          amountToken: { type: "number" },
          priceUsd: { type: "number" },
          realizedProfit: { type: "number", nullable: true },
          txHash: { type: "string" },
          tradedAt: { type: "string", format: "date-time" },
        },
      },
    },
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "session",
        description: "Session cookie from authentication",
      },
      apiKeyHeader: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
        description: "API key for external access (coming soon)",
      },
    },
  },
  tags: [
    {
      name: "Wallets",
      description: "Wallet data — KOLs and smart money",
    },
    {
      name: "Tokens",
      description: "Token data — trending, security, activity",
    },
    {
      name: "Trades",
      description: "Trade feed from tracked wallets",
    },
    {
      name: "Search",
      description: "Global search",
    },
    {
      name: "Social",
      description: "X/Twitter integration",
    },
    {
      name: "User",
      description: "Authenticated user features",
    },
    {
      name: "Community",
      description: "Community submissions and vouching",
    },
    {
      name: "Feedback",
      description: "Feedback and removal requests",
    },
    {
      name: "System",
      description: "Health and status",
    },
  ],
};

export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "application/json",
    },
  });
}
