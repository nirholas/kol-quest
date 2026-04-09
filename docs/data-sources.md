# Data Sources — Fetcher Roadmap

All free and free-tier external APIs that KolQuest fetches from. This document is the canonical reference and roadmap — update the **Status** column as integrations are built, tested, or upgraded.

**Archive location:** `archive/YYYY-MM-DD/{source}/{filename}.json`  
**Entry point:** `fetchers/index.ts`  
**Run:** `npm run fetch` (all), `npm run fetch:free` (no keys needed)

---

## Status Legend

| Symbol | Meaning |
|:------:|:--------|
| ✅ | Implemented and tested |
| 🔨 | Implemented, needs real-world testing with a key |
| 📋 | Planned — not yet implemented |
| ⚠️ | Partially implemented or known limitation |
| ❌ | Investigated, not viable (rate limits, paywalled, deprecated) |

---

## Tier 1 — No API Key Required

These run on every `npm run fetch:free` call with no configuration needed.

| Source | Status | File | What We Fetch | Notes |
|:-------|:------:|:-----|:--------------|:------|
| **DexScreener** | ✅ | `sources/dexscreener.ts` | Token profiles, boosts (latest + top), trending search (15 queries), per-chain latest tokens (12 chains) | Fully public REST. No key. No rate limit posted, be polite with delays. |
| **GeckoTerminal** | ✅ | `sources/geckoterminal.ts` | Global + per-chain trending pools, new pools, top-volume pools, dexes (11 priority chains) | Versioned header required (`application/json;version=20230302`). |
| **CoinGecko** | ✅ | `sources/coingecko.ts` | Global market, DeFi stats, trending, asset platforms, categories, coins list (full universe), markets pages 1–5 (1,250 coins), top 35 coin detail, exchanges, NFT list | Free plan is rate-limited ~10–30 req/min. Use `COINGECKO_API_KEY` to upgrade without code change (just add header). |
| **Solana RPC** | ✅ | `sources/solana-ecosystem.ts` | Epoch info, SOL supply, performance samples, vote accounts | Public mainnet RPC. Rate limit varies. |
| **Jupiter** | ✅ | `sources/solana-ecosystem.ts` | Full token list, strict token list, prices (top tokens), platform stats, top tokens | No key. Best Solana token universe source. |
| **Raydium** | ✅ | `sources/solana-ecosystem.ts` | Platform info, top pools by 24h volume (100), farm info | No key. REST v3 API. |
| **Pump.fun** | ✅ | `sources/solana-ecosystem.ts` | Latest coin launches (50), King of the Hill list | No official docs — uses frontend API. May break on site updates. |
| **Jito** | ✅ | `sources/solana-ecosystem.ts` | Tip accounts, block engine stats | No key. MEV/bundle data. |
| **The Graph** | ✅ | `sources/thegraph.ts` | Uniswap v2 top pairs, Uniswap v3 top pools/tokens/swaps, Pancakeswap v3 BSC pools, Aave v3 reserve data, Balancer v2 pools | Uses hosted service. Some subgraphs may migrate to decentralized network (requires GRT). |
| **Blockscout** | ✅ | `sources/blockscout.ts` | Chain stats, recent txs/blocks, per-wallet: summary, ERC-20 balances, txs, token transfers (ETH, Base, Optimism, Gnosis, Celo, Zora) | Open-source explorer. Fully public REST v2. |
| **GMGN** | ✅ | `sources/gmgn.ts` | Smart money ranks (smart_degen, kol, sniper, fresh_wallet, top_dev, pump_smart) × (1d, 7d, 30d) × (SOL + BSC), per-wallet PnL, holdings, activity (50 wallets) | No official API. Uses unauthenticated endpoints. Same source as existing scraper. |
| **KolScan** | ✅ | `sources/kolscan.ts` | Leaderboard (daily/weekly/monthly), per-wallet profile + trades (60 wallets) | Uses undocumented API. Same data as `scrape.js` playwright scraper but faster. |
| **Cielo Finance** | ✅ | `sources/supplemental.ts` | Whale alert feed, SOL + ETH whale wallets | No key for basic feed. Smart money alert aggregator. |
| **SolanaFM** | ✅ | `sources/supplemental.ts` | Chain stats, account info (top 20 wallets) | Solana block explorer API. No key required. |
| **Step Finance** | ✅ | `sources/supplemental.ts` | Portfolio data for top 10 Solana wallets | Solana portfolio aggregator. No key required. |
| **Nansen** | ⚠️ | `sources/supplemental.ts` | Top ETH DEX traders (24h) — public endpoint only | Most Nansen data is paid. Only the public leaderboard endpoint is attempted. |
| **Arkham Intelligence** | ⚠️ | `sources/supplemental.ts` | Public assets endpoint | Most Arkham data requires auth. Only public endpoints attempted. |
| **Whale Alert** | ⚠️ | `sources/supplemental.ts` | Large transfer alerts ($1M+, 50 results) | Free API key gives limited results. `api_key=free` returns minimal data. Upgrade with `WHALE_ALERT_API_KEY`. |

