#!/usr/bin/env node
/**
 * GMGN Smart Money Ranks Scraper (Direct API — no browser needed)
 *
 * Fetches all smart money categories from GMGN's rank API directly.
 * Output format is compatible with the existing solwallets.json / bscwallets.json.
 *
 * Categories: smart_degen, kol, sniper, fresh_wallet, top_dev, pump_smart
 * Timeframes: 1d, 7d, 30d (merged per wallet)
 * Chains: sol, bsc
 *
 * Usage: node scrape-gmgn-ranks.js
 * Output:
 *   site/data/solwallets.json
 *   site/data/bscwallets.json
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = "https://gmgn.ai/defi/quotation/v1";
const OUTPUT_SOL = path.join(__dirname, "site", "data", "solwallets.json");
const OUTPUT_BSC = path.join(__dirname, "site", "data", "bscwallets.json");

const CATEGORIES = [
  "smart_degen",
  "kol",
  "sniper",
  "fresh_wallet",
  "top_dev",
  "pump_smart",
];

const TIMEFRAMES = ["1d", "7d", "30d"];

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://gmgn.ai/",
  Origin: "https://gmgn.ai",
};

// Use GMGN token from environment if available (reduces rate-limit hits)
if (process.env.GMGN_TOKEN) {
  HEADERS["Authorization"] = `Bearer ${process.env.GMGN_TOKEN}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJSON(url, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (res.status === 429) {
        const wait = (attempt + 1) * 2000;
        console.log(`  [RATE LIMIT] waiting ${wait}ms...`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) {
        console.log(`  [WARN] ${url} → ${res.status}`);
        return null;
      }
      return await res.json();
    } catch (err) {
      if (attempt === retries) console.log(`  [ERR] ${url}: ${err.message}`);
      else await sleep(1000);
    }
  }
  return null;
}

/**
 * Merge timeframe-specific data into a single wallet entry.
 * The 30d entry is used as base; 1d and 7d data are patched in.
 */
function mergeWalletTimeframes(byAddr) {
  // byAddr: Map<address, { "1d": raw|null, "7d": raw|null, "30d": raw|null }>
  const merged = [];
  for (const [addr, frames] of byAddr) {
    const base = frames["30d"] || frames["7d"] || frames["1d"];
    if (!base) continue;
    const w = { ...base, wallet_address: addr, address: addr };
    if (frames["1d"]) {
      w.realized_profit_1d = frames["1d"].realized_profit || frames["1d"].realized_profit_1d || "0";
      w.pnl_1d = frames["1d"].pnl || frames["1d"].pnl_1d || "0";
      w.buy_1d = frames["1d"].buy_1d || frames["1d"].buy || 0;
      w.sell_1d = frames["1d"].sell_1d || frames["1d"].sell || 0;
      w.txs_1d = frames["1d"].txs_1d || frames["1d"].txs || 0;
      w.winrate_1d = frames["1d"].winrate || frames["1d"].winrate_1d || 0;
      w.volume_1d = frames["1d"].volume_1d || frames["1d"].volume || "0";
    }
    if (frames["7d"]) {
      w.realized_profit_7d = frames["7d"].realized_profit || frames["7d"].realized_profit_7d || "0";
      w.pnl_7d = frames["7d"].pnl || frames["7d"].pnl_7d || "0";
      w.buy_7d = frames["7d"].buy_7d || frames["7d"].buy || 0;
      w.sell_7d = frames["7d"].sell_7d || frames["7d"].sell || 0;
      w.txs_7d = frames["7d"].txs_7d || frames["7d"].txs || 0;
      w.winrate_7d = frames["7d"].winrate || frames["7d"].winrate_7d || 0;
      w.volume_7d = frames["7d"].volume_7d || frames["7d"].volume || "0";
    }
    if (frames["30d"]) {
      w.realized_profit_30d = frames["30d"].realized_profit || frames["30d"].realized_profit_30d || "0";
      w.pnl_30d = frames["30d"].pnl || frames["30d"].pnl_30d || "0";
      w.buy_30d = frames["30d"].buy_30d || frames["30d"].buy || 0;
      w.sell_30d = frames["30d"].sell_30d || frames["30d"].sell || 0;
      w.txs_30d = frames["30d"].txs_30d || frames["30d"].txs || 0;
      w.winrate_30d = frames["30d"].winrate || frames["30d"].winrate_30d || 0;
      w.volume_30d = frames["30d"].volume_30d || frames["30d"].volume || "0";
    }
    merged.push(w);
  }
  return merged;
}

/**
 * Fetch all wallets for a category across all timeframes.
 * Returns { wallets: [], walletDetails: {} }
 */
