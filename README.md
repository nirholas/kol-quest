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

---

## Full Wallet List

### Wallets & Socials

| # | Name | Wallet | Twitter | Telegram |
|---|------|--------|---------|----------|
| 1 | Inquixit | `3L8RAx...c1fW` | [inquixit](https://x.com/inquixit) | - |
| 2 | Pikalosi | `9cdZg6...mzqw` | [pikalosi](https://x.com/pikalosi) | [Link](https://t.me/PikalosiCalls) |
| 3 | Idontpaytaxes | `2T5NgD...UNBH` | [untaxxable](https://x.com/untaxxable) | - |
| 4 | zeropnl | `4xY9T1...uMmr` | [im0pnl](https://x.com/im0pnl) | - |
| 5 | Dior | `87rRds...AAxJ` | [Dior100x](https://x.com/Dior100x) | - |
| 6 | 👀 | `Ew6qBU...TceD` | [UniswapVillain](https://x.com/UniswapVillain) | - |
| 7 | Eric Cryptoman | `EgnY4z...MFQW` | [EricCryptoman](https://x.com/EricCryptoman) | [Link](https://t.me/Erics_Calls) |
| 8 | hood | `91sP85...Nod9` | [hoodscall](https://x.com/hoodscall) | - |
| 9 | PattyIce | `6nhskL...W88s` | [patty_fi](https://x.com/patty_fi) | - |
| 10 | sadizmed | `DTdHa4...6meZ` | [sadizmed](https://x.com/sadizmed) | [Link](https://t.me/SadizFig) |
| 11 | Paper | `FwjYcb...V7ft` | [stackppr](https://x.com/stackppr) | - |
| 12 | Xelf | `9Vk7pk...hNMT` | [xelf_sol](https://x.com/xelf_sol) | [Link](https://t.me/xelfalpha) |
| 13 | Lectron | `Gv8YFC...sfcE` | [LectronNFT](https://x.com/LectronNFT) | - |
| 14 | 7 | `FTg1gq...Y27j` | [Soloxbt](https://x.com/Soloxbt) | - |
| 15 | Phineas.SOL | `64ymeD...FikE` | [Phineas_Sol](https://x.com/Phineas_Sol) | [Link](https://t.me/PhineasCabal) |
| 16 | Ricco 🥀 | `7Gi4H4...L9zM` | [RiccoRosas](https://x.com/RiccoRosas) | - |
| 17 | lyftical | `951wq3...46zt` | [lyftical](https://x.com/lyftical) | - |
| 18 | Gh0stee | `2kv8X2...Rva9` | [4GH0STEE](https://x.com/4GH0STEE) | - |
| 19 | CryptoStacksss | `FEGu1i...tv4W` | [CryptoStacksss](https://x.com/CryptoStacksss) | [Link](https://t.me/Stacksendors) |
| 20 | Pavel | `3jckt6...QmuL` | [pavelbtc](https://x.com/pavelbtc) | [Link](http://t.me/pavelcalls) |
| 21 | cuban | `EcVgev...LNk8` | [oCubann](https://x.com/oCubann) | - |
| 22 | Laanie | `37Y6bz...eRt2` | [cryptolaanie](https://x.com/cryptolaanie) | [Link](https://t.me/laaniecalls) |
| 23 | gambles.sol | `Hi5yNv...2mqd` | [mastern0de3](https://x.com/mastern0de3) | [Link](https://t.me/launchlog) |
| 24 | Coler | `99xnE2...LXrs` | [ColerCooks](https://x.com/ColerCooks) | - |
| 25 | Walta | `39q2g5...sGEt` | [Walta61](https://x.com/Walta61) | [Link](https://t.me/waltacalls) |
| 26 | Zachary | `D52tmC...oCW5` | [Zakidge](https://x.com/Zakidge) | - |
| 27 | MACXBT | `ETU3Gy...qGMz` | [00MACXBT](https://x.com/00MACXBT) | [Link](https://t.me/memecoinitalia) |
| 28 | Cowboy🔶BNB | `6EDaVs...UqN3` | [feibo03](https://x.com/feibo03) | - |
| 29 | Pain | `GEpM1S...UXL4` | [ipaincharts](https://x.com/ipaincharts) | [Link](http://t.me/PainofMoney) |
| 30 | Classic | `DsqRyT...fTPE` | [simplyclassic69](https://x.com/simplyclassic69) | [Link](https://t.me/mrclassiccalls) |
| 31 | merky | `ATpSEx...DVYi` | [Merkytrades](https://x.com/Merkytrades) | - |
| 32 | Jdn | `2iPgNg...DtFM` | [JadenOnChain](https://x.com/JadenOnChain) | [Link](http://t.me/jadendegens) |
| 33 | Killua | `95TWoK...oKep` | [cryptokillua99](https://x.com/cryptokillua99) | - |
| 34 | 0xWinged | `HrCPnD...TEng` | [0xExorcized](https://x.com/0xExorcized) | - |
| 35 | jamessmith | `EQaxqK...87zD` | [luckedhub](https://x.com/luckedhub) | - |
| 36 | The Doc | `DYAn4X...hbrt` | [KayTheDoc](https://x.com/KayTheDoc) | [Link](https://t.me/+9OnlKXERe9hkODBh) |
| 37 | dints | `DbRQjQ...qeu3` | [dintsfi](https://x.com/dintsfi) | - |
| 38 | Nyhrox | `6S8Gez...ajKC` | [nyhrox](https://x.com/nyhrox) | - |
| 39 | kitty | `qP3Q8d...8rWU` | [0xkitty69](https://x.com/0xkitty69) | [Link](https://t.me/KittysKasino) |
| 40 | Dan176 | `J2B5fn...oaGM` | [176Dan](https://x.com/176Dan) | [Link](https://t.me/DansCall) |
| 41 | Schoen | `5hAgYC...84zM` | [Schoen_xyz](https://x.com/Schoen_xyz) | - |
| 42 | Preston | `HmtAZQ...JrUz` | [prestonharty](https://x.com/prestonharty) | - |
| 43 | Bottom Seller | `BtUBxH...ATna` | [bottomseller](https://x.com/bottomseller) | - |
| 44 | blixze ♱ | `5vg7he...dpJu` | [blixze](https://x.com/blixze) | - |
| 45 | kitakitsune | `kita97...yaN5` | [kitakitsune](https://x.com/kitakitsune) | [Link](https://t.me/kitabakes) |
| 46 | Numer0 (trench/arc) | `A3W8ps...Q2KJ` | [Numerooo0](https://x.com/Numerooo0) | [Link](https://t.me/fakepumpsbynumer0) |
| 47 | Fozzy | `B9oKse...KK2D` | [fozzycapone](https://x.com/fozzycapone) | - |
| 48 | big bags bobby | `8oQoMh...vRgs` | [bigbagsbobby](https://x.com/bigbagsbobby) | - |
| 49 | Keano | `Ez2jp3...faJN` | [nftkeano](https://x.com/nftkeano) | - |
| 50 | Zef | `EjtQrP...QZp2` | [zefwashere](https://x.com/zefwashere) | [Link](https://t.me/SefaPVP) |
| 51 | J Spizzle | `4z3WtX...4m4A` | [JSpizzleCrypto](https://x.com/JSpizzleCrypto) | - |
| 52 | Yenni | `5B52w1...vyxG` | [Yennii56](https://x.com/Yennii56) | - |
| 53 | Stacker ✝️ | `HbCxe8...kwft` | [Stackeronsol](https://x.com/Stackeronsol) | - |
| 54 | Spike | `FhsSfT...718z` | [NotSpikeG](https://x.com/NotSpikeG) | [Link](http://t.me/Spikescallss) |
| 55 | Zil | `FSAmbD...oXqj` | [zilxbt](https://x.com/zilxbt) | [Link](https://t.me/zilcalls) |
| 56 | orangie | `DuQabF...docy` | [orangie](https://x.com/orangie) | - |
| 57 | BIGWARZ | `7bsTke...HwZ4` | [bigwarzeth](https://x.com/bigwarzeth) | - |
| 58 | Alpha wallet 4 | `6pa2Qn...cQ8g` | [quarsays](https://x.com/quarsays) | [Link](https://t.me/magicalslol) |
| 59 | Meechie | `9iaawV...dUqY` | [973Meech](https://x.com/973Meech) | [Link](https://t.co/zb0ZJIEhEm) |
| 60 | JADAWGS | `3H9LVH...FSEC` | [10xJDOG](https://x.com/10xJDOG) | - |
| 61 | Rasta | `RaSSH7...MqdA` | [rastacowboy2021](https://x.com/rastacowboy2021) | [Link](https://t.me/rastasyard) |
| 62 | flock (6'3) | `F1WT79...PuRM` | [flocko](https://x.com/flocko) | - |
| 63 | Naruza | `ASVzak...ybJk` | [0xNaruza](https://x.com/0xNaruza) | - |
| 64 | DRT 🐂 | `7K7itu...hiL6` | [pepeDRT](https://x.com/pepeDRT) | - |
| 65 | jester | `4s2WzR...T23z` | [thejester](https://x.com/thejester) | - |
| 66 | Scrim | `GBERKN...mTgu` | [mircs](https://x.com/mircs) | - |
| 67 | Hash | `DNsh1U...o8Zj` | [Hashbergers](https://x.com/Hashbergers) | [Link](https://t.me/HashTrades) |
| 68 | peely 🍌 | `BaLxyj...WAPK` | [0xpeely](https://x.com/0xpeely) | [Link](https://t.me/peelystree) |
| 69 | SatsBuyer | `BWQPaF...7XeQ` | [Satsbuyer](https://x.com/Satsbuyer) | [Link](https://t.me/+QuSpUmbxgtszOGI1) |
| 70 | Danny | `9FNz4M...138r` | [0xSevere](https://x.com/0xSevere) | - |
| 71 | Setora | `HTVupc...cLcU` | [Setora__](https://x.com/Setora__) | - |
| 72 | Te' | `8RrMaJ...cZQx` | [TeTheGamer](https://x.com/TeTheGamer) | [Link](https://t.me/trenchwithte) |
| 73 | Rich The Dev | `FCt3Gy...ctPv` | [Piana100x](https://x.com/Piana100x) | [Link](https://t.me/fivepct) |
| 74 | Divix | `FajxNu...SCKp` | [cryptodivix](https://x.com/cryptodivix) | [Link](https://t.me/divixtrades) |
| 75 | Jay | `HwRnKq...vfXE` | [BitBoyJay](https://x.com/BitBoyJay) | - |
| 76 | Toxic weast | `DU323D...jf7k` | [Toxic_weast](https://x.com/Toxic_weast) | [Link](https://t.me/TOXICgambols) |
| 77 | Lowskii (believes) | `41uh7g...x1Gg` | [Lowskii_gg](https://x.com/Lowskii_gg) | [Link](http://t.me/lowskiicooks) |
| 78 | Aymory ⚡️ | `9qdiDG...Pd6N` | [Aymoryfun](https://x.com/Aymoryfun) | [Link](https://t.me/Aymoryfun) |
| 79 | Hermes | `5dzH7g...9vag` | [coinsolmaxi](https://x.com/coinsolmaxi) | - |
| 80 | TMH メタ | `A38dM3...Xg3M` | [thememeshunterx](https://x.com/thememeshunterx) | - |
| 81 | Woozy | `9tRff7...TnAp` | [woozy2so](https://x.com/woozy2so) | - |
| 82 | Padly | `FQEXjV...aiCb` | [Padly1k](https://x.com/Padly1k) | - |
| 83 | Scooter | `9NL6th...jfgo` | [imperooterxbt](https://x.com/imperooterxbt) | - |
| 84 | N’o | `Di75xb...S4ow` | [Nosa1x](https://x.com/Nosa1x) | - |
| 85 | Robo | `4ZdCpH...NtyT` | [roboPBOC](https://x.com/roboPBOC) | [Link](https://t.me/robogems) |
| 86 | trisha | `4Dm3g5...MGmj` | [trishhxy](https://x.com/trishhxy) | - |
| 87 | Trench Guerilla | `9St6ET...j89U` | [trenchguerilla](https://x.com/trenchguerilla) | - |
| 88 | sp | `722tXm...5VTx` | [SolanaPlays](https://x.com/SolanaPlays) | - |
| 89 | prosciutto | `4EsY8H...gk2w` | [prosciuttosol](https://x.com/prosciuttosol) | [Link](http://t.me/prosciuttosol) |
| 90 | Legend | `EgjCS3...VGX3` | [legend_calls](https://x.com/legend_calls) | - |
| 91 | Aroa | `Aen6LK...C4GZ` | [AroaOnSol](https://x.com/AroaOnSol) | [Link](https://t.me/AroasJournal) |
| 92 | MoneyMaykah | `3i8akM...SEk9` | [moneymaykah_](https://x.com/moneymaykah_) | - |
| 93 | goob | `9BkauJ...QaLt` | [goobfarmedyou](https://x.com/goobfarmedyou) | [Link](https://t.me/goobscall) |
| 94 | I̶l̷y̶ | `5XVKfr...Niid` | [ilyunow](https://x.com/ilyunow) | [Link](https://t.me/ilythinks) |
| 95 | ree | `EVCwZr...dYuJ` | [reeotrix](https://x.com/reeotrix) | - |
| 96 | xet | `9yGxZ4...TEUc` | [xet](https://x.com/xet) | - |
| 97 | Frost | `4nwfXw...9k6T` | [FrostBallin](https://x.com/FrostBallin) | - |
| 98 | Guy | `ELNFHk...R2Xx` | [obeyguy](https://x.com/obeyguy) | [Link](http://t.me/richguytrades) |
| 99 | dns | `2DG4vs...Kowr` | [DNS_ERR](https://x.com/DNS_ERR) | [Link](https://t.me/DNS_diary) |
| 100 | Pavlo | `7NnaXg...FxSH` | [pavlotrading](https://x.com/pavlotrading) | - |
| 101 | proh | `FksF9A...FGqA` | [PR0H0S](https://x.com/PR0H0S) | [Link](http://t.me/PR0H0S) |
| 102 | 十九岁绿帽少年🍀 | `DzeSE8...QSkp` | [19ys_GGboy](https://x.com/19ys_GGboy) | [Link](https://t.me/M19yrs1) |
| 103 | Gorilla Capital | `DpNVrt...wD26` | [gorillacapsol](https://x.com/gorillacapsol) | [Link](https://t.me/gorillacapitalcooks) |
| 104 | 0xMistBlade | `14HDbS...6q5x` | [0xMistBlade](https://x.com/0xMistBlade) | - |
| 105 | Chefin | `6Qs6jo...LysH` | [Chefin100x](https://x.com/Chefin100x) | [Link](https://t.me/ChefinAlpha) |
| 106 | Issa | `2BU3NA...JPX2` | [issathecooker](https://x.com/issathecooker) | [Link](https://t.me/issasthoughts) |
| 107 | old | `CA4keX...rzu5` | [old](https://x.com/old) | - |
| 108 | Gake | `DNfuF1...eBHm` | [Ga__ke](https://x.com/Ga__ke) | [Link](https://t.me/GakesBakes) |
| 109 | jitter | `7PuHVA...fCyj` | [jitterxyz](https://x.com/jitterxyz) | - |
| 110 | Pow | `8zFZHu...c7Zd` | [traderpow](https://x.com/traderpow) | [Link](https://t.me/PowsGemCalls) |
| 111 | MERK | `4jFPYS...Pq6X` | [MerkTrading](https://x.com/MerkTrading) | [Link](http://t.me/MerkTradingCalls) |
| 112 | polar | `GL8VLa...FwQG` | [polarsterrr](https://x.com/polarsterrr) | - |
| 113 | Ansem | `AVAZvH...NXYm` | [blknoiz06](https://x.com/blknoiz06) | - |
| 114 | Mezoteric | `EdDCRf...MjA7` | [mezoteric](https://x.com/mezoteric) | - |
| 115 | fa1r | `8ggkt7...67MV` | [fa1rtrade](https://x.com/fa1rtrade) | - |
| 116 | Affu (aura farming) | `BjNueA...1yYJ` | [lethal_affu](https://x.com/lethal_affu) | [Link](https://t.me/affucalls) |
| 117 | profitier | `FbvUU5...d6FB` | [profitierr](https://x.com/profitierr) | - |
| 118 | Burixx 🇮🇹 | `A9aTuB...fXvp` | [Burix_sol](https://x.com/Burix_sol) | [Link](https://t.me/BurixxDegenCorner) |
| 119 | LJC | `6HJetM...USX2` | [OnlyLJC](https://x.com/OnlyLJC) | [Link](https://t.me/LJCcabals) |
| 120 | killz | `9Wagwc...ydUG` | [KillzzSol](https://x.com/KillzzSol) | - |
| 121 | Key | `4Bdn33...uixe` | [w3b3k3y](https://x.com/w3b3k3y) | - |
| 122 | wuzie | `Akht8E...JKeH` | [crypt0wu](https://x.com/crypt0wu) | [Link](https://t.me/wuziemakesmoney) |
| 123 | s0ber | `Hq5TTU...vyae` | [whaIecrypto](https://x.com/whaIecrypto) | - |
| 124 | Connor | `9EyPAM...rUiH` | [Connoreo_](https://x.com/Connoreo_) | - |
| 125 | zoru | `BrT5kY...3sqg` | [zoruuuuu](https://x.com/zoruuuuu) | - |
| 126 | Nach | `9jyqFi...AVVz` | [NachSOL](https://x.com/NachSOL) | [Link](https://t.me/NarrativeNach) |
| 127 | Sully | `Ebk5AT...oex6` | [sullyfromDeets](https://x.com/sullyfromDeets) | [Link](https://t.me/kitchenofsully) |
| 128 | Qtdegen | `7tiRXP...6RLA` | [qtdegen](https://x.com/qtdegen) | - |
| 129 | Rektober | `3cG7d6...GtG5` | [rektober](https://x.com/rektober) | [Link](https://t.me/RektNFA) |
| 130 | waste management | `D2aXNm...cUmj` | [wastemanagem3nt](https://x.com/wastemanagem3nt) | [Link](https://t.me/managingwaste) |
| 131 | Fabix | `DN7pYL...redr` | [Fabix_R](https://x.com/Fabix_R) | [Link](https://t.me/FabixAlpha) |
| 132 | Ferb | `m7Kaas...YuF7` | [ferbsol](https://x.com/ferbsol) | - |
| 133 | Dolo | `5wcc13...Tuo3` | [doloxbt](https://x.com/doloxbt) | [Link](https://t.me/DolosTradingDojo) |
| 134 | Polly | `HtvLcC...vWMm` | [0xsushi](https://x.com/0xsushi) | [Link](https://t.me/WildyJournals) |
| 135 | Sue | `AXwssg...EgAH` | [sue_xbt](https://x.com/sue_xbt) | [Link](https://t.me/sues_degenjournal) |
| 136 | YOUNIZ | `DVM5U7...bHUa` | [YOUNIZ_XLZ](https://x.com/YOUNIZ_XLZ) | - |
| 137 | i gamble your yearly salary | `KJXB1o...ftvY` | [aightbet](https://x.com/aightbet) | - |
| 138 | Terp | `HkFt55...8Pwz` | [OnlyTerp](https://x.com/OnlyTerp) | - |
| 139 | Prada | `gkNNf4...yCkB` | [0xPradaa](https://x.com/0xPradaa) | - |
| 140 | Ramset ✟ | `71PCu3...9UtQ` | [Ramsetx](https://x.com/Ramsetx) | - |
| 141 | quant | `Fi2hrx...NgCn` | [quantgz](https://x.com/quantgz) | - |
| 142 | Insentos | `7SDs3P...seHS` | [insentos](https://x.com/insentos) | [Link](https://t.me/insentos) |
| 143 | zync (锌仔) | `zyncUi...5ART` | [zyncxbt](https://x.com/zyncxbt) | - |
| 144 | mog | `EtuuyC...of3t` | [10piecedawg](https://x.com/10piecedawg) | - |
| 145 | TheDefiApe | `ExKCuo...wQM4` | [TheDefiApe](https://x.com/TheDefiApe) | [Link](https://t.me/DEFIAPEALERTS) |
| 146 | DJ.Σn | `Cxe1d5...3bge` | [thisisdjen](https://x.com/thisisdjen) | [Link](http://t.me/djeninfo) |
| 147 | BagCalls | `4AHgEk...4G5H` | [BagCalls](https://x.com/BagCalls) | [Link](https://t.me/bagcalls) |
| 148 | el charto | `CCUcje...JF7w` | [elchartox](https://x.com/elchartox) | [Link](https://t.me/ChartoCartel) |
| 149 | Jack Duval🌊 | `BAr5cs...XJPh` | [jackduvalstocks](https://x.com/jackduvalstocks) | - |
| 150 | Zeek | `DUTpdj...kC6T` | [zeekbased](https://x.com/zeekbased) | - |
| 151 | Saif | `BuhkHh...xCdW` | [degensaif](https://x.com/degensaif) | - |
| 152 | Yokai Ryujin | `2w3zDW...igTs` | [YokaiCapital](https://x.com/YokaiCapital) | - |
| 153 | yeekidd | `88e2kB...ySWJ` | [yeekiddd](https://x.com/yeekiddd) | - |
| 154 | ShockedJS | `6m5sW6...9rAF` | [ShockedJS](https://x.com/ShockedJS) | [Link](https://t.me/shockedjstrading) |
| 155 | Oura | `4WPTQA...VfQw` | [Oura456](https://x.com/Oura456) | [Link](https://t.me/OuraEmergencyCalls) |
| 156 | Lynk | `CkPFGv...u7xD` | [lynk0x](https://x.com/lynk0x) | [Link](https://t.me/lynkscabal) |
| 157 | Monarch | `4uTeAz...Aiyu` | [MonarchBTC](https://x.com/MonarchBTC) | [Link](https://t.me/MonarchJournal) |
| 158 | Insyder | `G3g1CK...Zygk` | [insydercrypto](https://x.com/insydercrypto) | - |
| 159 | Zinc | `EBjXst...bjru` | [zinceth](https://x.com/zinceth) | [Link](https://t.me/zincalpha) |
| 160 | Lyxe | `HLv6yC...Sek1` | [cryptolyxe](https://x.com/cryptolyxe) | [Link](https://t.me/+yFy-8j3uwBBjMzhl) |
| 161 | Seee | `9EfTig...8pTk` | [tstar_frr1](https://x.com/tstar_frr1) | - |
| 162 | CC2 | `B3beyo...pnoS` | [CC2Ventures](https://x.com/CC2Ventures) | - |
| 163 | Spuno | `GfXQes...hzPH` | [spunosounds](https://x.com/spunosounds) | - |
| 164 | 🇩🇴 Jerry | `GmDXqH...zNBj` | [0xJrmm](https://x.com/0xJrmm) | - |
| 165 | Brox | `7VBTpi...HNnn` | [ohbrox](https://x.com/ohbrox) | [Link](https://t.me/broxcalls) |
| 166 | 0xJumpman | `8eioZu...viuE` | [0xjumpman](https://x.com/0xjumpman) | - |
| 167 | Chris ☕️ | `CtUzwA...MiMx` | [ChrisCoffeeEth](https://x.com/ChrisCoffeeEth) | - |
| 168 | Jakey | `B8kdog...XB64` | [SolJakey](https://x.com/SolJakey) | - |
| 169 | kilo | `kiLogf...E49u` | [kilorippy](https://x.com/kilorippy) | - |
| 170 | Pullup 🗡️🧣✨ | `65paNE...SQuE` | [pullupso](https://x.com/pullupso) | - |
| 171 | Fawcette | `JBTJAk...GnEm` | [Fawcette_](https://x.com/Fawcette_) | - |
| 172 | para | `uS74ri...VhVp` | [paradilf](https://x.com/paradilf) | - |
| 173 | Little Mustacho 🐕 | `Huk3Ku...3m8f` | [littlemustacho](https://x.com/littlemustacho) | [Link](https://t.me/LittleMustachoCalls) |
| 174 | Bobby | `DBmRHN...XYSC` | [retardmode](https://x.com/retardmode) | - |
| 175 | GVQ | `GVQtcY...jMkF` | [GVQ_xx](https://x.com/GVQ_xx) | - |
| 176 | Jordan | `EAnB51...9T5J` | [ohFrostyyy](https://x.com/ohFrostyyy) | - |
| 177 | Bolivian | `5AyJw1...Qrw8` | [_bolivian](https://x.com/_bolivian) | [Link](http://t.me/boliviantrades) |
| 178 | Carti The Menace | `3mPypx...77qe` | [CartiTheMenace](https://x.com/CartiTheMenace) | - |
| 179 | Angi | `AGnd5W...iCLu` | [angitradez](https://x.com/angitradez) | [Link](https://t.me/angiscalls) |
| 180 | Value & Time | `3nvC8c...izVX` | [valueandtime](https://x.com/valueandtime) | - |
| 181 | Dutch | `9vWutd...5yFA` | [0xDutch_](https://x.com/0xDutch_) | - |
| 182 | Hustler | `HUS9Er...SK9U` | [JoeVargas](https://x.com/JoeVargas) | [Link](https://t.me/hustlersalpha) |
| 183 | Rev | `EgzjRC...2BZm` | [solrevv](https://x.com/solrevv) | - |
| 184 | .exe | `42nsEk...PV2g` | [itoptick](https://x.com/itoptick) | [Link](https://t.me/exejournal) |
| 185 | Jalen | `F72vY9...w6qL` | [RipJalens](https://x.com/RipJalens) | - |
| 186 | Sabby | `9K18Ms...gh6g` | [sabby_eth](https://x.com/sabby_eth) | - |
| 187 | Mitch | `4Be9Cv...ha7t` | [idrawline](https://x.com/idrawline) | [Link](https://t.me/whimsicalclown) |
| 188 | Rizz | `BPWsae...91tT` | [sollrizz](https://x.com/sollrizz) | - |
| 189 | Collectible | `Ehqd8q...Upg3` | [collectible](https://x.com/collectible) | - |
| 190 | cxltures | `3ZtwP8...qnAJ` | [cxlturesvz](https://x.com/cxlturesvz) | - |
| 191 | Michi | `8YYDiC...4pwh` | [michibets](https://x.com/michibets) | - |
| 192 | evening | `E7gozE...8o4S` | [eveningbtc](https://x.com/eveningbtc) | - |
| 193 | Obijai | `5dhKiV...oANw` | [Obijai](https://x.com/Obijai) | - |
| 194 | shaka | `4S8YBC...UuHA` | [solanashaka](https://x.com/solanashaka) | [Link](https://t.me/shakasisland) |
| 195 | aloh | `FGVjsm...SWtH` | [alohquant](https://x.com/alohquant) | [Link](https://t.me/alohcooks) |
| 196 | Fuzz | `FUZZUh...Z85t` | [slfuzz](https://x.com/slfuzz) | - |
| 197 | ִֶָ | `B57ChV...4VY2` | [fshmatt](https://x.com/fshmatt) | [Link](https://t.me/fullstackhitler) |
| 198 | RUSKY 🪬⚡️ | `J4rYYP...dvc4` | [CryDevil23](https://x.com/CryDevil23) | [Link](https://t.me/cryptorusky) |
| 199 | kyz | `72YiE4...Lqsm` | [kyzenill](https://x.com/kyzenill) | - |
| 200 | Noah | `6DwBGY...Jtw4` | [Noahhcalls](https://x.com/Noahhcalls) | [Link](https://t.me/noahhcalls) |
| 201 | Achi | `FPx2Ba...xCra` | [AchillesXBT](https://x.com/AchillesXBT) | - |
| 202 | asta | `AstaWu...V6JL` | [astaso1](https://x.com/astaso1) | - |
| 203 | Al4n | `2YJbcB...MymV` | [Al4neu](https://x.com/Al4neu) | - |
| 204 | fomo 🧠 | `9FEHWF...VSnH` | [fomomofosol](https://x.com/fomomofosol) | - |
| 205 | deecayz ⌐◨-◨ | `Dv32u9...ysZY` | [deecayz](https://x.com/deecayz) | [Link](https://t.me/summerprinter) |
| 206 | 0xBossman | `BjYxVF...3bXZ` | [0xBossman](https://x.com/0xBossman) | [Link](http://t.me/BossmanCallsOfficial) |
| 207 | iconXBT | `2Fbbtm...bftM` | [iconXBT](https://x.com/iconXBT) | - |
| 208 | yassir | `HFx9E1...LLSs` | [yassirwtf](https://x.com/yassirwtf) | - |
| 209 | woopig🧙🏻‍♂️ | `9Bs2Xg...byPD` | [crypto_woopig](https://x.com/crypto_woopig) | [Link](https://t.me/woopigschannel) |
| 210 | sarah milady | `AAMnoN...6ccg` | [saracrypto_eth](https://x.com/saracrypto_eth) | [Link](https://t.me/Solana100xhunt) |
| 211 | eq | `7w7f4P...gdzq` | [404flipped](https://x.com/404flipped) | - |
| 212 | R💫WDY | `DKgvpf...yciK` | [RowdyCrypto](https://x.com/RowdyCrypto) | [Link](https://t.me/CryptoUpdates) |
| 213 | Maurits | `274vmG...2nD6` | [mauritsneo](https://x.com/mauritsneo) | [Link](https://t.me/mauritsfree) |
| 214 | Dolo 🥷 | `EeSx4w...zgZh` | [Dolonomix](https://x.com/Dolonomix) | [Link](https://t.me/DolosColdCalls) |
| 215 | Fizzwick Bramblewhistle | `3pcmVZ...6oS1` | [fizzwickBW](https://x.com/fizzwickBW) | - |
| 216 | Nils😈 | `FkL99x...FfW3` | [nilsthedegen](https://x.com/nilsthedegen) | [Link](https://t.me/nilshouse) |
| 217 | zurh | `HYgRa7...TKJD` | [zurhxbt](https://x.com/zurhxbt) | - |
| 218 | Fwasty | `J15mCw...5q1g` | [Fwasty](https://x.com/Fwasty) | - |
| 219 | Dedmeow5 | `9THzoX...RnqE` | [dedmeow5](https://x.com/dedmeow5) | [Link](https://t.me/nicotinelounge) |
| 220 | Charlie | `14k7D9...ypgz` | [Charlduyomeme](https://x.com/Charlduyomeme) | - |
| 221 | JinMu | `8tP391...2PRP` | [LongzuAlpha](https://x.com/LongzuAlpha) | [Link](https://t.me/jinmucall) |
| 222 | Nuotrix | `Aa5Lyc...wc2Q` | [Nuotrix](https://x.com/Nuotrix) | - |
| 223 | Dragon | `6SYhd6...SH4r` | [DragonOnSol](https://x.com/DragonOnSol) | - |
| 224 | Iced | `DrJ6Sn...Sd5o` | [IcedKnife](https://x.com/IcedKnife) | [Link](https://t.me/houseofdegeneracy) |
| 225 | Crypto Chef | `EbSjMK...JiCJ` | [TheCryptoChefX](https://x.com/TheCryptoChefX) | [Link](https://t.me/CryptoChefCooks) |
| 226 | lucky flash | `2vXMy7...4Ro4` | [flashcashy](https://x.com/flashcashy) | - |
| 227 | Yugi | `4TCMpx...p66B` | [CryptoYugi0](https://x.com/CryptoYugi0) | - |
| 228 | eezzyLIVE 🧸 | `DiDbxf...HNjN` | [notEezzy](https://x.com/notEezzy) | [Link](http://t.me/eezzyjournal) |
| 229 | zhynx | `zhYnXq...AHkL` | [onlyzhynx](https://x.com/onlyzhynx) | [Link](http://t.me/zhynxjournal) |
| 230 | nich | `nichQ7...fYas` | [nichxbt](https://x.com/nichxbt) | - |
| 231 | Frags | `2yoJib...UFHS` | [cryptofrags](https://x.com/cryptofrags) | - |
| 232 | ItsVine | `ztRg1P...ohSv` | [ItsVineSOL](https://x.com/ItsVineSOL) | - |
| 233 | Rice | `CWvdyv...C8ou` | [Ricecooker38](https://x.com/Ricecooker38) | - |
| 234 | KennyLoaded | `3BEtHG...ac7E` | [KennyLoaded](https://x.com/KennyLoaded) | - |
| 235 | Storm | `EYBMFf...mtAy` | [StormsTrades](https://x.com/StormsTrades) | - |
| 236 | Baraka | `CUKFKd...nCnw` | [baraka_wins](https://x.com/baraka_wins) | [Link](https://t.me/Jan_Cook) |
| 237 | denzaa | `4X199P...vCA8` | [denzzaaa](https://x.com/denzzaaa) | - |
| 238 | arnz | `2G6CNJ...NtiJ` | [arnzxbt](https://x.com/arnzxbt) | [Link](https://t.me/xbtarnz) |
| 239 | Canis | `AzXDG1...mSAo` | [Canissolana](https://x.com/Canissolana) | - |
| 240 | ⚫️ | `13gj9s...LkzG` | [jo5htheboss](https://x.com/jo5htheboss) | - |
| 241 | Iz | `FH6jdK...GMUg` | [IzCryptoG](https://x.com/IzCryptoG) | [Link](https://t.me/IzAlphaCalls) |
| 242 | milito | `EeXvxk...zumH` | [fnmilito](https://x.com/fnmilito) | - |
| 243 | voyage | `BJeWdz...fdQJ` | [voyage940](https://x.com/voyage940) | - |
| 244 | GK | `GxifJq...pEmV` | [Ygktgk](https://x.com/Ygktgk) | [Link](http://t.me/Ygktgk) |
| 245 | neko ≈💧🌸 | `7EQjTH...8jv2` | [n_ekox](https://x.com/n_ekox) | - |
| 246 | Lunar cipher | `EtVEeq...kqhc` | [Lunarc1pher](https://x.com/Lunarc1pher) | [Link](https://t.me/lunarsvault) |
| 247 | Jays | `By5huc...ReTj` | [JaysOnEBT](https://x.com/JaysOnEBT) | - |
| 248 | Niners | `2RyUYq...YS1p` | [Niners](https://x.com/Niners) | - |
| 249 | Exploitz | `F5Tw3a...tAEB` | [exploitzonsol](https://x.com/exploitzonsol) | - |
| 250 | Lockiner | `ErhZ8c...GB5p` | [lockiner](https://x.com/lockiner) | - |
| 251 | Sugus | `2octNb...hv3t` | [SugusTrader](https://x.com/SugusTrader) | - |
| 252 | Basel de’ Medici | `8vPVTT...157t` | [bassel_amin](https://x.com/bassel_amin) | - |
| 253 | LUKEY ✣ | `DjM7Tu...uN7s` | [VERYKOOLLUKEY](https://x.com/VERYKOOLLUKEY) | - |
| 254 | dints | `3PWGw2...pDwU` | [dintsfi](https://x.com/dintsfi) | - |
| 255 | jimmy | `HcpsFY...BicY` | [JIMMYEDGAR](https://x.com/JIMMYEDGAR) | - |
| 256 | bradjae | `8Dg8J8...f7eV` | [bradjae](https://x.com/bradjae) | - |
| 257 | Cesco.Sol | `7wr4Hf...Mdo4` | [Cesco_Sol](https://x.com/Cesco_Sol) | [Link](https://t.me/Cescone93) |
| 258 | AdamJae | `4xUEz1...UeBy` | [Adam_JAE](https://x.com/Adam_JAE) | - |
| 259 | Crypto Pirate | `8mp548...vRxV` | [Crypt0Pirate_](https://x.com/Crypt0Pirate_) | [Link](https://t.me/TheCryptoPirateBay) |
| 260 | maybe | `Gp9W8Q...wKb7` | [marekeacc](https://x.com/marekeacc) | [Link](https://t.me/maybbtc) |
| 261 | appie | `7WaL6o...WAjy` | [appiesol_](https://x.com/appiesol_) | - |
| 262 | ocr | `3MNu91...yaqt` | [ocrxa](https://x.com/ocrxa) | - |
| 263 | Nikolas (aura arc) | `iPUp3q...Ne6C` | [ArcNikolas](https://x.com/ArcNikolas) | [Link](https://t.me/nikolasapes) |
| 264 | Kaaox | `GPryzR...ayNh` | [xKaaox](https://x.com/xKaaox) | - |
| 265 | 7xNickk | `AmofvG...FVtf` | [7xNickk](https://x.com/7xNickk) | - |
| 266 | Levis | `GwoFJF...gZ1R` | [LevisNFT](https://x.com/LevisNFT) | [Link](https://t.me/LevisAlpha) |
| 267 | Pocket Hitlers | `9RrKUh...FBj9` | [pockethitlers](https://x.com/pockethitlers) | - |
| 268 | Rilsio | `4fZFcK...ZMHu` | [CryptoRilsio](https://x.com/CryptoRilsio) | [Link](https://t.me/rilsio) |
| 269 | Yami 𓃵 | `7Js5gm...nyVm` | [YamiPNL](https://x.com/YamiPNL) | - |
| 270 | Ray | `HvNqQB...h16W` | [23slyy](https://x.com/23slyy) | - |
| 271 | Chairman ² | `Be24Gb...nRR6` | [Chairman_DN](https://x.com/Chairman_DN) | - |
| 272 | Exy | `8hKZKq...HTe1` | [eth_exy](https://x.com/eth_exy) | - |
| 273 | dyor ( revenge arc ) | `AVmFMb...j3Gq` | [dyorwgmi](https://x.com/dyorwgmi) | [Link](http://t.me/dyormind) |
| 274 | Unipcs (aka 'Bonk Guy') | `5M8ACG...QW3Y` | [theunipcs](https://x.com/theunipcs) | - |
| 275 | Toz | `Fza6jH...Era9` | [Cryptoze](https://x.com/Cryptoze) | [Link](https://t.me/Cryptoze0) |
| 276 | jazz | `3wDWKh...yRKg` | [youngjazzeth](https://x.com/youngjazzeth) | - |
| 277 | Win All Day | `Gtg4qS...G5C2` | [winallday_](https://x.com/winallday_) | - |
| 278 | Roxo | `AE3tJD...ZbSa` | [ignRoxo](https://x.com/ignRoxo) | - |
| 279 | PRINCESS | `6vZenw...nPoZ` | [lifebyprincess](https://x.com/lifebyprincess) | [Link](http://t.me/lifebyprincess) |
| 280 | fawi | `A3JBfM...9Qn7` | [freakyfawi](https://x.com/freakyfawi) | - |
| 281 | Donuttcrypto | `3wjyaS...vnmz` | [donuttcrypto](https://x.com/donuttcrypto) | [Link](https://t.me/donuttcryptocalls) |
| 282 | Ron | `8JuRx7...6Ehn` | [ronpf_](https://x.com/ronpf_) | - |
| 283 | Rozer | `4hGiRi...kvoK` | [Rozer_](https://x.com/Rozer_) | [Link](http://t.me/rozeralpha) |
| 284 | nad | `363sqM...XuaT` | [NADGEMS](https://x.com/NADGEMS) | [Link](https://t.me/NADSGEMS) |
| 285 | Fey | `B6Jx8R...aHni` | [fey_xbt](https://x.com/fey_xbt) | - |
| 286 | Boru | `3rwzJN...6Lu2` | [boru_crypto](https://x.com/boru_crypto) | [Link](https://t.me/boru_insider) |
| 287 | guappy | `3TsRAE...FKSq` | [guappy_eth](https://x.com/guappy_eth) | - |
| 288 | ChartFu | `7i7vHE...8iY2` | [ChartFuMonkey](https://x.com/ChartFuMonkey) | - |
| 289 | buka ᚠ ᛏ ᚲ | `8T1HF5...fg55` | [bukasphere](https://x.com/bukasphere) | [Link](https://t.me/bukasaurt) |
| 290 | Mr. Frog | `4Ddrfi...9nNh` | [TheMisterFrog](https://x.com/TheMisterFrog) | [Link](https://t.me/misterfrogofficial) |
| 291 | trav 🎒 | `CXnf4T...e99m` | [travonsol](https://x.com/travonsol) | [Link](https://t.me/travjournal) |
| 292 | B* | `3wZ6Mf...G6jk` | [BeezyScores](https://x.com/BeezyScores) | - |
| 293 | boogie | `75oEqX...ug5i` | [boogiepnl](https://x.com/boogiepnl) | - |
| 294 | Thurston (zapped arc) | `ALauG4...31wE` | [itsthurstxn](https://x.com/itsthurstxn) | - |
| 295 | Owl | `A5uxHm...vjH4` | [OwlFN_](https://x.com/OwlFN_) | - |
| 296 | printer | `Bu8iZs...nMXA` | [prxnterr](https://x.com/prxnterr) | - |
| 297 | Bronsi | `4ud45n...n2JW` | [Bronsicooks](https://x.com/Bronsicooks) | [Link](https://t.me/Bronsisinsiderinfo) |
| 298 | staticc | `9pgKiU...Vqk6` | [staticctrades](https://x.com/staticctrades) | - |
| 299 | Sweep | `GP9PyT...empH` | [0xSweep](https://x.com/0xSweep) | [Link](https://t.me/jsdao) |
| 300 | dingaling | `9X5n5i...zFHa` | [dingalingts](https://x.com/dingalingts) | - |
| 301 | Don | `winkAC...gXLu` | [doncaarbon](https://x.com/doncaarbon) | [Link](https://t.me/dontrenches) |
| 302 | Sizeab1e | `AtmeWw...fm8p` | [sizeab1e](https://x.com/sizeab1e) | [Link](https://t.me/thetradingcorps) |
| 303 | oscar | `AeLb2R...1FHx` | [oscarexitliq](https://x.com/oscarexitliq) | - |
| 304 | JB | `7dP8Dm...cqCu` | [Jeetburner](https://x.com/Jeetburner) | - |
| 305 | Enjooyer | `Enjoy9...dyWm` | [0xEnjooyer](https://x.com/0xEnjooyer) | - |
| 306 | LilMoonLambo | `GJyhzL...7W8B` | [LilMoonLambo](https://x.com/LilMoonLambo) | - |
| 307 | Solstice | `GrD2um...eaDN` | [The__Solstice](https://x.com/The__Solstice) | [Link](https://t.me/solsticesmoonshots) |
| 308 | Hail | `HA1L7G...wPuB` | [ignHail](https://x.com/ignHail) | - |
| 309 | Jeets | `D1H83u...3m5t` | [ieatjeets](https://x.com/ieatjeets) | - |
| 310 | Daumen | `8MaVa9...88D5` | [daumenxyz](https://x.com/daumenxyz) | - |
| 311 | FINN | `BTeqNy...faom` | [finnbags](https://x.com/finnbags) | - |
| 312 | Thesis ✍️ | `5S9qzJ...K9G7` | [Theeesis](https://x.com/Theeesis) | - |
| 313 | Eddy 💹🧲 | `DuGezK...QHjx` | [EddyMetaX](https://x.com/EddyMetaX) | [Link](https://t.me/MrEduTrades) |
| 314 | Megz 🦉 | `CECN4B...55Du` | [DeltaXtc](https://x.com/DeltaXtc) | - |
| 315 | Damian Prosalendis | `AEeJUP...kJMX` | [DamianProsa](https://x.com/DamianProsa) | [Link](http://t.me/prosacalls) |
| 316 | Latuche | `GJA1HE...SU65` | [Latuche95](https://x.com/Latuche95) | - |
| 317 | Inside Calls | `4NtyFq...ax9a` | [insidecalls](https://x.com/insidecalls) | [Link](http://t.me/callsfromwithin) |
| 318 | storm | `Dxudj2...rRNh` | [stormtradez](https://x.com/stormtradez) | [Link](http://t.me/stormcooks) |
| 319 | Dusty | `B799XD...YFdR` | [guidustyy](https://x.com/guidustyy) | [Link](https://t.me/dustycalls) |
| 320 | narc | `CxgPWv...eGve` | [narracanz](https://x.com/narracanz) | - |
| 321 | Bastille | `3kebnK...yPzV` | [BastilleBtc](https://x.com/BastilleBtc) | - |
| 322 | racks | `CM1dn5...p17g` | [rackstm_](https://x.com/rackstm_) | - |
| 323 | gr3g | `J23qr9...7wsA` | [gr3gor14n](https://x.com/gr3gor14n) | - |
| 324 | dxrnelljcl | `3jzHjo...dioT` | [dxrnell](https://x.com/dxrnell) | - |
| 325 | set | `62N1K5...EtuR` | [Setuhx](https://x.com/Setuhx) | - |
| 326 | psykø | `FC3nyV...P7c4` | [psykogem](https://x.com/psykogem) | - |
| 327 | Bluey | `6TAHDM...umyK` | [Blueycryp](https://x.com/Blueycryp) | - |
| 328 | Junior | `3tnzEg...F2qP` | [Junior_dot_](https://x.com/Junior_dot_) | - |
| 329 | bruce | `4xHGhy...dBPR` | [onchainscammer](https://x.com/onchainscammer) | - |
| 330 | EvansOfWeb | `5RQEcW...crwo` | [EvansOfWeb3](https://x.com/EvansOfWeb3) | - |
| 331 | mercy | `F5jWYu...MYjt` | [mercularx](https://x.com/mercularx) | - |
| 332 | Banf | `Fv8byB...Xn1d` | [BanfSol](https://x.com/BanfSol) | - |
| 333 | Mak | `3SU8wj...ttzr` | [MakXBT](https://x.com/MakXBT) | [Link](https://t.me/MaksJournal) |
| 334 | Jookiaus | `jsjsxP...ZUsb` | [JookCrypto](https://x.com/JookCrypto) | - |
| 335 | dash | `4ESzFZ...EAau` | [dashcrypto_](https://x.com/dashcrypto_) | - |
| 336 | unprofitable | `DYmsQu...TPNF` | [exitliquid1ty](https://x.com/exitliquid1ty) | - |
| 337 | Zemrics | `EP5mvf...pDvG` | [Zemrics](https://x.com/Zemrics) | - |
| 338 | wizard | `DwCp9G...icWf` | [w1zar9](https://x.com/w1zar9) | - |
| 339 | rambo | `2net6e...CiWz` | [goatedondsticks](https://x.com/goatedondsticks) | - |
| 340 | fl0wjoe | `9v9Xsx...Pe9R` | [fl0wjoe](https://x.com/fl0wjoe) | - |
| 341 | CookDoc | `Dvbv5T...UaRv` | [CookDoc1993](https://x.com/CookDoc1993) | - |
| 342 | Heyitsyolo | `Av3xWH...L9YQ` | [Heyitsyolotv](https://x.com/Heyitsyolotv) | - |
| 343 | Matt | `3bzaJd...1n1f` | [MattFws](https://x.com/MattFws) | - |
| 344 | bilo | `7sA5em...akhh` | [chargememan](https://x.com/chargememan) | - |
| 345 | Coasty | `CATk62...g3nB` | [coasty_sol](https://x.com/coasty_sol) | - |
| 346 | Hueno | `FWAmTV...Gu59` | [HuenoZ](https://x.com/HuenoZ) | [Link](https://t.me/HuenosTaxEvaders) |
| 347 | decu | `4vw54B...9Ud9` | [notdecu](https://x.com/notdecu) | [Link](https://t.me/DecusCalls) |
| 348 | Mike | `A8i6J8...sXzw` | [mike8pump](https://x.com/mike8pump) | - |
| 349 | OGAntD | `215nhc...gQjP` | [0GAntD](https://x.com/0GAntD) | - |
| 350 | Boomer | `4JyenL...Xudh` | [boomerbuilds](https://x.com/boomerbuilds) | - |
| 351 | Beaver | `GM7Hrz...8NvN` | [beaverd](https://x.com/beaverd) | - |
| 352 | Sebi | `DxwDRW...n5mc` | [limpcritisism](https://x.com/limpcritisism) | - |
| 353 | Lucas | `6uwzmi...dU2M` | [LockedInLucas](https://x.com/LockedInLucas) | [Link](https://t.me/frontruncalls) |
| 354 | S | `ApRnQN...Hdz1` | [runitbackghost](https://x.com/runitbackghost) | - |
| 355 | Rem | `3pfqeb...CbtK` | [yeaitsrem](https://x.com/yeaitsrem) | - |
| 356 | Zoke | `6MrVEE...pobM` | [z0ke](https://x.com/z0ke) | - |
| 357 | King | `69z4qT...m2JS` | [thekryptoking_](https://x.com/thekryptoking_) | - |
| 358 | Tally ꨄ︎ | `JAmx4W...M8h9` | [tallxyyy](https://x.com/tallxyyy) | [Link](https://t.me/Tallxybunker) |
| 359 | Veloce | `2W14ah...uvP3` | [VeloceSVJ](https://x.com/VeloceSVJ) | - |
| 360 | fz7 | `G2mgnz...CvR4` | [fz7](https://x.com/fz7) | - |
| 361 | Dex | `mW4PZB...gTsM` | [igndex](https://x.com/igndex) | - |
| 362 | Xanse. | `B9K2wT...UXrh` | [xansey](https://x.com/xansey) | [Link](https://t.me/Xansey_Citadel) |
| 363 | Advyth | `GEKZWL...XnvS` | [Advyth](https://x.com/Advyth) | - |
| 364 | bihoz | `An68XC...J2dE` | [bihozNFTs](https://x.com/bihozNFTs) | - |
| 365 | marker | `CQervC...ntM2` | [m4rk3r](https://x.com/m4rk3r) | - |
| 366 | Solana degen | `9tY7u1...RUr8` | [Solanadegen](https://x.com/Solanadegen) | - |
| 367 | Absol | `BXNiM7...SLWN` | [absolquant](https://x.com/absolquant) | [Link](https://t.me/absolcalls) |
| 368 | Groovy | `34ZEH7...ucMw` | [0xGroovy](https://x.com/0xGroovy) | - |
| 369 | samsrep | `CUHBzS...9P7H` | [samsrepx](https://x.com/samsrepx) | - |
| 370 | Marcell | `FixmSp...w67X` | [MarcellxMarcell](https://x.com/MarcellxMarcell) | [Link](https://t.me/marcellcooks) |
| 371 | crayohla | `GDoG4t...G3aN` | [CrayohlaEU](https://x.com/CrayohlaEU) | - |
| 372 | ozark | `DZAa55...rXam` | [ohzarke](https://x.com/ohzarke) | - |
| 373 | Betman | `BoYHJo...bcGG` | [ImTheBetman](https://x.com/ImTheBetman) | - |
| 374 | Johnson | `J9TYAs...C8MB` | [johnsoncooks101](https://x.com/johnsoncooks101) | - |
| 375 | k4ye | `5fHJsz...zGeV` | [k4yeSol](https://x.com/k4yeSol) | - |
| 376 | slingoor | `6mWEJG...vzXd` | [slingoorio](https://x.com/slingoorio) | [Link](https://t.me/slingdeez) |
| 377 | Grimace | `EA4MXk...MBJr` | [naughtygrimace](https://x.com/naughtygrimace) | - |
| 378 | trunoest | `ardinR...b6AT` | [trunoest](https://x.com/trunoest) | - |
| 379 | Hugo Fartingale | `Au1GUW...LK4i` | [HugoMartingale](https://x.com/HugoMartingale) | - |
| 380 | Netti | `8WN7tk...NYcf` | [Netti_kun](https://x.com/Netti_kun) | [Link](https://t.me/nettikun) |
| 381 | Joji | `525Lue...fXJT` | [metaversejoji](https://x.com/metaversejoji) | [Link](https://t.me/jojiinnercircle) |
| 382 | rise_crypt | `AUEQxh...9E4t` | [rise_crypt](https://x.com/rise_crypt) | [Link](https://t.me/rise_call) |
| 383 | Mazino | `9r1Ben...DL52` | [Mazinotrenches](https://x.com/Mazinotrenches) | [Link](https://t.me/MazinosTower) |
| 384 | saale | `SAALE2...ayQp` | [saale](https://x.com/saale) | - |
| 385 | Ban | `8DGbkG...Ajpn` | [Bancrypto__](https://x.com/Bancrypto__) | - |
| 386 | Roshi 風と | `5JrDgn...gs3w` | [roshi100x](https://x.com/roshi100x) | [Link](https://t.me/prerichplayground) |
| 387 | JB | `JBrYni...14p7` | [JbTheQuant](https://x.com/JbTheQuant) | - |
| 388 | Dali | `CvNiez...k5mB` | [SolanaDali](https://x.com/SolanaDali) | - |
| 389 | peacefuldestroy | `8AtQ4k...venm` | [peacefuldestroy](https://x.com/peacefuldestroy) | - |
| 390 | Putrick | `AVjEtg...oeQN` | [Putrickk](https://x.com/Putrickk) | [Link](https://t.me/cryptoputro) |
| 391 | CoCo | `FqojC2...Maiv` | [CoCoCookerr](https://x.com/CoCoCookerr) | [Link](https://t.me/cococabin) |
| 392 | rez | `FkRN9y...gDuN` | [rezthegreatt](https://x.com/rezthegreatt) | - |
| 393 | juicyfruity | `Cv4JVc...aJSz` | [juicyfruityy2](https://x.com/juicyfruityy2) | - |
| 394 | Sanity | `5ruP87...HYHH` | [Sanity100x](https://x.com/Sanity100x) | - |
| 395 | matsu | `9f5ywd...Wh1p` | [matsu_sol](https://x.com/matsu_sol) | - |
| 396 | Kimba | `7mHqL9...U1d3` | [Kimbazxz](https://x.com/Kimbazxz) | [Link](https://t.me/+fDC7q_ji3PNlNWI1) |
| 397 | bust | `FzVQSz...ZmND` | [IAmAboutToBust](https://x.com/IAmAboutToBust) | [Link](https://t.me/dustsdungeon) |
| 398 | Gasp | `xyzfhx...StB6` | [oh_gasp](https://x.com/oh_gasp) | - |
| 399 | Felix | `3uz65G...j7qn` | [Felixonchain](https://x.com/Felixonchain) | [Link](https://t.me/felixtradez) |
| 400 | ^1s1mple | `AeLaMj...PFe3` | [s1mple_s1mple](https://x.com/s1mple_s1mple) | - |
| 401 | Megga | `H31vEB...dQoU` | [Megga](https://x.com/Megga) | - |
| 402 | kreo | `BCnqsP...dArc` | [kreo444](https://x.com/kreo444) | - |
| 403 | EustazZ | `FqamE7...zrve` | [Eustazzeus](https://x.com/Eustazzeus) | [Link](https://t.me/EustazzCooks) |
| 404 | Sebastian | `3BLjRc...k4Ei` | [Saint_pablo123](https://x.com/Saint_pablo123) | - |
| 405 | Jidn | `3h65Mm...axoE` | [jidn_w](https://x.com/jidn_w) | [Link](https://t.me/JidnLosesMoney) |
| 406 | jakey | `B3JyPD...9jCT` | [jakeyPRMR](https://x.com/jakeyPRMR) | [Link](https://t.me/jakeyjournal) |
| 407 | chester | `PMJA8U...gyYN` | [Chestererer](https://x.com/Chestererer) | - |
| 408 | Ataberk 🧙‍♂️ | `6hcX7f...Lj1U` | [ataberk](https://x.com/ataberk) | - |
| 409 | Reljoo | `FsG3Ba...HpHP` | [Reljoooo](https://x.com/Reljoooo) | - |
| 410 | dv | `BCagck...UPJd` | [vibed333](https://x.com/vibed333) | - |
| 411 | Giann | `GNrmKZ...sHEC` | [Giann2K](https://x.com/Giann2K) | - |
| 412 | Orange | `2X4H5Y...AwQv` | [OrangeSBS](https://x.com/OrangeSBS) | - |
| 413 | Ducky | `ADC1QV...A2ph` | [zXDuckyXz](https://x.com/zXDuckyXz) | - |
| 414 | King Solomon | `DEdEW3...BQDQ` | [0xsolomon](https://x.com/0xsolomon) | [Link](https://t.me/alwaysgems) |
| 415 | TIL | `EHg5Yk...Myaf` | [tilcrypto](https://x.com/tilcrypto) | - |
| 416 | CameXBT | `67SNjk...Uxx6` | [Camexbt](https://x.com/Camexbt) | [Link](https://t.me/CameXBTGroup) |
| 417 | Exotic | `Dwo2kj...ujXC` | [74Exotic](https://x.com/74Exotic) | - |
| 418 | Otta | `As7HjL...SMB5` | [ottabag](https://x.com/ottabag) | [Link](https://t.me/ottabag) |
| 419 | Smokez | `5t9xBN...o8Qz` | [SmokezXBT](https://x.com/SmokezXBT) | - |
| 420 | tech | `5d3jQc...NkuE` | [technoviking46](https://x.com/technoviking46) | - |
| 421 | shah | `7xwDKX...eh7w` | [shahh](https://x.com/shahh) | [Link](https://t.me/shahlito) |
| 422 | Leens | `Leense...VABY` | [leensx100](https://x.com/leensx100) | [Link](https://t.me/leenscooks) |
| 423 | Kev | `BTf4A2...sadd` | [Kevsznx](https://x.com/Kevsznx) | - |
| 424 | Hesi | `FpD6n8...8k4X` | [hesikillaz](https://x.com/hesikillaz) | - |
| 425 | Fashr | `719sfK...qFYz` | [FASHRCrypto](https://x.com/FASHRCrypto) | - |
| 426 | noob mini | `AGqjiv...FYLm` | [noobmini_](https://x.com/noobmini_) | - |
| 427 | West | `JDd3hy...CJPN` | [ratwizardx](https://x.com/ratwizardx) | - |
| 428 | Red | `7ABz8q...hkQ6` | [redwithbag](https://x.com/redwithbag) | [Link](https://t.me/yvlred) |
| 429 | Monki | `53BnNc...Ynsh` | [m0nkicrypto](https://x.com/m0nkicrypto) | [Link](http://t.me/cryptomonki) |
| 430 | cryptovillain26 | `5sNnKu...V7gn` | [cryptovillain26](https://x.com/cryptovillain26) | - |
| 431 | WaiterG | `4cXnf2...Zqj2` | [Waiter1x](https://x.com/Waiter1x) | [Link](https://t.me/Waitercooks) |
| 432 | Flames | `6aXFYX...eWoV` | [FlamesOnSol](https://x.com/FlamesOnSol) | - |
| 433 | Nilla | `j38fhf...Ti4o` | [NillaGurilla](https://x.com/NillaGurilla) | - |
| 434 | Zuki | `922Vvm...ygrG` | [zukiweb3](https://x.com/zukiweb3) | - |
| 435 | Scharo | `4sAUSQ...m5nU` | [XScharo](https://x.com/XScharo) | [Link](http://t.me/ScharoCooks) |
| 436 | Publix | `86AEJE...1EdD` | [Publixplayz](https://x.com/Publixplayz) | - |
| 437 | M A M B A 🧲 | `4nvNc7...5LYh` | [mambatrades_](https://x.com/mambatrades_) | - |
| 438 | Silver | `67Nwfi...zU6U` | [0xSilver](https://x.com/0xSilver) | - |
| 439 | Kadenox | `B32Qbb...JqnC` | [kadenox](https://x.com/kadenox) | - |
| 440 | Art | `CgaA9a...7Rz5` | [ArtCryptoz](https://x.com/ArtCryptoz) | - |
| 441 | Tom | `CEUA7z...qoXJ` | [tdmilky](https://x.com/tdmilky) | - |
| 442 | Henn | `FRbUNv...dyCS` | [henn100x](https://x.com/henn100x) | - |
| 443 | Padre | `4Ff9db...NY4g` | [PadrePrints](https://x.com/PadrePrints) | - |
| 444 | Cooker | `8deJ9x...XhU6` | [CookerFlips](https://x.com/CookerFlips) | [Link](https://t.me/CookersCooks) |
| 445 | Files | `DtjYbZ...g92Y` | [xfilesboy](https://x.com/xfilesboy) | - |
| 446 | Clown | `EDXHdS...8HR8` | [ClownsTrenches](https://x.com/ClownsTrenches) | - |
| 447 | Earl | `F2SuEr...cyWm` | [earlTrades](https://x.com/earlTrades) | - |
| 448 | dov 7 | `8nqtxp...iM3v` | [dovvvv7](https://x.com/dovvvv7) | - |
| 449 | Letterbomb | `BtMBMP...aQtr` | [ihateoop](https://x.com/ihateoop) | - |
| 450 | Dani | `AuPp4Y...yqrf` | [DaniWorldwide](https://x.com/DaniWorldwide) | - |
| 451 | AlxCooks | `89HbgW...mkDi` | [AlxCooks_off](https://x.com/AlxCooks_off) | - |
| 452 | Tuults | `5T229o...mwEP` | [tuults69](https://x.com/tuults69) | [Link](https://t.me/tuults1coma05x) |
| 453 | Zyaf | `F5TjPy...m429` | [0xZyaf](https://x.com/0xZyaf) | [Link](https://t.me/zyafgambles) |
| 454 | Cupsey | `2fg5QD...rx6f` | [Cupseyy](https://x.com/Cupseyy) | - |
| 455 | Casino | `8rvAsD...y7qR` | [casino616](https://x.com/casino616) | [Link](https://t.me/casino_calls) |
| 456 | Mayhem Bot | `BwWK17...de6s` | [pumpfun](https://x.com/pumpfun) | - |
| 457 | Sheep | `78N177...Vkh2` | [imsheepsol](https://x.com/imsheepsol) | - |
| 458 | Limfork.eth | `BQVz7f...PRmB` | [Limfork](https://x.com/Limfork) | [Link](https://t.me/limforkdiary) |
| 459 | xunle | `4YzpSZ...qry8` | [xunle111](https://x.com/xunle111) | - |
| 460 | xander | `B3wagQ...wzMh` | [xandereef](https://x.com/xandereef) | [Link](https://t.me/xanderstrenches) |
| 461 | h14 | `BJXjRq...fMda` | [H14onX](https://x.com/H14onX) | - |
| 462 | prettyover | `2e1w3X...4Vis` | [prettyoverr](https://x.com/prettyoverr) | - |
| 463 | danny | `EaVboa...S2kK` | [cladzsol](https://x.com/cladzsol) | - |
| 464 | Setsu | `2k7Mnf...oLHd` | [Setsu2k](https://x.com/Setsu2k) | [Link](https://t.me/setsutrenching) |
| 465 | Ethan Prosper | `sAdNbe...vzLT` | [pr6spr](https://x.com/pr6spr) | - |
| 466 | Trey | `831yhv...eoEs` | [treysocial](https://x.com/treysocial) | [Link](https://t.me/treystele) |
| 467 | Leck | `98T65w...w3Mp` | [LeckSol](https://x.com/LeckSol) | [Link](https://t.me/LeckSol) |
| 468 | Loopierr | `9yYya3...4jqL` | [Loopierr](https://x.com/Loopierr) | [Link](https://t.me/loopierrsjourney) |
| 469 | Domy | `3LUfv2...2Yww` | [domyxbt](https://x.com/domyxbt) | - |
| 470 | omar | `Dgehc8...YJPJ` | [maghrrebi](https://x.com/maghrrebi) | - |
| 471 | cap | `CAPn1y...UJdw` | [himothy](https://x.com/himothy) | [Link](https://t.me/capskitchen) |
| 472 | bandit | `5B79fM...9q2X` | [bandeez](https://x.com/bandeez) | - |

### Performance

| # | Name | Wallet | Profit (SOL) | Wins | Losses | Win Rate |
|---|------|--------|-------------|------|--------|----------|
| 1 | Inquixit | `3L8RAx...c1fW` | +34.72 | 120 | 439 | 21.5% |
| 2 | Pikalosi | `9cdZg6...mzqw` | +33.73 | 167 | 224 | 42.7% |
| 3 | Idontpaytaxes | `2T5NgD...UNBH` | +32.64 | 103 | 68 | 60.2% |
| 4 | zeropnl | `4xY9T1...uMmr` | +31.38 | 15 | 10 | 60.0% |
| 5 | Dior | `87rRds...AAxJ` | +30.51 | 50 | 58 | 46.3% |
| 6 | 👀 | `Ew6qBU...TceD` | +29.49 | 5 | 22 | 18.5% |
| 7 | Eric Cryptoman | `EgnY4z...MFQW` | +26.97 | 1 | 0 | 100.0% |
| 8 | hood | `91sP85...Nod9` | +25.47 | 67 | 151 | 30.7% |
| 9 | PattyIce | `6nhskL...W88s` | +24.29 | 11 | 6 | 64.7% |
| 10 | sadizmed | `DTdHa4...6meZ` | +24.17 | 12 | 1 | 92.3% |
| 11 | Paper | `FwjYcb...V7ft` | +17.17 | 30 | 114 | 20.8% |
| 12 | Xelf | `9Vk7pk...hNMT` | +16.99 | 7 | 11 | 38.9% |
| 13 | Lectron | `Gv8YFC...sfcE` | +13.83 | 1 | 1 | 50.0% |
| 14 | 7 | `FTg1gq...Y27j` | +13.75 | 5 | 5 | 50.0% |
| 15 | Phineas.SOL | `64ymeD...FikE` | +13.30 | 36 | 63 | 36.4% |
| 16 | Ricco 🥀 | `7Gi4H4...L9zM` | +11.44 | 15 | 23 | 39.5% |
| 17 | lyftical | `951wq3...46zt` | +11.19 | 32 | 79 | 28.8% |
| 18 | Gh0stee | `2kv8X2...Rva9` | +11.06 | 159 | 435 | 26.8% |
| 19 | CryptoStacksss | `FEGu1i...tv4W` | +10.45 | 4 | 9 | 30.8% |
| 20 | Pavel | `3jckt6...QmuL` | +9.42 | 156 | 295 | 34.6% |
| 21 | cuban | `EcVgev...LNk8` | +8.95 | 14 | 35 | 28.6% |
| 22 | Laanie | `37Y6bz...eRt2` | +8.26 | 8 | 2 | 80.0% |
| 23 | gambles.sol | `Hi5yNv...2mqd` | +8.07 | 17 | 22 | 43.6% |
| 24 | Coler | `99xnE2...LXrs` | +7.73 | 200 | 316 | 38.8% |
| 25 | Walta | `39q2g5...sGEt` | +7.68 | 82 | 137 | 37.4% |
| 26 | Zachary | `D52tmC...oCW5` | +6.72 | 58 | 142 | 29.0% |
| 27 | MACXBT | `ETU3Gy...qGMz` | +6.64 | 137 | 249 | 35.5% |
| 28 | Cowboy🔶BNB | `6EDaVs...UqN3` | +6.60 | 212 | 307 | 40.8% |
| 29 | Pain | `GEpM1S...UXL4` | +5.74 | 3 | 6 | 33.3% |
| 30 | Classic | `DsqRyT...fTPE` | +5.21 | 71 | 95 | 42.8% |
| 31 | merky | `ATpSEx...DVYi` | +5.13 | 4 | 10 | 28.6% |
| 32 | Jdn | `2iPgNg...DtFM` | +4.63 | 116 | 190 | 37.9% |
| 33 | Killua | `95TWoK...oKep` | +4.28 | 1 | 0 | 100.0% |
| 34 | 0xWinged | `HrCPnD...TEng` | +4.11 | 4 | 8 | 33.3% |
| 35 | jamessmith | `EQaxqK...87zD` | +3.87 | 77 | 204 | 27.4% |
| 36 | The Doc | `DYAn4X...hbrt` | +3.85 | 53 | 96 | 35.6% |
| 37 | dints | `DbRQjQ...qeu3` | +3.80 | 4 | 0 | 100.0% |
| 38 | Nyhrox | `6S8Gez...ajKC` | +3.75 | 63 | 150 | 29.6% |
| 39 | kitty | `qP3Q8d...8rWU` | +3.65 | 4 | 6 | 40.0% |
| 40 | Dan176 | `J2B5fn...oaGM` | +3.37 | 2 | 3 | 40.0% |
| 41 | Schoen | `5hAgYC...84zM` | +3.36 | 10 | 28 | 26.3% |
| 42 | Preston | `HmtAZQ...JrUz` | +3.29 | 2 | 5 | 28.6% |
| 43 | Bottom Seller | `BtUBxH...ATna` | +3.18 | 10 | 38 | 20.8% |
| 44 | blixze ♱ | `5vg7he...dpJu` | +2.94 | 3 | 7 | 30.0% |
| 45 | kitakitsune | `kita97...yaN5` | +2.93 | 1 | 3 | 25.0% |
| 46 | Numer0 (trench/arc) | `A3W8ps...Q2KJ` | +2.61 | 14 | 17 | 45.2% |
| 47 | Fozzy | `B9oKse...KK2D` | +2.60 | 8 | 15 | 34.8% |
| 48 | big bags bobby | `8oQoMh...vRgs` | +2.45 | 1 | 3 | 25.0% |
| 49 | Keano | `Ez2jp3...faJN` | +2.24 | 6 | 6 | 50.0% |
| 50 | Zef | `EjtQrP...QZp2` | +1.84 | 7 | 21 | 25.0% |
| 51 | J Spizzle | `4z3WtX...4m4A` | +1.78 | 2 | 3 | 40.0% |
| 52 | Yenni | `5B52w1...vyxG` | +1.77 | 32 | 86 | 27.1% |
| 53 | Stacker ✝️ | `HbCxe8...kwft` | +1.70 | 49 | 106 | 31.6% |
| 54 | Spike | `FhsSfT...718z` | +1.70 | 6 | 11 | 35.3% |
| 55 | Zil | `FSAmbD...oXqj` | +1.58 | 13 | 18 | 41.9% |
| 56 | orangie | `DuQabF...docy` | +1.53 | 1 | 0 | 100.0% |
| 57 | BIGWARZ | `7bsTke...HwZ4` | +1.50 | 3 | 8 | 27.3% |
| 58 | Alpha wallet 4 | `6pa2Qn...cQ8g` | +1.48 | 3 | 2 | 60.0% |
| 59 | Meechie | `9iaawV...dUqY` | +1.48 | 134 | 246 | 35.3% |
| 60 | JADAWGS | `3H9LVH...FSEC` | +1.36 | 4 | 3 | 57.1% |
| 61 | Rasta | `RaSSH7...MqdA` | +1.23 | 1 | 3 | 25.0% |
| 62 | flock (6'3) | `F1WT79...PuRM` | +1.11 | 3 | 1 | 75.0% |
| 63 | Naruza | `ASVzak...ybJk` | +1.00 | 7 | 6 | 53.8% |
| 64 | DRT 🐂 | `7K7itu...hiL6` | +0.87 | 4 | 2 | 66.7% |
| 65 | jester | `4s2WzR...T23z` | +0.84 | 2 | 2 | 50.0% |
| 66 | Scrim | `GBERKN...mTgu` | +0.83 | 3 | 19 | 13.6% |
| 67 | Hash | `DNsh1U...o8Zj` | +0.80 | 46 | 65 | 41.4% |
| 68 | peely 🍌 | `BaLxyj...WAPK` | +0.76 | 25 | 63 | 28.4% |
| 69 | SatsBuyer | `BWQPaF...7XeQ` | +0.75 | 2 | 0 | 100.0% |
| 70 | Danny | `9FNz4M...138r` | +0.75 | 28 | 80 | 25.9% |
| 71 | Setora | `HTVupc...cLcU` | +0.66 | 7 | 17 | 29.2% |
| 72 | Te' | `8RrMaJ...cZQx` | +0.65 | 2 | 4 | 33.3% |
| 73 | Rich The Dev | `FCt3Gy...ctPv` | +0.54 | 2 | 1 | 66.7% |
| 74 | Divix | `FajxNu...SCKp` | +0.51 | 1 | 1 | 50.0% |
| 75 | Jay | `HwRnKq...vfXE` | +0.46 | 1 | 0 | 100.0% |
| 76 | Toxic weast | `DU323D...jf7k` | +0.39 | 2 | 4 | 33.3% |
| 77 | Lowskii (believes) | `41uh7g...x1Gg` | +0.32 | 11 | 30 | 26.8% |
| 78 | Aymory ⚡️ | `9qdiDG...Pd6N` | +0.24 | 1 | 1 | 50.0% |
| 79 | Hermes | `5dzH7g...9vag` | +0.22 | 2 | 4 | 33.3% |
| 80 | TMH メタ | `A38dM3...Xg3M` | +0.12 | 1 | 1 | 50.0% |
| 81 | Woozy | `9tRff7...TnAp` | +0.05 | 36 | 92 | 28.1% |
| 82 | Padly | `FQEXjV...aiCb` | +0.05 | 1 | 0 | 100.0% |
| 83 | Scooter | `9NL6th...jfgo` | +0.03 | 1 | 0 | 100.0% |
| 84 | N’o | `Di75xb...S4ow` | +0.00 | 0 | 0 | - |
| 85 | Robo | `4ZdCpH...NtyT` | +0.00 | 0 | 0 | - |
| 86 | trisha | `4Dm3g5...MGmj` | +0.00 | 0 | 0 | - |
| 87 | Trench Guerilla | `9St6ET...j89U` | +0.00 | 0 | 0 | - |
| 88 | sp | `722tXm...5VTx` | +0.00 | 0 | 0 | - |
| 89 | prosciutto | `4EsY8H...gk2w` | +0.00 | 0 | 0 | - |
| 90 | Legend | `EgjCS3...VGX3` | +0.00 | 0 | 0 | - |
| 91 | Aroa | `Aen6LK...C4GZ` | +0.00 | 0 | 0 | - |
| 92 | MoneyMaykah | `3i8akM...SEk9` | +0.00 | 0 | 0 | - |
| 93 | goob | `9BkauJ...QaLt` | +0.00 | 0 | 0 | - |
| 94 | I̶l̷y̶ | `5XVKfr...Niid` | +0.00 | 0 | 0 | - |
| 95 | ree | `EVCwZr...dYuJ` | +0.00 | 0 | 0 | - |
| 96 | xet | `9yGxZ4...TEUc` | +0.00 | 0 | 0 | - |
| 97 | Frost | `4nwfXw...9k6T` | +0.00 | 0 | 0 | - |
| 98 | Guy | `ELNFHk...R2Xx` | +0.00 | 0 | 0 | - |
| 99 | dns | `2DG4vs...Kowr` | +0.00 | 0 | 0 | - |
| 100 | Pavlo | `7NnaXg...FxSH` | +0.00 | 0 | 0 | - |
| 101 | proh | `FksF9A...FGqA` | +0.00 | 0 | 0 | - |
| 102 | 十九岁绿帽少年🍀 | `DzeSE8...QSkp` | +0.00 | 0 | 0 | - |
| 103 | Gorilla Capital | `DpNVrt...wD26` | +0.00 | 0 | 0 | - |
| 104 | 0xMistBlade | `14HDbS...6q5x` | +0.00 | 0 | 0 | - |
| 105 | Chefin | `6Qs6jo...LysH` | +0.00 | 0 | 0 | - |
| 106 | Issa | `2BU3NA...JPX2` | +0.00 | 0 | 0 | - |
| 107 | old | `CA4keX...rzu5` | +0.00 | 0 | 0 | - |
| 108 | Gake | `DNfuF1...eBHm` | +0.00 | 0 | 0 | - |
| 109 | jitter | `7PuHVA...fCyj` | +0.00 | 0 | 0 | - |
| 110 | Pow | `8zFZHu...c7Zd` | +0.00 | 0 | 0 | - |
| 111 | MERK | `4jFPYS...Pq6X` | +0.00 | 0 | 0 | - |
| 112 | polar | `GL8VLa...FwQG` | +0.00 | 0 | 0 | - |
| 113 | Ansem | `AVAZvH...NXYm` | +0.00 | 0 | 0 | - |
| 114 | Mezoteric | `EdDCRf...MjA7` | +0.00 | 0 | 0 | - |
| 115 | fa1r | `8ggkt7...67MV` | +0.00 | 0 | 0 | - |
| 116 | Affu (aura farming) | `BjNueA...1yYJ` | +0.00 | 0 | 0 | - |
| 117 | profitier | `FbvUU5...d6FB` | +0.00 | 0 | 0 | - |
| 118 | Burixx 🇮🇹 | `A9aTuB...fXvp` | +0.00 | 0 | 0 | - |
| 119 | LJC | `6HJetM...USX2` | +0.00 | 0 | 0 | - |
| 120 | killz | `9Wagwc...ydUG` | +0.00 | 0 | 0 | - |
| 121 | Key | `4Bdn33...uixe` | +0.00 | 0 | 0 | - |
| 122 | wuzie | `Akht8E...JKeH` | +0.00 | 0 | 0 | - |
| 123 | s0ber | `Hq5TTU...vyae` | +0.00 | 0 | 0 | - |
| 124 | Connor | `9EyPAM...rUiH` | +0.00 | 0 | 0 | - |
| 125 | zoru | `BrT5kY...3sqg` | +0.00 | 0 | 0 | - |
| 126 | Nach | `9jyqFi...AVVz` | +0.00 | 0 | 0 | - |
| 127 | Sully | `Ebk5AT...oex6` | +0.00 | 0 | 0 | - |
| 128 | Qtdegen | `7tiRXP...6RLA` | +0.00 | 0 | 0 | - |
| 129 | Rektober | `3cG7d6...GtG5` | +0.00 | 0 | 0 | - |
| 130 | waste management | `D2aXNm...cUmj` | +0.00 | 0 | 0 | - |
| 131 | Fabix | `DN7pYL...redr` | +0.00 | 0 | 0 | - |
| 132 | Ferb | `m7Kaas...YuF7` | +0.00 | 0 | 0 | - |
| 133 | Dolo | `5wcc13...Tuo3` | +0.00 | 0 | 0 | - |
| 134 | Polly | `HtvLcC...vWMm` | +0.00 | 0 | 0 | - |
| 135 | Sue | `AXwssg...EgAH` | +0.00 | 0 | 0 | - |
| 136 | YOUNIZ | `DVM5U7...bHUa` | +0.00 | 0 | 0 | - |
| 137 | i gamble your yearly salary | `KJXB1o...ftvY` | +0.00 | 0 | 0 | - |
| 138 | Terp | `HkFt55...8Pwz` | +0.00 | 0 | 0 | - |
| 139 | Prada | `gkNNf4...yCkB` | +0.00 | 0 | 0 | - |
| 140 | Ramset ✟ | `71PCu3...9UtQ` | +0.00 | 0 | 0 | - |
| 141 | quant | `Fi2hrx...NgCn` | +0.00 | 0 | 0 | - |
| 142 | Insentos | `7SDs3P...seHS` | +0.00 | 0 | 0 | - |
| 143 | zync (锌仔) | `zyncUi...5ART` | +0.00 | 0 | 0 | - |
| 144 | mog | `EtuuyC...of3t` | +0.00 | 0 | 0 | - |
| 145 | TheDefiApe | `ExKCuo...wQM4` | +0.00 | 0 | 0 | - |
| 146 | DJ.Σn | `Cxe1d5...3bge` | +0.00 | 0 | 0 | - |
| 147 | BagCalls | `4AHgEk...4G5H` | +0.00 | 0 | 0 | - |
| 148 | el charto | `CCUcje...JF7w` | +0.00 | 0 | 0 | - |
| 149 | Jack Duval🌊 | `BAr5cs...XJPh` | +0.00 | 0 | 0 | - |
| 150 | Zeek | `DUTpdj...kC6T` | +0.00 | 0 | 0 | - |
| 151 | Saif | `BuhkHh...xCdW` | +0.00 | 0 | 0 | - |
| 152 | Yokai Ryujin | `2w3zDW...igTs` | +0.00 | 0 | 0 | - |
| 153 | yeekidd | `88e2kB...ySWJ` | +0.00 | 0 | 0 | - |
| 154 | ShockedJS | `6m5sW6...9rAF` | +0.00 | 0 | 0 | - |
| 155 | Oura | `4WPTQA...VfQw` | +0.00 | 0 | 0 | - |
| 156 | Lynk | `CkPFGv...u7xD` | +0.00 | 0 | 0 | - |
| 157 | Monarch | `4uTeAz...Aiyu` | +0.00 | 0 | 0 | - |
| 158 | Insyder | `G3g1CK...Zygk` | +0.00 | 0 | 0 | - |
| 159 | Zinc | `EBjXst...bjru` | +0.00 | 0 | 0 | - |
| 160 | Lyxe | `HLv6yC...Sek1` | +0.00 | 0 | 0 | - |
| 161 | Seee | `9EfTig...8pTk` | +0.00 | 0 | 0 | - |
| 162 | CC2 | `B3beyo...pnoS` | +0.00 | 0 | 0 | - |
| 163 | Spuno | `GfXQes...hzPH` | +0.00 | 0 | 0 | - |
| 164 | 🇩🇴 Jerry | `GmDXqH...zNBj` | +0.00 | 0 | 0 | - |
| 165 | Brox | `7VBTpi...HNnn` | +0.00 | 0 | 0 | - |
| 166 | 0xJumpman | `8eioZu...viuE` | +0.00 | 0 | 0 | - |
| 167 | Chris ☕️ | `CtUzwA...MiMx` | +0.00 | 0 | 0 | - |
| 168 | Jakey | `B8kdog...XB64` | +0.00 | 0 | 0 | - |
| 169 | kilo | `kiLogf...E49u` | +0.00 | 0 | 0 | - |
| 170 | Pullup 🗡️🧣✨ | `65paNE...SQuE` | +0.00 | 0 | 0 | - |
| 171 | Fawcette | `JBTJAk...GnEm` | +0.00 | 0 | 0 | - |
| 172 | para | `uS74ri...VhVp` | +0.00 | 0 | 0 | - |
| 173 | Little Mustacho 🐕 | `Huk3Ku...3m8f` | +0.00 | 0 | 0 | - |
| 174 | Bobby | `DBmRHN...XYSC` | +0.00 | 0 | 0 | - |
| 175 | GVQ | `GVQtcY...jMkF` | +0.00 | 0 | 0 | - |
| 176 | Jordan | `EAnB51...9T5J` | +0.00 | 0 | 0 | - |
| 177 | Bolivian | `5AyJw1...Qrw8` | +0.00 | 0 | 0 | - |
| 178 | Carti The Menace | `3mPypx...77qe` | +0.00 | 0 | 0 | - |
| 179 | Angi | `AGnd5W...iCLu` | +0.00 | 0 | 0 | - |
| 180 | Value & Time | `3nvC8c...izVX` | +0.00 | 0 | 0 | - |
| 181 | Dutch | `9vWutd...5yFA` | +0.00 | 0 | 0 | - |
| 182 | Hustler | `HUS9Er...SK9U` | +0.00 | 0 | 0 | - |
| 183 | Rev | `EgzjRC...2BZm` | +0.00 | 0 | 0 | - |
| 184 | .exe | `42nsEk...PV2g` | +0.00 | 0 | 0 | - |
| 185 | Jalen | `F72vY9...w6qL` | +0.00 | 0 | 0 | - |
| 186 | Sabby | `9K18Ms...gh6g` | +0.00 | 0 | 0 | - |
| 187 | Mitch | `4Be9Cv...ha7t` | +0.00 | 0 | 0 | - |
| 188 | Rizz | `BPWsae...91tT` | +0.00 | 0 | 0 | - |
| 189 | Collectible | `Ehqd8q...Upg3` | +0.00 | 0 | 0 | - |
| 190 | cxltures | `3ZtwP8...qnAJ` | +0.00 | 0 | 0 | - |
| 191 | Michi | `8YYDiC...4pwh` | +0.00 | 0 | 0 | - |
| 192 | evening | `E7gozE...8o4S` | +0.00 | 0 | 0 | - |
| 193 | Obijai | `5dhKiV...oANw` | +0.00 | 0 | 0 | - |
| 194 | shaka | `4S8YBC...UuHA` | +0.00 | 0 | 0 | - |
| 195 | aloh | `FGVjsm...SWtH` | +0.00 | 0 | 0 | - |
| 196 | Fuzz | `FUZZUh...Z85t` | +0.00 | 0 | 0 | - |
| 197 | ִֶָ | `B57ChV...4VY2` | +0.00 | 0 | 0 | - |
| 198 | RUSKY 🪬⚡️ | `J4rYYP...dvc4` | +0.00 | 0 | 0 | - |
| 199 | kyz | `72YiE4...Lqsm` | +0.00 | 0 | 0 | - |
| 200 | Noah | `6DwBGY...Jtw4` | +0.00 | 0 | 0 | - |
| 201 | Achi | `FPx2Ba...xCra` | +0.00 | 0 | 0 | - |
| 202 | asta | `AstaWu...V6JL` | +0.00 | 0 | 0 | - |
| 203 | Al4n | `2YJbcB...MymV` | +0.00 | 0 | 0 | - |
| 204 | fomo 🧠 | `9FEHWF...VSnH` | +0.00 | 0 | 0 | - |
| 205 | deecayz ⌐◨-◨ | `Dv32u9...ysZY` | +0.00 | 0 | 0 | - |
| 206 | 0xBossman | `BjYxVF...3bXZ` | +0.00 | 0 | 0 | - |
| 207 | iconXBT | `2Fbbtm...bftM` | +0.00 | 0 | 0 | - |
| 208 | yassir | `HFx9E1...LLSs` | +0.00 | 0 | 0 | - |
| 209 | woopig🧙🏻‍♂️ | `9Bs2Xg...byPD` | +0.00 | 0 | 0 | - |
| 210 | sarah milady | `AAMnoN...6ccg` | +0.00 | 0 | 0 | - |
| 211 | eq | `7w7f4P...gdzq` | +0.00 | 0 | 0 | - |
| 212 | R💫WDY | `DKgvpf...yciK` | +0.00 | 0 | 0 | - |
| 213 | Maurits | `274vmG...2nD6` | +0.00 | 0 | 0 | - |
| 214 | Dolo 🥷 | `EeSx4w...zgZh` | +0.00 | 0 | 0 | - |
| 215 | Fizzwick Bramblewhistle | `3pcmVZ...6oS1` | +0.00 | 0 | 0 | - |
| 216 | Nils😈 | `FkL99x...FfW3` | +0.00 | 0 | 0 | - |
| 217 | zurh | `HYgRa7...TKJD` | +0.00 | 0 | 0 | - |
| 218 | Fwasty | `J15mCw...5q1g` | +0.00 | 0 | 0 | - |
| 219 | Dedmeow5 | `9THzoX...RnqE` | +0.00 | 0 | 0 | - |
| 220 | Charlie | `14k7D9...ypgz` | +0.00 | 0 | 0 | - |
| 221 | JinMu | `8tP391...2PRP` | +0.00 | 0 | 0 | - |
| 222 | Nuotrix | `Aa5Lyc...wc2Q` | +0.00 | 0 | 0 | - |
| 223 | Dragon | `6SYhd6...SH4r` | +0.00 | 0 | 0 | - |
| 224 | Iced | `DrJ6Sn...Sd5o` | +0.00 | 0 | 0 | - |
| 225 | Crypto Chef | `EbSjMK...JiCJ` | +0.00 | 0 | 0 | - |
| 226 | lucky flash | `2vXMy7...4Ro4` | +0.00 | 0 | 0 | - |
| 227 | Yugi | `4TCMpx...p66B` | +0.00 | 0 | 0 | - |
| 228 | eezzyLIVE 🧸 | `DiDbxf...HNjN` | +0.00 | 0 | 0 | - |
| 229 | zhynx | `zhYnXq...AHkL` | +0.00 | 0 | 0 | - |
| 230 | nich | `nichQ7...fYas` | +0.00 | 0 | 0 | - |
| 231 | Frags | `2yoJib...UFHS` | +0.00 | 0 | 0 | - |
| 232 | ItsVine | `ztRg1P...ohSv` | +0.00 | 0 | 0 | - |
| 233 | Rice | `CWvdyv...C8ou` | +0.00 | 0 | 0 | - |
| 234 | KennyLoaded | `3BEtHG...ac7E` | +0.00 | 0 | 0 | - |
| 235 | Storm | `EYBMFf...mtAy` | +0.00 | 0 | 0 | - |
| 236 | Baraka | `CUKFKd...nCnw` | +0.00 | 0 | 0 | - |
| 237 | denzaa | `4X199P...vCA8` | +0.00 | 0 | 0 | - |
| 238 | arnz | `2G6CNJ...NtiJ` | +0.00 | 0 | 0 | - |
| 239 | Canis | `AzXDG1...mSAo` | +0.00 | 0 | 0 | - |
| 240 | ⚫️ | `13gj9s...LkzG` | +0.00 | 0 | 0 | - |
| 241 | Iz | `FH6jdK...GMUg` | +0.00 | 0 | 0 | - |
| 242 | milito | `EeXvxk...zumH` | +0.00 | 0 | 0 | - |
| 243 | voyage | `BJeWdz...fdQJ` | +0.00 | 0 | 0 | - |
| 244 | GK | `GxifJq...pEmV` | +0.00 | 0 | 0 | - |
| 245 | neko ≈💧🌸 | `7EQjTH...8jv2` | +0.00 | 0 | 0 | - |
| 246 | Lunar cipher | `EtVEeq...kqhc` | +0.00 | 0 | 0 | - |
| 247 | Jays | `By5huc...ReTj` | +0.00 | 0 | 0 | - |
| 248 | Niners | `2RyUYq...YS1p` | +0.00 | 0 | 0 | - |
| 249 | Exploitz | `F5Tw3a...tAEB` | +0.00 | 0 | 0 | - |
| 250 | Lockiner | `ErhZ8c...GB5p` | +0.00 | 0 | 0 | - |
| 251 | Sugus | `2octNb...hv3t` | +0.00 | 0 | 0 | - |
| 252 | Basel de’ Medici | `8vPVTT...157t` | +0.00 | 0 | 0 | - |
| 253 | LUKEY ✣ | `DjM7Tu...uN7s` | +0.00 | 0 | 0 | - |
| 254 | dints | `3PWGw2...pDwU` | +0.00 | 0 | 0 | - |
| 255 | jimmy | `HcpsFY...BicY` | +0.00 | 0 | 0 | - |
| 256 | bradjae | `8Dg8J8...f7eV` | +0.00 | 0 | 0 | - |
| 257 | Cesco.Sol | `7wr4Hf...Mdo4` | +0.00 | 0 | 0 | - |
| 258 | AdamJae | `4xUEz1...UeBy` | +0.00 | 0 | 0 | - |
| 259 | Crypto Pirate | `8mp548...vRxV` | +0.00 | 0 | 0 | - |
| 260 | maybe | `Gp9W8Q...wKb7` | +0.00 | 0 | 0 | - |
| 261 | appie | `7WaL6o...WAjy` | +0.00 | 0 | 0 | - |
| 262 | ocr | `3MNu91...yaqt` | +0.00 | 0 | 0 | - |
| 263 | Nikolas (aura arc) | `iPUp3q...Ne6C` | +0.00 | 0 | 0 | - |
| 264 | Kaaox | `GPryzR...ayNh` | +0.00 | 0 | 0 | - |
| 265 | 7xNickk | `AmofvG...FVtf` | +0.00 | 0 | 0 | - |
| 266 | Levis | `GwoFJF...gZ1R` | +0.00 | 0 | 0 | - |
| 267 | Pocket Hitlers | `9RrKUh...FBj9` | +0.00 | 0 | 0 | - |
| 268 | Rilsio | `4fZFcK...ZMHu` | +0.00 | 0 | 0 | - |
| 269 | Yami 𓃵 | `7Js5gm...nyVm` | +0.00 | 0 | 0 | - |
| 270 | Ray | `HvNqQB...h16W` | +0.00 | 0 | 0 | - |
| 271 | Chairman ² | `Be24Gb...nRR6` | +0.00 | 0 | 0 | - |
| 272 | Exy | `8hKZKq...HTe1` | +0.00 | 0 | 0 | - |
| 273 | dyor ( revenge arc ) | `AVmFMb...j3Gq` | +0.00 | 0 | 0 | - |
| 274 | Unipcs (aka 'Bonk Guy') | `5M8ACG...QW3Y` | +0.00 | 0 | 0 | - |
| 275 | Toz | `Fza6jH...Era9` | +0.00 | 0 | 0 | - |
| 276 | jazz | `3wDWKh...yRKg` | +0.00 | 0 | 0 | - |
| 277 | Win All Day | `Gtg4qS...G5C2` | +0.00 | 0 | 0 | - |
| 278 | Roxo | `AE3tJD...ZbSa` | +0.00 | 0 | 0 | - |
| 279 | PRINCESS | `6vZenw...nPoZ` | +0.00 | 0 | 0 | - |
| 280 | fawi | `A3JBfM...9Qn7` | +0.00 | 0 | 0 | - |
| 281 | Donuttcrypto | `3wjyaS...vnmz` | +0.00 | 0 | 0 | - |
| 282 | Ron | `8JuRx7...6Ehn` | +0.00 | 0 | 0 | - |
| 283 | Rozer | `4hGiRi...kvoK` | +0.00 | 0 | 0 | - |
| 284 | nad | `363sqM...XuaT` | +0.00 | 0 | 0 | - |
| 285 | Fey | `B6Jx8R...aHni` | +0.00 | 0 | 0 | - |
| 286 | Boru | `3rwzJN...6Lu2` | +0.00 | 0 | 0 | - |
| 287 | guappy | `3TsRAE...FKSq` | +0.00 | 0 | 0 | - |
| 288 | ChartFu | `7i7vHE...8iY2` | +0.00 | 0 | 0 | - |
| 289 | buka ᚠ ᛏ ᚲ | `8T1HF5...fg55` | +0.00 | 0 | 0 | - |
| 290 | Mr. Frog | `4Ddrfi...9nNh` | +0.00 | 0 | 0 | - |
| 291 | trav 🎒 | `CXnf4T...e99m` | +0.00 | 0 | 0 | - |
| 292 | B* | `3wZ6Mf...G6jk` | +0.00 | 0 | 0 | - |
| 293 | boogie | `75oEqX...ug5i` | +0.00 | 0 | 0 | - |
| 294 | Thurston (zapped arc) | `ALauG4...31wE` | +0.00 | 0 | 0 | - |
| 295 | Owl | `A5uxHm...vjH4` | +0.00 | 0 | 0 | - |
| 296 | printer | `Bu8iZs...nMXA` | +0.00 | 0 | 0 | - |
| 297 | Bronsi | `4ud45n...n2JW` | +0.00 | 0 | 0 | - |
| 298 | staticc | `9pgKiU...Vqk6` | +0.00 | 0 | 0 | - |
| 299 | Sweep | `GP9PyT...empH` | +0.00 | 0 | 0 | - |
| 300 | dingaling | `9X5n5i...zFHa` | +0.00 | 0 | 0 | - |
| 301 | Don | `winkAC...gXLu` | +0.00 | 0 | 0 | - |
| 302 | Sizeab1e | `AtmeWw...fm8p` | +0.00 | 0 | 0 | - |
| 303 | oscar | `AeLb2R...1FHx` | +0.00 | 0 | 0 | - |
| 304 | JB | `7dP8Dm...cqCu` | +0.00 | 0 | 0 | - |
| 305 | Enjooyer | `Enjoy9...dyWm` | +0.00 | 0 | 0 | - |
| 306 | LilMoonLambo | `GJyhzL...7W8B` | +0.00 | 0 | 0 | - |
| 307 | Solstice | `GrD2um...eaDN` | +0.00 | 0 | 0 | - |
| 308 | Hail | `HA1L7G...wPuB` | +0.00 | 0 | 0 | - |
| 309 | Jeets | `D1H83u...3m5t` | +0.00 | 0 | 0 | - |
| 310 | Daumen | `8MaVa9...88D5` | -0.07 | 99 | 186 | 34.7% |
| 311 | FINN | `BTeqNy...faom` | -0.07 | 4 | 4 | 50.0% |
| 312 | Thesis ✍️ | `5S9qzJ...K9G7` | -0.16 | 3 | 4 | 42.9% |
| 313 | Eddy 💹🧲 | `DuGezK...QHjx` | -0.17 | 0 | 1 | 0.0% |
| 314 | Megz 🦉 | `CECN4B...55Du` | -0.23 | 1 | 1 | 50.0% |
| 315 | Damian Prosalendis | `AEeJUP...kJMX` | -0.25 | 0 | 1 | 0.0% |
| 316 | Latuche | `GJA1HE...SU65` | -0.31 | 0 | 1 | 0.0% |
| 317 | Inside Calls | `4NtyFq...ax9a` | -0.35 | 1 | 1 | 50.0% |
| 318 | storm | `Dxudj2...rRNh` | -0.36 | 30 | 47 | 39.0% |
| 319 | Dusty | `B799XD...YFdR` | -0.39 | 0 | 1 | 0.0% |
| 320 | narc | `CxgPWv...eGve` | -0.44 | 1 | 1 | 50.0% |
| 321 | Bastille | `3kebnK...yPzV` | -0.45 | 3 | 12 | 20.0% |
| 322 | racks | `CM1dn5...p17g` | -0.51 | 7 | 33 | 17.5% |
| 323 | gr3g | `J23qr9...7wsA` | -0.53 | 1 | 3 | 25.0% |
| 324 | dxrnelljcl | `3jzHjo...dioT` | -0.56 | 0 | 3 | 0.0% |
| 325 | set | `62N1K5...EtuR` | -0.66 | 0 | 3 | 0.0% |
| 326 | psykø | `FC3nyV...P7c4` | -0.71 | 0 | 1 | 0.0% |
| 327 | Bluey | `6TAHDM...umyK` | -0.72 | 13 | 24 | 35.1% |
| 328 | Junior | `3tnzEg...F2qP` | -0.74 | 2 | 14 | 12.5% |
| 329 | bruce | `4xHGhy...dBPR` | -0.81 | 2 | 4 | 33.3% |
| 330 | EvansOfWeb | `5RQEcW...crwo` | -0.88 | 1 | 2 | 33.3% |
| 331 | mercy | `F5jWYu...MYjt` | -0.88 | 0 | 2 | 0.0% |
| 332 | Banf | `Fv8byB...Xn1d` | -0.91 | 16 | 28 | 36.4% |
| 333 | Mak | `3SU8wj...ttzr` | -0.97 | 1 | 3 | 25.0% |
| 334 | Jookiaus | `jsjsxP...ZUsb` | -1.02 | 1 | 3 | 25.0% |
| 335 | dash | `4ESzFZ...EAau` | -1.07 | 5 | 3 | 62.5% |
| 336 | unprofitable | `DYmsQu...TPNF` | -1.18 | 8 | 15 | 34.8% |
| 337 | Zemrics | `EP5mvf...pDvG` | -1.31 | 3 | 11 | 21.4% |
| 338 | wizard | `DwCp9G...icWf` | -1.42 | 1 | 6 | 14.3% |
| 339 | rambo | `2net6e...CiWz` | -1.45 | 97 | 249 | 28.0% |
| 340 | fl0wjoe | `9v9Xsx...Pe9R` | -1.56 | 1 | 4 | 20.0% |
| 341 | CookDoc | `Dvbv5T...UaRv` | -1.66 | 2 | 4 | 33.3% |
| 342 | Heyitsyolo | `Av3xWH...L9YQ` | -1.84 | 0 | 1 | 0.0% |
| 343 | Matt | `3bzaJd...1n1f` | -2.04 | 3 | 14 | 17.6% |
| 344 | bilo | `7sA5em...akhh` | -2.10 | 1 | 7 | 12.5% |
| 345 | Coasty | `CATk62...g3nB` | -2.13 | 5 | 8 | 38.5% |
| 346 | Hueno | `FWAmTV...Gu59` | -2.17 | 0 | 2 | 0.0% |
| 347 | decu | `4vw54B...9Ud9` | -2.20 | 48 | 78 | 38.1% |
| 348 | Mike | `A8i6J8...sXzw` | -2.25 | 3 | 5 | 37.5% |
| 349 | OGAntD | `215nhc...gQjP` | -2.25 | 2 | 2 | 50.0% |
| 350 | Boomer | `4JyenL...Xudh` | -2.57 | 1 | 6 | 14.3% |
| 351 | Beaver | `GM7Hrz...8NvN` | -2.64 | 0 | 1 | 0.0% |
| 352 | Sebi | `DxwDRW...n5mc` | -2.94 | 0 | 2 | 0.0% |
| 353 | Lucas | `6uwzmi...dU2M` | -2.95 | 3 | 12 | 20.0% |
| 354 | S | `ApRnQN...Hdz1` | -3.02 | 0 | 9 | 0.0% |
| 355 | Rem | `3pfqeb...CbtK` | -3.20 | 0 | 5 | 0.0% |
| 356 | Zoke | `6MrVEE...pobM` | -3.38 | 2 | 19 | 9.5% |
| 357 | King | `69z4qT...m2JS` | -3.38 | 7 | 12 | 36.8% |
| 358 | Tally ꨄ︎ | `JAmx4W...M8h9` | -3.44 | 1 | 9 | 10.0% |
| 359 | Veloce | `2W14ah...uvP3` | -3.52 | 14 | 27 | 34.1% |
| 360 | fz7 | `G2mgnz...CvR4` | -3.53 | 3 | 20 | 13.0% |
| 361 | Dex | `mW4PZB...gTsM` | -3.54 | 3 | 8 | 27.3% |
| 362 | Xanse. | `B9K2wT...UXrh` | -3.62 | 1 | 10 | 9.1% |
| 363 | Advyth | `GEKZWL...XnvS` | -3.65 | 3 | 8 | 27.3% |
| 364 | bihoz | `An68XC...J2dE` | -3.74 | 26 | 63 | 29.2% |
| 365 | marker | `CQervC...ntM2` | -3.78 | 10 | 11 | 47.6% |
| 366 | Solana degen | `9tY7u1...RUr8` | -4.07 | 0 | 4 | 0.0% |
| 367 | Absol | `BXNiM7...SLWN` | -4.11 | 1 | 10 | 9.1% |
| 368 | Groovy | `34ZEH7...ucMw` | -4.18 | 1 | 9 | 10.0% |
| 369 | samsrep | `CUHBzS...9P7H` | -4.33 | 2 | 8 | 20.0% |
| 370 | Marcell | `FixmSp...w67X` | -4.63 | 0 | 3 | 0.0% |
| 371 | crayohla | `GDoG4t...G3aN` | -4.76 | 5 | 18 | 21.7% |
| 372 | ozark | `DZAa55...rXam` | -4.82 | 11 | 32 | 25.6% |
| 373 | Betman | `BoYHJo...bcGG` | -5.35 | 5 | 18 | 21.7% |
| 374 | Johnson | `J9TYAs...C8MB` | -5.38 | 4 | 6 | 40.0% |
| 375 | k4ye | `5fHJsz...zGeV` | -5.66 | 30 | 60 | 33.3% |
| 376 | slingoor | `6mWEJG...vzXd` | -5.68 | 0 | 3 | 0.0% |
| 377 | Grimace | `EA4MXk...MBJr` | -5.93 | 5 | 10 | 33.3% |
| 378 | trunoest | `ardinR...b6AT` | -6.04 | 3 | 14 | 17.6% |
| 379 | Hugo Fartingale | `Au1GUW...LK4i` | -6.46 | 0 | 1 | 0.0% |
| 380 | Netti | `8WN7tk...NYcf` | -6.84 | 16 | 54 | 22.9% |
| 381 | Joji | `525Lue...fXJT` | -7.14 | 1 | 4 | 20.0% |
| 382 | rise_crypt | `AUEQxh...9E4t` | -7.19 | 2 | 6 | 25.0% |
| 383 | Mazino | `9r1Ben...DL52` | -7.43 | 12 | 34 | 26.1% |
| 384 | saale | `SAALE2...ayQp` | -7.57 | 0 | 1 | 0.0% |
| 385 | Ban | `8DGbkG...Ajpn` | -8.10 | 40 | 133 | 23.1% |
| 386 | Roshi 風と | `5JrDgn...gs3w` | -8.11 | 3 | 14 | 17.6% |
| 387 | JB | `JBrYni...14p7` | -8.30 | 5 | 13 | 27.8% |
| 388 | Dali | `CvNiez...k5mB` | -8.49 | 2 | 18 | 10.0% |
| 389 | peacefuldestroy | `8AtQ4k...venm` | -8.70 | 1 | 5 | 16.7% |
| 390 | Putrick | `AVjEtg...oeQN` | -8.78 | 6 | 23 | 20.7% |
| 391 | CoCo | `FqojC2...Maiv` | -8.91 | 10 | 15 | 40.0% |
| 392 | rez | `FkRN9y...gDuN` | -9.15 | 7 | 22 | 24.1% |
| 393 | juicyfruity | `Cv4JVc...aJSz` | -9.24 | 137 | 362 | 27.5% |
| 394 | Sanity | `5ruP87...HYHH` | -9.27 | 6 | 30 | 16.7% |
| 395 | matsu | `9f5ywd...Wh1p` | -9.31 | 53 | 176 | 23.1% |
| 396 | Kimba | `7mHqL9...U1d3` | -9.52 | 5 | 10 | 33.3% |
| 397 | bust | `FzVQSz...ZmND` | -9.90 | 13 | 33 | 28.3% |
| 398 | Gasp | `xyzfhx...StB6` | -10.12 | 14 | 47 | 23.0% |
| 399 | Felix | `3uz65G...j7qn` | -10.80 | 1 | 13 | 7.1% |
| 400 | ^1s1mple | `AeLaMj...PFe3` | -10.91 | 72 | 254 | 22.1% |
| 401 | Megga | `H31vEB...dQoU` | -11.00 | 7 | 23 | 23.3% |
| 402 | kreo | `BCnqsP...dArc` | -11.13 | 5 | 25 | 16.7% |
| 403 | EustazZ | `FqamE7...zrve` | -11.13 | 7 | 28 | 20.0% |
| 404 | Sebastian | `3BLjRc...k4Ei` | -11.14 | 6 | 26 | 18.8% |
| 405 | Jidn | `3h65Mm...axoE` | -11.57 | 2 | 15 | 11.8% |
| 406 | jakey | `B3JyPD...9jCT` | -12.26 | 4 | 15 | 21.1% |
| 407 | chester | `PMJA8U...gyYN` | -12.69 | 34 | 117 | 22.5% |
| 408 | Ataberk 🧙‍♂️ | `6hcX7f...Lj1U` | -13.06 | 0 | 5 | 0.0% |
| 409 | Reljoo | `FsG3Ba...HpHP` | -13.29 | 1 | 13 | 7.1% |
| 410 | dv | `BCagck...UPJd` | -13.80 | 31 | 87 | 26.3% |
| 411 | Giann | `GNrmKZ...sHEC` | -14.44 | 239 | 445 | 34.9% |
| 412 | Orange | `2X4H5Y...AwQv` | -15.03 | 10 | 44 | 18.5% |
| 413 | Ducky | `ADC1QV...A2ph` | -15.05 | 2 | 16 | 11.1% |
| 414 | King Solomon | `DEdEW3...BQDQ` | -15.17 | 56 | 168 | 25.0% |
| 415 | TIL | `EHg5Yk...Myaf` | -15.79 | 2 | 13 | 13.3% |
| 416 | CameXBT | `67SNjk...Uxx6` | -18.47 | 15 | 66 | 18.5% |
| 417 | Exotic | `Dwo2kj...ujXC` | -18.51 | 37 | 117 | 24.0% |
| 418 | Otta | `As7HjL...SMB5` | -18.56 | 7 | 36 | 16.3% |
| 419 | Smokez | `5t9xBN...o8Qz` | -19.59 | 6 | 10 | 37.5% |
| 420 | tech | `5d3jQc...NkuE` | -20.31 | 1 | 3 | 25.0% |
| 421 | shah | `7xwDKX...eh7w` | -20.36 | 1 | 16 | 5.9% |
| 422 | Leens | `Leense...VABY` | -20.49 | 5 | 21 | 19.2% |
| 423 | Kev | `BTf4A2...sadd` | -20.86 | 29 | 63 | 31.5% |
| 424 | Hesi | `FpD6n8...8k4X` | -22.19 | 69 | 201 | 25.6% |
| 425 | Fashr | `719sfK...qFYz` | -23.31 | 15 | 65 | 18.8% |
| 426 | noob mini | `AGqjiv...FYLm` | -24.16 | 11 | 46 | 19.3% |
| 427 | West | `JDd3hy...CJPN` | -24.55 | 4 | 26 | 13.3% |
| 428 | Red | `7ABz8q...hkQ6` | -24.94 | 7 | 17 | 29.2% |
| 429 | Monki | `53BnNc...Ynsh` | -25.64 | 3 | 20 | 13.0% |
| 430 | cryptovillain26 | `5sNnKu...V7gn` | -25.94 | 34 | 178 | 16.0% |
| 431 | WaiterG | `4cXnf2...Zqj2` | -26.08 | 10 | 32 | 23.8% |
| 432 | Flames | `6aXFYX...eWoV` | -26.73 | 33 | 109 | 23.2% |
| 433 | Nilla | `j38fhf...Ti4o` | -26.83 | 63 | 156 | 28.8% |
| 434 | Zuki | `922Vvm...ygrG` | -26.86 | 6 | 41 | 12.8% |
| 435 | Scharo | `4sAUSQ...m5nU` | -27.27 | 4 | 17 | 19.0% |
| 436 | Publix | `86AEJE...1EdD` | -27.42 | 4 | 26 | 13.3% |
| 437 | M A M B A 🧲 | `4nvNc7...5LYh` | -28.93 | 19 | 60 | 24.1% |
| 438 | Silver | `67Nwfi...zU6U` | -31.13 | 16 | 58 | 21.6% |
| 439 | Kadenox | `B32Qbb...JqnC` | -32.74 | 76 | 195 | 28.0% |
| 440 | Art | `CgaA9a...7Rz5` | -33.68 | 29 | 97 | 23.0% |
| 441 | Tom | `CEUA7z...qoXJ` | -34.24 | 7 | 25 | 21.9% |
| 442 | Henn | `FRbUNv...dyCS` | -34.37 | 4 | 36 | 10.0% |
| 443 | Padre | `4Ff9db...NY4g` | -35.07 | 7 | 29 | 19.4% |
| 444 | Cooker | `8deJ9x...XhU6` | -36.67 | 4 | 4 | 50.0% |
| 445 | Files | `DtjYbZ...g92Y` | -38.16 | 8 | 36 | 18.2% |
| 446 | Clown | `EDXHdS...8HR8` | -38.64 | 12 | 60 | 16.7% |
| 447 | Earl | `F2SuEr...cyWm` | -45.75 | 8 | 54 | 12.9% |
| 448 | dov 7 | `8nqtxp...iM3v` | -45.77 | 187 | 315 | 37.3% |
| 449 | Letterbomb | `BtMBMP...aQtr` | -46.36 | 5 | 43 | 10.4% |
| 450 | Dani | `AuPp4Y...yqrf` | -47.77 | 14 | 26 | 35.0% |
| 451 | AlxCooks | `89HbgW...mkDi` | -49.33 | 11 | 37 | 22.9% |
| 452 | Tuults | `5T229o...mwEP` | -50.55 | 7 | 31 | 18.4% |
| 453 | Zyaf | `F5TjPy...m429` | -53.40 | 46 | 90 | 33.8% |
| 454 | Cupsey | `2fg5QD...rx6f` | -55.17 | 314 | 599 | 34.4% |
| 455 | Casino | `8rvAsD...y7qR` | -55.37 | 14 | 34 | 29.2% |
| 456 | Mayhem Bot | `BwWK17...de6s` | -56.15 | 49109 | 24555 | 66.7% |
| 457 | Sheep | `78N177...Vkh2` | -57.60 | 45 | 42 | 51.7% |
| 458 | Limfork.eth | `BQVz7f...PRmB` | -57.72 | 90 | 258 | 25.9% |
| 459 | xunle | `4YzpSZ...qry8` | -59.60 | 16 | 60 | 21.1% |
| 460 | xander | `B3wagQ...wzMh` | -61.03 | 6 | 34 | 15.0% |
| 461 | h14 | `BJXjRq...fMda` | -62.57 | 319 | 994 | 24.3% |
| 462 | prettyover | `2e1w3X...4Vis` | -66.67 | 11 | 54 | 16.9% |
| 463 | danny | `EaVboa...S2kK` | -73.44 | 11 | 30 | 26.8% |
| 464 | Setsu | `2k7Mnf...oLHd` | -83.96 | 49 | 103 | 32.2% |
| 465 | Ethan Prosper | `sAdNbe...vzLT` | -95.45 | 35 | 101 | 25.7% |
| 466 | Trey | `831yhv...eoEs` | -112.12 | 74 | 162 | 31.4% |
| 467 | Leck | `98T65w...w3Mp` | -112.97 | 24 | 118 | 16.9% |
| 468 | Loopierr | `9yYya3...4jqL` | -123.79 | 69 | 251 | 21.6% |
| 469 | Domy | `3LUfv2...2Yww` | -137.49 | 46 | 236 | 16.3% |
| 470 | omar | `Dgehc8...YJPJ` | -143.04 | 20 | 81 | 19.8% |
| 471 | cap | `CAPn1y...UJdw` | -154.11 | 76 | 181 | 29.6% |
| 472 | bandit | `5B79fM...9q2X` | -203.69 | 106 | 274 | 27.9% |
