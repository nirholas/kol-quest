/**
 * Zerion fetcher — free API key required (partner access)
 * Docs: https://developers.zerion.io/reference/introduction
 *
 * Coverage: 100+ EVM chains, full DeFi portfolio + history.
 *
 * Endpoints:
 * - /wallets/{address}/positions (token + DeFi positions)
 * - /wallets/{address}/portfolio (total portfolio value over time)
 * - /wallets/{address}/transactions/ (full transaction history)
 * - /wallets/{address}/nft-positions
 * - /chains (supported chains)
 * - /fungibles/top?sort=market_cap (top tokens)
 * - /fungibles/{id} (token metadata)
 */

import { fetchJSON, saveArchive, log, sleep, env, hasKey } from "../lib/utils.ts";
import { loadEvmWallets } from "../lib/wallets.ts";

const BASE = "https://api.zerion.io/v1";
const SRC = "zerion";

function headers(): Record<string, string> {
  const key = env("ZERION_API_KEY") || "";
  const encoded = btoa(`${key}:`);
  return { Authorization: `Basic ${encoded}`, accept: "application/json" };
}

export async function runZerion() {
  if (!hasKey("ZERION_API_KEY")) {
    log(SRC, "Warning: No ZERION_API_KEY — skipping Zerion");
    return;
  }

  log(SRC, "Starting Zerion fetch...");
  const h = headers();

  // 1. Supported chains
  const chains = await fetchJSON(`${BASE}/chains`, { source: SRC, headers: h });
  if (chains) saveArchive(SRC, "chains", chains);
  await sleep(400);

  // 2. Top fungible tokens
  const topTokens = await fetchJSON(
    `${BASE}/fungibles/top?filter[implementation_chain_id]=ethereum,bsc,base,solana&sort=market_cap&page[size]=100`,
    { source: SRC, headers: h }
  );
  if (topTokens) saveArchive(SRC, "top-tokens-market-cap", topTokens);
  await sleep(400);

  // 3. Trending tokens
  const trending = await fetchJSON(
    `${BASE}/fungibles/top?sort=change_24h&page[size]=50`,
    { source: SRC, headers: h }
  );
  if (trending) saveArchive(SRC, "trending-tokens-24h", trending);
  await sleep(400);

  // 4. Per-wallet data
  const wallets = loadEvmWallets().slice(0, 25);
  log(SRC, `Fetching Zerion data for ${wallets.length} wallets`);

  for (const wallet of wallets) {
    const data: any = { wallet };
    const addr = wallet.toLowerCase();

    // Positions (tokens + DeFi)
    const positions = await fetchJSON(
      `${BASE}/wallets/${addr}/positions/?filter[trash]=only_non_trash&currency=usd&sort=value&page[size]=100`,
      { source: SRC, headers: h, delayMs: 300 }
    );
    if (positions) data.positions = positions;

    // Portfolio chart (30d)
    const portfolio = await fetchJSON(
      `${BASE}/wallets/${addr}/portfolio?currency=usd&portfolio_fields=all`,
      { source: SRC, headers: h, delayMs: 300 }
    );
    if (portfolio) data.portfolio = portfolio;

    // Transaction history
    const txs = await fetchJSON(
      `${BASE}/wallets/${addr}/transactions/?currency=usd&page[size]=100&filter[trash]=only_non_trash`,
      { source: SRC, headers: h, delayMs: 300 }
    );
    if (txs) data.transactions = txs;

    // NFT positions
    const nfts = await fetchJSON(
      `${BASE}/wallets/${addr}/nft-positions/?sort=floor_price&currency=usd`,
      { source: SRC, headers: h, delayMs: 300 }
    );
    if (nfts) data.nft_positions = nfts;

    if (data.positions || data.portfolio) {
      saveArchive(SRC, `wallet-${addr}`, data);
      log(SRC, `Saved wallet ${wallet.slice(0, 8)}...`);
    }

    await sleep(600);
  }

  log(SRC, "Zerion fetch complete.");
}
