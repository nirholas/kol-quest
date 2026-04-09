/**
 * Solana public RPC + Program fetcher
 * No API key needed — uses public endpoints.
 *
 * Sources:
 * - Solana mainnet RPC (getRecentPerformanceSamples, getSupply, etc.)
 * - Jupiter Aggregator API (free, no key)
 * - Raydium API (free, no key)
 * - Pump.fun API (free, no key)
 * - Jito API (MEV/tips data, free)
 */

import { fetchJSON, saveArchive, log, sleep } from "../lib/utils.ts";
import { loadTopWallets } from "../lib/wallets.ts";

const SRC = "solana-ecosystem";
const SOL_RPC = "https://api.mainnet-beta.solana.com";
const JUP_BASE = "https://quote-api.jup.ag/v6";
const JUP_PRICE = "https://price.jup.ag/v6";
const JUP_STATS = "https://stats.jup.ag";
const RAYDIUM_BASE = "https://api-v3.raydium.io";
const PUMP_BASE = "https://frontend-api.pump.fun";
const JITO_BASE = "https://bundles.jito.wtf/api/v1";

async function rpc(method: string, params: any[] = []): Promise<any> {
  return fetchJSON(SOL_RPC, {
    method: "POST",
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    source: SRC,
    delayMs: 200,
  });
}

export async function runSolanaEcosystem() {
  log(SRC, "Starting Solana ecosystem fetch...");

  // === SOLANA RPC ===
  // Network health
  const supply = await rpc("getSupply", [{ excludeNonCirculatingAccountsList: true }]);
  if (supply?.result) saveArchive(SRC, "sol-supply", supply.result);
  await sleep(300);

  const epoch = await rpc("getEpochInfo");
  if (epoch?.result) saveArchive(SRC, "sol-epoch-info", epoch.result);
  await sleep(300);

  const perf = await rpc("getRecentPerformanceSamples", [10]);
  if (perf?.result) saveArchive(SRC, "sol-perf-samples", perf.result);
  await sleep(300);

  const validators = await rpc("getVoteAccounts");
  if (validators?.result) saveArchive(SRC, "sol-vote-accounts", validators.result);
  await sleep(500);

  const health = await fetchJSON(`${SOL_RPC}/health`);
  if (health) saveArchive(SRC, "sol-rpc-health", health);
  await sleep(300);

  // === JUPITER ===
  log(SRC, "Fetching Jupiter data...");

  // Token list
  const jupTokens = await fetchJSON("https://token.jup.ag/all", { source: SRC });
  if (jupTokens) {
    saveArchive(SRC, "jup-token-list", jupTokens);
    log(SRC, `Jupiter token list: ${Array.isArray(jupTokens) ? jupTokens.length : "?"} tokens`);
  }
  await sleep(500);

  // Strict token list (vetted)
  const jupStrict = await fetchJSON("https://token.jup.ag/strict", { source: SRC });
  if (jupStrict) saveArchive(SRC, "jup-token-list-strict", jupStrict);
  await sleep(500);

  // Price data for top tokens
  const TOP_MINTS = [
    "So11111111111111111111111111111111111111112",
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
    "HhJpBhRRn4g56VsyLuT8DL5Bv31HkXqsrahTTUCZeZg4",
    "A8C3xuqscfmyLrte3VmTqrAq8kgMASius9AFNANwpump",
  ];

  const jupPrice = await fetchJSON(
    `${JUP_PRICE}/price?ids=${TOP_MINTS.join(",")}&showExtraInfo=true`,
    { source: SRC }
  );
  if (jupPrice) saveArchive(SRC, "jup-prices", jupPrice);
  await sleep(500);

  // Jupiter stats (volume, trading activity)
  const jupVolume = await fetchJSON(`${JUP_STATS}/info`, { source: SRC });
  if (jupVolume) saveArchive(SRC, "jup-platform-stats", jupVolume);
  await sleep(300);

  const jupTopTokens = await fetchJSON(`${JUP_STATS}/top-tokens`, { source: SRC });
  if (jupTopTokens) saveArchive(SRC, "jup-top-tokens", jupTopTokens);
  await sleep(300);

  // === RAYDIUM ===
  log(SRC, "Fetching Raydium data...");

  const raydiumInfo = await fetchJSON(`${RAYDIUM_BASE}/main/info`, { source: SRC });
  if (raydiumInfo) saveArchive(SRC, "raydium-platform-info", raydiumInfo);
  await sleep(400);

  // AMM pools
  const raydiumPools = await fetchJSON(
    `${RAYDIUM_BASE}/pools/info/list?poolType=all&poolSortField=volume24h&sortType=desc&pageSize=100&page=1`,
    { source: SRC }
  );
  if (raydiumPools) saveArchive(SRC, "raydium-top-pools", raydiumPools);
  await sleep(500);

  // Farm info
  const raydiumFarms = await fetchJSON(`${RAYDIUM_BASE}/farm/info?type=all`, { source: SRC });
  if (raydiumFarms) saveArchive(SRC, "raydium-farms", raydiumFarms);
  await sleep(400);

  // === PUMP.FUN ===
  log(SRC, "Fetching Pump.fun data...");

  // Latest coins
  const pumpLatest = await fetchJSON(`${PUMP_BASE}/coins?limit=50&offset=0&sort=last_trade_timestamp&order=DESC&includeNsfw=false`, {
    source: SRC,
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (pumpLatest) saveArchive(SRC, "pump-latest-coins", pumpLatest);
  await sleep(500);

  // King of the hill
  const pumpKoth = await fetchJSON(`${PUMP_BASE}/coins/king-of-the-hill?limit=20&includeNsfw=false`, {
    source: SRC,
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (pumpKoth) saveArchive(SRC, "pump-king-of-the-hill", pumpKoth);
  await sleep(500);

  // === JITO (MEV / tips) ===
  log(SRC, "Fetching Jito MEV data...");

  const jitoTips = await fetchJSON(`${JITO_BASE}/getTipAccounts`, {
    method: "POST",
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTipAccounts", params: [] }),
    source: SRC,
  });
  if (jitoTips) saveArchive(SRC, "jito-tip-accounts", jitoTips);
  await sleep(300);

  // Jito block engine info
  const jitoStats = await fetchJSON("https://explorer.jito.wtf/wtfrest/app/stats/getStats", {
    source: SRC,
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (jitoStats) saveArchive(SRC, "jito-stats", jitoStats);

  log(SRC, "Solana ecosystem fetch complete.");
}
