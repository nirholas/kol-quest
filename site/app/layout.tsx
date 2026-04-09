import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "KolScan Explorer — Reverse-Engineered Leaderboard Scraper",
  description:
    "472 Solana KOL wallets scraped from kolscan.io with full reverse-engineering writeup",
};

function Nav() {
  return (
    <nav className="sticky top-0 z-50 bg-bg-primary/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-white font-bold text-lg tracking-tight">
            KolScan<span className="text-buy"> Explorer</span>
          </Link>
          <div className="hidden sm:flex items-center gap-4 text-sm">
            <Link
              href="/"
              className="text-muted hover:text-white transition-colors"
            >
              Writeup
            </Link>
            <Link
              href="/leaderboard"
              className="text-muted hover:text-white transition-colors"
            >
              Leaderboard
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted hidden sm:block">472 wallets scraped</span>
          <a
            href="https://github.com/nirholas/scrape-kolscan-wallets"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-bg-card border border-border rounded-lg px-3 py-1.5 text-white hover:bg-bg-hover transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </nav>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Nav />
        {children}
      </body>
    </html>
  );
}
