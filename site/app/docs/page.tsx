import Link from "next/link";
import ApiPlayground from "./ApiPlayground";
import CodeBlock, { CodeTabs } from "./components/CodeBlock";
import EndpointDoc from "./components/EndpointDoc";

export const metadata = {
  title: "Docs | KolQuest — API, MCP & Technical Writeup",
  description:
    "KolQuest documentation — REST API reference, MCP server setup, and technical writeup on reverse-engineering KolScan.",
};

/* ── Shared Components ─────────────────────────────── */

function SectionNav({ items }: { items: { id: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2 mb-10">
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-card border border-border text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
        >
          {item.label}
        </a>
      ))}
    </div>
  );
}

function InfoCard({
  icon,
  title,
  children,
  variant = "default",
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
  variant?: "default" | "warning" | "success";
}) {
  const styles = {
    default: "border-border bg-bg-card",
    warning: "border-amber-500/30 bg-amber-500/5",
    success: "border-emerald-500/30 bg-emerald-500/5",
  };
  return (
    <div className={`rounded-xl border p-4 ${styles[variant]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <h4 className="font-semibold text-white text-sm">{title}</h4>
      </div>
      <div className="text-zinc-400 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function ErrorCodeTable() {
  const errors = [
    { code: 400, name: "Bad Request", description: "Invalid request parameters or malformed JSON" },
    { code: 401, name: "Unauthorized", description: "Authentication required or invalid credentials" },
    { code: 403, name: "Forbidden", description: "Insufficient permissions for this resource" },
    { code: 404, name: "Not Found", description: "Resource not found" },
    { code: 429, name: "Too Many Requests", description: "Rate limit exceeded — slow down" },
    { code: 500, name: "Internal Error", description: "Server error — try again later" },
    { code: 502, name: "Bad Gateway", description: "Upstream API error" },
    { code: 503, name: "Service Unavailable", description: "Service temporarily unavailable" },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-border">
            <th className="pb-3 pr-4 text-zinc-500 font-medium">Code</th>
            <th className="pb-3 pr-4 text-zinc-500 font-medium">Name</th>
            <th className="pb-3 text-zinc-500 font-medium">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {errors.map((e) => (
            <tr key={e.code}>
              <td className="py-3 pr-4">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold ${
                    e.code < 400
                      ? "bg-emerald-500/10 text-emerald-400"
                      : e.code < 500
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {e.code}
                </span>
              </td>
              <td className="py-3 pr-4 text-white font-mono text-xs">{e.name}</td>
              <td className="py-3 text-zinc-400">{e.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function McpTool({
  name,
  desc,
  params,
}: {
  name: string;
  desc: string;
  params?: { name: string; type: string; desc: string; required?: boolean }[];
}) {
  return (
    <div className="bg-bg-card rounded-xl border border-border p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500/10 text-violet-400 ring-1 ring-inset ring-violet-500/20 uppercase tracking-wider">
          Tool
        </span>
        <code className="text-sm text-white font-mono">{name}</code>
      </div>
      <p className="text-zinc-400 text-sm mb-3">{desc}</p>
      {params && params.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left border-b border-border">
                <th className="pb-2 pr-4 text-zinc-500 font-medium">Param</th>
                <th className="pb-2 pr-4 text-zinc-500 font-medium">Type</th>
                <th className="pb-2 pr-4 text-zinc-500 font-medium">Description</th>
                <th className="pb-2 text-zinc-500 font-medium">Required</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {params.map((p) => (
                <tr key={p.name}>
                  <td className="py-2 pr-4 text-violet-400 font-mono">{p.name}</td>
                  <td className="py-2 pr-4 text-zinc-500 font-mono">{p.type}</td>
                  <td className="py-2 pr-4 text-zinc-400">{p.desc}</td>
                  <td className="py-2 text-zinc-500">{p.required ? "✓" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="text-xs overflow-x-auto !bg-bg-secondary rounded-lg p-3">
      <code className="text-emerald-400">{children}</code>
    </pre>
  );
}

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
    <div className="relative pl-10 pb-10 border-l border-border last:border-l-0 last:pb-0 group">
      <div className="absolute -left-[13px] top-0 w-[26px] h-[26px] rounded-full bg-bg-card border-2 border-buy/60 text-buy text-[11px] font-bold flex items-center justify-center group-last:border-buy">
        {n}
      </div>
      <h3 className="text-white font-semibold text-[15px] mb-2 leading-snug">{title}</h3>
      <div className="text-zinc-400 text-sm space-y-3 leading-relaxed">{children}</div>
    </div>
  );
}

function Pill({ children, variant = "green" }: { children: React.ReactNode; variant?: "green" | "red" | "yellow" | "zinc" }) {
  const styles = {
    green: "bg-emerald-500/8 text-emerald-400 ring-emerald-500/20",
    red: "bg-red-500/8 text-red-400 ring-red-500/20",
    yellow: "bg-amber-500/8 text-amber-400 ring-amber-500/20",
    zinc: "bg-zinc-500/8 text-zinc-400 ring-zinc-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${styles[variant]}`}>
      {children}
    </span>
  );
}

