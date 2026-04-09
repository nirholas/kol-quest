# Task: New Page - Multi-Chain Portfolio Analyzer

## Context
Create a new `/portfolio` page where users can analyze any wallet across ALL chains with unified view.

## Requirements

### 1. Multi-Chain Data Fetching

**Per Chain APIs:**
- Solana: Helius, Birdeye, Solscan
- Ethereum: Moralis, DeBank, Alchemy, Etherscan
- BSC: Moralis, DeBank, Covalent, BscScan
- Base: Alchemy, Covalent, BaseScan
- Arbitrum: Alchemy, Covalent, Arbiscan
- Polygon: Alchemy, Covalent, PolygonScan
- Optimism: Alchemy, Covalent
- Avalanche: Covalent

**Unified Data:**
- DeBank: Best for cross-chain EVM (single call gets all chains)
- Moralis: Good backup for multi-chain
- Covalent: 200+ chains coverage

### 2. Page Sections

#### Wallet Input
- Paste any wallet address
- Auto-detect chain(s)
- Or connect wallet (WalletConnect, Phantom)
- Recent searches saved

#### Portfolio Summary
```
┌─────────────────────────────────────────────────────────┐
│ Total Portfolio Value: $1,234,567.89                    │
│ 24h Change: +$12,345 (+1.02%)                          │
│                                                         │
│ Chain Breakdown:                                        │
│ ████████████████░░░░░░░░░░░░░░░ Solana  $800k (65%)    │
│ ██████░░░░░░░░░░░░░░░░░░░░░░░░ Ethereum $250k (20%)    │
│ ████░░░░░░░░░░░░░░░░░░░░░░░░░░ BSC      $100k (8%)     │
│ ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░ Other    $84k (7%)      │
└─────────────────────────────────────────────────────────┘
```

#### Asset Allocation
- Pie chart by category:
  - Native tokens (SOL, ETH, BNB)
  - Stablecoins (USDC, USDT, DAI)
  - DeFi tokens
  - Meme coins
  - NFTs
  - LP positions
  - Staked assets

#### Holdings Table
| Asset | Chain | Balance | Price | Value | 24h | % Portfolio |
|-------|-------|---------|-------|-------|-----|-------------|
| SOL   | Solana| 500     | $150  | $75k  | +5% | 25%         |
| ETH   | ETH   | 50      | $3k   | $150k | +2% | 50%         |
| ...   | ...   | ...     | ...   | ...   | ... | ...         |

Features:
- Sort by value, change, chain
- Filter by chain, category
- Hide small balances toggle
- Search tokens

#### DeFi Positions
From DeBank `/user/all_complex_protocol_list`:
- Protocol, chain, position type
- Supplied/borrowed/staked amounts
- Rewards claimable
- Health factor (for lending)

| Protocol | Chain | Type | Value | Rewards | Health |
|----------|-------|------|-------|---------|--------|
| Aave V3  | ETH   | Lend | $50k  | $123    | 1.8    |
| Uniswap  | ETH   | LP   | $25k  | $45     | -      |
| Raydium  | SOL   | LP   | $10k  | $12     | -      |

#### NFT Gallery
- Grid of owned NFTs
- Floor price per collection
- Total NFT value estimate
- Rarest items highlighted

#### Performance Charts
- Portfolio value over time (7d, 30d, 90d, 1y)
- PnL chart
- Chain allocation over time
- Asset category shifts

### 3. Compare Mode
- Add second wallet
- Side-by-side comparison
- Overlap analysis (same tokens held)

### 4. API Routes
```
GET /api/portfolio/[address]?chains=all
GET /api/portfolio/[address]/holdings?chains=all&includeSmall=false
GET /api/portfolio/[address]/defi?chains=all
GET /api/portfolio/[address]/nfts?chains=all&limit=50
GET /api/portfolio/[address]/history?period=30d
```

### 5. Caching
- Cache portfolio summary for 5 minutes
- Cache DeFi positions for 10 minutes
- Cache NFTs for 30 minutes
- Force refresh button

## Files to Create
- `site/app/portfolio/page.tsx`
- `site/app/portfolio/[address]/page.tsx`
- `site/app/portfolio/components/PortfolioSummary.tsx`
- `site/app/portfolio/components/HoldingsTable.tsx`
- `site/app/portfolio/components/DefiPositions.tsx`
- `site/app/portfolio/components/NftGallery.tsx`
- `site/app/portfolio/components/PerformanceChart.tsx`
- `site/app/api/portfolio/[address]/route.ts`
- `site/lib/portfolio-aggregator.ts`

## Acceptance Criteria
- [ ] Accepts any wallet address
- [ ] Auto-detects chains
- [ ] Shows unified portfolio value
- [ ] Holdings table sortable/filterable
- [ ] DeFi positions from DeBank
- [ ] NFT gallery loads
- [ ] Charts render correctly
- [ ] Compare mode works
- [ ] Mobile responsive
- [ ] Share/export portfolio
