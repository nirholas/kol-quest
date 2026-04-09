import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/drizzle/db";
import { feedback } from "@/drizzle/db/schema";
import { checkRateLimit } from "@/lib/rate-limit";
import { feedbackSchema } from "@/lib/validation";
import { checkOrigin } from "@/lib/assert-origin";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  const originErr = checkOrigin(request);
  if (originErr) return originErr;

  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs }).catch(() => null);

  // Rate limit by user id if authenticated, otherwise by IP
  const rateLimitKey = session?.user?.id
    ? `feedback:${session.user.id}`
    : `feedback:ip:${hdrs.get("x-forwarded-for") ?? hdrs.get("x-real-ip") ?? "unknown"}`;

  const rl = await checkRateLimit(rateLimitKey, 10, 60 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again after ${rl.reset}.` },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { type, message, walletAddress } = parsed.data;

  if (type === "removal_request" && !walletAddress) {
    return NextResponse.json(
      { error: "walletAddress is required for removal requests" },
      { status: 422 },
    );
  }

  await db.insert(feedback).values({
    id: randomUUID(),
    userId: session?.user?.id ?? null,
    type,
    message,
    walletAddress: walletAddress ?? null,
    status: "open",
  });

  return NextResponse.json({ success: true });
}
