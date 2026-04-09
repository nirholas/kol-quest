/**
 * GMGN X Tracker Scraper
 *
 * Scrapes X/Twitter accounts from GMGN's X Tracker API directly.
 * Uses the /vas/api/v1/twitter/user/search endpoint with pagination
 * to fetch all tracked crypto-relevant X accounts (~10,000+).
 *
 * It also enriches the data with twitter usernames from our wallet data files.
 *
 * Usage: node scrape-gmgn-x-tracker.js
 * Output: site/data/gmgn-x-tracker.json
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, "site", "data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "gmgn-x-tracker.json");

// GMGN API configuration
const API_BASE = "https://gmgn.ai/vas/api/v1/twitter/user/search";
const USER_TAGS = [
  "kol",
  "trader", 
  "master",
  "politics",
  "media",
  "companies",
  "founder",
  "exchange",
  "celebrity",
  "binance_square",
  "other",
];
const PAGE_LIMIT = 50;
const DELAY_BETWEEN_REQUESTS_MS = 500;

// Map GMGN user_tags to display tags
const TAG_MAP = {
  kol: "KOL",
  trader: "Trader",
  master: "Master",
  politics: "Politics",
  media: "Media",
  companies: "Companies",
  founder: "Founders",
  exchange: "Exchanges",
  celebrity: "Celebrity",
  binance_square: "Binance Square",
  other: "Other",
};

// Generate random device/fingerprint IDs like GMGN uses
function generateDeviceId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function generateFpDid() {
  return [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}

async function scrape() {
  console.log("Starting GMGN X Tracker API scraper...\n");

  // Pre-seed from existing wallet data
  const accountMap = new Map();
  seedFromWalletData(accountMap);
  console.log(`Pre-seeded ${accountMap.size} accounts from wallet data.\n`);

  // Generate auth params that GMGN requires
  const deviceId = generateDeviceId();
  const fpDid = generateFpDid();
  const appVer = `${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${Math.floor(Math.random() * 99999)}-${generateFpDid().slice(0,7)}`;
  
  const authParams = new URLSearchParams({
    device_id: deviceId,
    fp_did: fpDid,
    client_id: `gmgn_web_${appVer}`,
    from_app: 'gmgn',
    app_ver: appVer,
    tz_name: 'America/Los_Angeles',
    tz_offset: '-25200',
    app_lang: 'en-US',
    os: 'web',
    worker: '0',
  }).toString();

  // Build query params for all user tags
  const tagParams = USER_TAGS.map((t) => `user_tags=${t}`).join("&");
  let pageToken = "";
  let totalFetched = 0;
  let pageNum = 0;
  let consecutiveEmpty = 0;

  console.log("Fetching accounts from GMGN API...\n");

  while (consecutiveEmpty < 3) {
    pageNum++;
    const url = `${API_BASE}?${authParams}&limit=${PAGE_LIMIT}&handle=&${tagParams}${pageToken ? `&page_token=${encodeURIComponent(pageToken)}` : ""}`;

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: "https://gmgn.ai/x",
          Origin: "https://gmgn.ai",
        },
      });

      if (!res.ok) {
        console.log(`  Page ${pageNum}: HTTP ${res.status} - stopping.`);
        break;
      }

      const data = await res.json();

      // Extract accounts from response
      const users = data?.data?.users || data?.data?.list || data?.data || [];
      const newPageToken = data?.data?.next_page_token || data?.data?.page_token || "";

      if (!Array.isArray(users) || users.length === 0) {
        console.log(`  Page ${pageNum}: No users in response.`);
        consecutiveEmpty++;
        if (newPageToken && newPageToken !== pageToken) {
          pageToken = newPageToken;
          continue;
        }
        break;
      }

      consecutiveEmpty = 0;
      let newCount = 0;

      for (const user of users) {
        const account = parseUserToAccount(user);
        if (account && account.handle) {
          const key = account.handle.toLowerCase();
          if (!accountMap.has(key)) {
            newCount++;
          }
          // Merge with existing data
          const existing = accountMap.get(key) || {};
          accountMap.set(key, {
            ...existing,
            ...account,
            // Keep higher values
            subscribers: Math.max(existing.subscribers || 0, account.subscribers || 0),
            followers: Math.max(existing.followers || 0, account.followers || 0),
          });
        }
      }

      totalFetched += users.length;
      console.log(
        `  Page ${pageNum}: Got ${users.length} users (+${newCount} new) | Total unique: ${accountMap.size}`,
      );

      // Get next page token
      if (!newPageToken || newPageToken === pageToken) {
        console.log(`  No more pages available.`);
        break;
      }
      pageToken = newPageToken;

      // Rate limiting
      await sleep(DELAY_BETWEEN_REQUESTS_MS);
    } catch (err) {
      console.log(`  Page ${pageNum}: Error - ${err.message}`);
      consecutiveEmpty++;
      await sleep(1000);
    }
  }

  console.log(`\nTotal API responses: ${totalFetched}`);
  console.log(`Total unique X accounts: ${accountMap.size}`);

  // Save results
  const result = {
    meta: {
      scrapedAt: new Date().toISOString(),
      source: "gmgn.ai/vas/api/v1/twitter/user/search",
      totalAccounts: accountMap.size,
    },
    accounts: Array.from(accountMap.values()).sort(
      (a, b) => (b.followers || 0) - (a.followers || 0),
    ),
  };

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
  console.log(`\nSaved to ${OUTPUT_FILE}`);
  console.log("\nDone!");
}

/**
 * Parse a GMGN user object into our XTrackerAccount format.
 */
