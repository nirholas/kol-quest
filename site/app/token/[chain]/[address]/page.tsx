import { Metadata } from "next";
import { notFound } from "next/navigation";
import TokenPageClient from "./TokenPageClient";
import { getAllSolanaWallets, getBscWallets } from "@/lib/data";

interface Props {
  params: Promise<{ chain: string; address: string }>;
}

export async function generateMetadata({ params: rawParams }: Props): Promise<Metadata> {
  const { chain, address } = await rawParams;
  return {
    title: `Token ${address.slice(0, 8)}… | KOL Quest`,
    description: `KOL activity and price data for ${address} on ${chain === "sol" ? "Solana" : "BSC"}`,
  };
}

export default async function TokenPage({ params: rawParams }: Props) {
  const { chain, address } = await rawParams;

  if (chain !== "sol" && chain !== "bsc") notFound();
  if (!address || address.length < 20) notFound();

  // Load known KOL wallets for holder cross-referencing
  const allWallets = chain === "sol"
    ? await getAllSolanaWallets()
    : await getBscWallets();

  const knownWallets = allWallets.map((w) => ({
    wallet_address: w.wallet_address,
    name: w.name,
    avatar: w.avatar ?? null,
    twitter_username: "twitter_username" in w ? (w as any).twitter_username ?? null : null,
  }));

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-4">
        <nav className="text-xs text-zinc-600 flex items-center gap-1.5">
          <a href="/" className="hover:text-white transition-colors">Home</a>
          <span>/</span>
          <a href="/feed" className="hover:text-white transition-colors">Feed</a>
          <span>/</span>
          <span className="text-zinc-400 font-mono">{address.slice(0, 8)}…</span>
        </nav>
      </div>
      <TokenPageClient
        chain={chain as "sol" | "bsc"}
        address={address}
        knownWallets={knownWallets}
      />
    </main>
  );
}
