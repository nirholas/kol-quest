/**
 * GMGN Rewards Monitor
 *
 * Monitors GMGN's points redemption page to detect when items become available.
 * Since the rewards page requires login, this uses saved browser state.
 *
 * First run setup:
 *   1. Run with --login flag: node monitor-gmgn-rewards.js --login
 *   2. Log into GMGN in the browser window that opens
 *   3. Press Enter in the terminal to save auth state
 *
 * Normal usage:
 *   node monitor-gmgn-rewards.js           # One-time check
 *   node monitor-gmgn-rewards.js --poll    # Poll every 5 minutes
 *   node monitor-gmgn-rewards.js --poll 60 # Poll every 60 seconds
 *
 * Output: output/gmgn-rewards.json
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const OUTPUT_DIR = path.join(__dirname, "output");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "gmgn-rewards.json");
const AUTH_STATE_FILE = path.join(__dirname, ".gmgn-auth-state.json");
const GMGN_REWARDS_URL = "https://gmgn.ai/rewards?chain=sol&tab=points";

// Parse command line args
const args = process.argv.slice(2);
const isLoginMode = args.includes("--login");
const isPollMode = args.includes("--poll");
const pollIndex = args.indexOf("--poll");
const pollIntervalSec =
  isPollMode && pollIndex + 1 < args.length
    ? parseInt(args[pollIndex + 1], 10) || 300
    : 300;

async function waitForUserInput(prompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}

async function saveAuthState(context) {
  const state = await context.storageState();
  fs.writeFileSync(AUTH_STATE_FILE, JSON.stringify(state, null, 2));
  console.log(`✓ Auth state saved to ${AUTH_STATE_FILE}`);
}

async function loadAuthState() {
  if (!fs.existsSync(AUTH_STATE_FILE)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(AUTH_STATE_FILE, "utf-8"));
  } catch {
    return null;
  }
}

async function login() {
  console.log("=== GMGN Login Mode ===\n");
  console.log("A browser window will open. Please:");
  console.log("  1. Log into GMGN (connect wallet or sign in)");
  console.log("  2. Navigate to the rewards page if needed");
  console.log("  3. Come back here and press Enter to save your session\n");

  const browser = await chromium.launch({
    headless: false, // Must be visible for manual login
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();
  await page.goto(GMGN_REWARDS_URL, { waitUntil: "domcontentloaded" });

  await waitForUserInput("\nPress Enter after logging in to save session...");

  await saveAuthState(context);
  await browser.close();
  console.log("\n✓ Login complete! You can now run the monitor in normal mode.");
}

async function scrapeRewards(context) {
  const page = await context.newPage();
  const apiResponses = [];

  // Intercept API responses for rewards/points data
  page.on("response", async (response) => {
    const url = response.url();

    const isRewardsApi =
      url.includes("gmgn.ai") &&
      (url.includes("reward") ||
        url.includes("point") ||
        url.includes("redeem") ||
        url.includes("exchange") ||
        url.includes("mall") ||
        url.includes("shop") ||
        url.includes("claim"));

    if (!isRewardsApi) return;

    try {
      const contentType = response.headers()["content-type"] || "";
      if (!contentType.includes("json")) return;

      const json = await response.json();
      apiResponses.push({ url, data: json, timestamp: new Date().toISOString() });
      console.log(`  [API] ${url.substring(0, 120)}`);
    } catch {
      // Not JSON — skip
    }
  });

  console.log(`Loading ${GMGN_REWARDS_URL} ...`);
  try {
    await page.goto(GMGN_REWARDS_URL, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
  } catch (e) {
    console.log(`  Navigation warning: ${e.message}`);
  }

  await page.waitForTimeout(3000);

  // Extract redemption items from DOM
  const items = await page.evaluate(() => {
    const results = [];

    // Find all redemption item cards
    // Based on the HTML structure: 134px height containers with reward items
    const itemCards = document.querySelectorAll(
      '[class*="h-[134px]"], [class*="reward"], [class*="redeem"]'
    );

    for (const card of itemCards) {
      try {
        // Get item name from title/heading
        const nameEl =
          card.querySelector('[class*="font-semibold"] span') ||
          card.querySelector('[class*="font-semibold"]') ||
          card.querySelector("h3") ||
          card.querySelector("h4");
        const name = nameEl?.innerText?.trim() || "";

        // Get image URL
        const imgEl = card.querySelector("img[src*='points']");
        const imageUrl = imgEl?.src || "";

        // Get points required (usually in the button or progress section)
        const pointsEl = card.querySelector("button span:last-child");
        const pointsText = pointsEl?.innerText?.trim() || "";
        const pointsRequired = parseInt(pointsText.replace(/,/g, ""), 10) || 0;

        // Get batch size (e.g., "Batch Size: 10")
        const batchEl = card.querySelector('[class*="batch"], [class*="-bottom-"]');
        const batchText = batchEl?.innerText?.trim() || "";
        const batchMatch = batchText.match(/(\d+)/);
        const batchSize = batchMatch ? parseInt(batchMatch[1], 10) : 0;

        // Get progress (from progress bar width percentage)
        const progressBar = card.querySelector('[class*="h-full"][class*="rounded"]');
        const progressStyle = progressBar?.getAttribute("style") || "";
        const widthMatch = progressStyle.match(/width:\s*(\d+(?:\.\d+)?)/);
        const progressPercent = widthMatch ? parseFloat(widthMatch[1]) : 100;

        // Get current/total from progress text (e.g., "5" and "10")
        const progressText = card.querySelectorAll(
          '[class*="mt-8px"] span, [class*="justify-between"] span'
        );
        let claimed = 0;
        let total = 0;
        if (progressText.length >= 2) {
          claimed = parseInt(progressText[0]?.innerText?.replace(/,/g, ""), 10) || 0;
          total = parseInt(progressText[1]?.innerText?.replace(/,/g, ""), 10) || 0;
        }

        // Check if button is disabled
        const button = card.querySelector("button");
        const isDisabled =
          button?.classList?.contains("cursor-not-allowed") ||
          button?.classList?.contains("opacity-50") ||
          button?.disabled === true;

        // Calculate available slots
        const available = total > claimed ? total - claimed : 0;

        if (name || pointsRequired) {
          results.push({
            name: name || "Unknown Item",
            imageUrl,
            pointsRequired,
            batchSize: batchSize || total,
            claimed,
            total,
            progressPercent,
            available,
            isRedeemable: !isDisabled && available > 0,
          });
        }
      } catch (err) {
        // Skip malformed card
      }
    }

    return results;
  });

  // Also try to find items via any visible text patterns
  const additionalItems = await page.evaluate(() => {
    const results = [];

    // Look for any iPhone or reward mentions in the page
    const allText = document.body.innerText;
    const lines = allText.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (
        line.includes("iphone") ||
        line.includes("wallet") ||
        line.includes("ledger") ||
        line.includes("airpods")
      ) {
        // Try to find batch size and points nearby
        const context = lines.slice(Math.max(0, i - 3), i + 3).join(" ");
        const batchMatch = context.match(/batch\s*size[:\s]*(\d+)/i);
        const pointsMatch = context.match(/(\d{1,3}(?:,\d{3})+)/);

        if (pointsMatch || batchMatch) {
          results.push({
            contextLine: lines[i].trim(),
            nearbyBatchSize: batchMatch ? parseInt(batchMatch[1], 10) : null,
            nearbyPoints: pointsMatch
              ? parseInt(pointsMatch[1].replace(/,/g, ""), 10)
              : null,
          });
        }
      }
    }

    return results;
  });

  await page.close();

  return { items, additionalItems, apiResponses };
}

async function runMonitor() {
  const authState = await loadAuthState();

  if (!authState) {
    console.error("✗ No auth state found. Run with --login first:");
    console.error("  node monitor-gmgn-rewards.js --login\n");
    process.exit(1);
  }

  console.log("=== GMGN Rewards Monitor ===\n");
  console.log(`Using saved auth state from ${AUTH_STATE_FILE}\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    storageState: authState,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
  });

  // Load previous results to detect changes
  let previousResults = null;
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      previousResults = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf-8"));
    } catch {
      // Ignore
    }
  }

  async function checkOnce() {
    const timestamp = new Date().toISOString();
    console.log(`\n[${timestamp}] Checking rewards...\n`);

    const { items, additionalItems, apiResponses } = await scrapeRewards(context);

    console.log(`\nFound ${items.length} redemption items:\n`);

    for (const item of items) {
      const status = item.isRedeemable
        ? "🟢 AVAILABLE"
        : item.progressPercent >= 100
          ? "🔴 SOLD OUT"
          : "🟡 UNAVAILABLE";

      console.log(`  ${status} ${item.name}`);
      console.log(`    Points: ${item.pointsRequired.toLocaleString()}`);
      console.log(`    Progress: ${item.claimed}/${item.total} (${item.progressPercent}%)`);
      console.log(`    Available: ${item.available}`);
      console.log("");
    }

    // Check for changes (new availability)
    if (previousResults?.items) {
      for (const item of items) {
        const prev = previousResults.items.find((p) => p.name === item.name);
        if (prev) {
          if (!prev.isRedeemable && item.isRedeemable) {
            console.log(`\n🚨 ALERT: "${item.name}" is now REDEEMABLE! 🚨\n`);
          }
          if (item.available > prev.available) {
            console.log(
              `\n🚨 ALERT: "${item.name}" has more slots! ${prev.available} → ${item.available} 🚨\n`
            );
          }
          if (item.batchSize > prev.batchSize) {
            console.log(
              `\n🚨 ALERT: "${item.name}" batch size increased! ${prev.batchSize} → ${item.batchSize} 🚨\n`
            );
          }
        }
      }
    }

    // Save results
    const results = {
      timestamp,
      url: GMGN_REWARDS_URL,
      items,
      additionalContext: additionalItems,
      apiResponses,
    };

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
    console.log(`Results saved to ${OUTPUT_FILE}`);

    return results;
  }

  if (isPollMode) {
    console.log(`Polling every ${pollIntervalSec} seconds. Press Ctrl+C to stop.\n`);

    // Initial check
    previousResults = await checkOnce();

    // Poll loop
    setInterval(async () => {
      try {
        previousResults = await checkOnce();
      } catch (err) {
        console.error(`Poll error: ${err.message}`);
      }
    }, pollIntervalSec * 1000);
  } else {
    // One-time check
    await checkOnce();
    await browser.close();
  }
}

// Main
(async () => {
  try {
    if (isLoginMode) {
      await login();
    } else {
      await runMonitor();
    }
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
})();
