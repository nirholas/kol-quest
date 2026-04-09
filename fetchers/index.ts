#!/usr/bin/env bun
/**
 * ============================================================
 * KOL Quest — Master Data Fetcher & Archiver
 * ============================================================
 *
 * Fetches from ALL available free/free-tier APIs:
 *
 * NO KEY NEEDED (runs always):
 *   - DexScreener       (pairs, boosts, trending, search)
 *   - GeckoTerminal     (pools, tokens, all chains)
 *   - CoinGecko         (markets, metadata, trending)
 *   - Blockscout        (explorer data: ETH, Base, Optimism, Gnosis, Celo, Zora)
 *   - The Graph         (Uniswap v2/v3, Pancakeswap, Aave, Balancer)
 *   - Solana RPC        (epoch, supply, validators, perf)
 *   - Jupiter           (token list, prices, volume stats)
 *   - Raydium           (pool list, farm data)
 *   - Pump.fun          (latest launches, king of the hill)
 *   - Jito              (MEV tips, block engine stats)
 *   - GMGN              (smart money, KOL, trending — no key needed)
 *   - KolScan           (leaderboard, wallet data)
 *
 * OPTIONAL API KEYS (skips gracefully if missing):
 *   - Birdeye           (BIRDEYE_API_KEY)
 *   - Helius            (HELIUS_API_KEY) — best Solana wallet indexer
 *   - Solscan           (SOLSCAN_API_KEY — optional, some endpoints work without)
 *   - Moralis           (MORALIS_API_KEY)
 *   - Alchemy           (ALCHEMY_ETH_KEY, ALCHEMY_BASE_KEY, etc.)
 *   - Covalent          (COVALENT_API_KEY)
 *   - Etherscan family  (ETHERSCAN_API_KEY, BSCSCAN_API_KEY, etc.)
 *   - DeBank            (DEBANK_API_KEY)
 *   - Zerion            (ZERION_API_KEY)
 *   - Tatum             (TATUM_API_KEY)
 *   - Chainbase         (CHAINBASE_API_KEY)
 *   - Dune              (DUNE_API_KEY)
 *   - Flipside          (FLIPSIDE_API_KEY)
 *   - Bitquery          (BITQUERY_API_KEY)
 *
 * Usage:
 *   bun fetchers/index.ts                # Run all sources
 *   bun fetchers/index.ts --only dexscreener,geckoterminal,coingecko
 *   bun fetchers/index.ts --skip dune,flipside
 *   bun fetchers/index.ts --free-only    # Only sources that need no key
 *
 * Output: archive/YYYY-MM-DD/{source}/{filename}.json
 * ============================================================
 */

import { log, today } from "./lib/utils.ts";

// Importers — grouped by tier
import { runDexScreener } from "./sources/dexscreener.ts";
import { runGeckoTerminal } from "./sources/geckoterminal.ts";
import { runCoinGecko } from "./sources/coingecko.ts";
import { runBlockscout } from "./sources/blockscout.ts";
import { runTheGraph } from "./sources/thegraph.ts";
import { runSolanaEcosystem } from "./sources/solana-ecosystem.ts";
import { runGMGN } from "./sources/gmgn.ts";
import { runKolScan } from "./sources/kolscan.ts";
import { runBirdeye } from "./sources/birdeye.ts";
import { runHelius } from "./sources/helius.ts";
import { runSolscan } from "./sources/solscan.ts";
import { runMoralis } from "./sources/moralis.ts";
import { runAlchemy } from "./sources/alchemy.ts";
import { runCovalent } from "./sources/covalent.ts";
import { runEtherscan } from "./sources/etherscan.ts";
import { runDeBank } from "./sources/debank.ts";
import { runZerion } from "./sources/zerion.ts";
import { runTatum } from "./sources/tatum.ts";
import { runChainbase } from "./sources/chainbase.ts";
import { runDune } from "./sources/dune.ts";
import { runFlipside } from "./sources/flipside.ts";
import { runBitquery } from "./sources/bitquery.ts";
import { runSupplemental } from "./sources/supplemental.ts";

