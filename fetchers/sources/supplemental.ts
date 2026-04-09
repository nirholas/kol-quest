/**
 * GMGN X-Tracker fetcher — extends existing scrape-gmgn-x-tracker.js
 * with additional KOL social + wallet linking data.
 *
 * Also fetches from:
 * - Axiom API (as used in scrape-axiom.js)
 * - Cielo Finance (free smart money tracker)
 * - Step Finance (Solana portfolio tracker)
 * - SolanaFM (Solana block explorer API)
 */

import { fetchJSON, saveArchive, log, sleep } from "../lib/utils.ts";
import { loadTopWallets, loadSolWallets } from "../lib/wallets.ts";

const SRC = "supplemental";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, */*",
};

export async function runSupplemental() {
  log(SRC, "Starting supplemental sources fetch...");

  // === CIELO FINANCE ===
  // Free smart money alerts / wallet tracker
  log(SRC, "Fetching Cielo Finance...");

  const cieloFeed = await fetchJSON("https://api.cielo.finance/feed?limit=50&type=swap", {
    source: SRC,
    headers: HEADERS,
  });
  if (cieloFeed) saveArchive(SRC, "cielo-feed", cieloFeed);
  await sleep(500);

  const cieloWhales = await fetchJSON("https://api.cielo.finance/whales?chain=solana&limit=50", {
    source: SRC,
    headers: HEADERS,
  });
  if (cieloWhales) saveArchive(SRC, "cielo-whales-sol", cieloWhales);
  await sleep(500);

  const cieloWhalesEth = await fetchJSON("https://api.cielo.finance/whales?chain=ethereum&limit=50", {
    source: SRC,
    headers: HEADERS,
  });
  if (cieloWhalesEth) saveArchive(SRC, "cielo-whales-eth", cieloWhalesEth);
  await sleep(500);

  // === SOLANAFM ===
  log(SRC, "Fetching SolanaFM...");

  const sfmStats = await fetchJSON("https://api.solana.fm/v1/stats", {
    source: SRC, headers: HEADERS,
  });
  if (sfmStats) saveArchive(SRC, "solanafm-stats", sfmStats);
  await sleep(400);

  // Account info for top wallets
  const wallets = loadTopWallets("sol", 20);
  for (const wallet of wallets) {
    const acct = await fetchJSON(`https://api.solana.fm/v1/accounts/${wallet}`, {
      source: SRC, headers: HEADERS, delayMs: 300,
    });
    if (acct) saveArchive(SRC, `solanafm-account-${wallet.slice(0, 8)}`, acct);
    await sleep(500);
  }

  // === NANSEN FREE ENDPOINTS ===
  // Nansen has some public endpoints for top wallets
  log(SRC, "Fetching Nansen public data...");

  const nansenTrending = await fetchJSON(
    "https://api.nansen.ai/query/nansen-1/dex/top-traders?chain=ethereum&period=24h&limit=50",
    { source: SRC, headers: HEADERS }
  );
  if (nansenTrending) saveArchive(SRC, "nansen-eth-top-traders-24h", nansenTrending);
  await sleep(500);

  // === ARKHAM INTELLIGENCE ===
  // Public endpoints (no auth for some data)
  log(SRC, "Fetching Arkham public data...");

  const arkhamAssets = await fetchJSON("https://api.arkhamintelligence.com/assets", {
    source: SRC, headers: HEADERS,
  });
  if (arkhamAssets) saveArchive(SRC, "arkham-assets", arkhamAssets);
  await sleep(500);

  // === LOOKONCHAIN / WHALE ALERT TYPE FEEDS ===
  // On-chain large transfer monitors

  // Whalealert-style data (if available via RSS/API)
  const whaleAlerts = await fetchJSON("https://api.whale-alert.io/v1/transactions?api_key=free&min_value=1000000&limit=50", {
    source: SRC,
    headers: HEADERS,
  });
  if (whaleAlerts) saveArchive(SRC, "whale-alert", whaleAlerts);
  await sleep(500);

  // === STEP FINANCE ===
  log(SRC, "Fetching Step Finance...");

  for (const wallet of wallets.slice(0, 10)) {
    const stepPortfolio = await fetchJSON(`https://api.step.finance/v2/portfolio?publicKey=${wallet}`, {
      source: SRC, headers: HEADERS, delayMs: 400,
    });
    if (stepPortfolio) {
      saveArchive(SRC, `step-portfolio-${wallet.slice(0, 8)}`, stepPortfolio);
      log(SRC, `Step portfolio: ${wallet.slice(0, 8)}...`);
    }
    await sleep(600);
  }

  log(SRC, "Supplemental sources fetch complete.");
}
