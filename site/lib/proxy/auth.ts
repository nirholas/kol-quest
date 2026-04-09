
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";
import { apiKey } from "@/drizzle/db/schema";
import { db } from "@/drizzle/db";
import { eq } from "drizzle-orm";
import { hash }_from "better-auth/utils";

const TIERS = {
  public: { rateLimit: 10 },
  free: { rateLimit: 60 },
  pro: { rateLimit: 600 },
};

export async function getUserTier(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { tier: "public", rateLimit: TIERS.public.rateLimit, apiKey: null };
  }

  const key = authHeader.replace("Bearer ", "");
  const hashedKey = await hash(key);

  const keyRecord = await db.query.apiKey.findFirst({
    where: eq(apiKey.keyHash, hashedKey),
  });

  if (!keyRecord || keyRecord.revokedAt) {
    return { tier: "public", rateLimit: TIERS.public.rateLimit, apiKey: null };
  }

  return {
    tier: keyRecord.tier,
    rateLimit: keyRecord.rateLimit,
    apiKey: keyRecord.id,
  };
}
