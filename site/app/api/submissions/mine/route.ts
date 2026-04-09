import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/drizzle/db";
import { walletSubmission } from "@/drizzle/db/schema";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const submissions = await db
    .select()
    .from(walletSubmission)
    .where(eq(walletSubmission.submittedBy, session.user.id))
    .orderBy(desc(walletSubmission.createdAt));

  return NextResponse.json({ submissions });
}
