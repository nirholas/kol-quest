import { NextRequest, NextResponse } from "next/server";
import { moralisProxy } from "@/lib/proxy/sources/moralis";
import { getCacheHeaders } from "@/lib/proxy/types";
import { CACHE_TTL, CACHE_STALE } from "@/lib/proxy/types";

export async function GET() {
  try {
    const data = await moralisProxy.getTopTokens();
    
    return NextResponse.json(data, {
      headers: getCacheHeaders(CACHE_TTL.chainInfo, CACHE_STALE.chainInfo)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
