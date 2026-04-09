
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
  if (!log.apiKeyId) return; // apiKeyId is required by the schema; skip logging for anonymous requests
  try {
    await db.insert(apiUsage).values({
      id: crypto.randomUUID(),
      apiKeyId: log.apiKeyId,
      endpoint: log.endpoint,
      source: log.source,
      cached: log.cached,
      latency: log.latency,
      status: log.status,
    });
  } catch (error) {
    console.error("Failed to log API usage:", error);
  }
}
