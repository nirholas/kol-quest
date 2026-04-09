import Link from "next/link";

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative pl-8 pb-8 border-l border-border last:border-l-0 last:pb-0">
      <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-buy text-black text-xs font-bold flex items-center justify-center">
        {n}
      </div>
      <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
      <div className="text-gray-400 text-sm space-y-3">{children}</div>
    </div>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="text-xs overflow-x-auto">
      <code className="text-green-400">{children}</code>
    </pre>
  );
}

function Badge({ children, color = "green" }: { children: React.ReactNode; color?: string }) {
  const cls = color === "red" ? "bg-red-500/10 text-red-400 border-red-500/20" :
    color === "yellow" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
    "bg-green-500/10 text-green-400 border-green-500/20";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs border ${cls}`}>
      {children}
    </span>
  );
}

export default function Home() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
          Reverse-Engineering{" "}
          <span className="text-buy glow-green">KolScan.io</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-6">
          How we scraped 472 Solana KOL wallets from kolscan.io&apos;s leaderboard
          by reverse-engineering their Next.js app, discovering a hidden POST API,
          and using Playwright to bypass Cloudflare protection.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Badge>1,304 entries</Badge>
          <Badge>472 unique wallets</Badge>
          <Badge>3 timeframes</Badge>
          <Badge color="yellow">Next.js App Router</Badge>
          <Badge color="yellow">POST API</Badge>
          <Badge color="yellow">Playwright</Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-16">
        {[
          { label: "Wallets", value: "472", sub: "unique addresses" },
          { label: "Daily", value: "434", sub: "entries" },
          { label: "Weekly", value: "435", sub: "entries" },
          { label: "Monthly", value: "435", sub: "entries" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-bg-card border border-border rounded-xl p-4 text-center"
          >
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-buy text-sm font-medium">{s.label}</div>
            <div className="text-muted text-xs">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="bg-bg-card border border-border rounded-xl p-6 mb-16 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-white font-semibold text-lg">View the full leaderboard</h2>
          <p className="text-muted text-sm">Sortable by profit, wins, losses, win rate</p>
        </div>
        <Link
          href="/leaderboard"
          className="bg-buy text-black font-semibold px-6 py-2.5 rounded-lg hover:bg-green-400 transition-colors whitespace-nowrap"
        >
          Open Leaderboard →
        </Link>
      </div>

      {/* Schema */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-white mb-4">Data Schema</h2>
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-muted font-medium">Field</th>
                <th className="px-4 py-3 text-muted font-medium">Type</th>
                <th className="px-4 py-3 text-muted font-medium hidden sm:table-cell">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["wallet_address", "string", "Solana wallet address"],
                ["name", "string", "KOL display name"],
                ["twitter", "string|null", "Twitter/X profile URL"],
                ["telegram", "string|null", "Telegram channel URL"],
                ["profit", "number", "Profit in SOL"],
                ["wins", "number", "Winning trades"],
                ["losses", "number", "Losing trades"],
                ["timeframe", "number", "1=Daily, 7=Weekly, 30=Monthly"],
              ].map(([field, type, desc]) => (
                <tr key={field} className="hover:bg-bg-hover transition-colors">
                  <td className="px-4 py-2.5 text-buy font-mono text-xs">{field}</td>
                  <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{type}</td>
                  <td className="px-4 py-2.5 text-gray-400 hidden sm:table-cell">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* GMGN Import */}
      <div className="bg-bg-card border border-border rounded-xl p-6 mb-16">
        <h2 className="text-xl font-bold text-white mb-2">📦 GMGN.ai Import Ready</h2>
        <p className="text-muted text-sm mb-4">
          All 472 wallets are pre-formatted for{" "}
          <a href="https://gmgn.ai/follow" target="_blank" className="text-buy hover:underline">
            GMGN bulk import
          </a>
          . Just paste the JSON from{" "}
          <code className="text-buy bg-bg-hover px-1 rounded text-xs">output/gmgn-import.json</code>.
        </p>
        <Code>{`[
  { "address": "CyaE1Vxv...", "name": "Cented", "emoji": "🐋" },
  { "address": "Bi4rd5FH...", "name": "theo",   "emoji": "💰" },
  ...
]`}</Code>
        <p className="text-muted text-xs mt-3">
          Emojis: 🐋 100+ SOL profit · 🔥 50+ · 💰 20+ · ✅ positive · 📉 negative
        </p>
      </div>

      {/* Timeline */}
      <h2 className="text-2xl font-bold text-white mb-8">
        The Reverse-Engineering Process
      </h2>

      <div className="space-y-0">
        <Step n={1} title="Initial Recon — What framework is this?">
          <p>
            First step: fetch the raw HTML and identify the tech stack.
          </p>
          <Code>{`curl -s 'https://kolscan.io/leaderboard' -o page.html
head -100 page.html`}</Code>
          <p>
            Found <code>/_next/static/chunks/</code> script tags — confirming it&apos;s a{" "}
            <strong className="text-white">Next.js</strong> application with App Router.
          </p>
        </Step>

        <Step n={2} title="Hunting for API Endpoints">
          <p>Tried common REST patterns with GET requests:</p>
          <Code>{`curl -s -o /dev/null -w "%{http_code}" 'https://kolscan.io/api/leaderboard'  → 400
curl -s -o /dev/null -w "%{http_code}" 'https://kolscan.io/api/kols'          → 400
curl -s -o /dev/null -w "%{http_code}" 'https://api.kolscan.io/'              → 401`}</Code>
          <p>
            <Badge>400</Badge> means the endpoints <em>exist</em> but reject GET requests.{" "}
            <Badge color="yellow">401</Badge> on the API subdomain means auth required.
          </p>
        </Step>

        <Step n={3} title="Identifying JavaScript Bundles">
          <p>Extracted all script chunk URLs from the page source:</p>
          <Code>{`curl -s 'https://kolscan.io/leaderboard' \\
  | grep -oE '"[^"]*/_next/static/chunks/[^"]*"'`}</Code>
          <p>Found key chunks including:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-400">
            <li><code>app/leaderboard/page-939ad755c42d8b9d.js</code> — the leaderboard page</li>
            <li><code>184-3d6ce3be6906820b.js</code> — shared API helper chunk</li>
          </ul>
        </Step>

        <Step n={4} title="Finding the API Call in Source Code">
          <p>Searched each JS chunk for <code>/api/</code> paths:</p>
          <Code>{`for chunk in 341-*.js 184-*.js 255-*.js; do
  curl -s "https://kolscan.io/_next/static/chunks/\${chunk}" \\
    | grep -oP '"/api/[^"]*"'
done`}</Code>
          <p>
            <strong className="text-white">Chunk 184</strong> contained the gold:{" "}
            <code>/api/trades</code>, <code>/api/tokens</code>,{" "}
            <code>/api/leaderboard</code>, <code>/api/data</code>
          </p>
        </Step>

        <Step n={5} title="Extracting the Exact Fetch Signature">
          <p>Pulled the surrounding code context to see the full fetch call:</p>
          <Code>{`curl -s '.../184-*.js' | grep -oP '.{0,200}/api/leaderboard.{0,200}'`}</Code>
          <p>Revealed the <strong className="text-white">exact implementation</strong>:</p>
          <Code>{`fetch("/api/leaderboard", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ timeframe: e, page: t, pageSize: n })
})`}</Code>
          <p>
            Key discovery: <Badge color="yellow">POST not GET</Badge>. Parameters:{" "}
            <code>timeframe</code> (1/7/30), <code>page</code> (0-indexed),{" "}
            <code>pageSize</code> (50).
          </p>
        </Step>

        <Step n={6} title="Direct POST Attempt — Blocked">
          <Code>{`curl -s -X POST 'https://kolscan.io/api/leaderboard' \\
  -H 'Content-Type: application/json' \\
  -d '{"timeframe":1,"page":0,"pageSize":50}'
