/**
 * Axiom.trade Smart Wallets Scraper
 *
 * Scrapes smart wallet / top trader data from https://axiom.trade
 * using Playwright to intercept API calls from the Pulse leaderboard.
 *
 * Usage: node scrape-axiom.js
 * Output: output/axiom-smart-wallets.json
 *         output/axiom-wallets.txt
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'output');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'axiom-smart-wallets.json');
const WALLETS_FILE = path.join(OUTPUT_DIR, 'axiom-wallets.txt');
const SCROLL_DELAY_MS = 2000;
const MAX_SCROLLS = 50;

// Axiom Pulse page – lists top traders / smart wallets
const AXIOM_URL = 'https://axiom.trade/pulse';

async function scrape() {
  console.log('Starting Axiom.trade smart-wallets scraper...\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  // Collect all intercepted API data
  const apiResponses = [];
  const walletMap = new Map(); // address -> data (dedup)

  // Intercept all API responses to capture wallet/leaderboard data
  page.on('response', async (response) => {
    const url = response.url();
    const method = response.request().method();

    // Capture any API calls that likely return wallet/trader data
    const isApiCall =
      url.includes('/api/') ||
      url.includes('api.axiom') ||
      url.includes('api2.axiom') ||
      url.includes('/graphql') ||
      url.includes('/pulse') ||
      url.includes('/leaderboard') ||
      url.includes('/traders') ||
      url.includes('/wallets') ||
      url.includes('/smart');

    if (!isApiCall) return;

    try {
      const contentType = response.headers()['content-type'] || '';
      if (!contentType.includes('json')) return;

      const json = await response.json();
      apiResponses.push({ url, method, data: json });
      console.log(`  [API] ${method} ${url.substring(0, 120)}`);

      // Try to extract wallet addresses from various response shapes
      extractWallets(json, walletMap);
    } catch {
      // Not JSON or failed to parse – skip
    }
  });

  // Navigate to axiom.trade/pulse
  console.log(`Loading ${AXIOM_URL} ...`);
  try {
    await page.goto(AXIOM_URL, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });
  } catch (err) {
    console.log(`Navigation warning: ${err.message}`);
    // Page may still be usable even if networkidle times out
  }

  await page.waitForTimeout(5000);

  // Take screenshot for debugging
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'axiom-debug.png') });
  console.log('  Saved debug screenshot to output/axiom-debug.png');

  // Try to find and click "Smart Wallets" or "Top Traders" tabs/links
  const tabSelectors = [
    'text=Smart Wallets',
    'text=Top Traders',
    'text=Leaderboard',
    'text=Top Wallets',
    'text=Traders',
    'text=Wallets',
    '[data-tab="wallets"]',
    '[data-tab="traders"]',
    'a[href*="wallet"]',
    'a[href*="trader"]',
    'button:has-text("Wallets")',
    'button:has-text("Traders")',
  ];

  for (const sel of tabSelectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        console.log(`  Clicking tab: ${sel}`);
        await el.click();
        await page.waitForTimeout(3000);
      }
    } catch {
      // Tab not found – try next
    }
  }

  // Scroll to load more wallets via infinite scroll / pagination
  console.log('\nScrolling to load more data...');
  let prevWalletCount = walletMap.size;
  let staleScrolls = 0;

  for (let s = 0; s < MAX_SCROLLS; s++) {
    await page.evaluate(() => {
      // Try common scroll containers
      const containers = [
        document.getElementById('mainScroll'),
        document.querySelector('[class*="scroll"]'),
        document.querySelector('main'),
        document.documentElement,
      ];
      for (const el of containers) {
        if (el) {
          el.scrollTop = el.scrollHeight;
        }
      }
      window.scrollTo(0, document.body.scrollHeight);
    });

    await page.waitForTimeout(SCROLL_DELAY_MS);

    // Check for "Load More" buttons
    try {
      const loadMore = await page.$(
        'button:has-text("Load More"), button:has-text("Show More"), button:has-text("View More")'
      );
      if (loadMore) {
        await loadMore.click();
        await page.waitForTimeout(2000);
      }
    } catch {}

    if (walletMap.size === prevWalletCount) {
      staleScrolls++;
      if (staleScrolls >= 5) {
        console.log(`  No new data after ${staleScrolls} scrolls, stopping.`);
        break;
      }
    } else {
      staleScrolls = 0;
      console.log(`  Scroll ${s + 1}: ${walletMap.size} wallets found`);
    }
    prevWalletCount = walletMap.size;
  }

  // Also try to extract wallets directly from the page DOM
  console.log('\nExtracting wallets from page DOM...');
  const domWallets = await page.evaluate(() => {
    const results = [];

    // Look for Solana wallet addresses in the page (base58, 32-44 chars)
    const solanaRegex = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;
    const text = document.body.innerText;
    const matches = text.match(solanaRegex) || [];

    for (const addr of matches) {
      // Filter out common false positives
      if (addr.length >= 32 && addr.length <= 44) {
        results.push(addr);
      }
    }

    // Also look for wallet links
    const links = document.querySelectorAll(
      'a[href*="wallet"], a[href*="address"], a[href*="account"]'
    );
    links.forEach((link) => {
      const href = link.getAttribute('href') || '';
      const addrMatch = href.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
      if (addrMatch) {
        results.push(addrMatch[0]);
      }
    });

    // Look for data attributes containing addresses
    const elements = document.querySelectorAll('[data-address], [data-wallet]');
    elements.forEach((el) => {
      const addr =
        el.getAttribute('data-address') || el.getAttribute('data-wallet');
      if (addr) results.push(addr);
    });

    return [...new Set(results)];
  });

  console.log(`  Found ${domWallets.length} potential wallet addresses in DOM`);
  for (const addr of domWallets) {
    if (!walletMap.has(addr)) {
      walletMap.set(addr, { wallet_address: addr, source: 'dom' });
    }
  }

  // Try alternate Axiom pages if pulse didn't yield much
  if (walletMap.size < 5) {
    const altPages = [
      'https://axiom.trade/pulse/wallets',
      'https://axiom.trade/pulse/traders',
      'https://axiom.trade/leaderboard',
      'https://axiom.trade/discover',
    ];

    for (const altUrl of altPages) {
      console.log(`\nTrying alternate page: ${altUrl}`);
      try {
        await page.goto(altUrl, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(3000);

        // Scroll a few times
        for (let s = 0; s < 10; s++) {
          await page.evaluate(() =>
            window.scrollTo(0, document.body.scrollHeight)
          );
          await page.waitForTimeout(SCROLL_DELAY_MS);
        }

        if (walletMap.size >= 5) {
          console.log(`  Found ${walletMap.size} wallets from ${altUrl}`);
          break;
        }
      } catch (e) {
        console.log(`  Failed: ${e.message}`);
      }
    }
  }

  await browser.close();

  // Save results
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const walletsArray = [...walletMap.values()];
  const walletAddresses = [...walletMap.keys()].sort();

  const output = {
    meta: {
      scrapedAt: new Date().toISOString(),
      source: 'axiom.trade',
      totalWallets: walletsArray.length,
      apiCallsCaptured: apiResponses.length,
    },
    wallets: walletsArray,
    apiResponseSamples: apiResponses.slice(0, 5), // keep first few for debugging
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\n========== RESULTS ==========`);
  console.log(`Total wallets: ${walletsArray.length}`);
  console.log(`API calls intercepted: ${apiResponses.length}`);
  console.log(`Saved to: ${OUTPUT_FILE}`);

  if (walletAddresses.length > 0) {
    fs.writeFileSync(WALLETS_FILE, walletAddresses.join('\n') + '\n');
    console.log(`Wallet list: ${WALLETS_FILE} (${walletAddresses.length} wallets)`);

    // Show sample
    console.log(`\nSample wallets:`);
    walletAddresses.slice(0, 10).forEach((w) => console.log(`  ${w}`));
  }

  if (walletsArray.length === 0) {
    console.log(
      '\n⚠  No wallets captured. Check axiom-debug.png for page state.'
    );
    console.log('   The site may require authentication or use a different URL structure.');
    console.log('   Captured API URLs:');
    apiResponses.forEach((r) => console.log(`   - ${r.url}`));
  }
}

/**
 * Recursively traverse a JSON response to find wallet addresses
 * and associated trader data.
 */
