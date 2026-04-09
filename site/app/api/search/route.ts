import { NextRequest, NextResponse } from "next/server";
import { getAllSolanaWallets, getBscWallets } from "@/lib/data";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim().toLowerCase();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const [sol, bsc] = await Promise.all([getAllSolanaWallets(), getBscWallets()]);

  interface SearchResult {
    type: "wallet" | "token";
    address: string;
    label: string;
    sublabel?: string;
    chain: string;
    avatar?: string | null;
  }

  const results: SearchResult[] = [];
  const limit = 12;

  // Search wallets by name, address, twitter
  for (const w of [...sol, ...bsc]) {
    if (results.length >= limit) break;
    const matchAddr = w.wallet_address.toLowerCase().includes(q);
    const matchName = w.name.toLowerCase().includes(q);
    const matchTwitter = w.twitter?.toLowerCase().includes(q);
    if (matchAddr || matchName || matchTwitter) {
      results.push({
        type: "wallet",
        address: w.wallet_address,
        label: w.name,
        sublabel: `${w.wallet_address.slice(0, 6)}...${w.wallet_address.slice(-4)} · ${w.chain.toUpperCase()} · ${w.category}`,
        chain: w.chain,
        avatar: w.avatar,
      });
    }
  }

  // If query looks like a raw address (no matches), still return it as a direct link
  if (results.length === 0) {
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q)) {
      results.push({
        type: "wallet",
        address: q,
        label: `${q.slice(0, 6)}...${q.slice(-4)}`,
        sublabel: "Look up Solana address",
        chain: "sol",
      });
    } else if (/^0x[a-fA-F0-9]{40}$/i.test(q)) {
      results.push({
        type: "wallet",
        address: q,
        label: `${q.slice(0, 6)}...${q.slice(-4)}`,
        sublabel: "Look up BSC address",
        chain: "bsc",
      });
    }
  }

  return NextResponse.json({ results });
}
