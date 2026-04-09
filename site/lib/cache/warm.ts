/**
 * Cache warming
 *
 * Pre-populate cache with popular endpoints to reduce cold-start latency.
 */

import { getWithSWR } from "./stale";
import { getCacheConfig } from "./config";
import { generateCacheKey } from "./keys";

/**
 * Endpoints to warm on startup/deploy
 *
 * These are popular, relatively stable endpoints that benefit from pre-caching.
 */
const WARM_ENDPOINTS: Array<{
  source: string;
  endpoint: string;
  params?: Record<string, string>;
  fetcher: () => Promise<unknown>;
}> = [
  // Trending data (frequently accessed)
  {
    source: "coingecko",
    endpoint: "/search/trending",
    fetcher: async () => {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/search/trending"
      );
      if (!res.ok) throw new Error(`CoinGecko trending: ${res.status}`);
      return res.json();
    },
  },
  {
    source: "dexscreener",
    endpoint: "/token-boosts/top/v1",
    fetcher: async () => {
      const res = await fetch(
        "https://api.dexscreener.com/token-boosts/top/v1"
      );
      if (!res.ok) throw new Error(`DexScreener boosts: ${res.status}`);
      return res.json();
    },
  },
  {
    source: "geckoterminal",
    endpoint: "/networks/trending_pools",
    fetcher: async () => {
      const res = await fetch(
        "https://api.geckoterminal.com/api/v2/networks/trending_pools"
      );
      if (!res.ok) throw new Error(`GeckoTerminal trending: ${res.status}`);
      return res.json();
    },
  },
];

/**
 * Warm cache with predefined endpoints
 *
 * Safe to call multiple times - uses cache TTL to avoid redundant fetches.
 */
export async function warmCache(): Promise<{
  warmed: string[];
  failed: string[];
}> {
  const warmed: string[] = [];
  const failed: string[] = [];

  for (const { source, endpoint, params, fetcher } of WARM_ENDPOINTS) {
    const key = generateCacheKey(source, endpoint, params);
    const config = getCacheConfig(source, endpoint);

    try {
      await getWithSWR(key, fetcher, config);
      warmed.push(`${source}:${endpoint}`);
    } catch (err) {
      console.error(`[cache:warm] Failed to warm ${source}:${endpoint}:`, err);
      failed.push(`${source}:${endpoint}`);
    }
  }

  if (warmed.length > 0) {
    console.log(`[cache:warm] Warmed ${warmed.length} endpoints`);
  }

  if (failed.length > 0) {
    console.warn(`[cache:warm] Failed to warm ${failed.length} endpoints`);
  }

  return { warmed, failed };
}

/**
 * Check if an endpoint is configured for warming
 */
export function isWarmEndpoint(source: string, endpoint: string): boolean {
  return WARM_ENDPOINTS.some(
    (e) => e.source === source && e.endpoint === endpoint
  );
}

/**
 * Get list of endpoints configured for warming
 */
export function getWarmEndpoints(): Array<{
  source: string;
  endpoint: string;
}> {
  return WARM_ENDPOINTS.map(({ source, endpoint }) => ({ source, endpoint }));
}
