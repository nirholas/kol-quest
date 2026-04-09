// Rate limit tier configurations

export type RateLimitTier = "public" | "free" | "pro" | "enterprise";

export interface TierConfig {
  requestsPerMinute: number;
  requestsPerDay: number;
  price: string;
  description: string;
}

export const TIER_CONFIGS: Record<RateLimitTier, TierConfig> = {
  public: {
    requestsPerMinute: 10,
    requestsPerDay: 100,
    price: "Free",
    description: "No API key required, limited access",
  },
  free: {
    requestsPerMinute: 60,
    requestsPerDay: 10_000,
    price: "Free",
    description: "Free tier with API key",
  },
  pro: {
    requestsPerMinute: 300,
    requestsPerDay: 100_000,
    price: "$29/mo",
    description: "Professional tier with higher limits",
  },
  enterprise: {
    requestsPerMinute: 1000,
    requestsPerDay: Infinity, // Unlimited
    price: "Custom",
    description: "Enterprise tier with unlimited daily quota",
  },
};

/**
 * Map of endpoint patterns to their request cost.
 * Some expensive endpoints count as multiple requests.
 */
export const ENDPOINT_COSTS: Record<string, number> = {
  // Expensive analytics endpoints (count as 5 requests)
  "proxy/analytics/dune/query/*/execute": 5,
  "proxy/analytics/flipside/query": 5,
  "proxy/analytics/bitquery": 5,

  // DeFi endpoints are moderately expensive (count as 3 requests)
  "proxy/evm/wallet/*/defi": 3,
  "proxy/solana/wallet/*/defi": 3,

  // Multi-source aggregations (count as 2 requests)
  "proxy/*/wallet/*/full": 2,
  "proxy/unified/*": 2,
};

/**
 * Match a request path to determine its cost.
 * Uses simple wildcard matching where * matches any segment.
 */
export function getEndpointCost(path: string): number {
  // Normalize path: remove leading slash and /api/ prefix
  const normalizedPath = path.replace(/^\/?(api\/)?/, "");

  for (const [pattern, cost] of Object.entries(ENDPOINT_COSTS)) {
    if (matchPattern(pattern, normalizedPath)) {
      return cost;
    }
  }
  return 1; // Default cost
}

function matchPattern(pattern: string, path: string): boolean {
  // Convert wildcard pattern to regex
  const regexPattern = pattern
    .split("*")
    .map((segment) => escapeRegex(segment))
    .join("[^/]+");

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Check if a tier is valid
 */
export function isValidTier(tier: string): tier is RateLimitTier {
  return tier in TIER_CONFIGS;
}

/**
 * Get tier config, defaulting to public if invalid
 */
export function getTierConfig(tier: string): TierConfig {
  if (isValidTier(tier)) {
    return TIER_CONFIGS[tier];
  }
  return TIER_CONFIGS.public;
}