---

## Tier 2 — Free API Key Required

Sign up once, add key to `.env`, and these unlock. All skip gracefully if the key is missing.

### Solana-Focused

| Source | Status | File | Key Env Var | What We Fetch | Free Tier |
|:-------|:------:|:-----|:------------|:--------------|:----------|
| **Helius** | 🔨 | `sources/helius.ts` | `HELIUS_API_KEY` | Enhanced parsed txs (SWAP type + all), token balances, DAS assets (all assets owned), batch token metadata, recent NFT assets — for top 50 SOL wallets | 10k credits/day. Best-in-class Solana wallet indexer. **Highest priority key to get.** |
| **Birdeye** | 🔨 | `sources/birdeye.ts` | `BIRDEYE_API_KEY` | Token list (by volume + mcap), trending tokens, per-token: overview, price, security score, 30d price history — for 8 top tokens. Per-wallet: token list, tx history — top 50 SOL wallets | Free plan covers most endpoints. |
| **Solscan Pro** | 🔨 | `sources/solscan.ts` | `SOLSCAN_API_KEY` _(optional)_ | Trending tokens, token list, chain info (all free). With key: wallet portfolio, DeFi activities — top 50 SOL wallets | Some public endpoints work without key. Pro key unlocks portfolio + DeFi data. |

### Multi-Chain EVM

| Source | Status | File | Key Env Var | What We Fetch | Free Tier |
|:-------|:------:|:-----|:------------|:--------------|:----------|
| **Moralis** | 🔨 | `sources/moralis.ts` | `MORALIS_API_KEY` | Global mcap, top ERC-20s, trending tokens, whale discovery. Per EVM wallet (30): tokens, net-worth, full history, top-token profitability, DeFi positions, active chains, NFTs. Per SOL wallet (30): tokens, portfolio | 40k CU/day. Covers 10+ EVM chains automatically. |
| **Alchemy** | 🔨 | `sources/alchemy.ts` | `ALCHEMY_ETH_KEY` etc. | Per EVM wallet: ERC-20 balances, asset transfers in/out, NFTs, native balance. Per SOL wallet: SOL balance, token accounts, recent signatures | 300M CU/month per app. One key per chain network is needed. |
| **Covalent (GoldRush)** | 🔨 | `sources/covalent.ts` | `COVALENT_API_KEY` | Chain list + status, per-wallet: balances, txs, 30d portfolio chart — 20 wallets × 7 chains. ERC-20 token holder list for top 8 contracts | Rate-limited. Covers 200+ chains. |
| **DeBank** | 🔨 | `sources/debank.ts` | `DEBANK_API_KEY` | Chain list, full protocol list (all DeFi), per wallet (30): total USD balance, all token balances, DeFi positions, tx history, used chains | 100k API units free. Best-in-class EVM DeFi positions. |
| **Zerion** | 🔨 | `sources/zerion.ts` | `ZERION_API_KEY` | Supported chains, top tokens (mcap + 24h gainers), per wallet (25): positions, portfolio chart, tx history, NFT positions | Partner plan. Covers 100+ EVM chains. |
| **Tatum** | 🔨 | `sources/tatum.ts` | `TATUM_API_KEY` | Exchange rates (15 tokens vs USD), gas prices (7 chains), per EVM wallet (20) × 7 chains: native balance, token balances, txs. Per SOL wallet (20): balance, tokens, txs | 10 req/sec free. 90+ chains. |
| **Chainbase** | 🔨 | `sources/chainbase.ts` | `CHAINBASE_API_KEY` | Trending tokens per chain (7 chains), per wallet (20): token balances, txs, token transfers on ETH + BSC + Polygon | Good for cross-chain token transfer indexing. |

