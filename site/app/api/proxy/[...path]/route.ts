
import { NextRequest, NextResponse } from "next/server";
import { proxyRequest } from "@/lib/proxy/handler";
import { heliusConfig } from "@/lib/proxy/sources/helius";

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");

  // This is a simple example. In a real-world scenario, you'd
  // have a more robust way of mapping paths to configs.
  if (path.startsWith("solana/helius")) {
    return proxyRequest(req, heliusConfig, path.replace('solana/helius/', ''));
  }

  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");

  if (path.startsWith("solana/helius")) {
    return proxyRequest(req, heliusConfig, path.replace('solana/helius/', ''));
  }

  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}
