import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql, and } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { trade, walletSubmission, walletVouch } from "@/drizzle/db/schema";
import { getAllSolanaWallets, getBscWallets, getXProfiles, getXProfile } from "@/lib/data";

// GET /api/wallets/[address] — comprehensive wallet detail
// Merges data from: unified wallets, X profiles, trades, community submissions
export async function GET(
  _req: NextRequest,
  { params }: { params: { address: string } },
) {
  const address = params.address;

  // Load unified data from both chains
  const [sol, bsc, xProfiles] = await Promise.all([
    getAllSolanaWallets(),
    getBscWallets(),
  getXProfiles(),
  ]);

  const wallet = [...sol, ...bsc].find((w) => w.wallet_address === address);

  // Fetch trade stats from DB
  const [tradeStats] = await db
    .select({
      totalTrades: sql<number>`count(*)`,
      totalBuys: sql<number>`count(*) filter (where ${trade.type} = 'buy')`,
      totalSells: sql<number>`count(*) filter (where ${trade.type} = 'sell')`,
      totalBuyUsd: sql<number>`coalesce(sum(${trade.amountUsd}) filter (where ${trade.type} = 'buy'), 0)`,
      totalSellUsd: sql<number>`coalesce(sum(${trade.amountUsd}) filter (where ${trade.type} = 'sell'), 0)`,
      totalRealizedProfit: sql<number>`coalesce(sum(${trade.realizedProfit}), 0)`,
      firstTrade: sql<string>`min(${trade.tradedAt})`,
      lastTrade: sql<string>`max(${trade.tradedAt})`,
      uniqueTokens: sql<number>`count(distinct ${trade.tokenAddress})`,
    })
    .from(trade)
    .where(eq(trade.walletAddress, address));

  // Recent trades
  const recentTrades = await db
    .select()
    .from(trade)
    .where(eq(trade.walletAddress, address))
    .orderBy(desc(trade.tradedAt))
    .limit(20);

  // Top tokens by volume
  const topTokens = await db
    .select({
      tokenAddress: trade.tokenAddress,
      tokenSymbol: trade.tokenSymbol,
      tokenName: trade.tokenName,
      chain: trade.chain,
      totalVolume: sql<number>`coalesce(sum(${trade.amountUsd}), 0)`,
      trades: sql<number>`count(*)`,
      realizedProfit: sql<number>`coalesce(sum(${trade.realizedProfit}), 0)`,
    })
    .from(trade)
    .where(eq(trade.walletAddress, address))
    .groupBy(trade.tokenAddress, trade.tokenSymbol, trade.tokenName, trade.chain)
    .orderBy(sql`sum(${trade.amountUsd}) desc`)
    .limit(10);

  // Community submission for this wallet
  const [submission] = await db
    .select()
    .from(walletSubmission)
    .where(eq(walletSubmission.walletAddress, address))
    .limit(1);

  let vouchCount = 0;
  if (submission) {
    const [vouchRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(walletVouch)
      .where(eq(walletVouch.submissionId, submission.id));
    vouchCount = vouchRow?.count || 0;
  }

  // X Profile
  let xProfile = null;
  if (wallet?.twitter) {
    xProfile = getXProfile(xProfiles, wallet.twitter);
  }

  if (!wallet && tradeStats.totalTrades === 0 && !submission) {
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  }

  return NextResponse.json({
    wallet: wallet || null,
    xProfile: xProfile
      ? {
          username: xProfile.username,
          name: xProfile.name,
          bio: xProfile.bio,
          avatar: xProfile.avatar,
          followers: xProfile.followers,
          following: xProfile.following,
          tweets: xProfile.tweets,
          verified: xProfile.verified,
          joinDate: xProfile.joinDate,
        }
      : null,
    tradeStats: {
      totalTrades: Number(tradeStats.totalTrades),
      totalBuys: Number(tradeStats.totalBuys),
      totalSells: Number(tradeStats.totalSells),
      totalBuyUsd: Number(tradeStats.totalBuyUsd),
      totalSellUsd: Number(tradeStats.totalSellUsd),
      totalRealizedProfit: Number(tradeStats.totalRealizedProfit),
      firstTrade: tradeStats.firstTrade,
      lastTrade: tradeStats.lastTrade,
      uniqueTokens: Number(tradeStats.uniqueTokens),
    },
    recentTrades: recentTrades.map((t) => ({
      id: t.id,
      chain: t.chain,
      type: t.type,
      tokenAddress: t.tokenAddress,
      tokenSymbol: t.tokenSymbol,
      tokenName: t.tokenName,
      amountUsd: t.amountUsd,
      priceUsd: t.priceUsd,
      realizedProfit: t.realizedProfit,
      txHash: t.txHash,
      tradedAt: t.tradedAt,
    })),
    topTokens: topTokens.map((t) => ({
      tokenAddress: t.tokenAddress,
      tokenSymbol: t.tokenSymbol,
      tokenName: t.tokenName,
      chain: t.chain,
      totalVolume: Number(t.totalVolume),
      trades: Number(t.trades),
      realizedProfit: Number(t.realizedProfit),
    })),
    community: submission
      ? {
          id: submission.id,
          label: submission.label,
          notes: submission.notes,
          twitter: submission.twitter,
          telegram: submission.telegram,
          status: submission.status,
          vouches: vouchCount,
          createdAt: submission.createdAt,
        }
      : null,
  });
}
