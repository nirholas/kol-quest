/**
 * Quick script to discover GMGN rewards API endpoints
 * Run: node inspect-gmgn-rewards-api.js
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const AUTH_STATE_FILE = path.join(__dirname, ".gmgn-auth-state.json");
const GMGN_REWARDS_URL = "https://gmgn.ai/rewards?chain=sol&tab=points";

async function loadAuthState() {
  if (!fs.existsSync(AUTH_STATE_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(AUTH_STATE_FILE, "utf-8"));
  } catch {
    return null;
  }
}

async function inspect() {
  const authState = await loadAuthState();

  console.log("=== GMGN Rewards API Inspector ===\n");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const contextOptions = {
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
  };

  if (authState) {
    contextOptions.storageState = authState;
    console.log("Using saved auth state\n");
  } else {
    console.log("No auth state found — trying without login\n");
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  const apiCalls = [];

  // Intercept ALL network requests
  page.on("response", async (response) => {
    const url = response.url();
    const status = response.status();

    // Only care about gmgn.ai requests
    if (!url.includes("gmgn.ai")) return;

    // Skip static assets
    if (url.match(/\.(png|jpg|jpeg|gif|svg|css|js|woff|woff2|ico)(\?|$)/)) return;

    const entry = {
      url,
      status,
      method: response.request().method(),
      contentType: response.headers()["content-type"] || "",
    };

    // Try to get JSON body
    if (entry.contentType.includes("json")) {
      try {
        entry.body = await response.json();
      } catch {
        entry.body = null;
      }
    }

    apiCalls.push(entry);
    console.log(`[${status}] ${entry.method} ${url}`);
  });

  console.log(`Loading ${GMGN_REWARDS_URL} ...\n`);

  try {
    await page.goto(GMGN_REWARDS_URL, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
  } catch (e) {
    console.log(`Navigation: ${e.message}\n`);
  }

  await page.waitForTimeout(3000);

  // Try clicking around to trigger more API calls
  console.log("\nTrying to trigger more API calls...\n");

  // Click on tabs if present
  for (const tabName of ["Points", "Tasks", "Leaderboard", "History"]) {
    try {
      const tab = page.locator(`text=${tabName}`).first();
      if (await tab.isVisible({ timeout: 1000 })) {
        console.log(`Clicking "${tabName}" tab...`);
        await tab.click();
        await page.waitForTimeout(2000);
      }
    } catch {}
  }

  // Scroll to load more
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);

  await browser.close();

  // Summarize findings
  console.log("\n\n=== API CALLS SUMMARY ===\n");

  const jsonCalls = apiCalls.filter((c) => c.contentType.includes("json"));

  for (const call of jsonCalls) {
    console.log(`\n📡 ${call.method} ${call.url}`);
    console.log(`   Status: ${call.status}`);

    if (call.body) {
      // Pretty print first level of response
      const preview = JSON.stringify(call.body, null, 2).substring(0, 500);
      console.log(`   Response preview:\n${preview}${preview.length >= 500 ? "..." : ""}`);
    }
  }

  // Save full results
  const outputFile = path.join(__dirname, "output", "gmgn-rewards-api-inspect.json");
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(apiCalls, null, 2));
  console.log(`\n\nFull results saved to ${outputFile}`);
}

inspect().catch(console.error);
