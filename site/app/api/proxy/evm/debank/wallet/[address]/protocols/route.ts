import { NextResponse } from "next/server";
import { createEvmRoute } from "@/lib/proxy/evm-route";
import { debankProxy } from "@/lib/proxy/sources/debank";
import { getCacheHeaders, CACHE_TTL, CACHE_STALE } from "@/lib/proxy/types";

export const GET = createEvmRoute(async (_request, params) => {
  const data = await debankProxy.getWalletProtocols(params.address.toLowerCase());
  return NextResponse.json(data, {
    headers: getCacheHeaders(CACHE_TTL.defiPositions, CACHE_STALE.defiPositions),
  });
});
