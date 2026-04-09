import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import MobileNav from "./components/MobileNav";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://kol.quest"),
  title: {
    default: "KolQuest — Smart Wallet Intelligence",
    template: "%s | KolQuest",
  },
  description:
    "Track the smartest crypto wallets — KolScan KOLs, GMGN smart money, Solana & BSC. Leaderboards, analytics, and copy-trade tools.",
  keywords: [
    "crypto wallet tracker",
    "smart money",
    "KOL wallets",
    "Solana wallets",
    "BSC wallets",
    "GMGN",
    "KolScan",
    "copy trade",
    "wallet analytics",
    "crypto leaderboard",
    "degen wallets",
    "sniper wallets",
  ],
  robots: { index: true, follow: true },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "KolQuest",
    title: "KolQuest — Smart Wallet Intelligence",
    description:
      "Track the smartest crypto wallets. KolScan KOLs, GMGN smart money, Solana & BSC leaderboards.",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "KolQuest" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "KolQuest — Smart Wallet Intelligence",
    description:
      "Track the smartest crypto wallets. KolScan KOLs, GMGN smart money, Solana & BSC leaderboards.",
    images: ["/api/og"],
  },
};

function NavDropdown({
  label,
  items,
  liveBadge,
}: {
  label: string;
  items: { href: string; label: string; desc?: string; external?: boolean; live?: boolean }[];
  liveBadge?: boolean;
}) {
  return (
    <div className="relative group">
      <button className="px-2.5 py-1 rounded text-xs text-zinc-500 hover:text-white hover:bg-bg-hover transition-all duration-150 flex items-center gap-1.5 font-mono uppercase tracking-wider">
        {label}
        {liveBadge && <span className="w-1.5 h-1.5 rounded-full bg-buy animate-pulse" />}
        <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="m19 9-7 7-7-7"/></svg>
      </button>
      <div className="absolute top-full left-0 pt-1 hidden group-hover:block z-50">
        <div className="bg-bg-card border border-border rounded shadow-elevated py-1 min-w-[210px]">
          {items.map((item) => {
            const inner = (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{item.label}</span>
                  {item.live && <span className="w-1.5 h-1.5 rounded-full bg-buy animate-pulse" />}
                  {item.external && (
                    <svg className="w-3 h-3 opacity-40 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                      <polyline points="15,3 21,3 21,9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  )}
                </div>
                {item.desc && <span className="block text-[11px] text-zinc-600 mt-0.5">{item.desc}</span>}
              </>
            );
            if (item.external) {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-3 py-2 text-xs text-zinc-500 hover:text-white hover:bg-bg-hover transition-colors"
                >
                  {inner}
                </a>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className="block px-4 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-bg-hover transition-colors"
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

async function Nav() {
  let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch {
    // DB not available — show unauthenticated nav
  }

  return (
    <nav className="sticky top-0 z-50 bg-bg-primary/95 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-6 h-6 rounded bg-white flex items-center justify-center text-black font-bold text-xs">
              K
            </div>
            <span className="text-white font-semibold text-xs tracking-widest font-mono uppercase">
              KOL<span className="text-zinc-600">QUEST</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-0">
            <NavDropdown
              label="KolScan"
              items={[
                { href: "/leaderboard", label: "Leaderboard", desc: "All KOLs ranked by profit" },
                { href: "/top-performers", label: "Top Win Rate", desc: "Best win rate KOLs" },
                { href: "/most-profitable", label: "Most Profitable", desc: "Highest profit KOLs" },
              ]}
            />
            <NavDropdown
              label="GMGN"
              items={[
                { href: "/gmgn-sol", label: "Solana Wallets", desc: "Smart money on Solana" },
                { href: "/bsc", label: "BSC Wallets", desc: "Smart money on BNB Chain" },
              ]}
            />
            <NavDropdown
              label="Tools"
              liveBadge
              items={[
                { href: "/feed", label: "Feed", desc: "Live wallet activity", live: true },
                { href: "/monitor", label: "Monitor", desc: "GMGN-style live wallet monitor", live: true },
                { href: "/track", label: "Track", desc: "New tokens from tracked wallets" },
                { href: "/tracker", label: "Wallet Tracker", desc: "Your tracked wallet portfolio" },
                { href: "/all-solana", label: "All Solana", desc: "Combined deduplicated wallets" },
              ]}
            />
            <Link
              href="/docs"
              className="px-2.5 py-1 rounded text-xs text-zinc-500 hover:text-white hover:bg-bg-hover transition-all duration-150 font-mono uppercase tracking-wider"
            >
              Docs
            </Link>
            <Link
              href="/community"
              className="px-2.5 py-1 rounded text-xs text-zinc-500 hover:text-white hover:bg-bg-hover transition-all duration-150 font-mono uppercase tracking-wider"
            >
              Community
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MobileNav userLabel={session?.user ? `Account (${(session.user as Record<string, unknown>).username || session.user.name || "user"})` : undefined} />
          <Link
            href="/submit"
            className="hidden sm:inline-flex items-center gap-1.5 bg-bg-card hover:bg-bg-hover border border-border rounded px-2.5 py-1 text-[11px] text-zinc-500 hover:text-white transition-all duration-150 font-mono uppercase tracking-wider"
          >
            Submit
          </Link>
          <Link
            href="/auth"
            className="hidden md:inline-flex items-center gap-1.5 bg-white text-black hover:bg-zinc-200 rounded px-2.5 py-1 text-[11px] font-mono font-semibold uppercase tracking-wider transition-all duration-150"
          >
            {session?.user ? `Account (${(session.user as Record<string, unknown>).username || session.user.name || "user"})` : "Sign in"}
          </Link>
        </div>
      </div>
    </nav>
  );
}

function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border">
      <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-[11px] font-mono font-semibold uppercase tracking-widest text-zinc-600 hover:text-white transition-colors">
            KOLQUEST
          </Link>
          <div className="flex items-center gap-4 text-[11px] text-zinc-700">
            <Link href="/leaderboard" className="hover:text-zinc-400 transition-colors">Leaderboard</Link>
            <Link href="/all-solana" className="hover:text-zinc-400 transition-colors">Solana</Link>
            <Link href="/bsc" className="hover:text-zinc-400 transition-colors">BSC</Link>
            <Link href="/docs" className="hover:text-zinc-400 transition-colors">Docs</Link>
            <a href="https://github.com/nirholas/scrape-kolscan-wallets" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">GitHub</a>
          </div>
        </div>
        <p className="text-[11px] text-zinc-800 font-mono">© {year} KolQuest</p>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="theme-color" content="#0a0a0b" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-icon.svg" />
      </head>
      <body>
        <Nav />
        <div className="min-h-[calc(100vh-3rem)]">
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
