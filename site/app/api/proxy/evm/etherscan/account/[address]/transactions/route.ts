import { NextResponse } from "next/server";
import { createEvmRoute } from "@/lib/proxy/evm-route";
import { etherscanProxy } from "@/lib/proxy/sources/etherscan";
import { getCacheHeaders, CACHE_TTL, CACHE_STALE } from "@/lib/proxy/types";

export const GET = createEvmRoute(async (request, params) => {
  const chainid = request.nextUrl.searchParams.get("chainid") || "1";
  const data = await etherscanProxy.getAccountTransactions(params.address, chainid);
  return NextResponse.json(data, {
    headers: getCacheHeaders(CACHE_TTL.transactions, CACHE_STALE.transactions),
  });
});
