import { NextResponse } from "next/server";
import { createEvmRoute } from "@/lib/proxy/evm-route";
import { covalentProxy } from "@/lib/proxy/sources/covalent";
import { COVALENT_CHAIN_NAMES, getCacheHeaders, CACHE_TTL, CACHE_STALE } from "@/lib/proxy/types";

export const GET = createEvmRoute(async (request, params) => {
  const chainParam = request.nextUrl.searchParams.get("chain") || "eth";
  const chain = COVALENT_CHAIN_NAMES[chainParam] || chainParam;
  const data = await covalentProxy.getWalletPortfolio(params.address, chain);
  return NextResponse.json(data, {
    headers: getCacheHeaders(CACHE_TTL.walletBalances, CACHE_STALE.walletBalances),
  });
});
