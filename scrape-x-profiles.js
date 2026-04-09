/**
 * Scrape X/Twitter profile data for all KOLs using xactions.
 *
 * Usage:
 *   # With auth token (recommended — higher rate limits):
 *   X_AUTH_TOKEN=your_auth_token node scrape-x-profiles.js
 *
 *   # Without auth (guest tokens — works for public profiles):
 *   node scrape-x-profiles.js
 *
 * Output: site/data/x-profiles.json
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// xactions HTTP-based scraper (no browser needed)
import {
  TwitterHttpClient,
  GuestTokenManager,
  scrapeProfile,
  GRAPHQL,
  BEARER_TOKEN,
  DEFAULT_FEATURES,
  buildGraphQLUrl,
  parseUserData,
} from "xactions/scrapers/twitter/http";

// --------------------------------------------------------------------------
// 1. Collect all unique Twitter usernames from our data
// --------------------------------------------------------------------------
function extractUsernames() {
  const usernames = new Set();

  // KolScan leaderboard
  for (const filepath of [
    path.join(__dirname, "site/data/kolscan-leaderboard.json"),
    path.join(__dirname, "output/kolscan-leaderboard.json"),
  ]) {
    if (fs.existsSync(filepath)) {
      const data = JSON.parse(fs.readFileSync(filepath, "utf-8"));
      for (const entry of data) {
        if (entry.twitter) {
          const match = entry.twitter.match(
            /(?:x\.com|twitter\.com)\/([A-Za-z0-9_]+)/
          );
          if (match) usernames.add(match[1].toLowerCase());
        }
      }
    }
  }

  // GMGN wallets
  for (const filepath of [
    path.join(__dirname, "site/data/solwallets.json"),
    path.join(__dirname, "solwallets.json"),
    path.join(__dirname, "site/data/bscwallets.json"),
    path.join(__dirname, "bscwallets.json"),
  ]) {
    if (fs.existsSync(filepath)) {
      const raw = JSON.parse(fs.readFileSync(filepath, "utf-8"));
      const extractFromWallets = (wallets) => {
        if (!Array.isArray(wallets)) return;
        for (const w of wallets) {
          if (w.twitter_username) {
            usernames.add(w.twitter_username.toLowerCase());
          }
        }
      };

      // SmartMoney categories
      if (raw.smartMoney?.wallets) {
        for (const list of Object.values(raw.smartMoney.wallets)) {
          extractFromWallets(list);
        }
      }
      // KOL wallets
      if (raw.kol?.wallets) extractFromWallets(raw.kol.wallets);
    }
  }

  return [...usernames].filter(
    (u) => u && u.length > 0 && !u.includes("/") && !u.includes("?")
  );
}

// --------------------------------------------------------------------------
// 2. Scrape profiles with rate limiting
// --------------------------------------------------------------------------

/** Bootstrap an authenticated client — fetches ct0 CSRF token from Twitter */
async function createAuthenticatedClient(authToken) {
  // First, hit Twitter to get a ct0 cookie
  const res = await fetch("https://x.com", {
    headers: { Cookie: `auth_token=${authToken}` },
    redirect: "manual",
  });

  // Extract ct0 from set-cookie headers
  let ct0 = "";
  const setCookies = res.headers.getSetCookie?.() || [];
  for (const cookie of setCookies) {
    const match = cookie.match(/ct0=([^;]+)/);
    if (match) {
      ct0 = match[1];
      break;
    }
  }

  if (!ct0) {
    // Generate a random ct0 as fallback (Twitter sometimes accepts this)
    const crypto = await import("crypto");
    ct0 = crypto.randomBytes(16).toString("hex");
  }

  const client = new TwitterHttpClient({
    cookies: `auth_token=${authToken}; ct0=${ct0}`,
    rateLimitStrategy: "wait",
  });

  return client;
}

/** Scrape a profile using guest token (no auth needed for public profiles) */
async function scrapeWithGuest(guestManager, username) {
  const { queryId, operationName } = GRAPHQL.UserByScreenName;
  const variables = {
    screen_name: username,
    withSafetyModeUserFields: true,
  };

  const url = buildGraphQLUrl(queryId, operationName, variables, DEFAULT_FEATURES);
  const headers = await guestManager.getHeaders();

  const res = await fetch(url, { headers });

  if (res.status === 429) throw new Error("rate limited (429)");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();
  const result = json?.data?.user?.result;
  if (!result || result.__typename === "UserUnavailable") {
    throw new Error(`User @${username} not found`);
  }

  return parseUserData(result);
}