### Explorer APIs (Etherscan Family)

Each requires its own free API key from the respective explorer.

| Source | Status | File | Key Env Var | Chains |
|:-------|:------:|:-----|:------------|:-------|
| **Etherscan** | 🔨 | `sources/etherscan.ts` | `ETHERSCAN_API_KEY` | Ethereum |
| **BscScan** | 🔨 | `sources/etherscan.ts` | `BSCSCAN_API_KEY` | BSC |
| **BaseScan** | 🔨 | `sources/etherscan.ts` | `BASESCAN_API_KEY` | Base |
| **ArbScan** | 🔨 | `sources/etherscan.ts` | `ARBISCAN_API_KEY` | Arbitrum |
| **PolygonScan** | 🔨 | `sources/etherscan.ts` | `POLYGONSCAN_API_KEY` | Polygon |
| **Optimism Etherscan** | 🔨 | `sources/etherscan.ts` | `OPTIMISMSCAN_API_KEY` | Optimism |

Each chain fetches: ETH price, supply, gas oracle, then per-wallet balance + txs + ERC-20 transfers for top 50 EVM wallets.

### Analytics & Query Engines

| Source | Status | File | Key Env Var | What We Fetch | Free Tier |
|:-------|:------:|:-----|:------------|:--------------|:----------|
| **Dune Analytics** | 🔨 | `sources/dune.ts` | `DUNE_API_KEY` | 15 curated public queries (SOL top traders PnL, smart money labels, whale movements, KOL wallets, DEX volume, etc.), Echo API: EVM + Solana trending tokens, per-wallet Dune profiles | 1000 credits/month. Fetches cached results first (0 cost) then executes if empty. |
| **Flipside Crypto** | 🔨 | `sources/flipside.ts` | `FLIPSIDE_API_KEY` | 6 SQL queries: Solana top traders 7d, Solana KOL wallets 30d, ETH smart money 30d, Base top traders 30d, Solana whale wallets, Solana trending tokens 24h | Generous free tier. Best for SQL-style smart money research. |
| **Bitquery** | 🔨 | `sources/bitquery.ts` | `BITQUERY_API_KEY` | GraphQL: Solana top DEX traders 7d, Solana whale transfers, ETH top DEX traders 7d, new Solana token launches, BSC smart money 24h, per-wallet trade history (top 20 SOL wallets) | 10k points/month. GraphQL streaming API. |

---

## Tier 3 — Planned / Not Yet Implemented

These are researched and viable. Add them as needed.

