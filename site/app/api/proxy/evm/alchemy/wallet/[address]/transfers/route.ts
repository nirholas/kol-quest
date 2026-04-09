import { NextResponse } from "next/server";
import { createEvmRoute } from "@/lib/proxy/evm-route";
import { alchemyProxy } from "@/lib/proxy/sources/alchemy";
import { getCacheHeaders, CACHE_TTL, CACHE_STALE } from "@/lib/proxy/types";

export const GET = createEvmRoute(async (request, params) => {
  const chain = request.nextUrl.searchParams.get("chain") || "eth";
  const data = await alchemyProxy.getWalletTransfers(params.address, chain);
  return NextResponse.json(data, {
    headers: getCacheHeaders(CACHE_TTL.transactions, CACHE_STALE.transactions),
  });
});
