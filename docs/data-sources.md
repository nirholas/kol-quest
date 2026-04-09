# Data Sources — Complete Fetcher Reference

All free and free-tier external APIs that KolQuest fetches from. This document is the **complete endpoint-level reference** — every URL, parameter, data field, and feature documented.

**Archive location:** `archive/YYYY-MM-DD/{source}/{filename}.json`  
**Entry point:** `fetchers/index.ts`  
**Run:** `npm run fetch` (all), `npm run fetch:free` (no keys needed)

---

## Table of Contents

1. [Status Legend](#status-legend)
2. [Tier 1 — No API Key Required](#tier-1--no-api-key-required)
   - [DexScreener](#1-dexscreener)
   - [GeckoTerminal](#2-geckoterminal)
   - [CoinGecko](#3-coingecko)
   - [Solana Ecosystem (RPC + DEXs)](#4-solana-ecosystem)
   - [The Graph](#5-the-graph)
   - [Blockscout](#6-blockscout)
   - [GMGN](#7-gmgn)
   - [KolScan](#8-kolscan)
   - [Supplemental Sources](#9-supplemental-sources)
3. [Tier 2 — Free API Key Required](#tier-2--free-api-key-required)
   - [Helius](#10-helius)
   - [Birdeye](#11-birdeye)
   - [Solscan](#12-solscan)
   - [Moralis](#13-moralis)
   - [Alchemy](#14-alchemy)
   - [Covalent](#15-covalent-goldrush)
   - [DeBank](#16-debank)
   - [Zerion](#17-zerion)
   - [Tatum](#18-tatum)
   - [Chainbase](#19-chainbase)
   - [Etherscan Family](#20-etherscan-family)
   - [Dune Analytics](#21-dune-analytics)
   - [Flipside Crypto](#22-flipside-crypto)
   - [Bitquery](#23-bitquery)
4. [Tier 3 — Planned Sources](#tier-3--planned--not-yet-implemented)
5. [Tier 4 — Scraper-Based](#tier-4--scraper-based-playwright)
6. [Archive Schema](#archive-schema)

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

---

### 1. DexScreener

**Status:** ✅ Implemented | **File:** `sources/dexscreener.ts` | **API Key:** None required  
**Docs:** https://docs.dexscreener.com/api/reference  
**Base URL:** `https://api.dexscreener.com`

#### Endpoints

| Endpoint | Method | Parameters | Data Returned |
|:---------|:------:|:-----------|:--------------|
| `/token-profiles/latest/v1` | GET | `chainId` (optional) | Latest token profiles with metadata |
| `/token-boosts/latest/v1` | GET | — | Recently boosted tokens |
| `/token-boosts/top/v1` | GET | — | Top boosted tokens (paid promotion) |
| `/latest/dex/search/?q={query}` | GET | `q` (search term) | Pairs matching query with price, volume, liquidity |
| `/dex/pairs/{chainId}/{pairAddresses}` | GET | `chainId`, `pairAddresses` (comma-sep) | Specific pair data |
| `/dex/tokens/{tokenAddresses}` | GET | `tokenAddresses` (comma-sep) | Token profiles |
| `/orders/v1/{chainId}/{tokenAddress}` | GET | `chainId`, `tokenAddress` | Active orders for token |

#### Search Queries Executed
`SOL`, `ETH`, `BNB`, `TRUMP`, `AI`, `meme`, `dog`, `pepe`, `RWA`, `DeFi`, `bot`, `pump`, `moon`, `ape`, `whale`

#### Chains Fetched
`solana`, `ethereum`, `bsc`, `base`, `arbitrum`, `polygon`, `avalanche`, `fantom`, `optimism`, `cronos`, `sui`, `ton`

#### Response Data Fields
- `pairs[]`: `pairAddress`, `baseToken.address`, `baseToken.name`, `baseToken.symbol`, `quoteToken.*`, `priceNative`, `priceUsd`, `txns.h24.buys`, `txns.h24.sells`, `volume.h24`, `liquidity.usd`, `fdv`, `pairCreatedAt`, `url`, `labels[]`

---

### 2. GeckoTerminal

**Status:** ✅ Implemented | **File:** `sources/geckoterminal.ts` | **API Key:** None required  
**Docs:** https://api.geckoterminal.com/docs  
**Base URL:** `https://api.geckoterminal.com/api/v2`  
**Required Header:** `Accept: application/json;version=20230302`

#### Endpoints

| Endpoint | Method | Parameters | Data Returned |
|:---------|:------:|:-----------|:--------------|
| `/networks?page={n}` | GET | `page` | All supported blockchain networks |
| `/networks/trending_pools` | GET | `include`, `page` | Global trending pools across all chains |
| `/networks/new_pools` | GET | `include`, `page` | Newly created pools globally |
| `/networks/{network}/trending_pools` | GET | `network`, `include`, `page` | Trending pools for specific chain |
| `/networks/{network}/new_pools` | GET | `network`, `include`, `page` | New pools for specific chain |
| `/networks/{network}/pools?sort={field}` | GET | `network`, `sort`, `include`, `page` | Pools sorted by criteria |
| `/networks/{network}/dexes` | GET | `network` | DEXs operating on network |
| `/tokens/info_recently_updated` | GET | `include`, `page` | Tokens with recent metadata updates |

#### Include Options
`base_token`, `quote_token`, `dex`, `network`

#### Sort Options (for pools)
`h24_volume_usd_liquidity_desc`, `h24_tx_count_desc`, `pool_created_at_desc`

#### Priority Networks Fetched
`solana`, `eth`, `bsc`, `base`, `arbitrum`, `polygon_pos`, `avalanche`, `fantom`, `optimism`, `sui-network`, `ton`

#### Response Data Fields
- Pool: `id`, `attributes.name`, `attributes.address`, `attributes.base_token_price_usd`, `attributes.quote_token_price_usd`, `attributes.base_token_price_native_currency`, `attributes.volume_usd.h24`, `attributes.reserve_in_usd`, `attributes.pool_created_at`, `attributes.fdv_usd`, `attributes.price_change_percentage.h24`
- Token: `id`, `attributes.address`, `attributes.name`, `attributes.symbol`, `attributes.coingecko_coin_id`, `attributes.image_url`, `attributes.websites[]`

---

### 3. CoinGecko

**Status:** ✅ Implemented | **File:** `sources/coingecko.ts` | **API Key:** Optional (`COINGECKO_API_KEY`)  
**Docs:** https://www.coingecko.com/en/api/documentation  
**Base URL:** `https://api.coingecko.com/api/v3`  
**Rate Limit:** ~10-30 req/min (free), 500 req/min (pro)

#### Endpoints

| Endpoint | Method | Parameters | Data Returned |
|:---------|:------:|:-----------|:--------------|
| `/ping` | GET | — | API health check |
| `/global` | GET | — | Global crypto market data |
| `/global/decentralized_finance_defi` | GET | — | Global DeFi market stats |
| `/search/trending` | GET | — | Trending coins + NFTs + categories |
| `/asset_platforms` | GET | — | All supported blockchains |
| `/coins/categories/list` | GET | — | All category IDs |
| `/coins/categories` | GET | — | Categories with market data |
| `/coins/list?include_platform=true` | GET | `include_platform` | Full coin universe (~15k coins) |
| `/coins/markets` | GET | `vs_currency`, `order`, `per_page`, `page`, `sparkline`, `price_change_percentage` | Market data for coins |
| `/coins/{id}` | GET | `localization`, `tickers`, `market_data`, `community_data`, `developer_data`, `sparkline` | Detailed coin info |
| `/exchanges?per_page={n}&page={n}` | GET | `per_page`, `page` | Exchange list with volume |
| `/exchanges/list` | GET | — | Full exchange ID list |
| `/nfts/list?per_page={n}&page={n}` | GET | `per_page`, `page` | NFT collection list |

#### Markets Query Parameters
- `vs_currency=usd`
- `order=market_cap_desc`
- `per_page=250` (max)
- `page=1-5` (fetches ~1,250 coins)
- `sparkline=true`
- `price_change_percentage=1h,24h,7d,30d`

#### Coin Detail Fields
`id`, `symbol`, `name`, `asset_platform_id`, `platforms{}`, `block_time_in_minutes`, `hashing_algorithm`, `categories[]`, `description.en`, `links.homepage[]`, `links.twitter_screen_name`, `links.telegram_channel_identifier`, `image.large`, `market_cap_rank`, `coingecko_rank`, `coingecko_score`, `developer_score`, `community_score`, `liquidity_score`, `market_data.current_price.usd`, `market_data.market_cap.usd`, `market_data.total_volume.usd`, `market_data.price_change_percentage_24h`, `market_data.price_change_percentage_7d`, `market_data.price_change_percentage_30d`, `tickers[]`

#### Top Coins Detailed Fetch
`bitcoin`, `ethereum`, `tether`, `binancecoin`, `solana`, `usd-coin`, `ripple`, `dogecoin`, `cardano`, `shiba-inu`, `avalanche-2`, `polkadot`, `near`, `chainlink`, `uniswap`, `litecoin`, `cosmos`, `stellar`, `algorand`, `filecoin`, `aave`, `maker`, `compound`, `curve-dao-token`, `sushiswap`, `pancakeswap-token`, `raydium`, `serum`, `jupiter-exchange-solana`, `bonk`, `dogwifcoin`, `popcat`, `book-of-meme`, `official-trump`

---

### 4. Solana Ecosystem

**Status:** ✅ Implemented | **File:** `sources/solana-ecosystem.ts` | **API Key:** None required  
**Multiple sources combined**

#### Solana Mainnet RPC

**Base URL:** `https://api.mainnet-beta.solana.com`

| RPC Method | Parameters | Data Returned |
|:-----------|:-----------|:--------------|
| `getSupply` | `excludeNonCirculatingAccountsList` | Total, circulating, non-circulating SOL supply |
| `getEpochInfo` | — | Current epoch, slot index, slots in epoch |
| `getRecentPerformanceSamples` | `limit: 10` | TPS, slot timing for recent slots |
| `getVoteAccounts` | — | Validator list with stake, commission |
| `/health` | — | RPC node health status |

#### Jupiter Aggregator

**URLs:**
- Token list: `https://token.jup.ag/all`, `https://token.jup.ag/strict`
- Prices: `https://price.jup.ag/v6/price?ids={mints}&showExtraInfo=true`
- Stats: `https://stats.jup.ag/info`, `https://stats.jup.ag/top-tokens`
- Quote: `https://quote-api.jup.ag/v6/quote` (not fetched, used for swaps)

| Endpoint | Data Returned |
|:---------|:--------------|
| `/all` | All Jupiter-listed tokens with mint, symbol, name, decimals, logoURI |
| `/strict` | Vetted tokens only |
| `/price?ids={mints}` | Current price, confidence, depth data |
| `/info` | Platform volume, TVL, transaction count |
| `/top-tokens` | Top traded tokens by volume |

#### Raydium

**Base URL:** `https://api-v3.raydium.io`

| Endpoint | Parameters | Data Returned |
|:---------|:-----------|:--------------|
| `/main/info` | — | Platform TVL, volume, pool count |
| `/pools/info/list` | `poolType`, `poolSortField`, `sortType`, `pageSize`, `page` | Pool list with APR, volume, TVL |
| `/farm/info?type=all` | `type` | Active farms with rewards |

#### Pump.fun

**Base URL:** `https://frontend-api.pump.fun`  
**Note:** Unofficial API, may break on site updates

| Endpoint | Parameters | Data Returned |
|:---------|:-----------|:--------------|
| `/coins?limit=50&offset=0&sort=last_trade_timestamp&order=DESC` | `limit`, `offset`, `sort`, `order`, `includeNsfw` | Latest launched tokens |
| `/coins/king-of-the-hill?limit=20` | `limit`, `includeNsfw` | Current top token (king of hill) |

#### Jito (MEV)

**Base URL:** `https://bundles.jito.wtf/api/v1`

| Endpoint | Method | Data Returned |
|:---------|:------:|:--------------|
| `/getTipAccounts` | POST (JSON-RPC) | Jito tip payment account addresses |
| `https://explorer.jito.wtf/wtfrest/app/stats/getStats` | GET | Bundle stats, tip volume |

---

### 5. The Graph

**Status:** ✅ Implemented | **File:** `sources/thegraph.ts` | **API Key:** None (hosted service)  
**Docs:** https://thegraph.com/docs/en/querying/querying-the-graph/

#### Subgraphs Queried

| Subgraph | URL | Queries |
|:---------|:----|:--------|
| **Uniswap V3 (ETH)** | `https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3` | top-pools-volume, top-tokens, recent-swaps |
| **Uniswap V2 (ETH)** | `https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2` | top-pairs |
| **PancakeSwap V3 (BSC)** | `https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3-bsc` | top-pools |
| **Aave V3 (ETH)** | `https://api.thegraph.com/subgraphs/name/aave/protocol-v3` | market-data |
| **Balancer V2 (ETH)** | `https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2` | top-pools |

#### GraphQL Queries

**Uniswap V3 top-pools-volume:**
```graphql
{
  pools(first: 100, orderBy: volumeUSD, orderDirection: desc) {
    id token0 { id symbol name } token1 { id symbol name }
    feeTier volumeUSD txCount liquidity token0Price token1Price
  }
}
```

**Uniswap V3 top-tokens:**
```graphql
{
  tokens(first: 100, orderBy: volumeUSD, orderDirection: desc) {
    id symbol name decimals volumeUSD totalValueLocked txCount
  }
}
```

**Uniswap V3 recent-swaps:**
```graphql
{
  swaps(first: 200, orderBy: timestamp, orderDirection: desc) {
    id timestamp sender recipient token0 { symbol } token1 { symbol }
    amount0 amount1 amountUSD
  }
}
```

**Aave V3 market-data:**
```graphql
{
  reserves(first: 50) {
    id underlyingAsset { id symbol decimals }
    totalLiquidity utilizationRate liquidityRate
    variableBorrowRate stableBorrowRate totalATokenSupply
  }
}
```

**Balancer V2 top-pools:**
```graphql
{
  pools(first: 50, orderBy: totalLiquidity, orderDirection: desc) {
    id name totalLiquidity totalSwapVolume totalSwapFee swapEnabled
    tokens { address symbol balance weight }
  }
}
```

---

### 6. Blockscout

**Status:** ✅ Implemented | **File:** `sources/blockscout.ts` | **API Key:** None required  
**Docs:** https://docs.blockscout.com/for-users/api/rest-api-endpoints

#### Chains Covered

| Chain | Base URL |
|:------|:---------|
| Ethereum | `https://eth.blockscout.com/api/v2` |
| Base | `https://base.blockscout.com/api/v2` |
| Optimism | `https://optimism.blockscout.com/api/v2` |
| Gnosis | `https://gnosis.blockscout.com/api/v2` |
| Celo | `https://celo.blockscout.com/api/v2` |
| Zora | `https://zora.blockscout.com/api/v2` |

#### Endpoints (per chain)

| Endpoint | Data Returned |
|:---------|:--------------|
| `/stats` | Chain stats: total blocks, transactions, addresses |
| `/transactions?filter=validated` | Recent validated transactions |
| `/blocks?type=block` | Recent blocks |
| `/addresses/{address}` | Address summary, balance, tx count |
| `/addresses/{address}/tokens?type=ERC-20` | ERC-20 token balances |
| `/addresses/{address}/transactions?filter=to%20%7C%20from` | Transactions involving address |
| `/addresses/{address}/token-transfers?type=ERC-20` | Token transfers |

---

### 7. GMGN

**Status:** ✅ Implemented | **File:** `sources/gmgn.ts` | **API Key:** None required  
**Base URL:** `https://gmgn.ai/defi/quotation/v1`  
**Note:** Unofficial API — same endpoints as existing Playwright scrapers

#### Smart Money Categories
`smart_degen`, `kol`, `sniper`, `fresh_wallet`, `top_dev`, `pump_smart`

#### Timeframes
`1d`, `7d`, `30d`

#### Endpoints

| Endpoint | Parameters | Data Returned |
|:---------|:-----------|:--------------|
| `/tokens/trending/{chain}` | `chain` (sol/bsc), `orderby`, `direction`, `filters[]` | Trending tokens with volume, price change |
| `/rank/{chain}/{category}/{timeframe}` | `chain`, `category`, `timeframe`, `orderby`, `direction`, `page`, `limit` | Smart money wallet rankings |
| `/wallet/{chain}/current_profit` | `chain`, `wallet`, `period` | Wallet PnL for period |
| `/wallet/{chain}/holdings` | `chain`, `wallet`, `orderby`, `direction`, `showsmall`, `sellout` | Current token holdings |
| `/wallet/{chain}/activity` | `chain`, `wallet`, `limit` | Recent trading activity |

#### Data Fields (wallet ranking)
`address`, `twitter_username`, `twitter_name`, `avatar`, `pnl_1d`, `pnl_7d`, `pnl_30d`, `winrate`, `realized_profit`, `unrealized_profit`, `total_profit`, `sol_balance`, `buy_30d`, `sell_30d`, `last_active_timestamp`, `tags[]`

---

### 8. KolScan

**Status:** ✅ Implemented | **File:** `sources/kolscan.ts` | **API Key:** None required  
**Base URL:** `https://api.kolscan.io`

#### Endpoints

| Endpoint | Method | Parameters | Data Returned |
|:---------|:------:|:-----------|:--------------|
| `/leaderboard` | POST | `timeframe` (daily/weekly/monthly), `page`, `limit` | KOL wallet rankings with PnL |
| `/wallet/{address}` | GET | `address` | Wallet profile, Twitter link, total PnL |
| `/wallet/{address}/trades?limit=50&page=1` | GET | `address`, `limit`, `page` | Trade history |

#### Data Fields (leaderboard entry)
`wallet`, `twitter_username`, `twitter_name`, `twitter_pfp`, `pnl_total`, `pnl_7d`, `pnl_30d`, `win_rate`, `total_trades`, `winning_trades`, `avg_hold_time`, `roi`, `last_active`

---

### 9. Supplemental Sources

**Status:** ⚠️ Partially Implemented | **File:** `sources/supplemental.ts`

#### Cielo Finance
**Base URL:** `https://api.cielo.finance`

| Endpoint | Data Returned |
|:---------|:--------------|
| `/feed?limit=50&type=swap` | Recent whale swap activity feed |
| `/whales?chain={chain}&limit=50` | Top whale wallets per chain |

#### SolanaFM
**Base URL:** `https://api.solana.fm/v1`

| Endpoint | Data Returned |
|:---------|:--------------|
| `/stats` | Network stats, TPS |
| `/accounts/{address}` | Account info, SOL balance |

#### Step Finance
**Base URL:** `https://api.step.finance/v2`

| Endpoint | Data Returned |
|:---------|:--------------|
| `/portfolio?publicKey={wallet}` | DeFi portfolio positions |

#### Nansen (Public Only)
**Endpoint:** `https://api.nansen.ai/query/nansen-1/dex/top-traders?chain=ethereum&period=24h&limit=50`

#### Arkham Intelligence (Public Only)
**Endpoint:** `https://api.arkhamintelligence.com/assets`

#### Whale Alert
**Endpoint:** `https://api.whale-alert.io/v1/transactions?api_key=free&min_value=1000000&limit=50`

---

## Tier 2 — Free API Key Required

Sign up once, add key to `.env`, and these unlock. All skip gracefully if the key is missing.

---

### 10. Helius

**Status:** 🔨 Implemented | **File:** `sources/helius.ts` | **Key:** `HELIUS_API_KEY`  
**Docs:** https://docs.helius.dev/  
**Free Tier:** 10k credits/day  
**Priority:** ⭐⭐⭐ HIGHEST — best Solana wallet indexer

#### REST Endpoints

| Endpoint | Parameters | Data Returned |
|:---------|:-----------|:--------------|
| `/v0/addresses/{address}/transactions?api-key={key}&limit=50&type=SWAP` | `address`, `limit`, `type` | Enhanced parsed swap transactions |
| `/v0/addresses/{address}/transactions?api-key={key}&limit=50` | `address`, `limit` | All enhanced transactions |
| `/v0/addresses/{address}/balances?api-key={key}` | `address` | Token balances with USD values |
| `/v0/tokens/metadata?api-key={key}` | POST: `mintAccounts[]`, `includeOffChain` | Batch token metadata |

#### DAS (Digital Asset Standard) RPC Methods

| Method | Parameters | Data Returned |
|:-------|:-----------|:--------------|
| `getAssetsByOwner` | `ownerAddress`, `page`, `limit`, `displayOptions` | All assets (fungible + NFT) owned by wallet |
| `searchAssets` | `tokenType`, `sortBy`, `displayOptions` | Search across all assets |

#### Display Options
`showFungible: true`, `showNativeBalance: true`, `showCollectionMetadata: true`

#### Transaction Data Fields
`signature`, `timestamp`, `type`, `source`, `fee`, `feePayer`, `nativeTransfers[]`, `tokenTransfers[]`, `accountData[]`, `events.swap{}` (with `tokenInputs[]`, `tokenOutputs[]`, `innerSwaps[]`)

---

### 11. Birdeye

**Status:** 🔨 Implemented | **File:** `sources/birdeye.ts` | **Key:** `BIRDEYE_API_KEY`  
**Docs:** https://docs.birdeye.so/reference  
**Header:** `X-API-KEY: {key}`, `x-chain: solana`

#### Token Endpoints

| Endpoint | Parameters | Data Returned |
|:---------|:-----------|:--------------|
| `/defi/tokenlist?sort_by={field}&sort_type=desc&offset=0&limit=50` | `sort_by` (v24hUSD, mc), `limit`, `offset` | Token list with analytics |
| `/defi/trending_tokens?sort_by=rank&sort_type=asc&offset=0&limit=20` | `sort_by`, `limit` | Currently trending tokens |
| `/defi/price?address={token}` | `address` | Current token price |
| `/defi/token_overview?address={token}` | `address` | Full token analytics |
| `/defi/token_security?address={token}` | `address` | Security score, honeypot check |
| `/defi/history_price?address={token}&type=1D&time_from={ts}&time_to={ts}` | `address`, `type`, `time_from`, `time_to` | OHLCV price history |
| `/defi/ohlcv?address={pair}&type=15m` | `address`, `type` | OHLCV for specific pair |

#### Wallet Endpoints

| Endpoint | Parameters | Data Returned |
|:---------|:-----------|:--------------|
| `/v1/wallet/token_list?wallet={address}` | `wallet` | All token holdings |
| `/v1/wallet/tx_list?wallet={address}&limit=50` | `wallet`, `limit` | Transaction history |
| `/v1/wallet/portfolio?wallet={address}` | `wallet` | Portfolio value over time |

#### Token Overview Fields
`address`, `symbol`, `name`, `decimals`, `logoURI`, `price`, `priceChange24hPercent`, `liquidity`, `volume24h`, `marketCap`, `holder`, `supply`, `extensions{}`

#### Security Fields
`isToken2022`, `isMintable`, `isFreezable`, `hasBurnedLp`, `top10HolderPercent`, `holderCount`, `creatorAddress`, `creatorPercentage`

---

### 12. Solscan

**Status:** 🔨 Implemented | **File:** `sources/solscan.ts` | **Key:** `SOLSCAN_API_KEY` (optional)  
**Docs:** https://pro-api.solscan.io/pro-api-docs/v2.0

#### Public Endpoints (no key)

| Endpoint | Data Returned |
|:---------|:--------------|
| `/market/token/trending?limit=20` | Trending tokens |
| `/token/list?sortBy=market_cap&direction=desc&limit=50&offset=0` | Token list by mcap |
| `/chaininfo` | Solana chain stats |
| `/account/tokens?account={wallet}&type=token&limit=40` | Wallet token balances |
| `/account/transactions?account={wallet}&limit=40` | Wallet transactions |

#### Pro Endpoints (with key)

| Endpoint | Data Returned |
|:---------|:--------------|
| `/account/portfolio?address={wallet}` | Full portfolio with historical value |
| `/account/defi/activities?address={wallet}&page=1&page_size=40` | DeFi protocol interactions |
| `/account/balance_change_activities?address={wallet}` | Balance change events |

---

### 13. Moralis

**Status:** 🔨 Implemented | **File:** `sources/moralis.ts` | **Key:** `MORALIS_API_KEY`  
**Docs:** https://docs.moralis.com/web3-data-api/evm/reference  
**Free Tier:** 40k CU/day (25 req/sec)

#### EVM Base URL: `https://deep-index.moralis.io/api/v2.2`
#### Solana Base URL: `https://solana-gateway.moralis.io`

#### Global Endpoints

| Endpoint | Data Returned |
|:---------|:--------------|
| `/market-data/global/market-cap` | Global crypto market cap |
| `/market-data/erc20s/top-tokens` | Top ERC-20 tokens by mcap |
| `/market-data/erc20s/trending` | Currently trending tokens |
| `/discovery/whales?chains={}&limit=30` | Discovered whale wallets |

#### Per-Wallet EVM Endpoints

| Endpoint | Parameters | Data Returned |
|:---------|:-----------|:--------------|
| `/wallets/{address}/tokens?exclude_spam=true&exclude_unverified_contracts=true` | `address` | Token balances |
| `/wallets/{address}/net-worth?exclude_spam=true` | `address` | Net worth in USD |
| `/wallets/{address}/history?include_internal_transactions=true&limit=50` | `address` | Full tx history |
| `/wallets/{address}/profitability/top-tokens?days=30` | `address`, `days` | Most profitable tokens |
| `/wallets/{address}/defi/positions?protocol=all` | `address` | DeFi positions |
| `/wallets/{address}/chains` | `address` | Chains wallet is active on |
| `/wallets/{address}/nfts?exclude_spam=true&limit=20` | `address` | NFT holdings |

#### Per-Wallet Solana Endpoints

| Endpoint | Data Returned |
|:---------|:--------------|
| `/account/mainnet/{address}/tokens` | SPL token balances |
| `/account/mainnet/{address}/portfolio` | Portfolio with value |

---

### 14. Alchemy

**Status:** 🔨 Implemented | **File:** `sources/alchemy.ts` | **Keys:** Per-chain  
**Docs:** https://docs.alchemy.com/reference/api-overview  
**Free Tier:** 300M CU/month per app

#### Environment Variables
`ALCHEMY_ETH_KEY`, `ALCHEMY_BASE_KEY`, `ALCHEMY_ARB_KEY`, `ALCHEMY_POLYGON_KEY`, `ALCHEMY_OPT_KEY`, `ALCHEMY_SOL_KEY`

#### EVM JSON-RPC Methods

| Method | Parameters | Data Returned |
|:-------|:-----------|:--------------|
| `alchemy_getTokenBalances` | `[address, "erc20"]` | All ERC-20 balances |
| `alchemy_getAssetTransfers` | `{fromAddress/toAddress, category[], maxCount, withMetadata, order}` | Transfers in/out |
| `eth_getBalance` | `[address, "latest"]` | Native balance |

#### Categories for Asset Transfers
`external`, `internal`, `erc20`, `erc721`, `erc1155`

#### NFT REST Endpoint
`/nft/v3/{key}/getNFTsForOwner?owner={address}&pageSize=20`

#### Solana JSON-RPC Methods
`getBalance`, `getTokenAccountsByOwner`, `getSignaturesForAddress`

---

### 15. Covalent (GoldRush)

**Status:** 🔨 Implemented | **File:** `sources/covalent.ts` | **Key:** `COVALENT_API_KEY`  
**Docs:** https://www.covalenthq.com/docs/api/  
**Auth:** Basic auth with key as username  
**Chains:** 200+ supported

#### Base URL: `https://api.covalenthq.com`

#### Global Endpoints

| Endpoint | Data Returned |
|:---------|:--------------|
| `/v1/chains/` | All supported chains |
| `/v1/chains/status/` | Chain status (healthy/degraded) |

#### Per-Wallet Endpoints

| Endpoint | Parameters | Data Returned |
|:---------|:-----------|:--------------|
| `/v1/{chain}/address/{address}/balances_v2/?nft=false` | `chain`, `address` | Token balances |
| `/v1/{chain}/address/{address}/transactions_v3/page/0/?page-size=20` | `chain`, `address` | Transaction history |
| `/v1/{chain}/address/{address}/portfolio_v2/?days=30` | `chain`, `address` | Portfolio over time |
| `/v1/{chain}/address/{address}/stacks/uniswap_v3/` | `chain`, `address` | Uniswap V3 positions |

#### Token Endpoints

| Endpoint | Data Returned |
|:---------|:--------------|
| `/v1/eth-mainnet/tokens/{contract}/token_holders_v2/?page-size=100` | Top token holders |
| `/v1/pricing/historical_by_addresses_v2/{chain}/USD/{contracts}/` | Historical prices |

#### Chains Fetched
`eth-mainnet`, `bsc-mainnet`, `matic-mainnet`, `base-mainnet`, `arbitrum-mainnet`, `optimism-mainnet`, `avalanche-mainnet`

---

### 16. DeBank

**Status:** 🔨 Implemented | **File:** `sources/debank.ts` | **Key:** `DEBANK_API_KEY`  
**Docs:** https://cloud.debank.com/api-access  
**Free Tier:** 100k API units  
**Priority:** ⭐⭐⭐ Best EVM DeFi positions

#### Base URL: `https://pro-openapi.debank.com/v1`
#### Header: `AccessKey: {key}`

#### Global Endpoints

| Endpoint | Data Returned |
|:---------|:--------------|
| `/chain/list` | All supported chains |
| `/protocol/all_list` | All DeFi protocols (~3k+) |

#### Per-Wallet Endpoints

| Endpoint | Parameters | Data Returned |
|:---------|:-----------|:--------------|
| `/user/total_balance?id={address}` | `id` (lowercase) | Total USD balance |
| `/user/all_token_list?id={address}&is_all=true` | `id`, `is_all` | All token balances |
| `/user/all_complex_protocol_list?id={address}` | `id` | DeFi positions across all protocols |
| `/user/history_list?id={address}&page_count=20` | `id`, `page_count` | Transaction history |
| `/user/used_chain_list?id={address}` | `id` | Chains wallet has used |
| `/user/nft_list?id={address}` | `id` | NFT holdings |

#### DeFi Position Data
`id`, `chain`, `name`, `logo_url`, `site_url`, `portfolio_item_list[]` containing `name`, `stats{}`, `asset_token_list[]`, `detail{supply_token_list[], reward_token_list[]}`

---

### 17. Zerion

**Status:** 🔨 Implemented | **File:** `sources/zerion.ts` | **Key:** `ZERION_API_KEY`  
**Docs:** https://developers.zerion.io/reference  
**Auth:** Basic auth with key  
**Coverage:** 100+ EVM chains

#### Base URL: `https://api.zerion.io/v1`

#### Global Endpoints

| Endpoint | Data Returned |
|:---------|:--------------|
| `/chains` | All supported chains |
| `/fungibles/top?sort={field}&page[size]=100` | Top tokens by criteria |

#### Sort Options
`market_cap`, `change_24h`

#### Per-Wallet Endpoints

| Endpoint | Parameters | Data Returned |
|:---------|:-----------|:--------------|
| `/wallets/{address}/positions/?filter[trash]=only_non_trash&currency=usd&sort=value&page[size]=100` | `address` | All positions (tokens + DeFi) |
| `/wallets/{address}/portfolio?currency=usd&portfolio_fields=all` | `address` | Portfolio chart |
| `/wallets/{address}/transactions/?currency=usd&page[size]=100` | `address` | Transaction history |
| `/wallets/{address}/nft-positions/?sort=floor_price&currency=usd` | `address` | NFT positions |

#### Position Data Fields
`id`, `type` (wallet, contract), `attributes.position_type` (wallet, deposit, stake, etc.), `attributes.quantity`, `attributes.value`, `attributes.price`, `attributes.fungible_info{name, symbol, icon}`, `attributes.application_metadata{name, url}`

---

### 18. Tatum

**Status:** 🔨 Implemented | **File:** `sources/tatum.ts` | **Key:** `TATUM_API_KEY`  
**Docs:** https://apidoc.tatum.io/  
**Free Tier:** 10 req/sec  
**Chains:** 90+

#### Base URLs: `https://api.tatum.io/v4` (new), `https://api.tatum.io/v3` (legacy)
#### Header: `x-api-key: {key}`

#### Global Endpoints

| Endpoint | Data Returned |
|:---------|:--------------|
| `/tatum/rate/{symbol}?basePair=USD` (v3) | Exchange rate for token |
| `/blockchain/fee/{chain}` (v3) | Gas prices for chain |

#### Symbols Fetched
`BTC`, `ETH`, `BNB`, `SOL`, `USDT`, `USDC`, `MATIC`, `AVAX`, `LINK`, `UNI`, `AAVE`, `ARB`, `OP`, `DOGE`, `SHIB`

#### Per-Wallet Endpoints

| Endpoint | Parameters | Data Returned |
|:---------|:-----------|:--------------|
| `/balance/{CHAIN}/{address}` | `chain`, `address` | Native balance |
| `/data/balances?addresses={address}&chain={CHAIN}` | `addresses`, `chain` | Token balances |
| `/data/transactions?addresses={address}&chain={CHAIN}&pageSize=50` | `addresses`, `chain`, `pageSize` | Transaction history |

#### Chains
`ETHEREUM`, `BSC`, `POLYGON`, `BASE`, `ARBITRUM`, `OPTIMISM`, `AVALANCHE`, `SOL`

---

### 19. Chainbase

**Status:** 🔨 Implemented | **File:** `sources/chainbase.ts` | **Key:** `CHAINBASE_API_KEY`  
**Docs:** https://docs.chainbase.com/reference  
**Free Tier:** 300 req/day

#### Base URL: `https://api.chainbase.online/v1`
#### Header: `x-api-key: {key}`

#### Chain IDs
| Chain | ID |
|:------|:---|
| Ethereum | 1 |
| BSC | 56 |
| Polygon | 137 |
| Base | 8453 |
| Arbitrum | 42161 |
| Optimism | 10 |
| Avalanche | 43114 |

#### Endpoints

| Endpoint | Parameters | Data Returned |
|:---------|:-----------|:--------------|
| `/token/market/top?chain_id={id}&limit=50&page=1` | `chain_id`, `limit` | Trending tokens |
| `/account/tokens?chain_id={id}&address={addr}&limit=20&page=1` | `chain_id`, `address` | Token balances |
| `/account/txs?chain_id={id}&address={addr}&limit=50&page=1` | `chain_id`, `address` | Transaction history |
| `/account/token_transfers?chain_id={id}&address={addr}&limit=50&page=1` | `chain_id`, `address` | Token transfers |
| `/account/nfts?chain_id={id}&address={addr}` | `chain_id`, `address` | NFT holdings |
| `/token/top_holders?chain_id={id}&contract_address={addr}` | `chain_id`, `contract_address` | Top token holders |

---

### 20. Etherscan Family

**Status:** 🔨 Implemented | **File:** `sources/etherscan.ts`  
**Docs:** https://docs.etherscan.io/api-endpoints

#### Chain Configuration

| Chain | Base URL | Env Var |
|:------|:---------|:--------|
| Ethereum | `https://api.etherscan.io/api` | `ETHERSCAN_API_KEY` |
| BSC | `https://api.bscscan.com/api` | `BSCSCAN_API_KEY` |
| Base | `https://api.basescan.org/api` | `BASESCAN_API_KEY` |
| Arbitrum | `https://api.arbiscan.io/api` | `ARBISCAN_API_KEY` |
| Polygon | `https://api.polygonscan.com/api` | `POLYGONSCAN_API_KEY` |
| Optimism | `https://api-optimistic.etherscan.io/api` | `OPTIMISMSCAN_API_KEY` |

#### Global Endpoints (per chain)

| Module | Action | Data Returned |
|:-------|:-------|:--------------|
| `stats` | `ethprice` | Current ETH price |
| `stats` | `ethsupply` | Total supply |
| `gastracker` | `gasoracle` | Gas prices (safe, propose, fast) |

#### Per-Wallet Endpoints

| Module | Action | Parameters | Data Returned |
|:-------|:-------|:-----------|:--------------|
| `account` | `balance` | `address`, `tag=latest` | Native balance |
| `account` | `txlist` | `address`, `startblock`, `endblock`, `sort`, `page`, `offset` | Normal transactions |
| `account` | `tokentx` | `address`, `startblock`, `endblock`, `sort`, `page`, `offset` | ERC-20 transfers |
| `account` | `tokennfttx` | `address` | ERC-721 transfers |
| `account` | `token1155tx` | `address` | ERC-1155 transfers |

---

### 21. Dune Analytics

**Status:** 🔨 Implemented | **File:** `sources/dune.ts` | **Key:** `DUNE_API_KEY`  
**Docs:** https://docs.dune.com/api-reference  
**Free Tier:** 1000 credits/month, 10 req/min

#### Base URL: `https://api.dune.com/api/v1`
#### Header: `X-Dune-API-Key: {key}`

#### Query Execution Flow
1. Try `/query/{id}/results?limit=1000` (cached, 0 credits)
2. If empty, POST `/query/{id}/execute` with `{performance: "medium"}`
3. Poll `/execution/{execution_id}/status` until `QUERY_STATE_COMPLETED`
4. GET `/execution/{execution_id}/results?limit=1000`

#### Public Query IDs Executed

| Query ID | Name | Description |
|:---------|:-----|:------------|
| 2435924 | solana-top-traders-pnl | Top Solana DEX traders by PnL |
| 2028278 | solana-dex-volume-daily | Daily Solana DEX volume |
| 3326291 | smart-money-eth-top-wallets | ETH smart money wallets |
| 1258228 | eth-dex-volume-by-protocol | DEX volume by protocol |
| 2726556 | bsc-top-traders | BSC top traders |
| 2035353 | base-chain-top-traders | Base top traders |
| 3209028 | solana-meme-coin-traders | Meme coin specialists |
| 2041663 | uniswap-top-wallets | Uniswap power users |
| 2551418 | raydium-top-wallets-pnl | Raydium top wallets |
| 2724854 | solana-new-wallets-daily | New Solana wallets |
| 3107899 | defi-smart-money-label | DeFi smart money labels |
| 2436278 | whale-wallet-eth-movements | ETH whale movements |
| 1284956 | crypto-twitter-kol-wallets | KOL wallets linked to Twitter |
| 3311589 | solana-top-100-wallets-30d | Top 100 Solana wallets 30d |
| 2763198 | base-dex-top-traders-30d | Base DEX traders 30d |

#### Echo API (Trending)

| Endpoint | Data Returned |
|:---------|:--------------|
| `https://api.dune.com/api/echo/v1/tokens/trending/evm` | Trending EVM tokens |
| `https://api.dune.com/api/echo/v1/tokens/trending/solana` | Trending Solana tokens |

#### Wallet Profile Endpoint
`/wallet/{address}` — Returns Dune labels and stats for wallet

---

### 22. Flipside Crypto

**Status:** 🔨 Implemented | **File:** `sources/flipside.ts` | **Key:** `FLIPSIDE_API_KEY`  
**Docs:** https://docs.flipsidecrypto.xyz/flipside-api  
**Free Tier:** Generous SQL access

#### Base URL: `https://api-v2.flipsidecrypto.xyz`
#### Header: `x-api-key: {key}`

#### Query Execution Flow
1. POST `/queries/run` with SQL payload
2. Poll for completion
3. Paginate results

#### SQL Queries Executed

**solana-top-traders-7d:**
```sql
SELECT
  tx_from AS wallet,
  COUNT(DISTINCT tx_id) AS tx_count,
  SUM(swap_to_amount_usd) AS total_buy_usd,
  SUM(swap_from_amount_usd) AS total_sell_usd,
  SUM(swap_to_amount_usd - swap_from_amount_usd) AS pnl_usd
FROM solana.defi.ez_dex_swaps
WHERE block_timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
  AND swap_to_amount_usd > 10
GROUP BY 1
HAVING SUM(swap_to_amount_usd) > 50000
ORDER BY pnl_usd DESC
LIMIT 500
```

**solana-kol-wallets-30d:**
```sql
SELECT
  tx_from AS wallet,
  COUNT(DISTINCT swap_to_mint) AS tokens_traded,
  COUNT(DISTINCT tx_id) AS total_trades,
  SUM(swap_to_amount_usd) AS total_volume_usd,
  SUM(CASE WHEN swap_to_amount_usd > swap_from_amount_usd THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0) AS win_rate
FROM solana.defi.ez_dex_swaps
WHERE block_timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days'
  AND swap_to_amount_usd > 1
GROUP BY 1
HAVING COUNT(DISTINCT tx_id) >= 20 AND SUM(swap_to_amount_usd) > 10000
ORDER BY total_volume_usd DESC
LIMIT 500
```

**eth-smart-money-wallets-30d:**
```sql
SELECT
  from_address AS wallet,
  COUNT(DISTINCT tx_hash) AS tx_count,
  SUM(amount_usd) AS total_volume_usd,
  COUNT(DISTINCT contract_address) AS tokens_swapped,
  MAX(block_timestamp) AS last_active
FROM ethereum.defi.ez_dex_swaps
WHERE block_timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days'
  AND amount_usd > 10
GROUP BY 1
HAVING SUM(amount_usd) > 100000
ORDER BY total_volume_usd DESC
LIMIT 500
```

**base-top-traders-30d, solana-new-whale-wallets, solana-trending-tokens-24h** — similar structure

---

### 23. Bitquery

**Status:** 🔨 Implemented | **File:** `sources/bitquery.ts` | **Key:** `BITQUERY_API_KEY`  
**Docs:** https://docs.bitquery.io/docs/graphql-ide  
**Free Tier:** 10k points/month

#### Base URL: `https://streaming.bitquery.io/graphql`
#### Headers: `Authorization: Bearer {key}`, `X-API-KEY: {key}`

#### GraphQL Queries

**Solana Top DEX Traders (7d):**
```graphql
query SolanaTopTraders($since: ISO8601DateTime!) {
  Solana {
    DEXTradeByTokens(
      where: {Trade: {Side: {Type: {is: buy}}}, Block: {Time: {since: $since}}}
      orderBy: {descendingByField: "volume_usd"}
      limit: {count: 100}
    ) {
      Trade { Account { Address } Currency { Symbol MintAddress } Amount PriceInUSD }
      volume_usd: sum(of: Trade__AmountInUSD)
      trades: count
    }
  }
}
```

**Solana Whale Transfers:**
```graphql
query SolanaWhales {
  Solana {
    Transfers(
      where: {Transfer: {AmountInUSD: {gt: "10000"}}}
      orderBy: {descendingByField: "Transfer__AmountInUSD"}
      limit: {count: 100}
    ) {
      Transfer { Amount AmountInUSD Currency { Symbol MintAddress } Sender Receiver }
      Block { Time }
    }
  }
}
```

**ETH Top DEX Traders (7d):**
```graphql
query EthTopTraders($since: ISO8601DateTime!) {
  EVM(network: eth) {
    DEXTradeByTokens(
      where: {Block: {Time: {since: $since}}}
      orderBy: {descendingByField: "volume_usd"}
      limit: {count: 100}
    ) {
      Trade { Buyer Sender Currency { Symbol SmartContract } AmountInUSD }
      volume_usd: sum(of: Trade__AmountInUSD)
      trades: count
    }
  }
}
```

**New Solana Token Launches:**
```graphql
query NewSolanaTokens {
  Solana {
    Instructions(
      where: {Instruction: {Program: {Method: {is: "initializeMint"}}}}
      orderBy: {descending: Block__Time}
      limit: {count: 200}
    ) {
      Instruction { Accounts { Address } Program { Method } }
      Block { Time }
      Transaction { Signer }
    }
  }
}
```

**BSC Smart Money (24h):** Similar to ETH query with `network: bsc`

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
