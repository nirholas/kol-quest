# Task: Enhanced Token Page with Full Analytics

## Context
The `/token/[address]` page needs comprehensive token analytics from all our data sources.

## Current State
- Page: `site/app/token/[address]/page.tsx`
- Basic token info, some price data

## Requirements

### 1. Multi-Source Token Data

**Price & Market Data:**
- DexScreener: Real-time price, volume, liquidity, pair info
- Birdeye: Price history (OHLCV), market overview
- CoinGecko: Market cap rank, supply, social links
- GeckoTerminal: Pool data, DEX info
- Jupiter: Current price with confidence

**Security Analysis (Solana):**
- Birdeye: `/defi/token_security` - honeypot check, mint/freeze authority
- Token metadata: Is Token2022, extensions
- Top holder concentration

**Holder Analysis:**
- Birdeye: `/defi/token/holders` - top holders
- Solscan: Holder distribution
- Smart money holders (cross-reference with our wallet database)

**Trading Activity:**
- Birdeye: `/defi/txs/token` - recent trades
- DexScreener: Buy/sell counts, volumes
- Whale transactions (filter large trades)

### 2. Page Sections

#### Header
- Token logo, name, symbol
- Current price (real-time)
- 24h change with color
- Market cap, FDV, volume
- Liquidity
- Contract address (copy button)
- Links: DEX, Twitter, Website, Telegram

#### Price Chart
- TradingView-style chart (use lightweight-charts)
- Timeframes: 5m, 15m, 1h, 4h, 1d
- OHLCV data from Birdeye
- Volume bars
- Drawing tools (optional)

#### Security Score Card
```
🟢 Safe | 🟡 Caution | 🔴 Danger

- Mint Authority: ✅ Revoked / ⚠️ Active
- Freeze Authority: ✅ Revoked / ⚠️ Active
- LP Burned: ✅ Yes (X%) / ⚠️ No
- Top 10 Holders: X%
- Honeypot Risk: Low/Medium/High
- Token Standard: SPL / Token2022
```

#### Top Holders Tab
- List of top 50 holders
- Show if wallet is known KOL (from our database)
- Show if wallet is contract
- Entry price if available
- Holding duration

#### Recent Trades Tab
- Live trade feed
- Filter: buys only, sells only, whales only (>$10k)
- Show: time, wallet, type, amount, price, USD value
- Link to wallet page

#### KOL Holdings Tab
- Which KOLs from our database hold this token
- Their buy price, current value, PnL
- Sort by PnL, amount, entry date

#### Similar Tokens
- Tokens in same category
- Similar market cap
- Trending in same narrative

### 3. API Routes
```
GET /api/token/[address]?chain=solana
GET /api/token/[address]/security?chain=solana
GET /api/token/[address]/holders?chain=solana&limit=50
GET /api/token/[address]/trades?chain=solana&limit=100
GET /api/token/[address]/ohlcv?chain=solana&timeframe=1h&from=X&to=Y
GET /api/token/[address]/kol-holdings?chain=solana
```

### 4. Real-time Updates
- WebSocket or polling (30s) for price
- New trades appear at top of feed
- Price chart updates

## Files to Create/Modify
- `site/app/token/[address]/page.tsx`
- `site/app/token/[address]/components/PriceChart.tsx`
- `site/app/token/[address]/components/SecurityCard.tsx`
- `site/app/token/[address]/components/HolderList.tsx`
- `site/app/token/[address]/components/TradesFeed.tsx`
- `site/app/api/token/[address]/route.ts`
- `site/app/api/token/[address]/security/route.ts`
- `site/app/api/token/[address]/holders/route.ts`
- `site/app/api/token/[address]/trades/route.ts`

## Dependencies
- `lightweight-charts` for price chart
- Or use existing charting solution

## Acceptance Criteria
- [ ] Token page shows comprehensive data
- [ ] Security analysis prominent
- [ ] Price chart with multiple timeframes
- [ ] Trade feed shows recent activity
- [ ] KOL holdings cross-referenced
- [ ] Works for Solana and EVM tokens
- [ ] Share button with OG image
- [ ] Mobile responsive