// ────────────────────────────────────────────────────────────
// Source registry
// ────────────────────────────────────────────────────────────
const SOURCES: {
  name: string;
  run: () => Promise<void>;
  requiresKey: boolean;
  priority: number; // lower = runs earlier
}[] = [
  // ── Fully public (no key) ──
  { name: "dexscreener",      run: runDexScreener,     requiresKey: false, priority: 1 },
  { name: "geckoterminal",    run: runGeckoTerminal,   requiresKey: false, priority: 1 },
  { name: "coingecko",        run: runCoinGecko,       requiresKey: false, priority: 1 },
  { name: "solana-ecosystem", run: runSolanaEcosystem, requiresKey: false, priority: 1 },
  { name: "thegraph",         run: runTheGraph,        requiresKey: false, priority: 2 },
  { name: "blockscout",       run: runBlockscout,      requiresKey: false, priority: 2 },
  { name: "gmgn",             run: runGMGN,            requiresKey: false, priority: 1 },
  { name: "kolscan",          run: runKolScan,         requiresKey: false, priority: 1 },
  { name: "supplemental",     run: runSupplemental,    requiresKey: false, priority: 3 },

  // ── Requires API key ──
  { name: "helius",    run: runHelius,    requiresKey: true, priority: 1 },
  { name: "birdeye",   run: runBirdeye,   requiresKey: true, priority: 1 },
  { name: "solscan",   run: runSolscan,   requiresKey: false, priority: 2 }, // some endpoints free
  { name: "moralis",   run: runMoralis,   requiresKey: true, priority: 2 },
  { name: "alchemy",   run: runAlchemy,   requiresKey: true, priority: 2 },
  { name: "covalent",  run: runCovalent,  requiresKey: true, priority: 2 },
  { name: "etherscan", run: runEtherscan, requiresKey: true, priority: 2 },
  { name: "debank",    run: runDeBank,    requiresKey: true, priority: 2 },
  { name: "zerion",    run: runZerion,    requiresKey: true, priority: 2 },
  { name: "tatum",     run: runTatum,     requiresKey: true, priority: 3 },
  { name: "chainbase", run: runChainbase, requiresKey: true, priority: 3 },
  { name: "dune",      run: runDune,      requiresKey: true, priority: 3 },
  { name: "flipside",  run: runFlipside,  requiresKey: true, priority: 3 },
  { name: "bitquery",  run: runBitquery,  requiresKey: true, priority: 3 },
];

// ────────────────────────────────────────────────────────────
// Argument parsing
// ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const freeOnly = args.includes("--free-only");
const onlyIdx = args.indexOf("--only");
const skipIdx = args.indexOf("--skip");
const listSources = args.includes("--list");

const onlySet = onlyIdx >= 0
  ? new Set(args[onlyIdx + 1]?.split(",").map((s) => s.trim()) ?? [])
  : null;
const skipSet = skipIdx >= 0
  ? new Set(args[skipIdx + 1]?.split(",").map((s) => s.trim()) ?? [])
  : new Set<string>();

if (listSources) {
  console.log("\nAvailable sources:\n");
  for (const s of SOURCES) {
    const keyNote = s.requiresKey ? " (requires API key)" : " (no key needed)";
    console.log(`  ${s.name.padEnd(18)} priority=${s.priority}${keyNote}`);
  }
  process.exit(0);
}

// ────────────────────────────────────────────────────────────
// Run
// ────────────────────────────────────────────────────────────
async function main() {
  const startTime = Date.now();
  console.log("=".repeat(60));
  console.log("  KOL Quest Master Fetcher");
  console.log(`  Date: ${today()}`);
  console.log(`  Mode: ${freeOnly ? "free-only" : onlySet ? `only: ${[...onlySet].join(",")}` : "all sources"}`);
  console.log("=".repeat(60));

  // Filter sources
  let toRun = SOURCES
    .filter((s) => !skipSet.has(s.name))
    .filter((s) => !onlySet || onlySet.has(s.name))
    .filter((s) => !freeOnly || !s.requiresKey);

  // Sort by priority
  toRun.sort((a, b) => a.priority - b.priority);

  console.log(`\nWill run ${toRun.length} sources: ${toRun.map((s) => s.name).join(", ")}\n`);

  const results: { name: string; status: "ok" | "error"; duration: number; error?: string }[] = [];

  for (const source of toRun) {
    const t0 = Date.now();
    console.log(`\n${"─".repeat(50)}`);
    console.log(`  Starting: ${source.name.toUpperCase()}`);
    console.log(`${"─".repeat(50)}`);

    try {
      await source.run();
      const duration = ((Date.now() - t0) / 1000).toFixed(1);
      results.push({ name: source.name, status: "ok", duration: parseFloat(duration) });
      console.log(`  ✓ ${source.name} completed in ${duration}s`);
    } catch (err: any) {
      const duration = ((Date.now() - t0) / 1000).toFixed(1);
      console.error(`  ✗ ${source.name} FAILED: ${err.message}`);
      results.push({ name: source.name, status: "error", duration: parseFloat(duration), error: err.message });
    }
  }

  // Summary
  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  const ok = results.filter((r) => r.status === "ok");
  const failed = results.filter((r) => r.status === "error");

  console.log("\n" + "=".repeat(60));
  console.log(`  SUMMARY — ${today()} — ${totalTime} min total`);
  console.log("=".repeat(60));
  console.log(`  Completed: ${ok.length}/${results.length}`);

  if (ok.length > 0) {
    console.log("\n  ✓ Successful:");
    for (const r of ok) {
      console.log(`      ${r.name.padEnd(20)} ${r.duration}s`);
    }
  }
  if (failed.length > 0) {
    console.log("\n  ✗ Failed:");
    for (const r of failed) {
      console.log(`      ${r.name.padEnd(20)} ${r.error}`);
    }
  }

  console.log(`\n  Archive saved to: archive/${today()}/`);
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