async function scrapeProfiles(usernames) {
  const authToken = process.env.X_AUTH_TOKEN;

  // Load existing profiles to resume
  const outputPath = path.join(__dirname, "site/data/x-profiles.json");
  let existing = {};
  if (fs.existsSync(outputPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
      console.log(`📂 Loaded ${Object.keys(existing).length} existing profiles`);
    } catch {
      existing = {};
    }
  }

  // Skip already scraped (unless older than 7 days)
  const STALE_MS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const toScrape = usernames.filter((u) => {
    const ex = existing[u];
    if (!ex) return true;
    if (ex.scrapedAt && now - new Date(ex.scrapedAt).getTime() < STALE_MS)
      return false;
    return true;
  });

  console.log(
    `\n🎯 ${usernames.length} total usernames, ${toScrape.length} to scrape (${usernames.length - toScrape.length} cached)\n`
  );

  if (toScrape.length === 0) {
    console.log("✅ All profiles up to date!");
    return existing;
  }

  // Set up scraping strategy
  let client = null;
  const guestManager = new GuestTokenManager({ poolSize: 3 });

  if (authToken) {
    console.log("🔑 Auth token provided — using authenticated client (higher rate limits)");
    try {
      client = await createAuthenticatedClient(authToken);
      // Test the client
      const testProfile = await scrapeProfile(client, "x");
      console.log(`✅ Auth client working (tested on @x)\n`);
    } catch (e) {
      console.log(`⚠️  Auth client failed (${e.message}), falling back to guest tokens\n`);
      client = null;
    }
  } else {
    console.log("🌐 No auth token — using guest tokens (public profiles only)\n");
  }

  // Pre-fill guest token pool
  if (!client) {
    try {
      await guestManager.fillPool();
      console.log("✅ Guest token pool ready\n");
    } catch (e) {
      console.log(`⚠️  Guest pool fill failed (${e.message}), will activate on demand\n`);
    }
  }

  const results = { ...existing };
  let success = 0;
  let failed = 0;

  for (let i = 0; i < toScrape.length; i++) {
    const username = toScrape[i];
    const progress = `[${i + 1}/${toScrape.length}]`;

    try {
      let profile;

      if (client) {
        // Authenticated path
        profile = await scrapeProfile(client, username);
      } else {
        // Guest token path
        profile = await scrapeWithGuest(guestManager, username);
      }

      results[username] = {
        username: profile.username || username,
        name: profile.name || null,
        bio: profile.bio || null,
        location: profile.location || null,
        website: profile.website || null,
        avatar: profile.avatar || profile.profileImageUrl || null,
        header: profile.header || profile.bannerImageUrl || null,
        followers: profile.followers ?? profile.followersCount ?? 0,
        following: profile.following ?? profile.followingCount ?? 0,
        tweets: profile.tweets ?? profile.tweetsCount ?? 0,
        verified: profile.verified || false,
        joinDate: profile.joined || profile.joinDate || null,
        scrapedAt: new Date().toISOString(),
      };

      success++;
      console.log(
        `${progress} ✅ @${username} — ${results[username].name} (${results[username].followers} followers)`
      );

      // Save every 10 profiles
      if (success % 10 === 0) {
        fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
      }

      // Rate limit: ~1 request per 2 seconds to be safe
      await sleep(2000 + Math.random() * 1000);
    } catch (err) {
      failed++;
      const msg = err.message || String(err);
      if (msg.includes("not found") || msg.includes("suspended")) {
        console.log(`${progress} ⚠️  @${username} — ${msg}`);
        results[username] = { username, error: msg, scrapedAt: new Date().toISOString() };
      } else if (msg.includes("rate") || msg.includes("429")) {
        console.log(`${progress} ⏳ Rate limited, waiting 60s...`);
        // If using guest tokens, rotate to a new one
        if (!client) {
          try { await guestManager.activate(); } catch {}
        }
        await sleep(60000);
        i--; // retry
        failed--;
      } else {
        console.log(`${progress} ❌ @${username} — ${msg}`);
        results[username] = { username, error: msg, scrapedAt: new Date().toISOString() };
      }
    }
  }

  // Final save
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(
    `\n✅ Done! ${success} scraped, ${failed} failed, ${Object.keys(results).length} total profiles`
  );
  console.log(`📁 Saved to ${outputPath}`);

  return results;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------
const usernames = extractUsernames();
console.log(`📋 Found ${usernames.length} unique X usernames across all data sources`);
console.log(`   Sample: ${usernames.slice(0, 5).map((u) => "@" + u).join(", ")}...`);

await scrapeProfiles(usernames);
