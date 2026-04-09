/**
 * GMGN fetcher — scrapes GMGN API endpoints (no official key needed, same as existing scrapers)
 * Extends existing scrape-gmgn-x-tracker.js with more endpoints.
 *
 * GMGN is one of the best free Solana smart-money data sources.
 *
 * Endpoints:
 * - /sol/token/trending (trending tokens)
 * - /sol/wallet/smart_money (smart money list)
 * - /sol/wallet/kol (KOL wallets)
 * - /sol/wallet/sniper (sniper wallets)
 * - /sol/wallet/fresh (fresh wallet list)
 * - /sol/wallet/top_dev (top dev wallets)
 * - /sol/wallet/{address}/pnl (wallet PnL)
 * - /sol/wallet/{address}/holdings (current holdings)
 * - /sol/token/{address} (token data)
 * - BSC equivalents
 */

import { fetchJSON, saveArchive, log, sleep } from "../lib/utils.ts";
import { loadSolWallets, loadEvmWallets, loadTopWallets } from "../lib/wallets.ts";

const BASE = "https://gmgn.ai/defi/quotation/v1";
const SRC = "gmgn";
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
  "User-Agent": UA,
  Accept: "application/json, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://gmgn.ai/",
};

const SMART_MONEY_CATEGORIES = [
  "smart_degen",
  "kol",
  "sniper",
  "fresh_wallet",
  "top_dev",
  "pump_smart",
];

const TIMEFRAMES = ["1d", "7d", "30d"];

export async function runGMGN() {
  log(SRC, "Starting GMGN fetch...");

  // 1. Trending tokens (SOL)
  const trending = await fetchJSON(
    `${BASE}/tokens/trending/sol?orderby=total_volume&direction=desc&filters[]=not_honeypot&filters[]=pump`,
    { source: SRC, headers: HEADERS }
  );
  if (trending) saveArchive(SRC, "trending-tokens-sol", trending);
  await sleep(600);

  // Trending without filter
  const trendingAll = await fetchJSON(
    `${BASE}/tokens/trending/sol?orderby=total_volume&direction=desc`,
    { source: SRC, headers: HEADERS }
  );
  if (trendingAll) saveArchive(SRC, "trending-tokens-sol-all", trendingAll);
  await sleep(600);

  // BSC trending
  const trendingBsc = await fetchJSON(
    `${BASE}/tokens/trending/bsc?orderby=total_volume&direction=desc`,
    { source: SRC, headers: HEADERS }
  );
  if (trendingBsc) saveArchive(SRC, "trending-tokens-bsc", trendingBsc);
  await sleep(600);

  // 2. Smart money wallet lists across categories + timeframes
  for (const category of SMART_MONEY_CATEGORIES) {
    for (const timeframe of TIMEFRAMES) {
      const wallets = await fetchJSON(
        `${BASE}/rank/sol/${category}/${timeframe}?orderby=pnl_${timeframe}&direction=desc&page=1&limit=100`,
        { source: SRC, headers: HEADERS }
      );
      if (wallets) {
        saveArchive(SRC, `wallets-sol-${category}-${timeframe}`, wallets);
        const count = wallets?.data?.rank?.length ?? wallets?.rank?.length ?? "?";
        log(SRC, `SOL ${category} ${timeframe}: ${count} wallets`);
      }
      await sleep(700);

      // BSC equivalent
      const bscWallets = await fetchJSON(
        `${BASE}/rank/bsc/${category}/${timeframe}?orderby=pnl_${timeframe}&direction=desc&page=1&limit=100`,
        { source: SRC, headers: HEADERS }
      );
      if (bscWallets) {
        saveArchive(SRC, `wallets-bsc-${category}-${timeframe}`, bscWallets);
      }
      await sleep(700);
    }
  }

  // 3. Per-wallet PnL data (top wallets)
  const solWallets = loadTopWallets("sol", 50);
  log(SRC, `Fetching GMGN PnL for ${solWallets.length} SOL wallets`);

  for (const wallet of solWallets) {
    const data: any = { wallet };

    for (const period of ["7d", "30d"]) {
      const pnl = await fetchJSON(
        `${BASE}/wallet/sol/current_profit?wallet=${wallet}&period=${period}`,
        { source: SRC, headers: HEADERS, delayMs: 300 }
      );
      if (pnl) data[`pnl_${period}`] = pnl;
    }

    const holdings = await fetchJSON(
      `${BASE}/wallet/sol/holdings?wallet=${wallet}&orderby=usd_value&direction=desc&showsmall=true&sellout=false`,
      { source: SRC, headers: HEADERS, delayMs: 300 }
    );
    if (holdings) data.holdings = holdings;

    const recentTrades = await fetchJSON(
      `${BASE}/wallet/sol/activity?wallet=${wallet}&limit=50`,
      { source: SRC, headers: HEADERS, delayMs: 300 }
    );
    if (recentTrades) data.recent_trades = recentTrades;

    saveArchive(SRC, `wallet-sol-${wallet}`, data);
    log(SRC, `Saved GMGN wallet ${wallet.slice(0, 8)}...`);
    await sleep(900);
  }

  // 4. BSC wallet data
  const bscWallets = loadEvmWallets().slice(0, 30);
  for (const wallet of bscWallets) {
    const data: any = { wallet };

    for (const period of ["7d", "30d"]) {
      const pnl = await fetchJSON(
        `${BASE}/wallet/bsc/current_profit?wallet=${wallet.toLowerCase()}&period=${period}`,
        { source: SRC, headers: HEADERS, delayMs: 300 }
      );
      if (pnl) data[`pnl_${period}`] = pnl;
    }

    const holdings = await fetchJSON(
      `${BASE}/wallet/bsc/holdings?wallet=${wallet.toLowerCase()}&orderby=usd_value&direction=desc`,
      { source: SRC, headers: HEADERS, delayMs: 300 }
    );
    if (holdings) data.holdings = holdings;

    saveArchive(SRC, `wallet-bsc-${wallet.toLowerCase()}`, data);
    log(SRC, `Saved GMGN BSC wallet ${wallet.slice(0, 8)}...`);
    await sleep(900);
  }

  log(SRC, "GMGN fetch complete.");
}
