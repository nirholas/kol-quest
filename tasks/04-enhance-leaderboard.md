# Task: Enhanced Multi-Source Leaderboard

## Context
The `/leaderboard` page ranks KOL wallets. We need to aggregate rankings from multiple sources and provide the most comprehensive leaderboard available.

## Current State
- Page: `site/app/leaderboard/page.tsx`
- Source: KolScan leaderboard data

## Requirements

### 1. Multi-Source Rankings

**Solana Sources:**
- KolScan: Existing leaderboard
- GMGN: `/rank/sol/{category}/{timeframe}` for each category
- Dune: Query 2435924 (solana-top-traders-pnl), Query 3311589 (top-100-wallets-30d)
- Flipside: Custom SQL for top traders

**EVM Sources:**
- Dune: Query 3326291 (smart-money-eth), Query 2726556 (bsc-top-traders)
- DeBank top holders (via our data)
- Nansen labels (if available via public endpoints)

### 2. Unified Scoring System
Create a composite score from multiple sources:

```typescript
interface LeaderboardEntry {
  address: string;
  chain: 'solana' | 'ethereum' | 'bsc' | 'base' | 'arbitrum';
  
  // Identity
  name?: string;
  twitter?: { username: string; name: string; avatar: string };
  ensOrSns?: string;
  
  // Rankings from each source
  rankings: {
    kolscan?: { rank: number; pnl: number; winRate: number };
    gmgn?: { rank: number; category: string; pnl: number };
    dune?: { rank: number; volume: number; trades: number };
    flipside?: { rank: number; pnl: number };
  };
  
  // Computed metrics  
  compositeScore: number; // 0-100
  avgRank: number;
  totalPnl: number;
  avgWinRate: number;
  
  // Activity
  lastActive: Date;
  totalTrades: number;
  
  // Tags
  categories: string[]; // ['kol', 'smart_degen', 'whale']
  verifiedSources: string[]; // Which sources have this wallet
}
```

### 3. Leaderboard Views

**By Timeframe:**
- 24h Top Performers
- 7d Top Performers
- 30d Top Performers
- All-time Legends

**By Chain:**
- All Chains (unified)
- Solana
- Ethereum
- BSC
- Base
- Arbitrum

**By Category:**
- Overall
- KOLs (Twitter-linked)
- Smart Money
- Whales (>$1M portfolio)
- Snipers (fast entry)
- Meme Coin Traders
- DeFi Farmers

### 4. Filters & Search
- Search by address or Twitter
- Filter by min PnL
- Filter by min win rate
- Filter by activity (active in X days)
- Show only verified (Twitter linked)

### 5. Leaderboard Table Columns
- Rank (with change indicator ↑↓)
- Wallet (avatar, name, address)
- Twitter (if linked)
- PnL (with period selector)
- Win Rate
- Total Trades
- Portfolio Value
- Last Active
- Tags/Categories
- Source badges (which APIs have data)

### 6. API Route
```
GET /api/leaderboard?chain=all&timeframe=7d&category=kol&sort=pnl&page=1&limit=50

Response:
{
  entries: LeaderboardEntry[],
  pagination: { page, limit, total },
  lastUpdated: ISO8601,
  sources: { kolscan: boolean, gmgn: boolean, dune: boolean, flipside: boolean }
}
```

### 7. Background Data Refresh
- Cron job fetches all sources every 15 minutes
- Stores aggregated leaderboard in database
- API serves from cache

## Files to Create/Modify
- `site/app/leaderboard/page.tsx` (enhance)
- `site/app/leaderboard/components/LeaderboardTable.tsx`
- `site/app/leaderboard/components/Filters.tsx`
- `site/app/api/leaderboard/route.ts`
- `site/lib/leaderboard-aggregator.ts` (new)
- `site/drizzle/db/schema.ts` (add leaderboard_cache table if needed)

## Acceptance Criteria
- [ ] Shows wallets from multiple sources
- [ ] Chain/timeframe/category tabs work
- [ ] Filters narrow results correctly  
- [ ] Search finds wallets
- [ ] Rank changes shown (vs previous period)
- [ ] Click row opens wallet page
- [ ] Mobile responsive with horizontal scroll
- [ ] Share specific leaderboard URL
