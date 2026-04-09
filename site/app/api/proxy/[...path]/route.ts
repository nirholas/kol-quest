
import { NextRequest, NextResponse } from "next/server";

// Catch-all fallback for unmatched proxy routes
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return NextResponse.json(
    {
      error: "Not Found",
      message: `No proxy route found for: /api/proxy/${path.join("/")}`,
      docs: "/api/proxy/docs",
    },
    { status: 404 }
  );
}

export const POST = GET;
export const PUT = GET;
export const DELETE = GET;
