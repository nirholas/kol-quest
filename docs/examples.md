# kol-quest examples

Scrape all KOL wallet data from kolscan.io leaderboard + GMGN smart money

## Example 1

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  DATA SOURCES   │     │    INGESTION     │     │    STORAGE      │     │   APPLICATION    │
│                 │     │                  │     │                 │     │                  │
│  KolScan.io     │────>│  scrape.js       │────>│  JSON files     │────>│  Next.js 14      │
│  GMGN API       │────>│  scrape-axiom.js │     │  (leaderboard,  │     │  (React 18, TS)  │
│  X / Twitter    │────>│  scrape-x.js     │     │   wallets, X)   │     │                  │
│                 │     │                  │     │                 │     │  Leaderboards    │
│                 │     │  ingest-trades   │────>│  PostgreSQL     │────>│  Tracking        │
│                 │     │  (batch + poll)  │     │  (trades,       │     │  Feed            │
│                 │     │                  │     │   submissions,  │     │  Community       │
│                 │     │                  │     │   watchlists,   │     │  Auth            │
│                 │     │                  │     │   users)        │     │                  │
└─────────────────┘     └──────────────────┘     └─────────────────┘     └──────────────────┘
                                                                               │
                                                                               │
                                                        ┌──────────────────────┴──────────┐
                                                        │                                 │
                                                  ┌─────┴──────┐                ┌─────────┴──────┐
                                                  │  Bun API   │                │  MCP Server    │
                                                  │  :3002     │                │  (stdio)       │
                                                  │  REST/JSON │                │  AI assistants │
                                                  └────────────┘                └────────────────┘
```

## Example 2

```bash
# Clone the repo
git clone https://github.com/nirholas/kol-quest.git
cd kol-quest

# Root dependencies (scrapers)
npm install

# Site dependencies (Next.js app)
cd site && npm install && cd ..

# Playwright for scraping
npx playwright install chromium
sudo npx playwright install-deps chromium   # Linux only
```

## Example 3

```bash
npm run setup
```

## Example 4

```bash
cp site/.env.example site/.env
```

## Example 5

```bash
cd site
npm run db:push        # Push schema directly (development)
npm run db:generate    # Generate migration SQL from schema changes
npm run db:migrate     # Apply pending migrations (production)
```

## Example 6

```bash
npm run scrape          # KolScan KOL leaderboard (~472 wallets)
npm run scrape:axiom    # GMGN smart money wallets (Solana + BSC)
npm run scrape:x        # X/Twitter profiles for KOL social data
```

## Example 7

```bash
cp output/kolscan-leaderboard.json site/data/
cp solwallets.json site/data/
cp bscwallets.json site/data/
```

## Example 8

```bash
# Development
npm run dev

# Production
cd site && npm run build && npm start
```


Every snippet above is taken from the [repository documentation](https://github.com/nirholas/kol-quest#readme).
