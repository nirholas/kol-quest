import { NextRequest, NextResponse } from "next/server";
import {
  checkApiRateLimit,
  addRateLimitHeaders,
  createRateLimitResponse,
  getTierFromApiKey,
  trackRequest,
} from "@/lib/rate-limit/index";

const CACHE_TTL = 60; // seconds
const cache = new Map<string, { data: unknown; timestamp: number }>();

async function safeFetch(url: string, headers?: Record<string, string>): Promise<unknown> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", ...headers },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

// GET /api/proxy/unified/trending?chains=solana,eth&limit=20
export async function GET(request: NextRequest) {
  const userIp = request.headers.get("x-forwarded-for") || "127.0.0.1";
  const apiKey =
    request.headers.get("x-api-key") ||
    request.headers.get("authorization")?.replace("Bearer ", "") ||
    null;

  const tier = await getTierFromApiKey(apiKey);
  const result = await checkApiRateLimit(request, apiKey, userIp, tier);
  if (!result.success || !result.quotaAllowed) {
    await trackRequest(apiKey || userIp, request.nextUrl.pathname, true);
    return createRateLimitResponse(result);
  }

  const chainsParam = request.nextUrl.searchParams.get("chains") || "solana,eth";
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") || "20"), 100);
  const chains = chainsParam.split(",").map((c) => c.trim()).filter(Boolean);

  const cacheKey = `unified:trending:${chains.join(",")}:${limit}`;
  const cached = cache.get(cacheKey);
  const now = Date.now();
  if (cached && now < cached.timestamp + CACHE_TTL * 1000) {
    const resp = NextResponse.json(cached.data);
    addRateLimitHeaders(resp, result);
    await trackRequest(apiKey || userIp, request.nextUrl.pathname, false);
    return resp;
  }

  const birdeyeKey = process.env.BIRDEYE_API_KEY || "";
  const coingeckoKey = process.env.COINGECKO_API_KEY || "";

  const fetchPromises: Promise<unknown>[] = [];
  const labels: string[] = [];

  if (chains.includes("solana")) {
    labels.push("birdeye_trending");
    fetchPromises.push(
      safeFetch(
        `https://public-api.birdeye.so/defi/token_trending?sort_by=rank&sort_type=asc&offset=0&limit=${limit}`,
        { "X-API-KEY": birdeyeKey, "x-chain": "solana" }
      )
    );

    labels.push("geckoterminal_solana");
    fetchPromises.push(
      safeFetch(
        "https://api.geckoterminal.com/api/v2/networks/solana/trending_pools?page=1",
        { Accept: "application/json;version=20230302" }
      )
    );
  }

  if (chains.some((c) => ["eth", "bsc", "polygon", "base", "arbitrum"].includes(c))) {
    labels.push("coingecko_trending");
    fetchPromises.push(
      safeFetch(
        `https://api.coingecko.com/api/v3/search/trending${coingeckoKey ? `?x_cg_demo_api_key=${coingeckoKey}` : ""}`
      )
    );

    labels.push("dexscreener_trending");
    fetchPromises.push(
      safeFetch("https://api.dexscreener.com/token-boosts/top/v1")
    );
  }

  const results = await Promise.allSettled(fetchPromises);

  const sourceMap: Record<string, unknown> = {};
  results.forEach((r, i) => {
    sourceMap[labels[i]] = r.status === "fulfilled" ? r.value : null;
  });

  // Normalize into a unified trending list
  const items: {
    chain: string;
    address: string;
    name: string;
    symbol: string;
    price?: number;
    volume24h?: number;
    priceChange24h?: number;
    source: string;
  }[] = [];

  const birdeye = sourceMap["birdeye_trending"] as any;
  if (birdeye?.data?.items) {
    for (const t of birdeye.data.items.slice(0, limit)) {
      items.push({
        chain: "solana",
        address: t.address ?? "",
        name: t.name ?? "",
        symbol: t.symbol ?? "",
        price: t.price,
        volume24h: t.v24hUSD,
        priceChange24h: t.priceChange24hPercent,
        source: "birdeye",
      });
    }
  }

  const cgTrending = sourceMap["coingecko_trending"] as any;
  if (cgTrending?.coins) {
    for (const t of cgTrending.coins.slice(0, limit)) {
      const coin = t.item;
      items.push({
        chain: coin.platforms?.["ethereum"] ? "eth" : "unknown",
        address: coin.platforms?.["ethereum"] ?? coin.id,
        name: coin.name ?? "",
        symbol: coin.symbol ?? "",
        price: coin.data?.price,
        volume24h: undefined,
        priceChange24h: coin.data?.price_change_percentage_24h?.usd,
        source: "coingecko",
      });
    }
  }

  const response = {
    chains,
    limit,
    items: items.slice(0, limit),
    totalSources: Object.values(sourceMap).filter(Boolean).length,
    sources: Object.fromEntries(
      Object.entries(sourceMap).map(([k, v]) => [k, v !== null])
    ),
    fetchedAt: new Date().toISOString(),
  };

  cache.set(cacheKey, { data: response, timestamp: now });
  const resp = NextResponse.json(response);
  addRateLimitHeaders(resp, result);
  await trackRequest(apiKey || userIp, request.nextUrl.pathname, false);
  return resp;
}
