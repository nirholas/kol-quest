# Task: Analytics API Proxy Routes

## Context
Implement proxy routes for analytics engines: Dune, Flipside, Bitquery, The Graph.

## Requirements

### 1. Dune Proxy

**Routes:**
```
GET /api/proxy/analytics/dune/query/[queryId]/results?limit=1000
POST /api/proxy/analytics/dune/query/[queryId]/execute
GET /api/proxy/analytics/dune/execution/[executionId]/status
GET /api/proxy/analytics/dune/execution/[executionId]/results
GET /api/proxy/analytics/dune/wallet/[address]
GET /api/proxy/analytics/dune/echo/trending/evm
GET /api/proxy/analytics/dune/echo/trending/solana
```

**Pre-built Queries Available:**
```typescript
const DUNE_QUERIES = {
  // Solana
  'solana-top-traders': 2435924,
  'solana-dex-volume': 2028278,
  'solana-top-100-wallets': 3311589,
  'solana-meme-traders': 3209028,
  'raydium-top-wallets': 2551418,
  
  // Ethereum
  'eth-smart-money': 3326291,
  'eth-dex-volume': 1258228,
  'eth-whale-movements': 2436278,
  'uniswap-top-wallets': 2041663,
  'kol-twitter-wallets': 1284956,
  
  // BSC  
  'bsc-top-traders': 2726556,
  
  // Base
  'base-top-traders': 2035353,
  'base-dex-traders-30d': 2763198,
};
```

**Simplified Query Endpoint:**
```typescript
// GET /api/proxy/analytics/dune/smart-money/solana?limit=100
// Maps to query 2435924 with caching
```

### 2. Flipside Proxy

**Routes:**
```
POST /api/proxy/analytics/flipside/query
GET /api/proxy/analytics/flipside/query/[queryRunId]/results
```

**Pre-built Queries:**
```typescript
const FLIPSIDE_QUERIES = {
  'solana-top-traders-7d': `
    SELECT tx_from AS wallet, COUNT(*) AS trades, SUM(swap_to_amount_usd) AS volume
    FROM solana.defi.ez_dex_swaps
    WHERE block_timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
    GROUP BY 1 HAVING volume > 50000
    ORDER BY volume DESC LIMIT 500`,
    
  'eth-smart-money-30d': `
    SELECT from_address AS wallet, COUNT(*) AS trades, SUM(amount_usd) AS volume
    FROM ethereum.defi.ez_dex_swaps
    WHERE block_timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days'
    GROUP BY 1 HAVING volume > 100000
    ORDER BY volume DESC LIMIT 500`,
};
```

**Simplified Query Endpoint:**
```typescript
// GET /api/proxy/analytics/flipside/smart-money/solana?period=7d
// Runs pre-built query with caching
```

### 3. Bitquery Proxy

**Routes:**
```
POST /api/proxy/analytics/bitquery/query
```

**Body:**
```json
{
  "query": "{ Solana { DEXTradeByTokens(...) { ... } } }",
  "variables": {}
}
```

**Pre-built Queries:**
```typescript
const BITQUERY_QUERIES = {
  'solana-top-dex-traders': `
    query($since: ISO8601DateTime!) {
      Solana {
        DEXTradeByTokens(
          where: {Block: {Time: {since: $since}}}
          orderBy: {descendingByField: "volume_usd"}
          limit: {count: 100}
        ) {
          Trade { Account { Address } }
          volume_usd: sum(of: Trade__AmountInUSD)
          trades: count
        }
      }
    }`,
    
  'solana-whale-transfers': `
    query {
      Solana {
        Transfers(
          where: {Transfer: {AmountInUSD: {gt: "10000"}}}
          limit: {count: 100}
        ) {
          Transfer { Amount AmountInUSD Sender Receiver }
          Block { Time }
        }
      }
    }`,
};
```

### 4. The Graph Proxy

**Routes:**
```
POST /api/proxy/analytics/thegraph/[subgraph]
```

**Subgraphs:**
```typescript
const SUBGRAPHS = {
  'uniswap-v3': 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
  'uniswap-v2': 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2',
  'pancakeswap-v3': 'https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3-bsc',
  'aave-v3': 'https://api.thegraph.com/subgraphs/name/aave/protocol-v3',
  'balancer-v2': 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2',
};
```

**Pre-built Queries:**
```typescript
const GRAPH_QUERIES = {
  'uniswap-v3-top-pools': `{
    pools(first: 100, orderBy: volumeUSD, orderDirection: desc) {
      id token0 { symbol } token1 { symbol } volumeUSD liquidity
    }
  }`,
  
  'uniswap-v3-recent-swaps': `{
    swaps(first: 100, orderBy: timestamp, orderDirection: desc) {
      id timestamp sender amountUSD token0 { symbol } token1 { symbol }
    }
  }`,
};
```

### 5. Unified Analytics Endpoints

```typescript
// GET /api/proxy/analytics/smart-money?chain=solana&period=7d&limit=100
// Aggregates Dune + Flipside results

interface SmartMoneyResponse {
  wallets: SmartMoneyWallet[];
  sources: {
    dune: boolean;
    flipside: boolean;
    bitquery: boolean;
  };
  cachedAt: string;
  queryIds: {
    dune?: number;
    flipside?: string;
  };
}

interface SmartMoneyWallet {
  address: string;
  chain: string;
  totalVolume: number;
  tradeCount: number;
  pnl?: number;
  winRate?: number;
  lastActive?: string;
  sources: string[];
}
```

### 6. Caching Strategy

Analytics queries are expensive - aggressive caching:

| Query Type | TTL | Stale |
|-----------|-----|-------|
| Dune cached results | 15m | 1h |
| Dune execution | 30m | 2h |
| Flipside results | 15m | 1h |
| Bitquery | 5m | 30m |
| The Graph | 2m | 15m |
| Echo trending | 5m | 30m |

### 7. Background Refresh

Pre-compute expensive queries on a schedule:

```typescript
// Cron jobs
'0 */15 * * * *' // Every 15 minutes: popular queries
'0 0 * * * *'    // Every hour: comprehensive queries
'0 0 */6 * * *'  // Every 6 hours: historical analysis
```

## Files to Create

```
site/app/api/proxy/analytics/
├── dune/
│   ├── query/[queryId]/results/route.ts
│   ├── query/[queryId]/execute/route.ts
│   ├── execution/[executionId]/route.ts
│   ├── wallet/[address]/route.ts
│   ├── echo/trending/[chain]/route.ts
│   └── smart-money/[chain]/route.ts  # Pre-built
├── flipside/
│   ├── query/route.ts
│   └── smart-money/[chain]/route.ts  # Pre-built
├── bitquery/
│   ├── query/route.ts
│   └── traders/[chain]/route.ts  # Pre-built
├── thegraph/
│   ├── [subgraph]/route.ts
│   └── pools/[dex]/route.ts  # Pre-built
└── smart-money/route.ts  # Unified endpoint

site/lib/proxy/sources/
├── dune.ts
├── flipside.ts
├── bitquery.ts
└── thegraph.ts
```

## Acceptance Criteria
- [ ] Dune query execution works
- [ ] Flipside query execution works
- [ ] Bitquery GraphQL works
- [ ] The Graph queries work
- [ ] Pre-built queries available via simple URLs
- [ ] Unified smart money endpoint
- [ ] Aggressive caching for expensive queries
- [ ] Background refresh for popular queries
