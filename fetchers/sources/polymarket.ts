/**
 * Polymarket fetcher — scrapes Polymarket APIs for prediction market data
 *
 * Polymarket is a leading prediction market on Polygon (MATIC).
 * All endpoints are public and require no API key.
 *
 * APIs used:
 * - Data API (data-api.polymarket.com): Leaderboard, positions, trades, analytics
 * - Gamma API (gamma-api.polymarket.com): Markets, events, search
 * - CLOB API (clob.polymarket.com): Order books, prices (public read)
 *
 * Output: Leaderboard of top traders with PnL, active markets, and positions
 */

import { fetchJSON, saveArchive, log, sleep } from "../lib/utils.ts";

const DATA_API = "https://data-api.polymarket.com";
const GAMMA_API = "https://gamma-api.polymarket.com";
const CLOB_API = "https://clob.polymarket.com";
const SRC = "polymarket";

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
  "User-Agent": UA,
  Accept: "application/json, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Origin: "https://polymarket.com",
  Referer: "https://polymarket.com/",
};

// Categories for market filtering
const CATEGORIES = [
  "politics",
  "sports",
  "crypto",
  "business",
  "science",
  "culture",
  "world",
];

export async function runPolymarket() {
  log(SRC, "Starting Polymarket fetch...");

  // ────────────────────────────────────────────────────────────
  // 1. Leaderboard — top traders by PnL
  // ────────────────────────────────────────────────────────────
  log(SRC, "Fetching leaderboard...");
  
  // Overall leaderboard
  const leaderboard = await fetchJSON(
    `${DATA_API}/leaderboard?limit=500`,
    { source: SRC, headers: HEADERS }
  );
  if (leaderboard) {
    saveArchive(SRC, "leaderboard", leaderboard);
    const count = Array.isArray(leaderboard) ? leaderboard.length : "?";
    log(SRC, `Leaderboard: ${count} traders`);
  }
  await sleep(500);

  // Weekly leaderboard
  const leaderboard7d = await fetchJSON(
    `${DATA_API}/leaderboard?window=7d&limit=200`,
    { source: SRC, headers: HEADERS }
  );
  if (leaderboard7d) {
    saveArchive(SRC, "leaderboard-7d", leaderboard7d);
  }
  await sleep(500);

  // Monthly leaderboard
  const leaderboard30d = await fetchJSON(
    `${DATA_API}/leaderboard?window=30d&limit=200`,
    { source: SRC, headers: HEADERS }
  );
  if (leaderboard30d) {
    saveArchive(SRC, "leaderboard-30d", leaderboard30d);
  }
  await sleep(500);

  // ────────────────────────────────────────────────────────────
  // 2. Active markets/events
  // ────────────────────────────────────────────────────────────
  log(SRC, "Fetching active markets...");
  
  const activeEvents = await fetchJSON(
    `${GAMMA_API}/events?limit=100&active=true&order=volume&ascending=false`,
    { source: SRC, headers: HEADERS }
  );
  if (activeEvents) {
    saveArchive(SRC, "events-active", activeEvents);
    const count = Array.isArray(activeEvents) ? activeEvents.length : "?";
    log(SRC, `Active events: ${count}`);
  }
  await sleep(500);

  const activeMarkets = await fetchJSON(
    `${GAMMA_API}/markets?limit=200&active=true&order=volume&ascending=false`,
    { source: SRC, headers: HEADERS }
  );
  if (activeMarkets) {
    saveArchive(SRC, "markets-active", activeMarkets);
    const count = Array.isArray(activeMarkets) ? activeMarkets.length : "?";
    log(SRC, `Active markets: ${count}`);
  }
  await sleep(500);

  // Fetch markets by category
  for (const category of CATEGORIES) {
    const markets = await fetchJSON(
      `${GAMMA_API}/markets?limit=50&active=true&tag=${category}`,
      { source: SRC, headers: HEADERS }
    );
    if (markets) {
      saveArchive(SRC, `markets-${category}`, markets);
    }
    await sleep(400);
  }

  // ────────────────────────────────────────────────────────────
  // 3. Trending/popular markets
  // ────────────────────────────────────────────────────────────
  log(SRC, "Fetching trending markets...");
  
  const trending = await fetchJSON(
    `${GAMMA_API}/markets?limit=50&order=volume_24h&ascending=false&active=true`,
    { source: SRC, headers: HEADERS }
  );
  if (trending) {
    saveArchive(SRC, "markets-trending", trending);
  }
  await sleep(500);

  // ────────────────────────────────────────────────────────────
  // 4. Top holder analytics
  // ────────────────────────────────────────────────────────────
  log(SRC, "Fetching top holders...");
  
  const topHolders = await fetchJSON(
    `${DATA_API}/top-holders?limit=200`,
    { source: SRC, headers: HEADERS }
  );
  if (topHolders) {
    saveArchive(SRC, "top-holders", topHolders);
  }
  await sleep(500);

  // ────────────────────────────────────────────────────────────
  // 5. Open interest data
  // ────────────────────────────────────────────────────────────
  log(SRC, "Fetching open interest...");
  
  const openInterest = await fetchJSON(
    `${DATA_API}/open-interest?limit=100`,
    { source: SRC, headers: HEADERS }
  );
  if (openInterest) {
    saveArchive(SRC, "open-interest", openInterest);
  }
  await sleep(500);

  // ────────────────────────────────────────────────────────────
  // 6. Per-trader profiles for top performers
  // ────────────────────────────────────────────────────────────
  if (Array.isArray(leaderboard) && leaderboard.length > 0) {
    log(SRC, `Fetching profiles for top ${Math.min(50, leaderboard.length)} traders...`);
    
    const traders = leaderboard.slice(0, 50);
    for (const trader of traders) {
      const address = trader.address || trader.wallet || trader.user;
      if (!address) continue;

      // Get profile
      const profile = await fetchJSON(
        `${GAMMA_API}/profiles/${address}`,
        { source: SRC, headers: HEADERS, delayMs: 200 }
      );
      
      // Get positions
      const positions = await fetchJSON(
        `${DATA_API}/positions?user=${address}&limit=50`,
        { source: SRC, headers: HEADERS, delayMs: 200 }
      );
      
      // Get trades
      const trades = await fetchJSON(
        `${DATA_API}/trades?user=${address}&limit=50`,
        { source: SRC, headers: HEADERS, delayMs: 200 }
      );

      const data: any = {
        address,
        rank: trader.rank,
        profile,
        positions,
        trades,
        leaderboard_data: trader,
      };

      saveArchive(SRC, `trader-${address.toLowerCase()}`, data);
      log(SRC, `Saved trader ${address.slice(0, 8)}... (rank ${trader.rank || "?"})`);
      await sleep(600);
    }
  }

  // ────────────────────────────────────────────────────────────
  // 7. CLOB data — order books for top markets
  // ────────────────────────────────────────────────────────────
  if (Array.isArray(activeMarkets) && activeMarkets.length > 0) {
    log(SRC, "Fetching order books for top markets...");
    
    const topMarkets = activeMarkets.slice(0, 20);
    for (const market of topMarkets) {
      const tokenId = market.clobTokenIds?.[0] || market.clob_token_ids?.[0] || market.condition_id;
      if (!tokenId) continue;

      const orderbook = await fetchJSON(
        `${CLOB_API}/book?token_id=${tokenId}`,
        { source: SRC, headers: HEADERS, delayMs: 300 }
      );
      
      const priceHistory = await fetchJSON(
        `${CLOB_API}/prices-history?market=${tokenId}&interval=1d&fidelity=60`,
        { source: SRC, headers: HEADERS, delayMs: 300 }
      );

      const marketData: any = {
        market_id: market.id || tokenId,
        question: market.question,
        orderbook,
        price_history: priceHistory,
      };

      saveArchive(SRC, `market-${tokenId}`, marketData);
      await sleep(400);
    }
  }

  log(SRC, "Polymarket fetch complete!");
}
