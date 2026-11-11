---
name: kol-wallet-intel
description: Query KolScan KOL leaderboards and GMGN smart money wallets on Solana and BSC by running the KolQuest stdio MCP server from a clone. Use when asked who the top traders are, to look up a wallet, or to search a KOL by name or X handle.
---

# KolQuest wallet intelligence

KolQuest ships a small MCP server (`mcp/index.ts`) that speaks newline-delimited JSON-RPC over stdio. It is not published to npm, so it runs from a clone with Bun.

## Run it

```bash
git clone https://github.com/nirholas/kol-quest
cd kol-quest
bun mcp/index.ts        # or: npm run mcp
```

To register it with a client, point the command at the clone:

```json
{"mcpServers": {"kolquest": {"command": "bun", "args": ["mcp/index.ts"], "cwd": "/path/to/kol-quest"}}}
```

No API keys are needed. On start it loads `output/kolscan-leaderboard.json` from the clone when present, and otherwise fetches the datasets from the `nirholas/scrape-kolscan-wallets` repo on raw.githubusercontent.com. Startup writes the loaded entry counts to stderr.

## Tools

| Tool | Arguments | Returns |
|---|---|---|
| `kolscan_leaderboard` | `timeframe` (1, 7 or 30 days, default 1), `sort` (`profit`, `wins`, `losses`, `winrate`, `name`), `order` (`asc`/`desc`), `limit` (1-100, default 20), `search` | Ranked KolScan entries |
| `kolscan_wallet` | `address` (required) | Stats and rankings across timeframes |
| `gmgn_wallets` | `chain` (`sol` or `bsc`), `category` (`smart_degen`, `kol`, `snipe_bot`, `launchpad_smart`, `fresh_wallet`, `live`, `top_followed`, `top_renamed`), `sort` (for example `realized_profit_7d`, `winrate_7d`, `buy_7d`), `order`, `limit`, `search` | GMGN smart money wallets |
| `gmgn_wallet_detail` | `address` (required) | Profit, buys, sells, win rates, tags, category |
| `wallet_stats` | none | Aggregate counts, top performers, category breakdown |
| `search_wallets` | `query` (required), `limit` | Matches across KolScan, GMGN Solana and GMGN BSC by name, address or X handle |

## Worked example

Ask: "Who were the top five Solana KOLs by weekly profit, and are any of them also GMGN smart degens?"

1. Call `kolscan_leaderboard` with `{"timeframe": 7, "sort": "profit", "order": "desc", "limit": 5}`.
2. For each wallet address, call `gmgn_wallet_detail` with `{"address": "<wallet>"}` to read its category and 7 day profit.
3. Report the ranked list with profit, win rate and category, and say which source each figure came from.

## Notes

- The data is a scraped snapshot, not a live feed. Say so when reporting figures.
- Wallet activity is public data about other people. Report it as data and do not give trade instructions based on it.
