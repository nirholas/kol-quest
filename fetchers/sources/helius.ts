/**
 * Helius fetcher — best Solana indexer API, free tier available
 * Docs: https://docs.helius.dev/
 *
 * Free plan: 10k credits/day
 *
 * Endpoints:
 * - /v0/addresses/{address}/transactions (parsed enhanced transactions)
 * - /v0/addresses/{address}/balances (token balances)
 * - /v0/tokens/metadata (batch token metadata)
 * - /v1/nfts (NFT data)
 * - /v0/pnl/wallets/{address} (wallet PnL — very valuable!)
 * - RPC: getAssetsByOwner (DAS API)
 * - RPC: searchAssets
 * - Webhook support (not scripted here)
 */

import { fetchJSON, saveArchive, log, sleep, env, hasKey } from "../lib/utils.ts";
import { loadSolWallets, loadTopWallets } from "../lib/wallets.ts";

const SRC = "helius";

function base(): string {
  const key = env("HELIUS_API_KEY") || "";
  return `https://api.helius.xyz`;
}

function rpcBase(): string {
  const key = env("HELIUS_API_KEY") || "";
  return `https://mainnet.helius-rpc.com/?api-key=${key}`;
}

function key(): string {
  return env("HELIUS_API_KEY") || "";
}

async function dasRequest(method: string, params: any): Promise<any> {
  return fetchJSON(rpcBase(), {
    method: "POST",
    body: JSON.stringify({ jsonrpc: "2.0", id: "helius", method, params }),
    source: SRC,
    delayMs: 200,
  });
}

export async function runHelius() {
  if (!hasKey("HELIUS_API_KEY")) {
    log(SRC, "Warning: No HELIUS_API_KEY — skipping Helius (key required)");
    return;
  }

  log(SRC, "Starting Helius fetch...");
  const k = key();
  const b = base();

  // 1. Top wallets PnL + transactions
  const wallets = loadTopWallets("sol", 50);
  log(SRC, `Fetching Helius data for ${wallets.length} SOL wallets`);

  for (const wallet of wallets) {
    const data: any = { wallet };

    // Enhanced transactions (parsed with labels, swap data, etc.)
    const txs = await fetchJSON(
      `${b}/v0/addresses/${wallet}/transactions?api-key=${k}&limit=50&type=SWAP`,
      { source: SRC, delayMs: 200 }
    );
    if (txs) data.swap_transactions = txs;

    const allTxs = await fetchJSON(
      `${b}/v0/addresses/${wallet}/transactions?api-key=${k}&limit=50`,
      { source: SRC, delayMs: 200 }
    );
    if (allTxs) data.all_transactions = allTxs;

    // Token balances
    const balances = await fetchJSON(
      `${b}/v0/addresses/${wallet}/balances?api-key=${k}`,
      { source: SRC, delayMs: 200 }
    );
    if (balances) data.balances = balances;

    // DAS: all assets owned
    const assets = await dasRequest("getAssetsByOwner", {
      ownerAddress: wallet,
      page: 1,
      limit: 50,
      displayOptions: {
        showFungible: true,
        showNativeBalance: true,
      },
    });
    if (assets?.result) data.assets = assets.result;

    saveArchive(SRC, `wallet-${wallet}`, data);
    log(SRC, `Saved Helius wallet ${wallet.slice(0, 8)}...`);
    await sleep(700);
  }

  // 2. Batch token metadata for popular Solana tokens
  const TOKEN_MINTS = [
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",  // BONK
    "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",  // WIF
    "So11111111111111111111111111111111111111112",      // SOL
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",  // USDC
    "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",   // JUP
    "HhJpBhRRn4g56VsyLuT8DL5Bv31HkXqsrahTTUCZeZg4",  // MOODENG
    "A8C3xuqscfmyLrte3VmTqrAq8kgMASius9AFNANwpump",   // FWOG
    "ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82",   // BOME
    "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",  // POPCAT
  ];

  const metadata = await fetchJSON(`${b}/v0/tokens/metadata?api-key=${k}`, {
    method: "POST",
    body: JSON.stringify({ mintAccounts: TOKEN_MINTS, includeOffChain: true }),
    source: SRC,
    delayMs: 300,
  });
  if (metadata) saveArchive(SRC, "token-metadata-batch", metadata);

  // 3. Search assets (trending NFT collections, etc.)
  const nftSearch = await dasRequest("searchAssets", {
    page: 1,
    limit: 50,
    tokenType: "nonFungible",
    sortBy: { sortBy: "created", sortDirection: "desc" },
    displayOptions: { showCollectionMetadata: true },
  });
  if (nftSearch?.result) saveArchive(SRC, "nft-recent-assets", nftSearch.result);

  log(SRC, "Helius fetch complete.");
}