→ Forbidden`}</Code>
          <p>
            <Badge color="red">Forbidden</Badge> — The API requires a valid browser
            session. Cookie/session-based protection prevents direct curl access.
          </p>
        </Step>

        <Step n={7} title="SSR Data Extraction — Partial Success">
          <p>
            Discovered the page server-renders initial data via the{" "}
            <code>initLeaderboard</code> React prop:
          </p>
          <Code>{`curl -s 'https://kolscan.io/leaderboard' \\
  | grep -oP '\\{[^}]*wallet_address[^}]*\\}' | head -5`}</Code>
          <p>
            Extracted <Badge>616 entries</Badge> from the HTML — but only the first
            page per timeframe, and many had missing fields due to regex limits.
          </p>
        </Step>

        <Step n={8} title="Understanding the Scroll Mechanism">
          <p>By reading the full page chunk (~14KB), we found:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-400">
            <li>Uses <code>react-infinite-scroll-component</code></li>
            <li>Scroll target: <code>scrollableTarget: &quot;mainScroll&quot;</code> (not window!)</li>
            <li>Page size hardcoded at 50</li>
            <li>Timeframes: <code>[1, 7, 30]</code> → Daily / Weekly / Monthly</li>
          </ul>
        </Step>

        <Step n={9} title="Playwright Headless Browser — First Fail">
          <p>
            Installed Playwright to get a real browser session. First attempt
            scrolled <code>window</code> — captured <strong className="text-sell">0 results</strong>.
          </p>
          <Code>{`// ❌ Wrong — infinite scroll listens on #mainScroll, not window