/* ── Page ───────────────────────────────────────────── */

export default function DocsPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 animate-fade-in">
      {/* Hero */}
      <div className="mb-12">
        <Link href="/" className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-white text-sm mb-6 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back to home
        </Link>
        <div className="inline-flex items-center gap-2 bg-bg-card border border-border rounded-full px-4 py-1.5 mb-6 block">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-xs text-zinc-400 font-medium">Documentation</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 tracking-tight leading-[1.1]">
          KolQuest <span className="gradient-text">Docs</span>
        </h1>
        <p className="text-zinc-400 text-base max-w-2xl leading-relaxed">
          REST API reference, MCP server integration, and the technical writeup
          on how we reverse-engineered KolScan.
        </p>
      </div>

      <SectionNav
        items={[
          { id: "getting-started", label: "Getting Started" },
          { id: "authentication", label: "Authentication" },
          { id: "rate-limits", label: "Rate Limits" },
          { id: "playground", label: "Playground" },
          { id: "endpoints", label: "Endpoints" },
          { id: "errors", label: "Error Codes" },
          { id: "mcp", label: "MCP Server" },
          { id: "writeup", label: "Technical Writeup" },
        ]}
      />

      {/* ═══════════════════════════════════════════════ */}
      {/*  Getting Started                               */}
      {/* ═══════════════════════════════════════════════ */}
      <section id="getting-started" className="mb-20 scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-2">Getting Started</h2>
        <p className="text-zinc-400 text-sm mb-6">
          KolQuest provides a unified API for crypto wallet intelligence — KOL tracking, smart money analysis, and token data.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          <InfoCard icon="🌐" title="Base URL">
            <code className="text-buy">https://kol.quest/api</code>
            <p className="mt-1 text-xs">All endpoints are relative to this base URL.</p>
          </InfoCard>
          <InfoCard icon="📦" title="Response Format">
            All responses are JSON with consistent structure.
            <p className="mt-1 text-xs text-zinc-500">Content-Type: application/json</p>
          </InfoCard>
        </div>

        <h3 className="text-lg font-semibold text-white mb-3">Quick Example</h3>
        <CodeTabs
          examples={[
            {
              language: "curl",
              code: `# Get trending tokens
curl "https://kol.quest/api/trending?chain=sol&limit=10"

# Search wallets
curl "https://kol.quest/api/wallets?search=cented&limit=5"

# Get wallet details
curl "https://kol.quest/api/wallets/CyaE1Vxv..."`,
            },
            {
              language: "javascript",
              code: `// Fetch trending tokens
const trending = await fetch("https://kol.quest/api/trending?chain=sol")
  .then(res => res.json());

console.log(trending.tokens);

// Search for a KOL
const wallets = await fetch("https://kol.quest/api/wallets?search=satsdart")
  .then(res => res.json());

console.log(wallets.wallets[0]);`,
            },
            {
              language: "python",
              code: `import requests

# Get trending tokens
trending = requests.get("https://kol.quest/api/trending", 
    params={"chain": "sol", "limit": 10}
).json()

print(trending["tokens"])

# Search wallets
wallets = requests.get("https://kol.quest/api/wallets",
    params={"search": "satsdart"}
).json()

print(wallets["wallets"][0])`,
            },
          ]}
        />

        <div className="mt-8 p-4 rounded-xl bg-violet-500/5 border border-violet-500/20">
          <div className="flex items-start gap-3">
            <span className="text-xl">📄</span>
            <div>
              <h4 className="font-semibold text-white text-sm mb-1">OpenAPI Specification</h4>
              <p className="text-zinc-400 text-sm">
                Full OpenAPI 3.0 spec available at{" "}
                <a href="/api/openapi.json" target="_blank" className="text-accent hover:underline">
                  /api/openapi.json
                </a>
                {" "}— import into Postman, Insomnia, or generate client SDKs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════ */}
      {/*  Authentication                                */}
      {/* ═══════════════════════════════════════════════ */}
      <section id="authentication" className="mb-20 scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-2">Authentication</h2>
        <p className="text-zinc-400 text-sm mb-6">
          Most read endpoints are public. Write operations and user-specific features require authentication.
        </p>

        <div className="space-y-4 mb-8">
          <InfoCard icon="🔓" title="Public Endpoints">
            <p>Wallet listings, trending tokens, search, and token data are publicly accessible without authentication.</p>
          </InfoCard>
          <InfoCard icon="🔐" title="Authenticated Endpoints">
            <p>Watchlist, submissions, vouching, and admin features require a valid session cookie from signing in.</p>
          </InfoCard>
        </div>

        <h3 className="text-lg font-semibold text-white mb-3">Session-Based Auth</h3>
        <p className="text-zinc-400 text-sm mb-4">
          KolQuest uses session cookies for authentication. Sign in via the web UI using Solana wallet, Ethereum (SIWE), or email/password.
        </p>

        <CodeBlock
          language="bash"
          title="Check session"
          code={`# The session cookie is automatically sent by browsers
# For programmatic access, include credentials:

curl -X GET "https://kol.quest/api/watchlist" \\
  -b "session=your-session-cookie"`}
        />

        <div className="mt-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <div className="flex items-start gap-3">
            <span className="text-xl">🔑</span>
            <div>
              <h4 className="font-semibold text-white text-sm mb-1">API Keys (Coming Soon)</h4>
              <p className="text-zinc-400 text-sm">
                API key authentication for external integrations and bots is on the roadmap.
                Keys will be managed from your profile dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════ */}
      {/*  Rate Limits                                   */}
      {/* ═══════════════════════════════════════════════ */}
      <section id="rate-limits" className="mb-20 scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-2">Rate Limits</h2>
        <p className="text-zinc-400 text-sm mb-6">
          Requests are rate-limited to ensure fair usage and service stability.
        </p>

        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-border">
                <th className="pb-3 pr-4 text-zinc-500 font-medium">Tier</th>
                <th className="pb-3 pr-4 text-zinc-500 font-medium">Limit</th>
                <th className="pb-3 text-zinc-500 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="py-3 pr-4 text-white">Anonymous</td>
                <td className="py-3 pr-4 text-zinc-400">60 req/min</td>
                <td className="py-3 text-zinc-500">Per IP address</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 text-white">Authenticated</td>
                <td className="py-3 pr-4 text-zinc-400">120 req/min</td>
                <td className="py-3 text-zinc-500">Per user account</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 text-white">Search</td>
                <td className="py-3 pr-4 text-zinc-400">30 req/min</td>
                <td className="py-3 text-zinc-500">Search endpoints only</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-white mb-3">Rate Limit Headers</h3>
        <p className="text-zinc-400 text-sm mb-4">
          Check response headers to monitor your rate limit status.
        </p>

        <CodeBlock
          language="bash"
          code={`X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1712678400`}
        />

        <div className="mt-6 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <h4 className="font-semibold text-white text-sm mb-1">429 Too Many Requests</h4>
              <p className="text-zinc-400 text-sm">
                If you exceed the rate limit, you&apos;ll receive a 429 response.
                Wait for the reset time before retrying.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════ */}
      {/*  API Playground                                */}
      {/* ═══════════════════════════════════════════════ */}
      <section id="playground" className="mb-20 scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-2">API Playground</h2>
        <p className="text-zinc-400 text-sm mb-6">
          Try the API live. Pick an endpoint, customize parameters, and send requests directly from your browser.
        </p>
        <div className="bg-bg-card rounded-2xl border border-border p-5 sm:p-6">
          <ApiPlayground />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════ */}
      {/*  API Endpoints                                 */}
      {/* ═══════════════════════════════════════════════ */}
      <section id="endpoints" className="mb-20 scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-2">API Endpoints</h2>
        <p className="text-zinc-400 text-sm mb-6">
          Complete endpoint reference. Click an endpoint to expand details, parameters, and code examples.
        </p>

        {/* Wallets */}
        <div className="mb-10">
          <h3 className="text-lg font-semibold text-white mb-1">Wallets</h3>
          <p className="text-zinc-500 text-xs mb-4">KOL and smart money wallet data from KolScan and GMGN.</p>
          <div className="space-y-3">
            <EndpointDoc
              method="GET"
              path="/api/wallets"
              description="List all wallets with filtering, sorting, and pagination."
              params={[
                { name: "chain", type: "string", description: "Filter by chain (sol, bsc, all)", default: "all" },
                { name: "source", type: "string", description: "Filter by source (kolscan, gmgn, all)", default: "all" },
                { name: "category", type: "string", description: "Filter by category (kol, smart_degen, etc.)" },
                { name: "search", type: "string", description: "Search by name, address, or twitter" },
                { name: "sort", type: "string", description: "Sort field (profit_7d, winrate_7d, etc.)", default: "profit_7d" },
                { name: "order", type: "string", description: "Sort order (asc, desc)", default: "desc" },
                { name: "page", type: "number", description: "Page number", default: "1" },
                { name: "limit", type: "number", description: "Results per page (max 100)", default: "50" },
                { name: "minProfit", type: "number", description: "Minimum 7-day profit threshold" },
                { name: "tag", type: "string", description: "Filter by tag (e.g., kolscan)" },
              ]}
              responses={[
                { code: 200, description: "Success — returns wallets array with pagination metadata" },
              ]}
            />
            <EndpointDoc
              method="GET"
              path="/api/wallets/{address}"
              description="Get detailed data for a specific wallet including trades and PnL."
              params={[
                { name: "address", type: "string", required: true, description: "Wallet address" },
              ]}
              responses={[
                { code: 200, description: "Wallet data with trades" },
                { code: 404, description: "Wallet not found" },
              ]}
            />
            <EndpointDoc
              method="GET"
              path="/api/search"
              description="Global search across wallets and tokens."
              params={[
                { name: "q", type: "string", required: true, description: "Search query" },
                { name: "type", type: "string", description: "Type filter (wallet, token, all)", default: "all" },
                { name: "limit", type: "number", description: "Max results", default: "20" },
              ]}
              responses={[
                { code: 200, description: "Search results" },
              ]}
            />
          </div>
        </div>

        {/* Tokens */}
        <div className="mb-10">
          <h3 className="text-lg font-semibold text-white mb-1">Tokens</h3>
          <p className="text-zinc-500 text-xs mb-4">Token data — trending, security analysis, smart money activity.</p>
          <div className="space-y-3">
            <EndpointDoc
              method="GET"
              path="/api/trending"
              description="Get trending tokens based on smart money activity."
              params={[
                { name: "source", type: "string", description: "Data source (aggregated, db)", default: "aggregated" },
                { name: "chain", type: "string", description: "Filter by chain (sol, bsc, eth)" },
                { name: "category", type: "string", description: "Token category filter" },
                { name: "timeframe", type: "string", description: "Trending period (1h, 24h, 7d)", default: "24h" },
                { name: "limit", type: "number", description: "Number of results (max 100)", default: "50" },
                { name: "minLiquidity", type: "number", description: "Minimum liquidity filter ($USD)" },
                { name: "hideRugs", type: "boolean", description: "Hide flagged tokens", default: "false" },
              ]}
              responses={[
                { code: 200, description: "Trending tokens with source metadata" },
              ]}
            />
            <EndpointDoc
              method="GET"
              path="/api/token"
              description="Get smart money trading activity for a specific token."
              params={[
                { name: "token", type: "string", required: true, description: "Token contract address" },
                { name: "chain", type: "string", description: "Blockchain", default: "sol" },
              ]}
              responses={[
                { code: 200, description: "Token activity with wallet breakdown" },
                { code: 400, description: "Token param required" },
              ]}
            />
            <EndpointDoc
              method="GET"
              path="/api/token/{chain}/{address}"
              description="Comprehensive token details — price, holders, trading history."
              params={[
                { name: "chain", type: "string", required: true, description: "Blockchain (sol, bsc, eth)" },
                { name: "address", type: "string", required: true, description: "Token contract address" },
              ]}
              responses={[
                { code: 200, description: "Token details" },
                { code: 404, description: "Token not found" },
              ]}
            />
            <EndpointDoc
              method="GET"
              path="/api/token/{chain}/{address}/security"
              description="Security analysis — honeypot detection, holder distribution, contract risks."
              params={[
                { name: "chain", type: "string", required: true, description: "Blockchain" },
                { name: "address", type: "string", required: true, description: "Token contract address" },
              ]}
              responses={[
                { code: 200, description: "Security analysis results" },
              ]}
            />
          </div>
        </div>

        {/* Trades */}
        <div className="mb-10">
          <h3 className="text-lg font-semibold text-white mb-1">Trades</h3>
          <p className="text-zinc-500 text-xs mb-4">Real-time trade feed from tracked smart money wallets.</p>
          <div className="space-y-3">
            <EndpointDoc
              method="GET"
              path="/api/trades"
              description="Get recent trades from tracked wallets."
              params={[
                { name: "chain", type: "string", description: "Filter by chain (sol, bsc)" },
                { name: "wallet", type: "string", description: "Filter by wallet address" },
                { name: "token", type: "string", description: "Filter by token address" },
                { name: "type", type: "string", description: "Trade type (buy, sell)" },
                { name: "limit", type: "number", description: "Max results", default: "50" },
                { name: "since", type: "string", description: "ISO timestamp — trades after this time" },
              ]}
              responses={[
                { code: 200, description: "Trade feed" },
              ]}
            />
          </div>
        </div>

        {/* Social */}
        <div className="mb-10">
          <h3 className="text-lg font-semibold text-white mb-1">Social</h3>
          <p className="text-zinc-500 text-xs mb-4">X/Twitter integration for KOL tracking.</p>
          <div className="space-y-3">
            <EndpointDoc
              method="GET"
              path="/api/x-tracker"
              description="Get KOLs tracked via GMGN's X tracker — smart money linked to X accounts."
              responses={[
                { code: 200, description: "X tracker data" },
              ]}
            />
            <EndpointDoc
              method="GET"
              path="/api/x-profiles"
              description="X profile metadata for tracked KOLs."
              responses={[
                { code: 200, description: "X profiles" },
              ]}
            />
          </div>
        </div>

        {/* User */}
        <div className="mb-10">
          <h3 className="text-lg font-semibold text-white mb-1">User (Authenticated)</h3>
          <p className="text-zinc-500 text-xs mb-4">Authenticated user features — requires session cookie.</p>
          <div className="space-y-3">
            <EndpointDoc
              method="GET"
              path="/api/watchlist"
              description="Get the authenticated user's watchlist."
              responses={[
                { code: 200, description: "Watchlist entries" },
                { code: 401, description: "Unauthorized" },
              ]}
            />
            <EndpointDoc
              method="POST"
              path="/api/watchlist"
              description="Add a wallet to the user's watchlist."
              bodyParams={[
                { name: "walletAddress", type: "string", required: true, description: "Wallet address to watch" },
                { name: "chain", type: "string", required: true, description: "Blockchain (sol, bsc)" },
                { name: "label", type: "string", description: "Custom label" },
                { name: "groupName", type: "string", description: "Group name for organization" },
              ]}
              responses={[
                { code: 200, description: "Added to watchlist" },
                { code: 401, description: "Unauthorized" },
              ]}
            />
            <EndpointDoc
              method="DELETE"
              path="/api/watchlist"
              description="Remove a wallet from the user's watchlist."
              bodyParams={[
                { name: "walletAddress", type: "string", required: true, description: "Wallet address to remove" },
              ]}
              responses={[
                { code: 200, description: "Removed" },
                { code: 401, description: "Unauthorized" },
              ]}
            />
          </div>
        </div>

        {/* Community */}
        <div className="mb-10">
          <h3 className="text-lg font-semibold text-white mb-1">Community</h3>
          <p className="text-zinc-500 text-xs mb-4">Community wallet submissions and vouching.</p>
          <div className="space-y-3">
            <EndpointDoc
              method="GET"
              path="/api/submissions"
              description="List community-submitted wallets."
              responses={[
                { code: 200, description: "Submissions list" },
              ]}
            />
            <EndpointDoc
              method="POST"
              path="/api/submissions"
              description="Submit a new wallet for community review."
              bodyParams={[
                { name: "walletAddress", type: "string", required: true, description: "Wallet address" },
                { name: "chain", type: "string", required: true, description: "Blockchain" },
                { name: "label", type: "string", required: true, description: "Wallet label/name" },
                { name: "notes", type: "string", description: "Additional notes" },
                { name: "twitter", type: "string", description: "Twitter handle" },
                { name: "telegram", type: "string", description: "Telegram channel" },
              ]}
              responses={[
                { code: 201, description: "Submission created" },
                { code: 401, description: "Unauthorized" },
              ]}
            />
            <EndpointDoc
              method="POST"
              path="/api/submissions/{id}/vouch"
              description="Vouch for a pending wallet submission."
              params={[
                { name: "id", type: "string", required: true, description: "Submission ID" },
              ]}
              responses={[
                { code: 200, description: "Vouched" },
                { code: 401, description: "Unauthorized" },
              ]}
            />
          </div>
        </div>

        {/* System */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">System</h3>
          <p className="text-zinc-500 text-xs mb-4">Health and status endpoints.</p>
          <div className="space-y-3">
            <EndpointDoc
              method="GET"
              path="/api/health"
              description="API health check with data source status."
              responses={[
                { code: 200, description: "Healthy" },
              ]}
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════ */}
      {/*  Error Codes                                   */}
      {/* ═══════════════════════════════════════════════ */}
      <section id="errors" className="mb-20 scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-2">Error Codes</h2>
        <p className="text-zinc-400 text-sm mb-6">
          Standard HTTP status codes with consistent error response format.
        </p>

        <div className="bg-bg-card rounded-xl border border-border p-5 sm:p-6 mb-6">
          <ErrorCodeTable />
        </div>

        <h3 className="text-lg font-semibold text-white mb-3">Error Response Format</h3>
        <CodeBlock
          language="json"
          code={`{
  "error": "RATE_LIMITED",
  "message": "Too many requests. Please slow down.",
  "retryAfter": 30
}`}
        />
      </section>

      {/* ═══════════════════════════════════════════════ */}
      {/*  MCP Server                                    */}
      {/* ═══════════════════════════════════════════════ */}
      <section id="mcp" className="mb-20 scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-2">MCP Server</h2>
        <p className="text-zinc-400 text-sm mb-3">
          Expose wallet intelligence via the{" "}
          <a href="https://modelcontextprotocol.io" target="_blank" className="text-accent hover:underline">
            Model Context Protocol
          </a>{" "}
          for use in AI assistants (Claude, Copilot, Cursor, etc.). Communicates over JSON-RPC via stdio.
        </p>
        <Code>{`# Run the MCP server
bun mcp/index.ts

# Claude Desktop config (~/.config/claude/claude_desktop_config.json)
{
  "mcpServers": {
    "kolquest": {
      "command": "bun",
      "args": ["mcp/index.ts"],
      "cwd": "/path/to/kol-quest"
    }
  }
}`}</Code>

        <div className="mt-8 space-y-4">
          <h3 className="text-lg font-semibold text-white mb-1">Available Tools</h3>
          <p className="text-zinc-500 text-xs mb-4">Each tool is callable by the AI assistant through the MCP protocol.</p>

          <McpTool
            name="kolscan_leaderboard"
            desc="Get KolScan KOL leaderboard. Returns wallets ranked by profit, win rate, or other metrics."
            params={[
              { name: "timeframe", type: "number", desc: "1 (daily), 7 (weekly), 30 (monthly)" },
              { name: "sort", type: "string", desc: "profit, wins, losses, winrate, name" },
              { name: "order", type: "string", desc: "asc or desc" },
              { name: "limit", type: "number", desc: "Max results (1-100)" },
              { name: "search", type: "string", desc: "Search by name or wallet address" },
            ]}
          />
          <McpTool
            name="kolscan_wallet"
            desc="Get detailed KolScan data for a specific wallet — stats, rankings, and PnL across all timeframes."
            params={[
              { name: "address", type: "string", desc: "Wallet address to look up", required: true },
            ]}
          />
          <McpTool
            name="gmgn_wallets"
            desc="Get GMGN smart money wallets. Supports Solana and BSC with category filtering."
            params={[
              { name: "chain", type: "string", desc: "sol or bsc" },
              { name: "category", type: "string", desc: "smart_degen, kol, snipe_bot, launchpad_smart, fresh_wallet, etc." },
              { name: "sort", type: "string", desc: "Sort field" },
              { name: "order", type: "string", desc: "asc or desc" },
              { name: "limit", type: "number", desc: "Max results (1-100)" },
              { name: "search", type: "string", desc: "Search by name, address, or twitter" },
            ]}
          />
          <McpTool
            name="gmgn_wallet_detail"
            desc="Get detailed GMGN data for a specific wallet — profit, trades, win rates, tags, and category."
            params={[
              { name: "address", type: "string", desc: "Wallet address to look up", required: true },
            ]}
          />
          <McpTool
            name="wallet_stats"
            desc="Aggregate statistics across all data sources — total wallets, top performers, category breakdowns."
          />
          <McpTool
            name="search_wallets"
            desc="Search across all data sources (KolScan + GMGN Solana + GMGN BSC) by name, address, or twitter."
            params={[
              { name: "query", type: "string", desc: "Search query", required: true },
              { name: "limit", type: "number", desc: "Max results" },
            ]}
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════ */}
      {/*  Technical Writeup                             */}
      {/* ═══════════════════════════════════════════════ */}
      <section id="writeup" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-2">Technical Writeup</h2>
        <p className="text-zinc-400 text-sm mb-2">
          How we scraped 472 Solana KOL wallets from kolscan.io by reverse-engineering their Next.js app,
          discovering a hidden POST API, and using Playwright to bypass session protection.
        </p>
        <div className="flex items-center gap-2 flex-wrap mb-10">
          <Pill>1,304 entries</Pill>
          <Pill>472 wallets</Pill>
          <Pill>3 timeframes</Pill>
          <Pill variant="yellow">Next.js</Pill>
          <Pill variant="yellow">POST API</Pill>
          <Pill variant="yellow">Playwright</Pill>
        </div>

        {/* Schema */}
        <div className="mb-12">
          <h3 className="text-lg font-semibold text-white mb-1">Data Schema</h3>
          <p className="text-zinc-500 text-sm mb-5">Each entry in the scraped dataset contains these fields.</p>
          <div className="bg-bg-card rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wider">Field</th>
                  <th className="px-5 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wider">Type</th>
                  <th className="px-5 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wider hidden sm:table-cell">Description</th>
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
                  ["timeframe", "number", "1 = Daily, 7 = Weekly, 30 = Monthly"],
                ].map(([field, type, desc]) => (
                  <tr key={field} className="hover:bg-bg-hover/50 transition-colors">
                    <td className="px-5 py-3 text-buy font-mono text-xs">{field}</td>
                    <td className="px-5 py-3 text-zinc-500 font-mono text-xs">{type}</td>
                    <td className="px-5 py-3 text-zinc-400 hidden sm:table-cell text-xs">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* GMGN Import */}
        <div className="relative bg-bg-card rounded-2xl p-6 sm:p-8 mb-12 border border-border overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📦</span>
              <h3 className="text-lg font-bold text-white">GMGN.ai Import Ready</h3>
            </div>
            <p className="text-zinc-400 text-sm mb-5">
              All 472 wallets are pre-formatted for{" "}
              <a href="https://gmgn.ai/r/nichxbt" target="_blank" className="text-buy hover:text-buy-light underline underline-offset-2 decoration-buy/30">
                GMGN bulk import
              </a>
              . Paste the JSON from{" "}
              <code className="text-buy bg-bg-hover px-1.5 py-0.5 rounded text-xs font-mono">output/gmgn-import.json</code>.
            </p>
            <Code>{`[
  { "address": "CyaE1Vxv...", "name": "Cented", "emoji": "🐋" },
  { "address": "Bi4rd5FH...", "name": "theo",   "emoji": "💰" },
  ...
]`}</Code>
            <div className="flex items-center gap-4 mt-4 text-xs text-zinc-500">
              <span>🐋 100+ SOL</span>
              <span>🔥 50+</span>
              <span>💰 20+</span>
              <span>✅ positive</span>
              <span>📉 negative</span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-1">The Process</h3>
          <p className="text-zinc-500 text-sm mb-8">Step-by-step reverse engineering, from initial recon to full data extraction.</p>
        </div>

        <div className="space-y-0">
          <Step n={1} title="Initial Recon — What framework is this?">
            <p>First step: fetch the raw HTML and identify the tech stack.</p>
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
              <Pill variant="zinc">400</Pill> means the endpoints <em>exist</em> but reject GET requests.{" "}
              <Pill variant="yellow">401</Pill> on the API subdomain means auth required.
            </p>
          </Step>

          <Step n={3} title="Identifying JavaScript Bundles">
            <p>Extracted all script chunk URLs from the page source:</p>
            <Code>{`curl -s 'https://kolscan.io/leaderboard' \\
  | grep -oE '"[^"]*/_next/static/chunks/[^"]*"'`}</Code>
            <p>Found key chunks including:</p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400">
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
              Key discovery: <Pill variant="yellow">POST not GET</Pill>. Parameters:{" "}
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
              <Pill variant="red">Forbidden</Pill> — The API requires a valid browser
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
              Extracted <Pill>616 entries</Pill> from the HTML — but only the first
              page per timeframe, and many had missing fields due to regex limits.
            </p>
          </Step>

          <Step n={8} title="Understanding the Scroll Mechanism">
            <p>By reading the full page chunk (~14KB), we found:</p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400">
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
            <p>Full data saved to JSON with GMGN-compatible import format generated automatically.</p>
          </Step>
        </div>

        {/* Key Lessons */}
        <div className="mt-16 bg-bg-card rounded-2xl border border-border p-6 sm:p-8">
          <h3 className="text-lg font-bold text-white mb-5">Key Takeaways</h3>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            {[
              ["Check the HTTP method", "This API only accepts POST, not GET"],
              ["Read the JS source", "Minified code still reveals exact API signatures"],
              ["Protected APIs need browsers", "Headless browsers bypass cookie/session protection"],
              ["Scroll containers matter", "Infinite scroll often binds to a specific element"],
              ["SSR data is free", "Next.js embeds initial page data in HTML as React props"],
              ["Shared chunks hold API helpers", "Look in numbered chunks (184-*.js) for fetch calls"],
            ].map(([title, desc]) => (
              <div key={title} className="flex items-start gap-3 bg-bg-hover/50 rounded-xl p-3">
                <div className="w-1.5 h-1.5 rounded-full bg-buy mt-2 shrink-0" />
                <div>
                  <span className="text-white font-medium text-[13px]">{title}</span>
                  <p className="text-zinc-500 text-xs mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
