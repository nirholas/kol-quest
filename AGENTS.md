# AGENTS.md

Operating notes for AI coding agents (Claude Code, Codex, Cursor, Copilot and others) working in this repository. Everything here is derived from the files actually in the tree, so trust it over guesses, and update it when the facts change.

## What this repository is

Open-source smart money tracker & crypto KOL leaderboard - real-time trade feeds, wallet monitoring, P&L analytics, token discovery. Solana & BSC. Built with Next.js, TypeScript, PostgreSQL.

- Homepage: https://kol.quest
- Source: https://github.com/nirholas/kol-quest
- Primary language: TypeScript
- License: Other (see the LICENSE file)

## Repository layout

- `api/`
- `assets/`
- `docs/`
- `fetchers/`
- `mcp/`
- `output/`
- `site/`
- `tasks/`
- `README.md`
- `LICENSE`
- `CLAUDE.md`
- `package.json`

## Setup

```bash
npm install
```

## Commands

| Task | Command |
|---|---|
| dev | `npm run dev` |
| build | `npm run build` |

Run the test and lint commands above before you consider a change finished. If a command fails on code you did not touch, say so in your report instead of silently skipping it.

## Conventions

- `.env` files are gitignored; never commit credentials, and read configuration from environment variables.
- Commit messages follow Conventional Commits (`type(scope): summary`), matching the existing history.
- `CLAUDE.md` holds additional, more detailed operating rules; it takes precedence where the two overlap.
- Read the surrounding code before adding to it, and match its naming, file organisation and error-handling style.
- Keep `README.md` accurate: if a change alters behaviour, commands or configuration, update the docs in the same commit.
- Do not leave TODO comments, stub functions, placeholder data or commented-out code behind. Finish what you start or leave it out.
- Small, focused commits with a subject line that describes the change, not the act of committing.

## Where to raise things

- Bugs and feature requests: https://github.com/nirholas/kol-quest/issues
- Questions and ideas: https://github.com/nirholas/kol-quest/discussions
- Security issues: report privately at https://github.com/nirholas/kol-quest/security/advisories/new, never in a public issue.
