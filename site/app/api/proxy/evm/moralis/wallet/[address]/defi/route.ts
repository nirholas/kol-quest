import { NextRequest, NextResponse } from "next/server";
import { moralisProxy } from "@/lib/proxy/sources/moralis";
import { MORALIS_CHAIN_NAMES, getCacheHeaders } from "@/lib/proxy/types";
import { CACHE_TTL, CACHE_STALE } from "@/lib/proxy/types";

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const chain = request.nextUrl.searchParams.get("chain") || "eth";
    const moralisChain = MORALIS_CHAIN_NAMES[chain] || chain;
    
    const data = await moralisProxy.getWalletDefi(params.address, moralisChain);
    
    return NextResponse.json(data, {
      headers: getCacheHeaders(CACHE_TTL.defiPositions, CACHE_STALE.defiPositions)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