| Source | Priority | Chain(s) | What It Provides | Key Required | Notes |
|:-------|:--------:|:---------|:-----------------|:------------:|:------|
| **QuickNode** | High | ETH, SOL, BSC, Base, Arb, Polygon | RPC + marketplace add-ons (NFT, DeFi APIs) | `QUICKNODE_ENDPOINT` | Per-chain endpoint URLs. Generous free tier. Complementary to Alchemy. |
| **CoinGecko Pro** | Medium | All | Same as free but 500 req/min, historical data, pro endpoints | `COINGECKO_API_KEY` | Just add header to existing fetcher. |
| **Birdeye Multichain** | High | SOL, ETH, BSC, Base, Arb | Token + wallet data across chains (not just Solana) | `BIRDEYE_API_KEY` | Add `x-chain` header variants to existing birdeye fetcher. |
| **Nansen Pro** | Medium | ETH, BSC, Polygon | Smart money labels, entity-level wallet intelligence | `NANSEN_API_KEY` | Paid. Best entity labeling in the industry. |
| **Kaito** | Medium | All | KOL mindshare / narrative intelligence, Yaps leaderboard | `KAITO_API_KEY` | Some free endpoints. Full data is paid subscription. |
| **Defined.fi** | High | SOL, ETH, BSC, Base | Token analytics, wallet activity, trending pairs | `DEFINED_API_KEY` | GraphQL. Free tier available. Very fast. |
| **Vybe Network** | High | SOL | Solana wallet analytics, smart money leaderboard, token flows | `VYBE_API_KEY` | Solana-native, good smart money focus. |
| **Token Terminal** | Medium | ETH + L2s | Protocol revenue, fees, users (fundamental data) | `TOKEN_TERMINAL_KEY` | Free tier. Useful for protocol-level KOL tracking. |
| **Santiment** | Low | All | Social volume, dev activity, whale transactions | `SANTIMENT_API_KEY` | GraphQL. Free tier limited. |
| **Glassnode** | Low | BTC, ETH | On-chain fundamentals, whale cohorts | `GLASSNODE_API_KEY` | Most data is paid. |
| **LunarCrush** | Medium | All | Social engagement metrics, KOL influence scores | `LUNARCRUSH_API_KEY` | Free tier available. Good for KOL social scoring. |
| **Mobula** | Medium | ETH + L2s | Token + wallet data, good for long-tail tokens | `MOBULA_API_KEY` | Free tier. Good coverage of less-indexed chains. |
| **Allium** | High | ETH, SOL, BSC | SQL-based cross-chain analytics, wallet labels | `ALLIUM_API_KEY` | Modern Flipside competitor. Generous free tier. |
| **Transpose** | Medium | ETH, BSC, Polygon | SQL queries, wallet + token data | `TRANSPOSE_API_KEY` | Good for historical wallet analysis. |
| **Parsiq** | Low | ETH, BSC, SOL | Real-time on-chain event triggers | `PARSIQ_API_KEY` | More for real-time streaming than archiving. |
| **Reservoir** | Medium | ETH, SOL, Base, Polygon | NFT data, floor prices, top collectors | `RESERVOIR_API_KEY` | Good for KOL NFT portfolio tracking. |
| **OpenSea** | Low | ETH, SOL, Polygon | NFT trades, collections, top owners | `OPENSEA_API_KEY` | Useful for NFT-native KOL tracking. |
| **Magic Eden** | Medium | SOL, ETH | SOL NFT trades + top collector wallets | None (public) | Free REST endpoints. Good Solana NFT data. |
| **DeBridge** | Low | Multi | Cross-chain bridge flow (where whales move funds) | None (public) | Useful for tracking capital flows between chains. |
| **Li.fi** | Low | Multi | Cross-chain bridge + swap aggregation data | None (public) | REST API, no key. |
| **Wormhole** | Low | Multi | Cross-chain transfer volumes, top movers | None (public) | Free API, no key. |
| **Hyperliquid** | Medium | (Perps) | Perpetuals top traders, leaderboard | None (public) | Perp-native smart money. |
| **dYdX** | Low | (Perps) | Perp trading leaderboard | `DYDX_API_KEY` | Good for perp-focused KOL tracking. |
| **SolanaCompass** | Low | SOL | Validator/stake analytics | None (public) | Useful for staking patterns. |
| **Messari** | Low | All | Token profiles, research, on-chain metrics | `MESSARI_API_KEY` | Paid for most data. |
| **CryptoRank** | Low | All | Token fundraising, VC wallets, IDO data | `CRYPTORANK_API_KEY` | Free tier. Good for VC wallet tracking. |
| **IntoTheBlock** | Low | ETH | Whale holder activity, in-and-out-of-the-money | `ITB_API_KEY` | Paid. Good complementary signal. |
| **Apeboard** | Low | Multi | Multi-chain DeFi portfolio (like DeBank, Zapper) | None (public) | May have undocumented API. |
| **Zapper** | Medium | ETH + L2s | DeFi + NFT portfolio, wallet net-worth | `ZAPPER_API_KEY` | Partner API access. Like DeBank for EVM. |
| **Defi Llama** | High | All | Protocol TVL, chain TVL, yields, stablecoin data | None (public) | Fully free REST. Excellent for protocol context. Add to `solana-ecosystem.ts` or own file. |
| **CoinMarketCap** | Low | All | Token data (mostly duplicates CoinGecko) | `CMC_PRO_API_KEY` | Free plan. Lower priority since CoinGecko covers same ground. |
| **SubWallet** | Low | SOL, DOT | Substrate + Solana wallet data | None (public) | Niche. |

