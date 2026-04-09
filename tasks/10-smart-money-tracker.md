# Task: New Page - Real-Time Smart Money Tracker

## Context
Create a new `/monitor` or `/smart-money` page that shows real-time activity from known smart money wallets.

## Requirements

### 1. Data Sources

**Activity Feeds:**
- Helius: Parse transactions from tracked wallets
- Birdeye: `/v1/wallet/tx_list` for tracked wallets
- GMGN: `/wallet/{chain}/activity` for tracked wallets
- Cielo: `/feed` for whale activity
- Whale Alert: Large transactions

**Wallet Lists:**
- Our KOL database (KolScan + GMGN)
- Dune smart money labels
- User-submitted wallets (approved)
- Custom watchlist

### 2. Page Sections

#### Live Feed (Main)
Real-time scrolling feed of smart money moves:

```
┌─────────────────────────────────────────────────────────┐
│ 🟢 LIVE                                    Filter ▼    │
├─────────────────────────────────────────────────────────┤
│ 2 min ago │ @CryptoWhale bought 50,000 $BONK           │
│           │ $12,500 · Entry: $0.00025                   │
│           │ [View Tx] [View Wallet] [View Token]        │
├─────────────────────────────────────────────────────────┤
│ 5 min ago │ Smart Money sold 100% of $XYZ              │
│           │ $85,000 · PnL: +$42,000 (97.6%)             │
│           │ [View Tx] [View Wallet] [View Token]        │
├─────────────────────────────────────────────────────────┤
│ 8 min ago │ 3 KOLs bought $NEWTOKEN in last hour       │
│           │ @KOL1, @KOL2, @KOL3 · Total: $25,000        │
│           │ [View Token] [View All Holders]             │
└─────────────────────────────────────────────────────────┘
```

#### Aggregated Signals
- Tokens being accumulated by multiple smart wallets
- Tokens being dumped by smart money
- New positions opened by top performers
- Unusual activity alerts

#### Wallet Segments
Tabs to filter by wallet type:
- All Smart Money
- Top 100 Performers (by PnL)
- KOLs (Twitter-linked)
- Whales (>$1M)
- Snipers (fast entry specialists)
- Fresh Wallets (new but profitable)

#### Token Accumulation Board
Show tokens with most smart money activity:

| Token | Smart $ Buys | Smart $ Sells | Net Flow | # Wallets |
|-------|--------------|---------------|----------|-----------|
| $BONK | $125,000     | $45,000       | +$80,000 | 12        |
| $XYZ  | $50,000      | $120,000      | -$70,000 | 8         |

### 3. Filters
- Chain (Solana, ETH, BSC, Base, All)
- Action type (Buy, Sell, Transfer)
- Min transaction size ($1k, $10k, $100k)
- Wallet category (KOL, Whale, Sniper)
- Time range (Live, 1h, 24h, 7d)
- Specific wallets (from watchlist)

### 4. Alerts System
- Push notification opt-in
- Email alerts for specific conditions:
  - When specific wallet trades
  - When X wallets buy same token
  - When whale moves > $X

### 5. API Routes
```
GET /api/smart-money/feed?chain=solana&type=buy&minValue=10000&limit=50
GET /api/smart-money/accumulation?chain=solana&period=24h
GET /api/smart-money/alerts/subscribe (POST)
```

### 6. Real-time Implementation
- WebSocket connection for live updates
- Or Server-Sent Events (SSE)
- Or polling every 15 seconds
- New items slide in at top

## Files to Create
- `site/app/smart-money/page.tsx`
- `site/app/smart-money/components/LiveFeed.tsx`
- `site/app/smart-money/components/AccumulationBoard.tsx`
- `site/app/smart-money/components/WalletFilter.tsx`
- `site/app/api/smart-money/feed/route.ts`
- `site/app/api/smart-money/accumulation/route.ts`
- `site/lib/smart-money-tracker.ts`

## Database Tables Needed
```sql
-- Track smart money transactions
CREATE TABLE smart_money_activity (
  id SERIAL PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  chain TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  action TEXT NOT NULL, -- 'buy', 'sell', 'transfer'
  token_address TEXT,
  token_symbol TEXT,
  amount NUMERIC,
  usd_value NUMERIC,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregated accumulation signals
CREATE TABLE smart_money_signals (
  id SERIAL PRIMARY KEY,
  token_address TEXT NOT NULL,
  chain TEXT NOT NULL,
  signal_type TEXT NOT NULL, -- 'accumulation', 'distribution', 'new_position'
  wallet_count INTEGER,
  total_usd NUMERIC,
  period TEXT, -- '1h', '24h', '7d'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Acceptance Criteria
- [ ] Live feed shows real-time activity
- [ ] Filters work correctly
- [ ] Accumulation board updates
- [ ] Click actions work (view wallet, token, tx)
- [ ] Mobile responsive
- [ ] Performance: handles 1000s of activities
- [ ] Graceful degradation if APIs fail
