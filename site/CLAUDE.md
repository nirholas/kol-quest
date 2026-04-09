## Terminal Management

- **Always use background terminals** (`isBackground: true`) for every command so a terminal ID is returned
- **Always kill the terminal** after the command completes, whether it succeeds or fails — never leave terminals open
- Do not reuse foreground shell sessions — stale sessions block future terminal operations in Codespaces
- In GitHub Codespaces, agent-spawned terminals may be hidden — they still work. Do not assume a terminal is broken if you cannot see it
- If a terminal appears unresponsive, kill it and create a new one rather than retrying in the same terminal

---

## Site-Specific Context

This is the Next.js 14 web application. Key paths:
- `app/` — pages and API routes (App Router)
- `lib/` — shared utilities, types, auth config
- `drizzle/db/schema.ts` — PostgreSQL schema
- `components/` — shared React components (inside `app/components/`)

### Commands (run from this directory)
```bash
npm run dev           # Start dev server on port 3000
npm run build         # Production build
npm run db:push       # Push schema to database
npm run db:generate   # Generate migration from schema changes
npm run ingest        # Batch import trades from JSON
npm run ingest:poll   # Poll GMGN API for live trades
```

### Code Quality
- **No lazy shortcuts.** Complete implementations, no TODOs, no stubs.
- **TypeScript strictly.** No `any` unless documented. Fix type errors before committing.
- **Validate at boundaries.** All API routes use Zod for input validation.
- **Follow patterns.** Check how similar features work before adding new code.
- **Test your changes.** Run `npx tsc --noEmit` to verify no type errors.
