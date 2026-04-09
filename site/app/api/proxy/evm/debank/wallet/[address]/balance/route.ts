import { NextRequest, NextResponse } from "next/server";
import { debankProxy } from "@/lib/proxy/sources/debank";
import { getCacheHeaders, CACHE_TTL, CACHE_STALE } from "@/lib/proxy/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const data = await debankProxy.getWalletBalance(params.address.toLowerCase());
    return NextResponse.json(data, {
      headers: getCacheHeaders(CACHE_TTL.walletBalances, CACHE_STALE.walletBalances),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
