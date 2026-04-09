# Task: Proxy API Architecture

## Context
Build a proxy layer so users can access all our API data through our unified API. This makes us a "data aggregator as a service."

## Architecture Overview

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Client    │────▶│  Our Proxy API   │────▶│  External APIs  │
│  (User App) │     │  /api/proxy/*    │     │  Helius, etc.   │
└─────────────┘     └──────────────────┘     └─────────────────┘
                           │
                    ┌──────┴──────┐
                    │   Features  │
                    ├─────────────┤
                    │ • Caching   │
                    │ • Rate Limit│
                    │ • Auth      │
                    │ • Logging   │
                    │ • Transform │
                    └─────────────┘
```

## Requirements

### 1. Proxy Route Structure

```
/api/proxy/
├── solana/
│   ├── helius/          # Helius endpoints
│   ├── birdeye/         # Birdeye endpoints  
│   ├── solscan/         # Solscan endpoints
│   ├── jupiter/         # Jupiter endpoints
│   └── wallet/          # Unified wallet data
├── evm/
│   ├── moralis/         # Moralis endpoints
│   ├── alchemy/         # Alchemy endpoints
│   ├── debank/          # DeBank endpoints
│   ├── etherscan/       # Etherscan V2 endpoints
│   ├── covalent/        # Covalent endpoints
│   └── wallet/          # Unified EVM wallet data
├── market/
│   ├── dexscreener/     # DexScreener endpoints
│   ├── coingecko/       # CoinGecko endpoints
│   ├── geckoterminal/   # GeckoTerminal endpoints
│   └── trending/        # Unified trending
├── analytics/
│   ├── dune/            # Dune queries
│   └── flipside/        # Flipside queries
└── unified/
    ├── wallet/          # Any wallet, any chain
    ├── token/           # Any token, any chain
    ├── trending/        # Cross-chain trending
    └── leaderboard/     # Cross-source leaderboard
```

### 2. Core Proxy Handler

```typescript
// site/lib/proxy/handler.ts

interface ProxyConfig {
  name: string;
  baseUrl: string;
  authHeader?: string;
  authKey?: string;
  rateLimit: { requests: number; window: number };
  cache: { ttl: number; staleWhileRevalidate?: number };
  transform?: (data: any) => any;
}

async function proxyRequest(
  config: ProxyConfig,
  path: string,
  params: Record<string, string>,
  userApiKey?: string
): Promise<ProxyResponse> {
  // 1. Check user rate limit
  // 2. Check cache
  // 3. Forward request
  // 4. Transform response
  // 5. Cache result
  // 6. Return to user
}
```

### 3. Authentication Tiers

**Public Tier (No API Key):**
- Rate limit: 10 requests/minute
- Cache-only (no live data)
- Limited endpoints

**Free Tier (API Key Required):**
- Rate limit: 60 requests/minute
- Live data with caching
- Most endpoints

**Pro Tier (Paid):**
- Rate limit: 600 requests/minute
- Priority caching
- All endpoints
- Webhook support

### 4. Rate Limiting

```typescript
// Per-user rate limiting with Upstash Redis
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(60, '1 m'),
  analytics: true,
});

// In proxy handler:
const { success, limit, remaining, reset } = await ratelimit.limit(userApiKey);
if (!success) {
  return new Response('Rate limited', { 
    status: 429,
    headers: {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': reset.toString(),
    }
  });
}
```

### 5. Caching Strategy

```typescript
// site/lib/proxy/cache.ts

interface CacheConfig {
  ttl: number;           // Time to live in seconds
  stale: number;         // Serve stale for X seconds while revalidating
  tags: string[];        // For cache invalidation
}

// Cache tiers:
const CACHE_CONFIGS = {
  realtime: { ttl: 15, stale: 60 },      // Prices, live data
  frequent: { ttl: 60, stale: 300 },     // Balances, positions
  standard: { ttl: 300, stale: 3600 },   // Token metadata
  static: { ttl: 86400, stale: 604800 }, // Chain lists, protocols
};
```

### 6. Response Format

All proxy responses follow this format:

```typescript
interface ProxyResponse<T> {
  success: boolean;
  data: T;
  meta: {
    source: string;           // 'helius', 'birdeye', etc.
    cached: boolean;
    cachedAt?: string;
    latency: number;          // ms
    rateLimit: {
      limit: number;
      remaining: number;
      reset: number;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}
```

### 7. Error Handling

```typescript
// Standardized error codes
enum ProxyErrorCode {
  RATE_LIMITED = 'RATE_LIMITED',
  UPSTREAM_ERROR = 'UPSTREAM_ERROR',
  INVALID_PARAMS = 'INVALID_PARAMS',
  NOT_FOUND = 'NOT_FOUND',
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
}

// Graceful degradation
// If primary source fails, try fallback
async function fetchWithFallback(primary: Source, fallbacks: Source[]) {
  try {
    return await primary.fetch();
  } catch (e) {
    for (const fallback of fallbacks) {
      try {
        return await fallback.fetch();
      } catch {}
    }
    throw new ProxyError(ProxyErrorCode.UPSTREAM_ERROR);
  }
}
```

### 8. Logging & Analytics

```typescript
// Log every proxy request
interface ProxyLog {
  timestamp: Date;
  userApiKey: string;
  endpoint: string;
  params: Record<string, string>;
  source: string;
  cached: boolean;
  latency: number;
  status: number;
  error?: string;
}

// Store in database for analytics
// Show usage dashboard to users
```

## Files to Create

```
site/lib/proxy/
├── handler.ts           # Core proxy logic
├── cache.ts             # Caching layer
├── rate-limit.ts        # Rate limiting
├── auth.ts              # API key validation
├── transform.ts         # Response transformers
├── errors.ts            # Error handling
├── logging.ts           # Request logging
└── sources/
    ├── helius.ts
    ├── birdeye.ts
    ├── moralis.ts
    ├── debank.ts
    ├── coingecko.ts
    └── ...

site/app/api/proxy/
├── [...path]/route.ts   # Catch-all proxy route
└── docs.ts              # OpenAPI spec generator
```

## Database Tables

```sql
-- API keys for users
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT,
  tier TEXT DEFAULT 'free', -- 'free', 'pro'
  rate_limit INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

-- Usage logs
CREATE TABLE api_usage (
  id SERIAL PRIMARY KEY,
  api_key_id UUID REFERENCES api_keys(id),
  endpoint TEXT NOT NULL,
  source TEXT NOT NULL,
  cached BOOLEAN DEFAULT FALSE,
  latency INTEGER,
  status INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily/monthly aggregates
CREATE TABLE api_usage_daily (
  api_key_id UUID,
  date DATE,
  request_count INTEGER,
  cache_hits INTEGER,
  errors INTEGER,
  PRIMARY KEY (api_key_id, date)
);
```

## Acceptance Criteria
- [ ] Proxy routes forward requests correctly
- [ ] Rate limiting enforced per API key
- [ ] Caching reduces upstream calls
- [ ] Errors handled gracefully with fallbacks
- [ ] Response format standardized
- [ ] Usage logged and queryable
- [ ] API keys generated for users
- [ ] Usage dashboard shows stats
