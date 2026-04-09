import { NextRequest, NextResponse } from "next/server";
import {
  checkApiRateLimit,
  addRateLimitHeaders,
  createRateLimitResponse,
  getTierFromApiKey,
  trackRequest,
} from "@/lib/rate-limit/index";

const CACHE_TTL = 120; // seconds
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

// GET /api/proxy/unified/token/[address]?chain=solana|evm
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
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

  const chain = request.nextUrl.searchParams.get("chain") || "solana";
  const cacheKey = `unified:token:${chain}:${address}`;
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
  const dexscreenerBase = "https://api.dexscreener.com/latest/dex";

  let sources: Record<string, unknown> = {};

  if (chain === "solana") {
    const [birdeye, dexscreener, helius] = await Promise.allSettled([
      safeFetch(
        `https://public-api.birdeye.so/defi/token_overview?address=${address}`,
        { "X-API-KEY": birdeyeKey, "x-chain": "solana" }
      ),
      safeFetch(`${dexscreenerBase}/tokens/${address}`),
      safeFetch(
        `https://api.helius.xyz/v0/token-metadata?api-key=${process.env.HELIUS_API_KEY || ""}&query=${address}`
      ),
    ]);

    sources = {
      birdeye: birdeye.status === "fulfilled" ? (birdeye.value as any)?.data ?? null : null,
      dexscreener: dexscreener.status === "fulfilled" ? dexscreener.value : null,
      helius: helius.status === "fulfilled" ? helius.value : null,
    };

    // Normalize top-level fields from best available source
    const b = sources.birdeye as any;
    const d = (sources.dexscreener as any)?.pairs?.[0];
    const response = {
      address,
      chain: "solana",
      name: b?.name ?? d?.baseToken?.name ?? null,
      symbol: b?.symbol ?? d?.baseToken?.symbol ?? null,
      price: b?.price ?? parseFloat(d?.priceUsd ?? "0"),
      priceChange24h: b?.priceChange24hPercent ?? d?.priceChange?.h24 ?? null,
      volume24h: b?.v24hUSD ?? d?.volume?.h24 ?? null,
      marketCap: b?.mc ?? null,
      liquidity: b?.liquidity ?? d?.liquidity?.usd ?? null,
      logo: b?.logoURI ?? null,
      sources,
      fetchedAt: new Date().toISOString(),
    };

    cache.set(cacheKey, { data: response, timestamp: now });
    const resp = NextResponse.json(response);
    addRateLimitHeaders(resp, result);
    await trackRequest(apiKey || userIp, request.nextUrl.pathname, false);
    return resp;
  }

  // EVM token
  const [coingecko, dexscreener, moralis] = await Promise.allSettled([
    coingeckoKey
      ? safeFetch(
          `https://api.coingecko.com/api/v3/coins/ethereum/contract/${address}?x_cg_demo_api_key=${coingeckoKey}`
        )
      : Promise.resolve(null),
    safeFetch(`${dexscreenerBase}/tokens/${address}`),
    process.env.MORALIS_API_KEY
      ? safeFetch(
          `https://deep-index.moralis.io/api/v2.2/erc20/metadata?chain=${chain}&addresses%5B0%5D=${address}`,
          { "X-API-Key": process.env.MORALIS_API_KEY }
        )
      : Promise.resolve(null),
  ]);

  sources = {
    coingecko: coingecko.status === "fulfilled" ? coingecko.value : null,
    dexscreener: dexscreener.status === "fulfilled" ? dexscreener.value : null,
    moralis: moralis.status === "fulfilled" ? moralis.value : null,
  };

  const cg = sources.coingecko as any;
  const d = (sources.dexscreener as any)?.pairs?.[0];
  const m = Array.isArray(sources.moralis) ? (sources.moralis as any[])[0] : null;

  const response = {
    address,
    chain: chain === "evm" ? "ethereum" : chain,
    name: cg?.name ?? d?.baseToken?.name ?? m?.name ?? null,
    symbol: cg?.symbol?.toUpperCase() ?? d?.baseToken?.symbol ?? m?.symbol ?? null,
    price: cg?.market_data?.current_price?.usd ?? parseFloat(d?.priceUsd ?? "0"),
    priceChange24h: cg?.market_data?.price_change_percentage_24h ?? d?.priceChange?.h24 ?? null,
    volume24h: cg?.market_data?.total_volume?.usd ?? d?.volume?.h24 ?? null,
    marketCap: cg?.market_data?.market_cap?.usd ?? null,
    liquidity: d?.liquidity?.usd ?? null,
    logo: cg?.image?.large ?? null,
    sources,
    fetchedAt: new Date().toISOString(),
  };

  cache.set(cacheKey, { data: response, timestamp: now });
  const resp = NextResponse.json(response);
  addRateLimitHeaders(resp, result);
  await trackRequest(apiKey || userIp, request.nextUrl.pathname, false);
  return resp;
}
