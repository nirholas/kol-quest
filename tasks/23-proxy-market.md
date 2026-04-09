# Task: Market Data API Proxy Routes

## Context
Implement proxy routes for market data sources: DexScreener, CoinGecko, GeckoTerminal, GMGN.

## Requirements

### 1. DexScreener Proxy

**Routes:**
```
GET /api/proxy/market/dexscreener/search?q={query}
GET /api/proxy/market/dexscreener/pairs/[chainId]/[pairAddress]
GET /api/proxy/market/dexscreener/tokens/[tokenAddresses]
GET /api/proxy/market/dexscreener/token-profiles/latest
GET /api/proxy/market/dexscreener/token-boosts/latest
GET /api/proxy/market/dexscreener/token-boosts/top
GET /api/proxy/market/dexscreener/orders/[chainId]/[tokenAddress]
```

**No API key needed** - but we add rate limiting and caching.

### 2. CoinGecko Proxy

**Routes:**
```
GET /api/proxy/market/coingecko/trending
GET /api/proxy/market/coingecko/global
GET /api/proxy/market/coingecko/coins/list
GET /api/proxy/market/coingecko/coins/markets?vs_currency=usd&order=...
GET /api/proxy/market/coingecko/coins/[id]
GET /api/proxy/market/coingecko/coins/[id]/market_chart?days=30
GET /api/proxy/market/coingecko/simple/price?ids=...&vs_currencies=usd
GET /api/proxy/market/coingecko/exchanges
GET /api/proxy/market/coingecko/categories
GET /api/proxy/market/coingecko/nfts/list
```

### 3. GeckoTerminal Proxy

**Routes:**
```
GET /api/proxy/market/geckoterminal/networks
GET /api/proxy/market/geckoterminal/networks/trending_pools
GET /api/proxy/market/geckoterminal/networks/new_pools
GET /api/proxy/market/geckoterminal/networks/[network]/trending_pools
GET /api/proxy/market/geckoterminal/networks/[network]/new_pools
GET /api/proxy/market/geckoterminal/networks/[network]/pools?sort=...
GET /api/proxy/market/geckoterminal/networks/[network]/dexes
GET /api/proxy/market/geckoterminal/networks/[network]/pools/[poolAddress]
GET /api/proxy/market/geckoterminal/tokens/info_recently_updated
```

### 4. GMGN Proxy

**Routes:**
```
GET /api/proxy/market/gmgn/trending/[chain]
GET /api/proxy/market/gmgn/rank/[chain]/[category]/[timeframe]
GET /api/proxy/market/gmgn/wallet/[chain]/[address]/holdings
GET /api/proxy/market/gmgn/wallet/[chain]/[address]/activity
GET /api/proxy/market/gmgn/wallet/[chain]/[address]/profit
```

**Chains:** `sol`, `bsc`
**Categories:** `smart_degen`, `kol`, `sniper`, `fresh_wallet`, `pump_smart`
**Timeframes:** `1d`, `7d`, `30d`

### 5. Unified Trending Endpoint

Aggregate trending from all sources:

```typescript
// GET /api/proxy/market/trending?chain=all&limit=100

interface UnifiedTrending {
  tokens: TrendingToken[];
  sources: {
    dexscreener: boolean;
    coingecko: boolean;
    geckoterminal: boolean;
    gmgn: boolean;
    birdeye: boolean;
  };
  lastUpdated: string;
}

interface TrendingToken {
  address: string;
  chain: string;
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  marketCap?: number;
  
  // Trending score (0-100)
  trendingScore: number;
  
  // Which sources have it trending
  trendingOn: string[];
  
  // Rank on each source
  ranks: {
    dexscreener?: number;
    coingecko?: number;
    geckoterminal?: number;
    gmgn?: number;
  };
}
```

### 6. Unified Token Endpoint

```typescript
// GET /api/proxy/market/token/[address]?chain=solana

interface UnifiedToken {
  address: string;
  chain: string;
  
  // Basic info (from CoinGecko/DexScreener)
  symbol: string;
  name: string;
  logo: string;
  
  // Price data (averaged/best source)
  price: number;
  priceChange1h: number;
  priceChange24h: number;
  priceChange7d: number;
  
  // Market data
  marketCap: number;
  fullyDilutedValuation: number;
  volume24h: number;
  liquidity: number;
  
  // Trading info
  buyCount24h: number;
  sellCount24h: number;
  uniqueTraders24h: number;
  
  // Links
  website?: string;
  twitter?: string;
  telegram?: string;
  coingeckoId?: string;
  
  // Pair info (from DexScreener)
  pairs: {
    dex: string;
    pairAddress: string;
    quoteToken: string;
    liquidity: number;
  }[];
  
  sources: string[];
}
```

### 7. Caching Rules

| Endpoint Type | TTL | Stale |
|--------------|-----|-------|
| Trending | 60s | 5m |
| Token price | 30s | 2m |
| Token metadata | 1h | 24h |
| Markets list | 5m | 30m |
| Global stats | 2m | 10m |
| Pools/pairs | 60s | 5m |

## Files to Create

```
site/app/api/proxy/market/
├── dexscreener/
│   ├── search/route.ts
│   ├── pairs/[chainId]/[pairAddress]/route.ts
│   ├── tokens/[addresses]/route.ts
│   ├── token-profiles/latest/route.ts
│   └── token-boosts/[type]/route.ts
├── coingecko/
│   ├── trending/route.ts
│   ├── global/route.ts
│   ├── coins/list/route.ts
│   ├── coins/markets/route.ts
│   ├── coins/[id]/route.ts
│   └── simple/price/route.ts
├── geckoterminal/
│   ├── networks/route.ts
│   ├── networks/trending_pools/route.ts
│   ├── networks/[network]/trending_pools/route.ts
│   └── networks/[network]/pools/route.ts
├── gmgn/
│   ├── trending/[chain]/route.ts
│   ├── rank/[chain]/[category]/[timeframe]/route.ts
│   └── wallet/[chain]/[address]/route.ts
├── trending/route.ts  # Unified trending
└── token/[address]/route.ts  # Unified token

site/lib/proxy/sources/
├── dexscreener.ts
├── coingecko.ts
├── geckoterminal.ts
└── gmgn.ts
```

## Acceptance Criteria
- [ ] All DexScreener endpoints proxied
- [ ] All CoinGecko endpoints proxied
- [ ] All GeckoTerminal endpoints proxied
- [ ] All GMGN endpoints proxied
- [ ] Unified trending aggregates all sources
- [ ] Unified token endpoint works
- [ ] Caching reduces upstream calls
- [ ] Rate limiting per user
