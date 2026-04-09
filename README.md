# KolScan Leaderboard Scraper

Scrapes all KOL (Key Opinion Leader) wallet data from [kolscan.io/leaderboard](https://kolscan.io/leaderboard) — including wallet addresses, names, socials, profit, win/loss records across Daily, Weekly, and Monthly timeframes.

## Quick Start

```bash
npm install
npx playwright install chromium
sudo npx playwright install-deps chromium   # Linux only — installs system libs
npm run scrape
```

## Output

```
output/kolscan-leaderboard.json   # Full dataset (all timeframes)
output/wallets.txt                # Deduplicated wallet address list
```

### Schema

| Field | Type | Description |
|-------|------|-------------|
| `wallet_address` | string | Solana wallet address |
| `name` | string | KOL display name |
| `twitter` | string\|null | Twitter/X profile URL |
| `telegram` | string\|null | Telegram channel URL |
| `profit` | number | Profit in SOL |
| `wins` | number | Number of winning trades |
| `losses` | number | Number of losing trades |
| `timeframe` | number | 1 = Daily, 7 = Weekly, 30 = Monthly |

### Sample Entry

```json
{
  "wallet_address": "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o",
  "name": "Cented",
  "telegram": null,
  "twitter": "https://x.com/Cented7",
  "profit": 116.700812423713,
  "wins": 99,
  "losses": 135,
  "timeframe": 1
}
```

---

## How We Reverse-Engineered This

This is a full walkthrough of the process used to figure out how to scrape kolscan.io, from first attempt to working scraper.

### Step 1: Initial Recon

First, we fetched the raw HTML to understand what framework the site uses:

```bash
curl -s 'https://kolscan.io/leaderboard' -o /tmp/kolscan_page.html
head -100 /tmp/kolscan_page.html
```

This revealed Next.js script tags (`/_next/static/chunks/...`), confirming it's a **Next.js** application.

### Step 2: Hunting for API Endpoints

We tried common API patterns with GET requests:

```bash
curl -s -o /dev/null -w "%{http_code}" 'https://kolscan.io/api/leaderboard'   # 400
curl -s -o /dev/null -w "%{http_code}" 'https://kolscan.io/api/kols'           # 400
curl -s -o /dev/null -w "%{http_code}" 'https://kolscan.io/api/v1/leaderboard' # 400
curl -s -o /dev/null -w "%{http_code}" 'https://kolscan.io/api/traders'         # 400
```

All returned **400** — the endpoints exist but reject GET requests. We also found `api.kolscan.io` returns **401** (auth required).

### Step 3: Identifying JS Bundles

We extracted the script chunk URLs from the HTML:

```bash
curl -s 'https://kolscan.io/leaderboard' | grep -oE '"[^"]*/_next/static/chunks/[^"]*"' | head -10
```

This revealed the key chunks, including `app/leaderboard/page-*.js` and shared chunks `184-*.js`, `341-*.js`, etc.

### Step 4: Finding the API Call in Source Code

We searched each JS chunk for `/api/` paths:

```bash
for chunk in 341-*.js 400-*.js 184-*.js 255-*.js; do
  curl -s "https://kolscan.io/_next/static/chunks/${chunk}" | grep -oP '"/api/[^"]*"'
done
```

**Chunk 184** contained the gold:

```
"/api/trades"
"/api/tokens"
"/api/leaderboard"
"/api/data"
```

### Step 5: Extracting the Exact Fetch Call

We pulled the surrounding code context:

```bash
curl -s 'https://kolscan.io/_next/static/chunks/184-*.js' | grep -oP '.{0,200}/api/leaderboard.{0,200}'
```

This revealed the **exact fetch implementation**:

```javascript
fetch("/api/leaderboard", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ timeframe: e, page: t, pageSize: n })
})
```

Key discovery: **It's a POST endpoint**, not GET. Parameters are `timeframe` (1/7/30), `page` (0-indexed), and `pageSize` (50).

### Step 6: Trying Direct POST (Failed)

We tried hitting it directly with curl:

```bash
curl -s -X POST 'https://kolscan.io/api/leaderboard' \
  -H 'Content-Type: application/json' \
  -d '{"timeframe":1,"page":0,"pageSize":50}'
```

Result: **Forbidden**. The API requires a valid browser session — likely Cloudflare or cookie-based protection.

### Step 7: Extracting SSR Data from HTML

We discovered the page server-renders initial data via the `initLeaderboard` React prop:

```bash
curl -s 'https://kolscan.io/leaderboard' | grep -oP '\{[^}]*wallet_address[^}]*\}' | head -10
```

This extracted **616 wallet entries** from the HTML — but only the first page per timeframe (50 each), plus many had missing `timeframe` fields due to regex limitations.

### Step 8: Analyzing the Leaderboard Component

By reading the full `page-*.js` chunk (~14KB), we found:

- **Infinite scroll** uses `react-infinite-scroll-component` targeting `scrollableTarget: "mainScroll"`
- **Timeframes**: `[1, 7, 30]` mapped to Daily/Weekly/Monthly
- **Page size**: hardcoded at 50
- The component fetches more data on scroll via the POST API

### Step 9: Headless Browser Approach

Since the API is protected, we needed a real browser session. First attempt with Puppeteer failed (module not found). We switched to **Playwright**:

```bash
npm install playwright
npx playwright install chromium
sudo npx playwright install-deps chromium  # needed for Linux shared libraries
```

### Step 10: First Playwright Attempt (0 results)

```javascript
// Scrolled window — captured nothing
for (let i = 0; i < 30; i++) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1500);
}
```

**Problem**: The infinite scroll listens on `#mainScroll`, not window. Scrolling the window doesn't trigger pagination.

### Step 11: Working Solution

The fix was scrolling the **correct container**:

```javascript
await page.evaluate(() => {
  const el = document.getElementById('mainScroll');
  if (el) el.scrollTop = el.scrollHeight;
  window.scrollTo(0, document.body.scrollHeight);
});
```

Combined with intercepting the POST responses and switching between timeframe tabs, this captured **all 1,304 entries across 472 unique wallets**.

### Final Result

```
Daily:   434 entries (9 pages × 50 + 34)
Weekly:  435 entries (8 pages × 50 + 35)
Monthly: 435 entries (8 pages × 50 + 35)
─────────────────────────────────────────
Total:   1,304 entries
Unique:  472 wallets
```

### Key Lessons

1. **Check the HTTP method** — this API only accepts POST, not GET
2. **Read the JS source** — minified code still reveals exact API signatures
3. **Protected APIs** require browser sessions — headless browsers solve this
4. **Scroll containers matter** — infinite scroll often binds to a specific element, not `window`
5. **SSR data is free** — Next.js embeds initial page data in HTML as React props
6. **Look at chunk names** — `app/leaderboard/page-*.js` is obviously the leaderboard page code
7. **Shared chunks** like `184-*.js` often contain API helper functions used across multiple pages

## License

MIT
