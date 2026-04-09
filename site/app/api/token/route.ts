import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { trade } from "@/drizzle/db/schema";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const token = searchParams.get("token");
  const chain = searchParams.get("chain") || "sol";

  if (!token) {
    return NextResponse.json({ error: "token param required" }, { status: 400 });
  }

  // Get trades for this token
  const conditions = [eq(trade.tokenAddress, token), eq(trade.chain, chain)];

  const rows = await db
    .select()
    .from(trade)
    .where(and(...conditions))
    .orderBy(desc(trade.tradedAt))
    .limit(200);

  // Aggregate wallet-level stats
  const walletStats = new Map<
    string,
    {
      address: string;
      label: string | null;
      buys: number;
      sells: number;
      totalBuyUsd: number;
      totalSellUsd: number;
      realizedProfit: number;
      lastTrade: string;
    }
  >();

  for (const t of rows) {
    const existing = walletStats.get(t.walletAddress) || {
      address: t.walletAddress,
      label: t.walletLabel,
      buys: 0,
      sells: 0,
      totalBuyUsd: 0,
      totalSellUsd: 0,
      realizedProfit: 0,
      lastTrade: t.tradedAt?.toISOString() || "",
    };

    if (t.type === "buy") {
      existing.buys++;
      existing.totalBuyUsd += t.amountUsd || 0;
    } else {
      existing.sells++;
      existing.totalSellUsd += t.amountUsd || 0;
    }
    existing.realizedProfit += t.realizedProfit || 0;
    walletStats.set(t.walletAddress, existing);
  }

  const tokenInfo = rows[0]
    ? {
        address: rows[0].tokenAddress,
        symbol: rows[0].tokenSymbol,
        name: rows[0].tokenName,
        logo: rows[0].tokenLogo,
        launchpad: rows[0].tokenLaunchpad,
        chain,
      }
    : null;

  return NextResponse.json({
    token: tokenInfo,
    totalTrades: rows.length,
    uniqueWallets: walletStats.size,
    totalBuyVolume: Array.from(walletStats.values()).reduce((s, w) => s + w.totalBuyUsd, 0),
    totalSellVolume: Array.from(walletStats.values()).reduce((s, w) => s + w.totalSellUsd, 0),
    wallets: Array.from(walletStats.values()).sort((a, b) => b.totalBuyUsd - a.totalBuyUsd),
    recentTrades: rows.slice(0, 50).map((t) => ({
      id: t.id,
      walletAddress: t.walletAddress,
      walletLabel: t.walletLabel,
      type: t.type,
      amountUsd: t.amountUsd,
      realizedProfit: t.realizedProfit,
      txHash: t.txHash,
      tradedAt: t.tradedAt,
    })),
  });
}