function extractWallets(data, walletMap) {
  if (!data) return;

  if (Array.isArray(data)) {
    for (const item of data) {
      extractWallets(item, walletMap);
    }
    return;
  }

  if (typeof data === 'object') {
    // Check if this object looks like a wallet/trader entry
    const addressFields = [
      'wallet_address',
      'walletAddress',
      'address',
      'wallet',
      'account',
      'pubkey',
      'publicKey',
      'public_key',
      'owner',
      'trader',
      'traderAddress',
      'trader_address',
    ];

    for (const field of addressFields) {
      if (data[field] && typeof data[field] === 'string') {
        const addr = data[field];
        // Validate it looks like a Solana address (base58, 32-44 chars)
        if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)) {
          if (!walletMap.has(addr)) {
            walletMap.set(addr, { ...data, wallet_address: addr, source: 'api' });
            console.log(`    + wallet: ${addr.substring(0, 8)}...`);
          } else {
            // Merge any new data
            const existing = walletMap.get(addr);
            walletMap.set(addr, { ...existing, ...data, wallet_address: addr });
          }
        }
      }
    }

    // Recurse into nested objects
    for (const key of Object.keys(data)) {
      if (typeof data[key] === 'object' && data[key] !== null) {
        extractWallets(data[key], walletMap);
      }
    }
  }
}

scrape().catch((err) => {
  console.error('Axiom scraper failed:', err);
  process.exit(1);
});
