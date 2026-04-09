import type { Metadata } from "next";
import Link from "next/link";
import { truncateAddr } from "@/lib/format";
import { detectChains, getPortfolioSummary } from "@/lib/portfolio-aggregator";
import PortfolioDashboard from "./PortfolioDashboard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params: rawParams,
}: {
  params: Promise<{ address: string }>;
}): Promise<Metadata> {
  const { address: resolvedAddress } = await rawParams;
  const addr = decodeURIComponent(resolvedAddress);
  const short = truncateAddr(addr);
  return {
    title: `Portfolio — ${short}`,
    description: `Multi-chain portfolio analysis for wallet ${short} across all supported blockchains.`,
  };
}

export default async function PortfolioAddressPage({
  params: rawParams,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address: rawAddress } = await rawParams;
  const address = decodeURIComponent(rawAddress);
  const chains = detectChains(address);

  if (chains.length === 0) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-20 text-center animate-fade-in">
        <h1 className="text-2xl font-bold text-white mb-2">Invalid Address</h1>
        <p className="text-zinc-500 mb-6">
          Provide a valid Solana or EVM (0x…) wallet address.
        </p>
        <Link href="/portfolio" className="text-accent hover:underline text-sm">
          ← Back to Portfolio
        </Link>
      </main>
    );
  }

  // Pre-fetch summary on the server for initial render
  let summary = null;
  try {
    summary = await getPortfolioSummary(address);
  } catch {
    // Client will fetch it
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/portfolio"
            className="text-zinc-500 hover:text-white text-xs transition-colors"
          >
            ← Portfolio
          </Link>
          <div className="text-zinc-700">/</div>
          <span className="text-zinc-400 text-xs font-mono truncate max-w-[200px] sm:max-w-none">
            {address}
          </span>
        </div>
        <div className="flex gap-2">
          <a
            href={`/portfolio/${encodeURIComponent(address)}`}
            className="text-xs text-zinc-500 hover:text-white px-2 py-1 border border-border rounded hover:bg-bg-hover transition-colors"
            title="Share portfolio link"
          >
            Share ↗
          </a>
        </div>
      </div>

      <PortfolioDashboard address={address} initialSummary={summary} />
    </main>
  );
}
