# Task: Enhanced Wallet Detail Page

## Context
The `/wallet/[address]` page shows wallet details. We need to make it the most comprehensive wallet analysis page available.

## Current State
- Page: `site/app/wallet/[address]/page.tsx`
- Shows: Basic wallet info, some trades, holdings

## Requirements

### 1. Multi-Source Data Aggregation
Fetch from ALL available APIs simultaneously:

**Solana Wallets:**
- Helius: `getAssetsByOwner`, `/v0/addresses/{address}/transactions`, `/v0/pnl/wallets/{address}`
- Birdeye: `/v1/wallet/token_list`, `/v1/wallet/portfolio`, `/v1/wallet/tx_list`
- Solscan: `/account/tokens`, `/account/transactions`, `/account/portfolio`
- GMGN: `/wallet/sol/holdings`, `/wallet/sol/activity`, `/wallet/sol/current_profit`

**EVM Wallets:**
- Moralis: `/wallets/{address}/tokens`, `/wallets/{address}/net-worth`, `/wallets/{address}/history`
- DeBank: `/user/total_balance`, `/user/all_token_list`, `/user/all_complex_protocol_list`
- Alchemy: `alchemy_getTokenBalances`, `alchemy_getAssetTransfers`
- Covalent: `/v1/{chain}/address/{address}/balances_v2/`
- Etherscan: `txlist`, `tokentx`

### 2. Page Sections

#### Header Section
- Wallet address (with copy button)
- ENS/SNS domain if available
- Twitter link if known
- Total portfolio value (USD)
- 24h/7d/30d PnL with sparkline
- Smart money tags/labels

#### Holdings Tab
- Token list with:
  - Logo, symbol, name
  - Balance, USD value
  - 24h price change
  - % of portfolio
- Sort by value, change, alphabetical
- Filter: hide small positions, show only profitable

#### Transactions Tab
- Unified transaction feed from all sources
- Filter by type: swap, transfer, mint, NFT
- Show: time, type, tokens in/out, USD value, tx hash link
- Pagination with infinite scroll

#### PnL Analysis Tab
- Realized vs unrealized PnL
- Per-token PnL breakdown
- Win/loss ratio
- Best/worst trades
- PnL chart over time

#### DeFi Positions Tab (EVM only)
- From DeBank: all protocol positions
- Show: protocol logo, position type, value, rewards
- Group by protocol

#### NFTs Tab
- From Alchemy/Moralis: all NFTs owned
- Grid view with images
- Floor price if available
- Collection grouping

#### Activity Feed Tab
- Real-time-ish activity (poll every 30s)
- Show swaps, transfers, DeFi interactions
- Filterable by type

### 3. Comparison Feature
- "Compare with another wallet" button
- Side-by-side metrics
- Overlap in holdings

### 4. API Routes
```
GET /api/wallets/[address]?chain=solana
GET /api/wallets/[address]/holdings?chain=solana
GET /api/wallets/[address]/transactions?chain=solana&limit=50
GET /api/wallets/[address]/pnl?chain=solana&period=30d
GET /api/wallets/[address]/defi?chain=ethereum
GET /api/wallets/[address]/nfts?chain=ethereum
```

### 5. Caching Strategy
- Cache wallet summary for 5 minutes
- Cache holdings for 2 minutes
- Cache transaction history for 1 minute
- Force refresh button for user

## Files to Create/Modify
- `site/app/wallet/[address]/page.tsx`
- `site/app/wallet/[address]/components/` (create sections)
- `site/app/api/wallets/[address]/route.ts`
- `site/app/api/wallets/[address]/holdings/route.ts`
- `site/app/api/wallets/[address]/transactions/route.ts`
- `site/app/api/wallets/[address]/pnl/route.ts`
- `site/lib/wallet-aggregator.ts` (new - aggregates multi-source data)

## API Keys Used
All configured keys - graceful fallback for missing ones

## Acceptance Criteria
- [ ] Page loads with data from multiple sources
- [ ] Each tab shows relevant data
- [ ] Detects chain from address format
- [ ] Loading skeletons while fetching
- [ ] Error boundaries for failed API calls
- [ ] Share button with OG image
- [ ] Mobile responsive tabs
