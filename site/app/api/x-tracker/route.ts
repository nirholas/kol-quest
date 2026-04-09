import { NextRequest, NextResponse } from "next/server";
import { getXTrackerAccounts } from "@/lib/data";

// GET /api/x-tracker — GMGN X tracker accounts
// ?search=term — search by handle, name, bio
// ?sort=followers|subscribers — sort field (default: followers)
// ?order=asc|desc — sort order (default: desc)
// ?tag=alpha — filter by tag
// ?verified=true — only verified
// ?page=1&limit=50 — pagination
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  let accounts = await getXTrackerAccounts();

  const search = searchParams.get("search")?.toLowerCase();
  if (search) {
    accounts = accounts.filter(
      (a) =>
        a.handle?.toLowerCase().includes(search) ||
        a.name?.toLowerCase().includes(search) ||
        a.bio?.toLowerCase().includes(search),
    );
  }

  const tag = searchParams.get("tag");
  if (tag) {
    accounts = accounts.filter((a) => a.tag === tag);
  }

  const verified = searchParams.get("verified");
  if (verified === "true") {
    accounts = accounts.filter((a) => a.verified);
  }

  // Sort
  const sort = searchParams.get("sort") || "followers";
  const order = searchParams.get("order") || "desc";
  const sortField = ["followers", "subscribers", "handle", "name"].includes(sort) ? sort : "followers";

  accounts.sort((a, b) => {
    const av = (a as any)[sortField] ?? 0;
    const bv = (b as any)[sortField] ?? 0;
    if (typeof av === "string") return order === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    return order === "asc" ? av - bv : bv - av;
  });

  // Extract unique tags for filter discovery
  const tags = [...new Set(accounts.map((a) => a.tag).filter(Boolean))];

  // Paginate
  const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 200);
  const total = accounts.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const data = accounts.slice(start, start + limit);

  return NextResponse.json({
    accounts: data,
    tags,
    total,
    page,
    totalPages,
  });
}
