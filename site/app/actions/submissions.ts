"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/drizzle/db";
import { user, walletSubmission, walletVouch } from "@/drizzle/db/schema";
import { submissionSchema, type SubmissionInput } from "@/lib/validation";

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function submitWallet(input: SubmissionInput) {
  const session = await getSession();
  if (!session?.user?.id) {
    return { success: false, error: "Authentication required" };
  }

  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Validation failed" };
  }

  // Duplicate check
  const [existing] = await db
    .select({ id: walletSubmission.id })
    .from(walletSubmission)
    .where(
      and(
        eq(walletSubmission.walletAddress, parsed.data.walletAddress.trim()),
        eq(walletSubmission.chain, parsed.data.chain),
      ),
    )
    .limit(1);
  if (existing) {
    return { success: false, error: "This wallet has already been submitted" };
  }

  const [roleRow] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  const [created] = await db
    .insert(walletSubmission)
    .values({
      id: randomUUID(),
      walletAddress: parsed.data.walletAddress.trim(),
      chain: parsed.data.chain,
      label: parsed.data.label.trim(),
      notes: parsed.data.notes?.trim() || null,
      twitter: parsed.data.twitter || null,
      telegram: parsed.data.telegram || null,
      submittedBy: session.user.id,
      status: roleRow?.role === "admin" ? "approved" : "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: walletSubmission.id });

  revalidatePath("/community");
  revalidatePath("/submit");
  return { success: true, id: created.id };
}

export async function getMySubmissions() {
  const session = await getSession();
  if (!session?.user?.id) return [];

  return db
    .select()
    .from(walletSubmission)
    .where(eq(walletSubmission.submittedBy, session.user.id))
    .orderBy(desc(walletSubmission.createdAt));
}

export async function getPendingSubmissions() {
  const session = await getSession();
  if (!session?.user?.id) return [];

  const [roleRow] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (roleRow?.role !== "admin") return [];

  return db
    .select()
    .from(walletSubmission)
    .where(eq(walletSubmission.status, "pending"))
    .orderBy(desc(walletSubmission.createdAt));
}

export async function approveSubmissionAction(id: string) {
  const session = await getSession();
  if (!session?.user?.id) return { success: false, error: "Authentication required" };

  const [roleRow] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (roleRow?.role !== "admin") {
    return { success: false, error: "Admin access required" };
  }

  const [updated] = await db
    .update(walletSubmission)
    .set({ status: "approved", updatedAt: new Date() })
    .where(and(eq(walletSubmission.id, id), eq(walletSubmission.status, "pending")))
    .returning({ id: walletSubmission.id });

  if (!updated) {
    return { success: false, error: "Submission not found or already processed" };
  }

  revalidatePath("/community");
  revalidatePath("/admin/submissions");
  return { success: true };
}

export async function rejectSubmissionAction(id: string) {
  const session = await getSession();
  if (!session?.user?.id) return { success: false, error: "Authentication required" };

  const [roleRow] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (roleRow?.role !== "admin") {
    return { success: false, error: "Admin access required" };
  }

  const [updated] = await db
    .update(walletSubmission)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(and(eq(walletSubmission.id, id), eq(walletSubmission.status, "pending")))
    .returning({ id: walletSubmission.id });

  if (!updated) {
    return { success: false, error: "Submission not found or already processed" };
  }

  revalidatePath("/admin/submissions");
  return { success: true };
}

export async function toggleVouchAction(submissionId: string) {
  const session = await getSession();
  if (!session?.user?.id) return { success: false, error: "Authentication required" };

  // Prevent self-vouching
  const [submission] = await db
    .select({ submittedBy: walletSubmission.submittedBy })
    .from(walletSubmission)
    .where(eq(walletSubmission.id, submissionId))
    .limit(1);

  if (!submission) {
    return { success: false, error: "Submission not found" };
  }
  if (submission.submittedBy === session.user.id) {
    return { success: false, error: "You cannot vouch for your own submission" };
  }

  // Use onConflictDoNothing to avoid race condition on insert
  try {
    const existing = await db
      .select({ userId: walletVouch.userId })
      .from(walletVouch)
      .where(and(eq(walletVouch.userId, session.user.id), eq(walletVouch.submissionId, submissionId)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .delete(walletVouch)
        .where(and(eq(walletVouch.userId, session.user.id), eq(walletVouch.submissionId, submissionId)));
    } else {
      await db
        .insert(walletVouch)
        .values({
          userId: session.user.id,
          submissionId,
          weight: 1,
          createdAt: new Date(),
        })
        .onConflictDoNothing();
    }
  } catch {
    return { success: false, error: "Failed to toggle vouch" };
  }

  revalidatePath("/community");
  return { success: true };
}

export async function getCommunitySubmissionsWithVouches(limit = 500) {
  const safeLimit = Math.min(Math.max(1, limit), 500);

  return db
    .select({
      id: walletSubmission.id,
      walletAddress: walletSubmission.walletAddress,
      chain: walletSubmission.chain,
      label: walletSubmission.label,
      notes: walletSubmission.notes,
      twitter: walletSubmission.twitter,
      telegram: walletSubmission.telegram,
      status: walletSubmission.status,
      createdAt: walletSubmission.createdAt,
      vouchCount: sql<number>`cast(count(${walletVouch.userId}) as int)`,
    })
    .from(walletSubmission)
    .leftJoin(walletVouch, eq(walletVouch.submissionId, walletSubmission.id))
    .where(eq(walletSubmission.status, "approved"))
    .groupBy(walletSubmission.id)
    .orderBy(desc(sql`count(${walletVouch.userId})`), desc(walletSubmission.createdAt))
    .limit(safeLimit);
}
