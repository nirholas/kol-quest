import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, eq, ne } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/drizzle/db";
import { user } from "@/drizzle/db/schema";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (!adminEmail || session.user.email.toLowerCase() !== adminEmail) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  await db
    .update(user)
    .set({ role: "admin", updatedAt: new Date() })
    .where(and(eq(user.id, session.user.id), ne(user.role, "admin")));

  return NextResponse.json({ ok: true });
}
