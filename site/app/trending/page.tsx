import type { Metadata } from "next";
import TrendingClient from "./TrendingClient";

export const metadata: Metadata = {
  title: "Trending Tokens — Multi-Source Aggregation",
  description:
    "Discover the hottest trending tokens across DexScreener, GeckoTerminal, CoinGecko, Birdeye, GMGN, and Jupiter. Real-time aggregation with trending scores.",
  openGraph: {
    title: "Trending Tokens | KolQuest",
    description:
      "Real-time aggregation of trending tokens from 6+ data sources. Filter by chain, category, and liquidity.",
  },
};

export default function TrendingPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Trending Tokens</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Aggregated from DexScreener, GeckoTerminal, CoinGecko, Birdeye, GMGN & Jupiter. Auto-refreshes every 60s.
        </p>
      </div>
      <TrendingClient />
    </main>
  );
}
