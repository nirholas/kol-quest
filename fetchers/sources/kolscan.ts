/**
 * KolScan fetcher — extends existing scraper with direct API calls
 * Target: https://kolscan.io API endpoints
 *
 * In addition to the Playwright-based scraper, we can call the API directly.
 * KolScan returns wallet + PnL data for known KOLs.
 *
 * Endpoints:
 * - /api/leaderboard (POST — already scraped by scrape.js)
 * - /api/wallet/{address} (wallet details)
 * - /api/wallet/{address}/trades (trade history)
 * - /api/token/{address} (token data)
 */

import { fetchJSON, saveArchive, log, sleep } from "../lib/utils.ts";
import { loadTopWallets, loadSolWallets } from "../lib/wallets.ts";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const BASE = "https://kolscan.io";
const API = "https://api.kolscan.io";
const SRC = "kolscan";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, */*",
  Referer: "https://kolscan.io/",
};

// Load KOL wallet addresses from existing kolscan-leaderboard.json if available
function loadKolWallets(): string[] {
  const files = [
    join(import.meta.dir, "..", "..", "output", "kolscan-leaderboard.json"),
    join(import.meta.dir, "..", "..", "site", "data", "kolscan-leaderboard.json"),
  ];

  const addrs = new Set<string>();
  for (const f of files) {
    if (!existsSync(f)) continue;
    try {
      const data = JSON.parse(readFileSync(f, "utf-8"));
      if (Array.isArray(data)) {
        for (const entry of data) {
          if (entry?.wallet) addrs.add(entry.wallet);
          if (entry?.address) addrs.add(entry.address);
        }
      }
    } catch {}
  }
  return [...addrs];
}

const LEADERBOARD_TIMEFRAMES = ["daily", "weekly", "monthly"];

export async function runKolScan() {
  log(SRC, "Starting KolScan API fetch...");

  // 1. Leaderboard per timeframe (direct POST)
  for (const timeframe of LEADERBOARD_TIMEFRAMES) {
    const result = await fetchJSON(`${API}/leaderboard`, {
      method: "POST",
      headers: { ...HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ timeframe, page: 1, limit: 100 }),
      source: SRC,
    });
    if (result) {
      saveArchive(SRC, `leaderboard-${timeframe}`, result);
      const count = result?.data?.length ?? result?.length ?? "?";
      log(SRC, `Leaderboard ${timeframe}: ${count} entries`);
    }
    await sleep(700);
  }

  // 2. Per-wallet details for known KOL wallets
  const kolWallets = loadKolWallets();
  const topWallets = loadTopWallets("sol", 30);
  const allWallets = [...new Set([...kolWallets, ...topWallets])].slice(0, 60);

  log(SRC, `Fetching KolScan details for ${allWallets.length} wallets`);

  for (const wallet of allWallets) {
    const data: any = { wallet };

    const profile = await fetchJSON(`${API}/wallet/${wallet}`, {
      source: SRC, headers: HEADERS, delayMs: 400,
    });
    if (profile) data.profile = profile;

    const trades = await fetchJSON(`${API}/wallet/${wallet}/trades?limit=50&page=1`, {
      source: SRC, headers: HEADERS, delayMs: 400,
    });
    if (trades) data.trades = trades;

    if (data.profile || data.trades) {
      saveArchive(SRC, `wallet-${wallet}`, data);
      log(SRC, `Saved KolScan wallet ${wallet.slice(0, 8)}...`);
    }

    await sleep(800);
  }

  log(SRC, "KolScan fetch complete.");
}
