import { NextRequest, NextResponse } from "next/server";
import { aggregateWalletData, detectChain } from "@/lib/wallet-aggregator";

// GET /api/wallets/[address] — comprehensive wallet summary
// This is the main summary route.
export async function GET(
  req: NextRequest,
  { params }: { params: { address: string } }
) {
  const { searchParams } = req.nextUrl;
  const chainParam = searchParams.get("chain") as "solana" | "ethereum" | undefined;

  try {
    const chain = chainParam || detectChain(params.address) || "solana";
    const data = await aggregateWalletData(params.address, chain);
    return NextResponse.json(data.summary);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
