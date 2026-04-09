import type { Metadata } from "next";
import TrendingClient from "./TrendingClient";

export const metadata: Metadata = {
  title: "Trending — What KOLs Are Buying",
  description:
    "See which tokens smart wallets and KOLs are buying right now. Aggregated from tracked wallet activity across Solana & BSC.",
  openGraph: {
    title: "Trending Tokens | KolQuest",
    description:
      "Real-time aggregation of what tracked smart wallets are buying.",
  },
};

export default function TrendingPage() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Trending Tokens</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Tokens being bought by the most tracked wallets in the last 24 hours.
        </p>
      </div>
      <TrendingClient />
    </main>
  );
}
