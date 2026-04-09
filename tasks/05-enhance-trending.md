# Task: Enhanced Trending Page with Cross-Platform Aggregation

## Context
The `/trending` page shows trending tokens. We need to aggregate trending data from ALL sources for the most comprehensive view.

## Current State
- Page: `site/app/trending/page.tsx`
- Limited sources

## Requirements

### 1. Multi-Source Trending Data

**Token Trending Sources:**
- DexScreener: `/latest/dex/search`, token boosts
- GeckoTerminal: `/networks/trending_pools`, `/networks/new_pools`
- CoinGecko: `/search/trending`
- Birdeye: `/defi/trending_tokens`
- GMGN: `/tokens/trending/{chain}`
- Dune Echo: `/api/echo/v1/tokens/trending/evm`, `/api/echo/v1/tokens/trending/solana`
- Jupiter: `/top-tokens`
- Pump.fun: `/coins` (newest launches)

**Pool/Pair Trending:**
- DexScreener pairs by volume
- GeckoTerminal trending pools
- Raydium: `/pools/info/list`

### 2. Trending Categories

**By Velocity:**
- 🔥 Hot Right Now (1h momentum)
- 📈 Rising (24h gainers)
- 🆕 New Launches (<24h old)
- 💎 Hidden Gems (low mcap, high volume)

**By Chain:**
- All Chains
- Solana
- Ethereum
- BSC
- Base
- Arbitrum

**By Type:**
- Meme Coins
- AI Tokens
- DeFi
- Gaming
- RWA
- New Narratives (auto-detect from categories)

### 3. Trending Score Algorithm
Create composite trending score:

```typescript
interface TrendingToken {
  address: string;
  chain: string;
  symbol: string;
  name: string;
  
  // Price data
  price: number;
  priceChange1h: number;
  priceChange24h: number;
  
  // Volume
  volume1h: number;
  volume24h: number;
  volumeChange: number; // vs previous period
  
  // Liquidity
  liquidity: number;
  
  // Social signals
  twitterMentions?: number;
  telegramActivity?: number;
  
  // Trading signals
  buyCount24h: number;
  sellCount24h: number;
  uniqueTraders24h: number;
  whaleActivity: boolean;
  
  // Source rankings
  sources: {
    dexscreener?: number;
    geckoterminal?: number;
    birdeye?: number;
    coingecko?: number;
    gmgn?: number;
  };
  
  // Computed
  trendingScore: number; // 0-100
  momentum: 'rising' | 'falling' | 'stable';
  riskLevel: 'low' | 'medium' | 'high';
}
```

### 4. Page Layout

#### Hero Section
- Top 3 trending tokens (large cards)
- Auto-rotate or carousel

#### Main Grid
- Token cards showing:
  - Logo, symbol, name
  - Price with change indicator
  - 24h volume
  - Trending score badge
  - Source icons (which platforms have it trending)
  - Quick actions: View, Trade

#### Filters Bar
- Chain selector
- Category selector  
- Time selector (1h, 24h, 7d)
- Min liquidity filter
- Hide rugs toggle

#### Live Feed Sidebar
- Real-time new listings
- Large trades
- Viral tokens

### 5. API Route
```
GET /api/trending?chain=solana&category=meme&timeframe=24h&limit=50

Response:
{
  tokens: TrendingToken[],
  lastUpdated: ISO8601,
  sources: { dexscreener, geckoterminal, birdeye, coingecko, gmgn }
}
```

### 6. Real-time Updates
- Poll every 60 seconds
- Visual indicator when new token enters top 10
- Price tickers update

## Files to Create/Modify
- `site/app/trending/page.tsx`
- `site/app/trending/components/TrendingCard.tsx`
- `site/app/trending/components/TrendingGrid.tsx`
- `site/app/trending/components/LiveFeed.tsx`
- `site/app/api/trending/route.ts`
- `site/lib/trending-aggregator.ts`

## Acceptance Criteria
- [ ] Shows trending from all sources
- [ ] Chain/category filters work
- [ ] Trending score visible
- [ ] Source badges show data origin
- [ ] New tokens highlighted
- [ ] Click opens token page
- [ ] Auto-refresh every minute
- [ ] Mobile responsive grid
