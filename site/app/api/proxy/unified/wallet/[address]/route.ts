import { NextRequest, NextResponse } from "next/server";
import {
  checkApiRateLimit,
  addRateLimitHeaders,
  createRateLimitResponse,
  getTierFromApiKey,
  trackRequest,
} from "@/lib/rate-limit/index";

const CACHE_TTL = 90; // seconds
const cache = new Map<string, { data: unknown; timestamp: number }>();

/** Detect the chain for a given address by shape */
function detectChain(address: string): "solana" | "evm" | "unknown" {
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return "solana";
  if (/^0x[0-9a-fA-F]{40}$/.test(address)) return "evm";
  return "unknown";
}

async function safeFetch(url: string, init?: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      ...init,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

// GET /api/proxy/unified/wallet/[address]?chain=auto|solana|evm
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

  const cacheKey = `unified:wallet:${address}`;
  const cached = cache.get(cacheKey);
  const now = Date.now();
  if (cached && now < cached.timestamp + CACHE_TTL * 1000) {
    const resp = NextResponse.json(cached.data);
    addRateLimitHeaders(resp, result);
    await trackRequest(apiKey || userIp, request.nextUrl.pathname, false);
    return resp;
  }

  const chainParam = request.nextUrl.searchParams.get("chain") || "auto";
  const chain =
    chainParam === "auto" ? detectChain(address) : (chainParam as string);

  let data: unknown;

  if (chain === "solana") {
    // Re-use solana/wallet unified endpoint data
    const origin = request.nextUrl.origin;
    data = await safeFetch(
      `${origin}/api/proxy/solana/wallet/${address}`,
      {
        headers: {
          ...(apiKey ? { "x-api-key": apiKey } : {}),
          "x-forwarded-for": userIp,
        },
      }
    );
    data = { chain: "solana", ...(data as object) };
  } else if (chain === "evm") {
    const chainsParam =
      request.nextUrl.searchParams.get("chains") || "eth,bsc,polygon";
    const origin = request.nextUrl.origin;
    data = await safeFetch(
      `${origin}/api/proxy/evm/wallet/${address}?chains=${chainsParam}`,
      {
        headers: {
          ...(apiKey ? { "x-api-key": apiKey } : {}),
          "x-forwarded-for": userIp,
        },
      }
    );
    data = { chain: "evm", ...(data as object) };
  } else {
    // Unknown chain – try both and merge
    const origin = request.nextUrl.origin;
    const [sol, evm] = await Promise.allSettled([
      safeFetch(`${origin}/api/proxy/solana/wallet/${address}`, {
        headers: {
          ...(apiKey ? { "x-api-key": apiKey } : {}),
          "x-forwarded-for": userIp,
        },
      }),
      safeFetch(
        `${origin}/api/proxy/evm/wallet/${address}?chains=eth,bsc`,
        {
          headers: {
            ...(apiKey ? { "x-api-key": apiKey } : {}),
            "x-forwarded-for": userIp,
          },
        }
      ),
    ]);
    data = {
      chain: "unknown",
      solana:
        sol.status === "fulfilled" && sol.value ? sol.value : null,
      evm:
        evm.status === "fulfilled" && evm.value ? evm.value : null,
    };
  }

  const response = {
    address,
    detectedChain: chain,
    data,
    fetchedAt: new Date().toISOString(),
  };

  cache.set(cacheKey, { data: response, timestamp: now });
  const resp = NextResponse.json(response);
  addRateLimitHeaders(resp, result);
  await trackRequest(apiKey || userIp, request.nextUrl.pathname, false);
  return resp;
}
