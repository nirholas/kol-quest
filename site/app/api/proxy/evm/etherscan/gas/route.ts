import { NextResponse } from "next/server";
import { createEvmRoute } from "@/lib/proxy/evm-route";
import { etherscanProxy } from "@/lib/proxy/sources/etherscan";
import { getCacheHeaders, CACHE_TTL, CACHE_STALE } from "@/lib/proxy/types";

export const GET = createEvmRoute(async (request) => {
  const chainid = request.nextUrl.searchParams.get("chainid") || "1";
  const data = await etherscanProxy.getGasOracle(chainid);
  return NextResponse.json(data, {
    headers: getCacheHeaders(CACHE_TTL.gasPrices, CACHE_STALE.gasPrices),
  });
}, { validateAddress: false });
