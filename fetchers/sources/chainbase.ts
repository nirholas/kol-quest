/**
 * Chainbase fetcher — free API key required
 * Docs: https://docs.chainbase.com/reference/overview
 *
 * Free plan: 300 req/day baseline
 * Coverage: ETH, BSC, Polygon, Avalanche, Base, Arbitrum, Optimism, Fantom, etc.
 *
 * Endpoints:
 * - /account/tokens (token balances per wallet)
 * - /account/txs (transactions per wallet)
 * - /account/token_transfers
 * - /account/nfts
 * - /token/top_holders
 * - /token/market/top (trending tokens)
 * - /token/price (token price)
 */

import { fetchJSON, saveArchive, log, sleep, env, hasKey } from "../lib/utils.ts";
import { loadEvmWallets } from "../lib/wallets.ts";

const BASE = "https://api.chainbase.online/v1";
const SRC = "chainbase";

// Chain IDs for Chainbase
const CHAINS: { name: string; id: number }[] = [
  { name: "ethereum", id: 1 },
  { name: "bsc", id: 56 },
  { name: "polygon", id: 137 },
  { name: "base", id: 8453 },
  { name: "arbitrum", id: 42161 },
  { name: "optimism", id: 10 },
  { name: "avalanche", id: 43114 },
];

function headers(): Record<string, string> {
  return { "x-api-key": env("CHAINBASE_API_KEY") || "" };
}

export async function runChainbase() {
  if (!hasKey("CHAINBASE_API_KEY")) {
    log(SRC, "Warning: No CHAINBASE_API_KEY — skipping Chainbase");
    return;
  }

  log(SRC, "Starting Chainbase fetch...");
  const h = headers();

  // 1. Trending tokens per chain
  for (const chain of CHAINS) {
    const trending = await fetchJSON(
      `${BASE}/token/market/top?chain_id=${chain.id}&limit=50&page=1`,
      { source: SRC, headers: h, delayMs: 200 }
    );
    if (trending) {
      saveArchive(SRC, `trending-tokens-${chain.name}`, trending);
      log(SRC, `Trending ${chain.name}: ${trending?.data?.length ?? "?"} tokens`);
    }
    await sleep(300);
  }

  // 2. Per-wallet data
  const wallets = loadEvmWallets().slice(0, 20);
  log(SRC, `Fetching wallet data for ${wallets.length} wallets`);

  for (const wallet of wallets) {
    const data: any = { wallet };

    for (const chain of CHAINS.slice(0, 3)) { // Limit to 3 chains per wallet to save credits
      // Token balances
      const tokens = await fetchJSON(
        `${BASE}/account/tokens?chain_id=${chain.id}&address=${wallet}&limit=20&page=1`,
        { source: SRC, headers: h, delayMs: 150 }
      );
      if (tokens?.data) data[`${chain.name}_tokens`] = tokens.data;

      // Transaction history
      const txs = await fetchJSON(
        `${BASE}/account/txs?chain_id=${chain.id}&address=${wallet}&limit=50&page=1`,
        { source: SRC, headers: h, delayMs: 150 }
      );
      if (txs?.data) data[`${chain.name}_transactions`] = txs.data;

      // Token transfers
      const transfers = await fetchJSON(
        `${BASE}/account/token_transfers?chain_id=${chain.id}&address=${wallet}&limit=50&page=1`,
        { source: SRC, headers: h, delayMs: 150 }
      );
      if (transfers?.data) data[`${chain.name}_token_transfers`] = transfers.data;

      await sleep(250);
    }

    saveArchive(SRC, `wallet-${wallet.toLowerCase()}`, data);
    log(SRC, `Saved wallet ${wallet.slice(0, 8)}...`);
    await sleep(400);
  }

  log(SRC, "Chainbase fetch complete.");
}
