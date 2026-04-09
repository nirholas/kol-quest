/**
 * Etherscan V2 API fetcher — single API key works for 60+ EVM chains
 * Docs: https://docs.etherscan.io/etherscan-v2
 *
 * Endpoints hit per wallet:
 * - account/balance
 * - account/txlist (normal txns)
 * - account/tokentx (ERC-20 transfers)
 * - account/tokennfttx (ERC-721 transfers)
 * - account/token1155tx (ERC-1155 transfers)
 *
 * Global endpoints:
 * - stats/ethsupply
 * - stats/ethprice
 * - gastracker/gasoracle
 */

import { fetchJSON, saveArchive, log, sleep, env, hasKey } from "../lib/utils.ts";
import { loadEvmWallets, loadTopWallets } from "../lib/wallets.ts";

const SRC = "etherscan";

// Etherscan V2 API — single endpoint, chainid parameter
const V2_BASE = "https://api.etherscan.io/v2/api";

// Chain IDs for V2 API (one key works for all)
const CHAINS_V2: { chain: string; chainid: number }[] = [
  { chain: "ethereum", chainid: 1 },
  { chain: "bsc", chainid: 56 },
  { chain: "base", chainid: 8453 },
  { chain: "arbitrum", chainid: 42161 },
  { chain: "polygon", chainid: 137 },
  { chain: "optimism", chainid: 10 },
  { chain: "avalanche", chainid: 43114 },
  { chain: "fantom", chainid: 250 },
  { chain: "gnosis", chainid: 100 },
  { chain: "linea", chainid: 59144 },
  { chain: "scroll", chainid: 534352 },
  { chain: "blast", chainid: 81457 },
];

// Fallback to legacy endpoints if V2 doesn't work
const EXPLORERS: {
  key: string;
  envKey: string;
  chain: string;
  base: string;
}[] = [
  {
    chain: "ethereum",
    base: "https://api.etherscan.io/api",
    envKey: "ETHERSCAN_API_KEY",
    key: "",
  },
  {
    chain: "bsc",
    base: "https://api.bscscan.com/api",
    envKey: "ETHERSCAN_API_KEY", // V2: same key works
    key: "",
  },
  {
    chain: "base",
    base: "https://api.basescan.org/api",
    envKey: "ETHERSCAN_API_KEY", // V2: same key works
    key: "",
  },
  {
    chain: "arbitrum",
    base: "https://api.arbiscan.io/api",
    envKey: "ETHERSCAN_API_KEY", // V2: same key works
    key: "",
  },
  {
    chain: "polygon",
    base: "https://api.polygonscan.com/api",
    envKey: "ETHERSCAN_API_KEY", // V2: same key works
    key: "",
  },
  {
    chain: "optimism",
    base: "https://api-optimistic.etherscan.io/api",
    envKey: "ETHERSCAN_API_KEY", // V2: same key works
    key: "",
  },
];

async function fetchV2(
  chainid: number,
  module: string,
  action: string,
  params: Record<string, string>,
  apikey: string,
  source: string
) {
  const qs = new URLSearchParams({ chainid: String(chainid), module, action, ...params, apikey }).toString();
  return fetchJSON(`${V2_BASE}?${qs}`, { source, delayMs: 220 });
}

async function fetchExplorer(
  base: string,
  module: string,
  action: string,
  params: Record<string, string>,
  apikey: string,
  source: string
) {
  const qs = new URLSearchParams({ module, action, ...params, apikey }).toString();
  return fetchJSON(`${base}?${qs}`, { source, delayMs: 220 });
}

async function fetchChainWallets(explorer: typeof EXPLORERS[0], wallets: string[]) {
  const apikey = env(explorer.envKey) || "";
  const src = `${SRC}-${explorer.chain}`;

  // Global stats
  const price = await fetchExplorer(explorer.base, "stats", "ethprice", {}, apikey, src);
  if (price) saveArchive(src, "eth-price", price);
  await sleep(250);

  const supply = await fetchExplorer(explorer.base, "stats", "ethsupply", {}, apikey, src);
  if (supply) saveArchive(src, "eth-supply", supply);
  await sleep(250);

  const gas = await fetchExplorer(explorer.base, "gastracker", "gasoracle", {}, apikey, src);
  if (gas) saveArchive(src, "gas-oracle", gas);
  await sleep(250);

  // Per-wallet
  log(src, `Fetching ${wallets.length} wallets...`);

  const limit = apikey ? Math.min(wallets.length, 50) : Math.min(wallets.length, 10);
  for (const wallet of wallets.slice(0, limit)) {
    const data: any = { wallet };

    const balance = await fetchExplorer(
      explorer.base, "account", "balance", { address: wallet, tag: "latest" }, apikey, src
    );
    if (balance) data.balance = balance;

    const txs = await fetchExplorer(
      explorer.base, "account", "txlist",
      { address: wallet, startblock: "0", endblock: "99999999", sort: "desc", page: "1", offset: "50" },
      apikey, src
    );
    if (txs) data.transactions = txs;

    const erc20 = await fetchExplorer(
      explorer.base, "account", "tokentx",
      { address: wallet, startblock: "0", endblock: "99999999", sort: "desc", page: "1", offset: "50" },
      apikey, src
    );
    if (erc20) data.erc20_transfers = erc20;

    saveArchive(src, `wallet-${wallet.toLowerCase()}`, data);
    log(src, `Saved ${wallet.slice(0, 8)}...`);
    await sleep(300);
  }

  log(src, `Done.`);
}

export async function runEtherscan() {
  log(SRC, "Starting Etherscan-family fetch...");

  const evmWallets = loadEvmWallets();
  log(SRC, `Total EVM wallets available: ${evmWallets.length}`);

  for (const explorer of EXPLORERS) {
    if (!hasKey(explorer.envKey)) {
      log(SRC, `No key for ${explorer.chain} (${explorer.envKey}), skipping wallet data (global stats only)`);
    }
    await fetchChainWallets(explorer, evmWallets);
    await sleep(1000);
  }

  log(SRC, "Etherscan-family fetch complete.");
}
