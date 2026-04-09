
import { db } from "@/drizzle/db";
import { apiUsage } from "@/drizzle/db/schema";

interface ProxyLog {
  apiKeyId: string | null;
  endpoint: string;
  source: string;
  cached: boolean;
  latency: number;
  status: number;
  error?: string;
}

export async function logRequest(log: ProxyLog) {
  try {
    await db.insert(apiUsage).values({
      id: crypto.randomUUID(),
      apiKeyId: log.apiKeyId,
      ...log,
    });
  } catch (error) {
    console.error("Failed to log API usage:", error);
  }
}
