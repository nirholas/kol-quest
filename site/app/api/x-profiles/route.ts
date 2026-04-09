import { NextRequest, NextResponse } from "next/server";
import { getXProfiles, getXProfile } from "@/lib/data";

// GET /api/x-profiles — list all X/Twitter profiles or look up specific ones
// ?username=xyz — single profile lookup
// ?search=term — search by username, name, or bio
// ?sort=followers|following|tweets — sort field (default: followers)
// ?order=asc|desc — sort order (default: desc)
// ?page=1&limit=50 — pagination
// ?minFollowers=1000 — filter by minimum followers
// ?verified=true — only verified accounts
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const profiles = await getXProfiles();

  // Single profile lookup
  const username = searchParams.get("username");
  if (username) {
    const profile = getXProfile(profiles, username);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    return NextResponse.json({ profile });
  }

  // Build filtered list
  let list = Object.values(profiles).filter((p) => !p.error);

  const search = searchParams.get("search")?.toLowerCase();
  if (search) {
    list = list.filter(
      (p) =>
        p.username?.toLowerCase().includes(search) ||
        p.name?.toLowerCase().includes(search) ||
        p.bio?.toLowerCase().includes(search),
    );
  }

  const minFollowers = parseInt(searchParams.get("minFollowers") || "0", 10);
  if (minFollowers > 0) {
    list = list.filter((p) => (p.followers || 0) >= minFollowers);
  }

  const verified = searchParams.get("verified");
  if (verified === "true") {
    list = list.filter((p) => p.verified);
  }

  // Sort
  const sort = searchParams.get("sort") || "followers";
  const order = searchParams.get("order") || "desc";
  const validSorts = ["followers", "following", "tweets", "likes", "username", "name"];
  const sortField = validSorts.includes(sort) ? sort : "followers";

  list.sort((a, b) => {
    const av = (a as any)[sortField] ?? 0;
    const bv = (b as any)[sortField] ?? 0;
    if (typeof av === "string") return order === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    return order === "asc" ? av - bv : bv - av;
  });

  // Paginate
  const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 200);
  const total = list.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const data = list.slice(start, start + limit);

  return NextResponse.json({
    profiles: data.map((p) => ({
      username: p.username,
      name: p.name,
      bio: p.bio,
      avatar: p.avatar,
      header: p.header,
      followers: p.followers,
      following: p.following,
      tweets: p.tweets,
      likes: p.likes,
      verified: p.verified,
      protected: p.protected,
      location: p.location,
      website: p.website,
      joinDate: p.joinDate,
      scrapedAt: p.scrapedAt,
    })),
    total,
    page,
    totalPages,
  });
}