---

## Tier 4 — Scraper-Based (Playwright)

Sources where no public API exists but data is accessible via browser automation. These use the existing Playwright infrastructure.

| Source | Status | Script | What It Provides | Notes |
|:-------|:------:|:-------|:-----------------|:------|
| **KolScan Leaderboard** | ✅ | `scrape.js` | KOL wallet addresses, PnL, wins/losses | Existing Playwright scraper. Kept alongside API fetcher. |
| **GMGN Smart Money** | ✅ | `scrape-axiom.js` | Smart money + KOL + sniper categories (SOL + BSC) | Existing Playwright scraper. API fetcher in `gmgn.ts` is faster. |
| **GMGN X-Tracker** | ✅ | `scrape-gmgn-x-tracker.js` | KOL wallets linked to X/Twitter accounts | Existing Playwright scraper. |
| **X / Twitter Profiles** | ✅ | `scrape-x-profiles.js` | Profile metadata for KOL accounts | Existing Playwright scraper. |
| **Axiom** | ✅ | (inside `scrape-axiom.js`) | Alternative smart money listing | Existing Playwright scraper. |
| **Kaito Yaps** | 📋 | planned | KOL mindshare leaderboard, narrative scores | Can be scraped from `kaito.ai/yaps`. |
| **Lookonchain** | 📋 | planned | Whale wallet alerts, smart money follows | Twitter/web scrape. High signal for KOL identification. |
| **Bubblemaps** | 📋 | planned | Token holder cluster maps (identify wallets related to KOLs) | Browser automation needed. |
| **Ave.ai** | 📋 | planned | Solana token analytics, smart money tracker | Chinese-market smart money data. |

---

## Archive Schema

Every file saved to `archive/` is wrapped in a standard envelope:

```json
{
  "_meta": {
    "fetchedAt": "2026-04-09T14:23:11.000Z",
    "source": "gmgn",
    "file": "wallets-sol-kol-30d"
  },
  "data": { ... }
}
```

### Directory structure

