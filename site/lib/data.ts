import type { KolEntry } from "./types";

const DATA_URL =
  "https://raw.githubusercontent.com/nirholas/scrape-kolscan-wallets/main/output/kolscan-leaderboard.json";

export async function getData(): Promise<KolEntry[]> {
  try {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "data", "kolscan-leaderboard.json");
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
  } catch {
    // fs not available — use fetch
  }
  const res = await fetch(DATA_URL);
  return res.json();
}
