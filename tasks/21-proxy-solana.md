# Task: Solana API Proxy Routes

## Context
Implement proxy routes for all Solana data sources: Helius, Birdeye, Solscan, Jupiter.

## Requirements

### 1. Helius Proxy

**Routes:**
```
GET /api/proxy/solana/helius/transactions/[address]
GET /api/proxy/solana/helius/balances/[address]
GET /api/proxy/solana/helius/pnl/[address]
POST /api/proxy/solana/helius/assets (getAssetsByOwner)
POST /api/proxy/solana/helius/token-metadata (batch)
```

**Implementation:**
```typescript
// site/app/api/proxy/solana/helius/transactions/[address]/route.ts

import { proxyHandler } from '@/lib/proxy/handler';

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  return proxyHandler({
    source: 'helius',
    endpoint: `/v0/addresses/${params.address}/transactions`,
    params: {
      limit: request.nextUrl.searchParams.get('limit') || '50',
      type: request.nextUrl.searchParams.get('type') || undefined,
    },
    cache: { ttl: 60 },
    transform: (data) => ({
      transactions: data,
      count: data.length,
    }),
  });
}
```

### 2. Birdeye Proxy

**Routes:**
```
GET /api/proxy/solana/birdeye/token/[address]
GET /api/proxy/solana/birdeye/token/[address]/security
GET /api/proxy/solana/birdeye/token/[address]/price
GET /api/proxy/solana/birdeye/token/[address]/ohlcv
GET /api/proxy/solana/birdeye/token/[address]/holders
GET /api/proxy/solana/birdeye/wallet/[address]/holdings
GET /api/proxy/solana/birdeye/wallet/[address]/transactions
GET /api/proxy/solana/birdeye/trending
GET /api/proxy/solana/birdeye/tokenlist
```

**Headers Required:**
```typescript
const BIRDEYE_HEADERS = {
  'X-API-KEY': process.env.BIRDEYE_API_KEY,
  'x-chain': 'solana',
};
```

### 3. Solscan Proxy

**Routes:**
```
GET /api/proxy/solana/solscan/account/[address]
GET /api/proxy/solana/solscan/account/[address]/tokens
GET /api/proxy/solana/solscan/account/[address]/transactions
GET /api/proxy/solana/solscan/token/[address]
GET /api/proxy/solana/solscan/token/trending
GET /api/proxy/solana/solscan/chaininfo
```

### 4. Jupiter Proxy

**Routes:**
```
GET /api/proxy/solana/jupiter/tokens
GET /api/proxy/solana/jupiter/price?ids=...
GET /api/proxy/solana/jupiter/quote?inputMint=...&outputMint=...&amount=...
GET /api/proxy/solana/jupiter/top-tokens
```

### 5. Unified Solana Wallet Endpoint

Aggregate from all sources:

```typescript
// GET /api/proxy/solana/wallet/[address]

interface UnifiedSolanaWallet {
  address: string;
  
  // From Helius
  assets: Asset[];
  recentTransactions: Transaction[];
  pnl: { realized: number; unrealized: number };
  
  // From Birdeye  
  holdings: TokenHolding[];
  portfolioValue: number;
  portfolioChange24h: number;
  
  // From Solscan
  solBalance: number;
  transactionCount: number;
  
  // Metadata
  sources: {
    helius: boolean;
    birdeye: boolean;
    solscan: boolean;
  };
  fetchedAt: string;
}
```

### 6. Caching Rules

| Endpoint Type | TTL | Stale |
|--------------|-----|-------|
| Token price | 15s | 60s |
| Token metadata | 1h | 24h |
| Wallet balances | 60s | 5m |
| Transactions | 30s | 2m |
| Trending | 60s | 5m |
| Chain info | 5m | 1h |

## Files to Create

```
site/app/api/proxy/solana/
├── helius/
│   ├── transactions/[address]/route.ts
│   ├── balances/[address]/route.ts
│   ├── pnl/[address]/route.ts
│   ├── assets/route.ts
│   └── token-metadata/route.ts
├── birdeye/
│   ├── token/[address]/route.ts
│   ├── token/[address]/security/route.ts
│   ├── token/[address]/price/route.ts
│   ├── token/[address]/ohlcv/route.ts
│   ├── wallet/[address]/holdings/route.ts
│   ├── trending/route.ts
│   └── tokenlist/route.ts
├── solscan/
│   ├── account/[address]/route.ts
│   ├── token/[address]/route.ts
│   └── chaininfo/route.ts
├── jupiter/
│   ├── tokens/route.ts
│   ├── price/route.ts
│   └── quote/route.ts
└── wallet/[address]/route.ts  # Unified endpoint

site/lib/proxy/sources/
├── helius.ts
├── birdeye.ts
├── solscan.ts
└── jupiter.ts
```

## Example Usage (for API docs)

```bash
# Get wallet transactions
curl "https://kolquest.com/api/proxy/solana/helius/transactions/ABC123?limit=50" \
  -H "X-API-Key: your-kolquest-api-key"

# Get token security
curl "https://kolquest.com/api/proxy/solana/birdeye/token/MINT_ADDRESS/security" \
  -H "X-API-Key: your-kolquest-api-key"

# Get unified wallet data (from all sources)
curl "https://kolquest.com/api/proxy/solana/wallet/ABC123" \
  -H "X-API-Key: your-kolquest-api-key"
```

## Acceptance Criteria
- [ ] All Helius endpoints proxied
- [ ] All Birdeye endpoints proxied
- [ ] All Solscan endpoints proxied
- [ ] All Jupiter endpoints proxied
- [ ] Unified wallet endpoint works
- [ ] Caching reduces upstream calls
- [ ] Rate limiting per user
- [ ] Errors handled gracefully
- [ ] Response format standardized