```
archive/
  2026-04-09/
    dexscreener/
      token-profiles-latest.json
      token-boosts-latest.json
      token-boosts-top.json
      search-trending.json
      chain-latest-tokens.json
      network-solana.json
      ...
    geckoterminal/
      networks.json
      global-trending-pools.json
      global-new-pools.json
      tokens-recently-updated.json
      network-solana.json
      ...
    coingecko/
      global.json
      global-defi.json
      trending.json
      coins-list.json
      coins-markets-page1.json ... page5.json
      coin-solana.json
      ...
    gmgn/
      trending-tokens-sol.json
      wallets-sol-smart_degen-30d.json
      wallets-sol-kol-30d.json
      wallets-bsc-kol-7d.json
      wallet-sol-{address}.json
      ...
    helius/
      wallet-{address}.json          # parsed txs, DAS assets, balances
      token-metadata-batch.json
      nft-recent-assets.json
    moralis/
      global-market-cap.json
      top-erc20-tokens.json
      trending-tokens.json
      whale-wallets.json
      evm-wallet-{address}.json
      sol-wallet-{address}.json
      ...
    dune/
      query-2435924-solana-top-traders-pnl.json
      echo-trending-evm.json
      echo-trending-solana.json
      ...
    {source}/
      ...
  2026-04-10/
    ...
```

---

## Running the Fetchers

```bash
# Run everything (skips sources with missing keys)
npm run fetch

# Only sources requiring no API key
npm run fetch:free

# All Solana sources
npm run fetch:solana

# All EVM sources
npm run fetch:evm

# Analytics engines (Dune, Flipside, Bitquery, The Graph)
npm run fetch:analytics

# Market data only (fast, completely public)
npm run fetch:market

# Specific sources
bun fetchers/index.ts --only helius,gmgn,dexscreener

# Skip slow sources
bun fetchers/index.ts --skip dune,flipside,bitquery

# List all available sources with priority
npm run fetch:list
```

---

## API Key Priority Guide

Get these in order for the best coverage-to-effort ratio — all are free tier:

| # | Key | Sign Up | Why It Matters |
|:-:|:----|:--------|:---------------|
| 1 | `HELIUS_API_KEY` | [helius.dev](https://www.helius.dev/) | Best Solana wallet data by far. Parsed txs, DAS, token metadata. |
| 2 | `BIRDEYE_API_KEY` | [birdeye.so](https://docs.birdeye.so/) | Solana token security, price history, wallet holdings. |
| 3 | `MORALIS_API_KEY` | [moralis.io](https://moralis.io/) | EVM + Solana in one key. Wallet profitability data. |
| 4 | `COVALENT_API_KEY` | [covalenthq.com](https://www.covalenthq.com/) | Best multi-chain token transfer indexing (200+ chains). |
| 5 | `ETHERSCAN_API_KEY` | [etherscan.io](https://etherscan.io/apidashboard) | Ground-truth ETH transaction data. |
| 6 | `BSCSCAN_API_KEY` | [bscscan.com](https://bscscan.com/apidashboard) | Ground-truth BSC transaction data. |
| 7 | `DEBANK_API_KEY` | [cloud.debank.com](https://cloud.debank.com/) | Most complete EVM DeFi positions. |
| 8 | `DUNE_API_KEY` | [dune.com](https://dune.com/) | Smart money SQL queries + Echo trending API. |
| 9 | `FLIPSIDE_API_KEY` | [flipsidecrypto.xyz](https://flipsidecrypto.xyz/) | KOL cohort analysis via SQL. |
| 10 | `ALCHEMY_ETH_KEY` | [alchemy.com](https://www.alchemy.com/) | Full asset transfer history, NFTs. |

---

## Related Files

| File | Purpose |
|:-----|:--------|
| [fetchers/index.ts](../fetchers/index.ts) | Master orchestrator — argument parsing, source registry, run loop |
| [fetchers/lib/utils.ts](../fetchers/lib/utils.ts) | `saveArchive()`, `fetchJSON()`, `log()`, `sleep()`, helpers |
| [fetchers/lib/wallets.ts](../fetchers/lib/wallets.ts) | Loads SOL + EVM wallet addresses from existing project data files |
| [.env.example](../.env.example) | All environment variable names with sign-up links |
| [docs/scrapers.md](scrapers.md) | Playwright-based scrapers (separate from REST fetchers) |
| [docs/architecture.md](architecture.md) | System-level data flow |
