import { NextResponse } from "next/server";
import { X402_PAYMENT_ADDRESS } from "@/lib/x402";

const BASE_URL = (process.env.NEXT_PUBLIC_URL || "https://kol.quest").replace(/\/$/, "");

/**
 * x402 server discovery document.
 * Used by x402scan to verify ownership of the payment address and
 * surface server metadata (name, icon, OG image, discovery URL).
 * Spec: https://x402scan.com/discovery
 */
export async function GET() {
  return NextResponse.json(
    {
      x402Version: 1,
      payTo: X402_PAYMENT_ADDRESS,
      network: "base",
      name: "KolQuest",
      description:
        "Smart wallet intelligence — track top crypto KOL wallets, leaderboards, PnL analytics, and trade feeds across Solana & BSC.",
      icon: `${BASE_URL}/icon.svg`,
      ogImage: `${BASE_URL}/api/og`,
      discoveryUrl: `${BASE_URL}/api/discovery/resources`,
    },
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
