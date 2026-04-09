/**
 * Per-source cache configuration
 *
 * TTL and stale times are tuned based on data freshness requirements.
 */

import type { CacheOptions } from "./types";

/**
 * Default cache options when no specific config exists
 */
export const DEFAULT_CACHE_OPTIONS: CacheOptions = {
  ttl: parseInt(process.env.CACHE_DEFAULT_TTL || "300", 10),
  stale: 600,
  tags: [],
};

/**
 * Cache configuration by source and endpoint pattern
 *
 * Key format: "source:endpoint-pattern" or just "source" for defaults
 * - ttl: Fresh data lifetime (seconds)
 * - stale: Total lifetime before refetch required (ttl + stale grace)
 */
export const CACHE_CONFIGS: Record<string, CacheOptions> = {
  // ═══════════════════════════════════════════════════════════════════
  // Real-time data (short TTL, need freshness)
  // ═══════════════════════════════════════════════════════════════════

  // Transaction streams
  "helius:transactions": { ttl: 30, stale: 120, tags: ["realtime", "helius"] },
  "solscan:transactions": { ttl: 30, stale: 120, tags: ["realtime", "solscan"] },

  // Price data
  "birdeye:price": { ttl: 15, stale: 60, tags: ["price", "birdeye"] },
  "birdeye:ohlcv": { ttl: 30, stale: 120, tags: ["price", "birdeye"] },
  "dexscreener:pairs": { ttl: 30, stale: 120, tags: ["price", "dexscreener"] },
  "dexscreener:search": { ttl: 60, stale: 300, tags: ["dexscreener"] },
  "geckoterminal:pools": { ttl: 30, stale: 120, tags: ["price", "geckoterminal"] },

  // ═══════════════════════════════════════════════════════════════════
  // Frequent updates (medium TTL)
  // ═══════════════════════════════════════════════════════════════════

  // Wallet balances
  "helius:balances": { ttl: 60, stale: 300, tags: ["wallet", "helius"] },
  "helius:portfolio": { ttl: 120, stale: 600, tags: ["wallet", "helius"] },
  "moralis:tokens": { ttl: 120, stale: 600, tags: ["wallet", "moralis"] },
  "moralis:balances": { ttl: 120, stale: 600, tags: ["wallet", "moralis"] },
  "debank:positions": { ttl: 300, stale: 1800, tags: ["wallet", "debank"] },
  "zerion:portfolio": { ttl: 300, stale: 1800, tags: ["wallet", "zerion"] },

  // Token info
  "birdeye:token": { ttl: 300, stale: 1800, tags: ["token", "birdeye"] },
  "solscan:token": { ttl: 300, stale: 1800, tags: ["token", "solscan"] },

  // ═══════════════════════════════════════════════════════════════════
  // Metadata (changes rarely, cache longer)
  // ═══════════════════════════════════════════════════════════════════

  // Coin/token metadata
  "coingecko:coin": { ttl: 3600, stale: 86400, tags: ["metadata", "coingecko"] },
  "coingecko:markets": { ttl: 300, stale: 900, tags: ["markets", "coingecko"] },
  "coingecko:trending": { ttl: 300, stale: 600, tags: ["trending", "coingecko"] },

  // Network info
  "geckoterminal:networks": { ttl: 86400, stale: 604800, tags: ["metadata", "geckoterminal"] },

  // ═══════════════════════════════════════════════════════════════════
  // Analytics (expensive queries, cache longer)
  // ═══════════════════════════════════════════════════════════════════

  "dune:results": { ttl: 900, stale: 3600, tags: ["analytics", "dune"] },
  "dune:trending": { ttl: 300, stale: 900, tags: ["trending", "dune"] },
  "flipside:query": { ttl: 900, stale: 3600, tags: ["analytics", "flipside"] },
  "bitquery:query": { ttl: 600, stale: 1800, tags: ["analytics", "bitquery"] },

  // ═══════════════════════════════════════════════════════════════════
  // Source defaults (fallback when no specific pattern matches)
  // ═══════════════════════════════════════════════════════════════════

  helius: { ttl: 60, stale: 300, tags: ["helius"] },
  birdeye: { ttl: 60, stale: 300, tags: ["birdeye"] },
  solscan: { ttl: 120, stale: 600, tags: ["solscan"] },
  dexscreener: { ttl: 60, stale: 300, tags: ["dexscreener"] },
  geckoterminal: { ttl: 60, stale: 300, tags: ["geckoterminal"] },
  coingecko: { ttl: 300, stale: 900, tags: ["coingecko"] },
  moralis: { ttl: 120, stale: 600, tags: ["moralis"] },
  debank: { ttl: 300, stale: 1800, tags: ["debank"] },
  zerion: { ttl: 300, stale: 1800, tags: ["zerion"] },
  covalent: { ttl: 120, stale: 600, tags: ["covalent"] },
  alchemy: { ttl: 60, stale: 300, tags: ["alchemy"] },
  dune: { ttl: 600, stale: 1800, tags: ["dune"] },
  flipside: { ttl: 600, stale: 1800, tags: ["flipside"] },
  etherscan: { ttl: 120, stale: 600, tags: ["etherscan"] },
  blockscout: { ttl: 120, stale: 600, tags: ["blockscout"] },
  gmgn: { ttl: 60, stale: 300, tags: ["gmgn"] },
  kolscan: { ttl: 300, stale: 900, tags: ["kolscan"] },
  polymarket: { ttl: 60, stale: 300, tags: ["polymarket"] },
};

/**
 * Get cache options for a source/endpoint combination
 *
 * Checks in order:
 * 1. Exact match: "source:endpoint"
 * 2. Source default: "source"
 * 3. Global default
 */
export function getCacheConfig(
  source: string,
  endpoint?: string
): CacheOptions {
  // Try exact match first
  if (endpoint) {
    // Normalize endpoint (remove leading slash, query params)
    const normalizedEndpoint = endpoint.replace(/^\//, "").split("?")[0];
    const exactKey = `${source}:${normalizedEndpoint}`;

    if (CACHE_CONFIGS[exactKey]) {
      return CACHE_CONFIGS[exactKey];
    }

    // Try matching endpoint patterns
    for (const [key, config] of Object.entries(CACHE_CONFIGS)) {
      if (key.startsWith(`${source}:`)) {
        const pattern = key.split(":")[1];
        if (normalizedEndpoint.includes(pattern)) {
          return config;
        }
      }
    }
  }

  // Fall back to source default
  if (CACHE_CONFIGS[source]) {
    return CACHE_CONFIGS[source];
  }

  // Global default
  return DEFAULT_CACHE_OPTIONS;
}

/**
 * Get all sources with their default configurations
 */
export function getAllSourceConfigs(): Record<string, CacheOptions> {
  const sources: Record<string, CacheOptions> = {};

  for (const [key, config] of Object.entries(CACHE_CONFIGS)) {
    // Only include source-level configs (no colon in key)
    if (!key.includes(":")) {
      sources[key] = config;
    }
  }

  return sources;
}
