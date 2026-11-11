import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { paymentProxyFromHTTPServer, x402HTTPResourceServer, x402ResourceServer } from "@x402/next";
import { X402_ENABLED, X402_FACILITATOR_URL, X402_NETWORK, X402_ROUTES, isX402GatedRoute } from "@/lib/x402";
// X402_ROUTES uses a single "/api/*" wildcard — all new API routes are gated automatically.

// Build the x402 payment proxy once at module load time.
const x402Server = X402_ENABLED
  ? new x402HTTPResourceServer(
      new x402ResourceServer(new HTTPFacilitatorClient({ url: X402_FACILITATOR_URL })).register(
        X402_NETWORK,
        new ExactEvmScheme(),
      ),
      X402_ROUTES,
    )
  : null;
// Facilitator sync is done below instead of by the SDK, whose startup sync
// calls process.exit() when the facilitator cannot settle the route.
const x402 = x402Server ? paymentProxyFromHTTPServer(x402Server, undefined, undefined, false) : null;

const FACILITATOR_RETRY_MS = 60_000;
let facilitatorReady: Promise<boolean> | null = null;
let facilitatorFailedAt = 0;

/** Fetches the facilitator's supported kinds once; retries at most once a minute after a failure. */
function ensureFacilitator(server: x402HTTPResourceServer): Promise<boolean> {
  if (!facilitatorReady && Date.now() - facilitatorFailedAt >= FACILITATOR_RETRY_MS) {
    facilitatorReady = server.initialize().then(
      () => true,
      (error: unknown) => {
        console.error(`[x402] facilitator ${X402_FACILITATOR_URL} cannot settle ${X402_NETWORK}:`, error);
        facilitatorReady = null;
        facilitatorFailedAt = Date.now();
        return false;
      },
    );
  }
  return facilitatorReady ?? Promise.resolve(false);
}

function facilitatorUnavailable(): NextResponse {
  return NextResponse.json(
    {
      error: "Payment facilitator unavailable",
      detail: "x402 payments for this API cannot be verified right now. Sign in at the KolQuest site for free access, or retry later.",
    },
    { status: 503, headers: { "Retry-After": String(FACILITATOR_RETRY_MS / 1000), "Cache-Control": "no-store" } },
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- UI auth gates ---
  if (pathname.startsWith("/submit") || pathname.startsWith("/admin") || pathname.startsWith("/monitor")) {
    const sessionCookie = getSessionCookie(request);
    if (!sessionCookie) {
      const url = new URL("/auth", request.url);
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // --- x402 payment gate for data API routes ---
  // Authenticated web-app users (session cookie present) get free access.
  // Requests originating from the app itself (same origin) also bypass payment.
  if (x402 && isX402GatedRoute(pathname)) {
    const sessionCookie = getSessionCookie(request);
    const requestOrigin = request.headers.get("origin");
    const appOrigin =
      process.env.NEXT_PUBLIC_URL ||
      process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
      `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const isSameOrigin =
      requestOrigin !== null && requestOrigin === appOrigin;
    if (!sessionCookie && !isSameOrigin && x402Server) {
      if (!(await ensureFacilitator(x402Server))) return facilitatorUnavailable();
      return x402(request);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // UI auth gates
    "/submit",
    "/admin/:path*",
    "/monitor",
    "/monitor/:path*",
    // x402 gate — covers ALL /api/* routes; exemptions are handled in isX402GatedRoute
    "/api/:path*",
  ],
};
