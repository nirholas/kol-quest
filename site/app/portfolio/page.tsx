import type { Metadata } from "next";
import PortfolioInput from "./PortfolioInput";

export const metadata: Metadata = {
  title: "Multi-Chain Portfolio Analyzer",
  description:
    "Analyze any wallet across all chains — Solana, Ethereum, BSC, Base, Arbitrum, Polygon and more. Unified holdings, DeFi positions, NFTs and performance charts.",
  openGraph: {
    title: "Multi-Chain Portfolio Analyzer | KolQuest",
    description:
      "Paste any wallet address to get unified portfolio data across 8+ blockchains.",
  },
};

export default function PortfolioPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16 animate-fade-in">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white mb-3">Multi-Chain Portfolio</h1>
        <p className="text-zinc-500 text-sm max-w-lg mx-auto">
          Paste any wallet address to see a unified view of holdings, DeFi positions, NFTs and
          performance across Solana, Ethereum, BSC, Base, Arbitrum, Polygon, Optimism and
          Avalanche.
        </p>
      </div>
      <PortfolioInput />
    </main>
  );
}