async function fetchCategory(chain, category) {
  console.log(`  [${chain.toUpperCase()}] ${category}...`);
  // Map address → per-timeframe data
  const byAddr = new Map();
  const walletDetails = {};

  for (const tf of TIMEFRAMES) {
    let page = 1;
    let hasMore = true;
    let pageWallets = 0;

    while (hasMore) {
      const url = `${BASE}/rank/${chain}/${category}/${tf}?orderby=pnl_${tf}&direction=desc&page=${page}&limit=100`;
      const data = await fetchJSON(url);
      await sleep(600);

      if (!data) { hasMore = false; break; }

      // GMGN rank API returns data.rank or rank
      const rank = data?.data?.rank ?? data?.rank;
      if (!Array.isArray(rank) || rank.length === 0) { hasMore = false; break; }

      for (const w of rank) {
        const addr = w.wallet_address || w.address;
        if (!addr) continue;
        if (!byAddr.has(addr)) byAddr.set(addr, { "1d": null, "7d": null, "30d": null });
        byAddr.get(addr)[tf] = w;

        // Collect wallet details if present
        if (w.detail) walletDetails[addr] = w.detail;
        if (data?.data?.walletDetails?.[addr]) walletDetails[addr] = data.data.walletDetails[addr];
      }
      pageWallets += rank.length;

      // Only paginate 7d and 30d up to 3 pages (300 wallets)
      hasMore = rank.length === 100 && page < 3;
      page++;
    }
    console.log(`      ${tf}: ${pageWallets} wallets`);
  }

  const wallets = mergeWalletTimeframes(byAddr);
  console.log(`    → ${wallets.length} total unique wallets`);
  return { wallets, walletDetails };
}

async function scrapeChain(chain) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  Scraping ${chain.toUpperCase()} smart money`);
  console.log(`${"=".repeat(60)}`);

  const startedAt = new Date().toISOString();
  const smartMoneyWallets = {};
  const kolWallets = [];
  const allWalletDetails = {};
  const stats = {};

  for (const cat of CATEGORIES) {
    const { wallets, walletDetails } = await fetchCategory(chain, cat);
    Object.assign(allWalletDetails, walletDetails);
    stats[cat] = wallets.length;

    if (cat === "kol") {
      kolWallets.push(...wallets);
    } else {
      smartMoneyWallets[cat] = wallets;
    }

    // Be respectful between category fetches
    await sleep(800);
  }

  const finishedAt = new Date().toISOString();
  const totalAll = [...Object.values(smartMoneyWallets).flat(), ...kolWallets];
  const uniqueAll = new Set(totalAll.map((w) => w.wallet_address)).size;

  const output = {
    meta: {
      startedAt,
      finishedAt,
      chain,
      version: "v4",
      scraper: "scrape-gmgn-ranks.js",
    },
    interceptor: {
      ...Object.fromEntries(
        Object.entries(stats).map(([k, v]) => [`walletsByCategory_${k}`, v])
      ),
      walletsAll: uniqueAll,
    },
    smartMoney: {
      wallets: smartMoneyWallets,
      meta: {
        chain,
        startedAt,
      },
    },
    kol: {
      wallets: kolWallets,
    },
    walletDetails: allWalletDetails,
  };

  console.log(`\nSummary for ${chain.toUpperCase()}:`);
  for (const [cat, count] of Object.entries(stats)) {
    console.log(`  ${cat}: ${count} wallets`);
  }
  console.log(`  Total unique: ${uniqueAll}`);

  return output;
}

async function main() {
  console.log("GMGN Smart Money Ranks Scraper");
  console.log(new Date().toISOString());
  console.log("Categories:", CATEGORIES.join(", "));
  console.log("");

  // Ensure output dir exists
  const outDir = path.join(__dirname, "site", "data");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // Scrape Solana
  const solData = await scrapeChain("sol");
  fs.writeFileSync(OUTPUT_SOL, JSON.stringify(solData, null, 2));
  console.log(`\nSaved SOL → ${OUTPUT_SOL}`);

  // Also write to root for backwards compat
  fs.writeFileSync(path.join(__dirname, "solwallets.json"), JSON.stringify(solData, null, 2));

  await sleep(2000);

  // Scrape BSC
  const bscData = await scrapeChain("bsc");
  fs.writeFileSync(OUTPUT_BSC, JSON.stringify(bscData, null, 2));
  console.log(`Saved BSC → ${OUTPUT_BSC}`);
  fs.writeFileSync(path.join(__dirname, "bscwallets.json"), JSON.stringify(bscData, null, 2));

  console.log("\nDone!");
}

main().catch((err) => {
  console.error("Scraper failed:", err);
  process.exit(1);
});
