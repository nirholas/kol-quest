/**
 * KolScan.io Leaderboard Scraper
 * 
 * Scrapes all KOL wallet data from https://kolscan.io/leaderboard
 * across all timeframes (Daily, Weekly, Monthly) using Playwright
 * to intercept the POST API calls triggered by infinite scroll.
 * 
 * Usage: node scrape.js
 * Output: output/kolscan-leaderboard.json
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'output');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'kolscan-leaderboard.json');
const SCROLL_DELAY_MS = 1500;
const MAX_SCROLLS = 30;
const TIMEFRAMES = ['Daily', 'Weekly', 'Monthly'];

async function scrape() {
  console.log('Starting KolScan leaderboard scraper...\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  const results = [];

  // Intercept all POST responses to /api/leaderboard
  page.on('response', async (r) => {
    if (
      r.url().includes('/api/leaderboard') &&
      r.request().method() === 'POST'
    ) {
      try {
        const json = await r.json();
        if (json.data && json.data.length > 0) {
          results.push(...json.data);
          console.log(
            `  Captured ${json.data.length} entries (total: ${results.length})`
          );
        }
      } catch {}
    }
  });

  // Load the leaderboard page
  console.log('Loading https://kolscan.io/leaderboard ...');
  await page.goto('https://kolscan.io/leaderboard', {
    waitUntil: 'networkidle',
    timeout: 60000,
  });
  await page.waitForTimeout(3000);

  // The infinite scroll component targets #mainScroll, not window
  const hasMainScroll = await page.evaluate(
    () => !!document.getElementById('mainScroll')
  );
  console.log(`Scroll container: ${hasMainScroll ? '#mainScroll' : 'window'}\n`);

  // Scrape each timeframe
  for (let i = 0; i < TIMEFRAMES.length; i++) {
    const tf = TIMEFRAMES[i];

    if (i > 0) {
      // Click the timeframe tab
      console.log(`\nSwitching to ${tf}...`);
      try {
        await page.click(`text=${tf}`);
      } catch {
        console.error(`  Could not click "${tf}" tab, skipping`);
        continue;
      }
      await page.waitForTimeout(2000);
    } else {
      console.log(`Scraping ${tf}...`);
    }

    // Scroll the container to trigger infinite scroll pagination
    const beforeCount = results.length;
    for (let s = 0; s < MAX_SCROLLS; s++) {
      await page.evaluate(() => {
        const el = document.getElementById('mainScroll');
        if (el) el.scrollTop = el.scrollHeight;
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(SCROLL_DELAY_MS);
    }
    console.log(
      `  ${tf}: ${results.length - beforeCount} new entries captured`
    );
  }

  await browser.close();

  // Deduplicate and save
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const uniqueWallets = new Set(results.map((e) => e.wallet_address));

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

  console.log(`\n========== RESULTS ==========`);
  console.log(`Total entries: ${results.length}`);
  console.log(`Unique wallets: ${uniqueWallets.size}`);
  console.log(`Schema: ${Object.keys(results[0] || {}).join(', ')}`);
  console.log(`Saved to: ${OUTPUT_FILE}`);

  // Also save a deduplicated wallet list
  const walletList = [...uniqueWallets].sort();
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'wallets.txt'),
    walletList.join('\n') + '\n'
  );
  console.log(
    `Wallet list: ${path.join(OUTPUT_DIR, 'wallets.txt')} (${walletList.length} wallets)`
  );
}

scrape().catch((err) => {
  console.error('Scraper failed:', err);
  process.exit(1);
});
