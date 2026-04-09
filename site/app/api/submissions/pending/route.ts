import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/drizzle/db";
import { user, walletSubmission } from "@/drizzle/db/schema";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const [roleRow] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (roleRow?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const submissions = await db
    .select()
    .from(walletSubmission)
    .where(eq(walletSubmission.status, "pending"))
    .orderBy(desc(walletSubmission.createdAt));

  return NextResponse.json({ submissions });
}
