/**
 * Tatum fetcher — free API key required
 * Docs: https://apidoc.tatum.io/
 *
 * Unified blockchain API: 90+ chains
 * Free plan: 10 req/sec
 *
 * Endpoints:
 * - /balance/{chain}/{address} (native balance)
 * - /fungible/address/{chain}/{address} (token balances)
 * - /data/transactions?addresses={address}&chain={chain} (tx history)
 * - /exchange-rate ({symbol}/USD)
 * - /blockchain/gas/{chain} (gas price)
 * - /nft/address/balance/{chain}/{address}
 */

import { fetchJSON, saveArchive, log, sleep, env, hasKey } from "../lib/utils.ts";
import { loadEvmWallets, loadSolWallets, loadTopWallets } from "../lib/wallets.ts";

const BASE = "https://api.tatum.io/v4";
const V3 = "https://api.tatum.io/v3";
const SRC = "tatum";

const CHAINS = ["ethereum", "bsc", "polygon", "base", "arbitrum", "optimism", "avalanche"];
const SOL_CHAIN = "solana";

function headers(): Record<string, string> {
  const key = env("TATUM_API_KEY") || "";
  return { "x-api-key": key };
}

const POPULAR_SYMBOLS = [
  "BTC", "ETH", "BNB", "SOL", "USDT", "USDC", "MATIC", "AVAX",
  "LINK", "UNI", "AAVE", "ARB", "OP", "DOGE", "SHIB",
];

export async function runTatum() {
  if (!hasKey("TATUM_API_KEY")) {
    log(SRC, "Warning: No TATUM_API_KEY — skipping Tatum");
    return;
  }

  log(SRC, "Starting Tatum fetch...");
  const h = headers();

  // 1. Exchange rates for major tokens
  for (const sym of POPULAR_SYMBOLS) {
    const rate = await fetchJSON(`${V3}/tatum/rate/${sym}?basePair=USD`, {
      source: SRC, headers: h, delayMs: 150
    });
    if (rate) saveArchive(SRC, `rate-${sym}-usd`, rate);
  }
  await sleep(500);

  // 2. Gas prices across chains
  for (const chain of CHAINS) {
    const gas = await fetchJSON(`${V3}/blockchain/fee/${chain}`, {
      source: SRC, headers: h, delayMs: 200
    });
    if (gas) saveArchive(SRC, `gas-${chain}`, gas);
    await sleep(200);
  }

  // 3. EVM wallet data
  const evmWallets = loadEvmWallets().slice(0, 20);
  for (const wallet of evmWallets) {
    const data: any = { wallet };

    for (const chain of CHAINS) {
      // Native balance
      const nativeBal = await fetchJSON(`${BASE}/balance/${chain.toUpperCase()}/${wallet}`, {
        source: SRC, headers: h, delayMs: 150
      });
      if (nativeBal) data[`${chain}_native_balance`] = nativeBal;

      // Token balances
      const tokenBal = await fetchJSON(`${BASE}/data/balances?addresses=${wallet}&chain=${chain.toUpperCase()}`, {
        source: SRC, headers: h, delayMs: 150
      });
      if (tokenBal) data[`${chain}_token_balances`] = tokenBal;

      // Transaction history
      const txs = await fetchJSON(
        `${BASE}/data/transactions?addresses=${wallet}&chain=${chain.toUpperCase()}&pageSize=50`,
        { source: SRC, headers: h, delayMs: 150 }
      );
      if (txs) data[`${chain}_transactions`] = txs;

      await sleep(200);
    }

    saveArchive(SRC, `evm-wallet-${wallet.toLowerCase()}`, data);
    log(SRC, `Saved EVM wallet ${wallet.slice(0, 8)}...`);
    await sleep(400);
  }

  // 4. Solana wallet data
  const solWallets = loadTopWallets("sol", 20);
  for (const wallet of solWallets) {
    const data: any = { wallet };

    const balance = await fetchJSON(`${BASE}/balance/SOL/${wallet}`, {
      source: SRC, headers: h, delayMs: 150
    });
    if (balance) data.sol_balance = balance;

    const tokens = await fetchJSON(`${BASE}/data/balances?addresses=${wallet}&chain=SOL`, {
      source: SRC, headers: h, delayMs: 150
    });
    if (tokens) data.token_balances = tokens;

    const txs = await fetchJSON(`${BASE}/data/transactions?addresses=${wallet}&chain=SOL&pageSize=50`, {
      source: SRC, headers: h, delayMs: 150
    });
    if (txs) data.transactions = txs;

    saveArchive(SRC, `sol-wallet-${wallet}`, data);
    log(SRC, `Saved SOL wallet ${wallet.slice(0, 8)}...`);
    await sleep(400);
  }

  log(SRC, "Tatum fetch complete.");
}
