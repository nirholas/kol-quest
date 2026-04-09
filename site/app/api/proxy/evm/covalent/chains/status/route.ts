import { NextResponse } from "next/server";
import { createEvmRoute } from "@/lib/proxy/evm-route";
import { covalentProxy } from "@/lib/proxy/sources/covalent";
import { getCacheHeaders, CACHE_TTL, CACHE_STALE } from "@/lib/proxy/types";

export const GET = createEvmRoute(async () => {
  const data = await covalentProxy.getChainStatus();
  return NextResponse.json(data, {
    headers: getCacheHeaders(CACHE_TTL.walletBalances, CACHE_STALE.walletBalances),
  });
}, { validateAddress: false });