function parseUserToAccount(user) {
  if (!user || typeof user !== "object") return null;

  // Extract handle
  const handle =
    user.handle ||
    user.twitter_username ||
    user.screen_name ||
    user.username ||
    user.twitter_handle;

  if (!handle) return null;

  // Extract tag from user_tag or tags array
  let tag = null;
  if (user.user_tag) {
    tag = TAG_MAP[user.user_tag] || user.user_tag;
  } else if (Array.isArray(user.tags) && user.tags.length > 0) {
    tag = TAG_MAP[user.tags[0]] || user.tags[0];
  } else if (user.tag) {
    tag = TAG_MAP[user.tag] || user.tag;
  }

  return {
    handle: handle.replace(/^@/, ""),
    name: user.name || user.display_name || user.twitter_name || null,
    avatar:
      user.avatar ||
      user.profile_image_url ||
      user.twitter_avatar ||
      user.image ||
      null,
    subscribers: user.subscribers || user.subscriber_count || user.follow_count || 0,
    followers: user.followers || user.followers_count || 0,
    tag,
    verified: user.verified ?? user.is_verified ?? false,
    bio: user.bio || user.description || null,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Pre-seed accounts from existing wallet JSON files.
 * This ensures we capture all twitter usernames from our GMGN wallet data
 * even if the X Tracker page doesn't show them all.
 */
function seedFromWalletData(map) {
  const walletFiles = [
    path.join(__dirname, "site", "data", "solwallets.json"),
    path.join(__dirname, "solwallets.json"),
    path.join(__dirname, "site", "data", "bscwallets.json"),
    path.join(__dirname, "bscwallets.json"),
  ];

  for (const filepath of walletFiles) {
    if (!fs.existsSync(filepath)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(filepath, "utf-8"));
      const processWallets = (wallets, category) => {
        if (!Array.isArray(wallets)) return;
        for (const w of wallets) {
          if (!w.twitter_username) continue;
          const key = w.twitter_username.toLowerCase();
          if (map.has(key)) continue;
          map.set(key, {
            handle: w.twitter_username,
            name: w.twitter_name || w.name || w.nickname || null,
            avatar: w.avatar || null,
            subscribers: w.follow_count || 0,
            followers: 0,
            tag: category === "kol" ? "KOL" : category === "smart_degen" ? "Smart Degen" : null,
            verified: false,
            bio: null,
          });
        }
      };

      if (raw.smartMoney?.wallets) {
        for (const [cat, list] of Object.entries(raw.smartMoney.wallets)) {
          processWallets(list, cat);
        }
      }
      if (raw.kol?.wallets) processWallets(raw.kol.wallets, "kol");

      // Also scan interceptorRaw for more wallets
      if (raw.interceptorRaw?.walletsAll) {
        processWallets(raw.interceptorRaw.walletsAll, "trader");
      }
    } catch (e) {
      console.log(`  Warning: Failed to parse ${filepath}: ${e.message}`);
    }
  }

  // Also load existing x-profiles.json for enrichment
  const xProfilesPath = path.join(__dirname, "site", "data", "x-profiles.json");
  if (fs.existsSync(xProfilesPath)) {
    try {
      const profiles = JSON.parse(fs.readFileSync(xProfilesPath, "utf-8"));
      for (const [key, p] of Object.entries(profiles)) {
        if (p.error) continue;
        const handle = p.username || key;
        const existing = map.get(key) || {};
        map.set(key, {
          handle: handle,
          name: p.name || existing.name || null,
          avatar: p.avatar || existing.avatar || null,
          subscribers: existing.subscribers || 0,
          followers: p.followers || existing.followers || 0,
          tag: existing.tag || null,
          verified: p.verified || existing.verified || false,
          bio: p.bio || existing.bio || null,
        });
      }
    } catch {
      // ignore
    }
  }
}

scrape().catch(console.error);
