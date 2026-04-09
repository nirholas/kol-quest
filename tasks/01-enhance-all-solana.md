# Task: Enhance All Solana Page with Multi-Source Data

## Context
The `/all-solana` page currently shows unified wallet data from KolScan + GMGN. We need to enrich it with data from all our configured APIs.

## Current State
- Page: `site/app/all-solana/page.tsx`
- Data: `site/lib/data.ts` - `getUnifiedSolData()`
- Sources: KolScan leaderboard + GMGN Solana wallets

## Requirements

### 1. Add New Data Sources
Fetch and merge data from:
- **Helius**: Wallet balances, parsed transactions, PnL (`/v0/pnl/wallets/{address}`)
- **Birdeye**: Wallet holdings, portfolio value (`/v1/wallet/token_list`, `/v1/wallet/portfolio`)
- **Solscan**: Account info, recent transactions
- **Dune**: Smart money labels from pre-built queries (2435924, 3311589)

### 2. Enhance Wallet Cards/Table
Add columns/data for each wallet:
- **Total Portfolio Value** (from Birdeye or Helius)
- **Realized PnL** (from Helius `/v0/pnl/wallets/`)
- **Unrealized PnL** (from GMGN or Birdeye)
- **Active Positions** count (from Birdeye holdings)
- **Last Trade** timestamp (from Helius transactions)
- **Win Rate** (if available from multiple sources - average them)
- **Smart Money Tags** (from Dune labels)

### 3. Filter & Sort Enhancements
Add filters for:
- Min/max portfolio value
- Win rate threshold
- Activity recency (active in last 24h/7d/30d)
- Smart money category (kol, sniper, smart_degen, etc.)
- Has Twitter linked (boolean)

Add sort options:
- Portfolio value (high to low)
- Realized PnL (high to low)
- Win rate (high to low)
- Recent activity (most recent first)

### 4. API Route
Create/update: `site/app/api/wallets/solana/route.ts`

```typescript
// Expected query params:
// ?page=1&limit=50&sort=pnl&order=desc&minValue=10000&category=kol&active=7d

// Response:
{
  wallets: UnifiedSolanaWallet[],
  pagination: { page, limit, total, hasMore },
  sources: { kolscan: boolean, gmgn: boolean, helius: boolean, birdeye: boolean }
}
```

### 5. Real-time Enrichment
When user clicks a wallet row, fetch fresh data from:
- Helius (balances + recent txs)
- Birdeye (current holdings with prices)
- Show loading state while fetching

## Files to Modify
- `site/app/all-solana/page.tsx`
- `site/lib/data.ts` (add enrichment functions)
- `site/lib/types.ts` (extend UnifiedWallet type)
- `site/app/api/wallets/solana/route.ts` (create if needed)
- `site/app/components/UnifiedTable.tsx` (add new columns)

## API Keys Used
- `HELIUS_API_KEY`
- `BIRDEYE_API_KEY`
- `SOLSCAN_API_KEY` (optional)
- `DUNE_API_KEY`

## Acceptance Criteria
- [ ] Page loads with existing data (no regression)
- [ ] Additional columns show data from new sources
- [ ] Filter/sort controls work correctly
- [ ] Click-to-expand shows enriched wallet data
- [ ] Graceful fallback if any API fails
- [ ] Loading states for async fetches
- [ ] Mobile responsive
