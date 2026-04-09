import { NextResponse } from "next/server";
import { desc, sql, gte } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { trade } from "@/drizzle/db/schema";

export async function GET() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24h

  // Aggregate: which tokens are being bought most by tracked wallets
  const rows = await db
    .select({
      tokenAddress: trade.tokenAddress,
      tokenSymbol: trade.tokenSymbol,
      tokenName: trade.tokenName,
      tokenLogo: trade.tokenLogo,
      chain: trade.chain,
      buyCount: sql<number>`count(*) filter (where ${trade.type} = 'buy')`,
      sellCount: sql<number>`count(*) filter (where ${trade.type} = 'sell')`,
      uniqueBuyers: sql<number>`count(distinct ${trade.walletAddress}) filter (where ${trade.type} = 'buy')`,
      totalBuyUsd: sql<number>`coalesce(sum(${trade.amountUsd}) filter (where ${trade.type} = 'buy'), 0)`,
      totalSellUsd: sql<number>`coalesce(sum(${trade.amountUsd}) filter (where ${trade.type} = 'sell'), 0)`,
      totalPnl: sql<number>`coalesce(sum(${trade.realizedProfit}), 0)`,
      firstSeen: sql<string>`min(${trade.tradedAt})`,
      lastSeen: sql<string>`max(${trade.tradedAt})`,
    })
    .from(trade)
    .where(gte(trade.tradedAt, since))
    .groupBy(trade.tokenAddress, trade.tokenSymbol, trade.tokenName, trade.tokenLogo, trade.chain)
    .orderBy(desc(sql`count(distinct ${trade.walletAddress}) filter (where ${trade.type} = 'buy')`))
    .limit(50);

  return NextResponse.json({
    tokens: rows.map((r) => ({
      tokenAddress: r.tokenAddress,
      tokenSymbol: r.tokenSymbol,
      tokenName: r.tokenName,
      tokenLogo: r.tokenLogo,
      chain: r.chain,
      buyCount: Number(r.buyCount),
      sellCount: Number(r.sellCount),
      uniqueBuyers: Number(r.uniqueBuyers),
      totalBuyUsd: Number(r.totalBuyUsd),
      totalSellUsd: Number(r.totalSellUsd),
      netFlow: Number(r.totalBuyUsd) - Number(r.totalSellUsd),
      totalPnl: Number(r.totalPnl),
      firstSeen: r.firstSeen,
      lastSeen: r.lastSeen,
    })),
  });
}