window.scrollTo(0, document.body.scrollHeight);`}</Code>
          <p>The infinite scroll component <em>only</em> triggers when <code>#mainScroll</code> is scrolled.</p>
        </Step>

        <Step n={10} title="The Fix — Scroll the Right Container">
          <Code>{`// ✅ Correct — scroll the actual container
const el = document.getElementById('mainScroll');
if (el) el.scrollTop = el.scrollHeight;`}</Code>
          <p>
            Combined with intercepting POST responses and clicking between
            Daily/Weekly/Monthly tabs, this captured{" "}
            <strong className="text-buy glow-green">all 1,304 entries</strong> across{" "}
            <strong className="text-buy glow-green">472 unique wallets</strong>.
          </p>
        </Step>

        <Step n={11} title="Final Result">
          <Code>{`Daily:   434 entries (9 pages × 50 + 34)
Weekly:  435 entries (8 pages × 50 + 35)
Monthly: 435 entries (8 pages × 50 + 35)
─────────────────────────────────────────
Total:   1,304 entries
Unique:  472 wallets`}</Code>
          <p>
            Full data saved to JSON with GMGN-compatible import format generated automatically.
          </p>
        </Step>
      </div>

      {/* Key Lessons */}
      <div className="mt-16 bg-bg-card border border-border rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Key Lessons</h2>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          {[
            ["Check the HTTP method", "This API only accepts POST, not GET"],
            ["Read the JS source", "Minified code still reveals exact API signatures"],
            ["Protected APIs need browsers", "Headless browsers bypass cookie/session protection"],
            ["Scroll containers matter", "Infinite scroll often binds to a specific element"],
            ["SSR data is free", "Next.js embeds initial page data in HTML as React props"],
            ["Shared chunks hold API helpers", "Look in numbered chunks (184-*.js) for fetch calls"],
          ].map(([title, desc]) => (
            <div key={title} className="flex gap-2">
              <span className="text-buy mt-0.5">→</span>
              <div>
                <span className="text-white font-medium">{title}</span>
                <span className="text-muted"> — {desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-border text-center text-muted text-sm">
        <p>
          Built by{" "}
          <a href="https://github.com/nirholas" className="text-buy hover:underline">
            @nirholas
          </a>{" "}
          ·{" "}
          <a
            href="https://github.com/nirholas/scrape-kolscan-wallets"
            className="text-buy hover:underline"
          >
            Source on GitHub
          </a>
        </p>
      </footer>
    </main>
  );
}
