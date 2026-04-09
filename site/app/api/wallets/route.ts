import { NextRequest, NextResponse } from "next/server";
import { getAllSolanaWallets, getBscWallets } from "@/lib/data";
import type { UnifiedWallet } from "@/lib/types";

// GET /api/wallets — unified wallet listing across KolScan + GMGN
// ?chain=sol|bsc|all — filter by chain (default: all)
// ?source=kolscan|gmgn|all — filter by data source (default: all)
// ?category=kol|smart_degen|... — filter by category
// ?search=term — search by name, address, twitter
// ?sort=profit_7d|profit_1d|profit_30d|winrate_7d|buys_7d — sort field
// ?order=asc|desc — sort order (default: desc)
// ?page=1&limit=50 — pagination
// ?minProfit=1000 — minimum 7d profit filter
// ?tag=kolscan — filter by tag
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const chain = searchParams.get("chain") || "all";

  let wallets: UnifiedWallet[] = [];
  if (chain === "bsc") {
    wallets = await getBscWallets();
  } else if (chain === "sol") {
    wallets = await getAllSolanaWallets();
  } else {
    const [sol, bsc] = await Promise.all([getAllSolanaWallets(), getBscWallets()]);
    wallets = [...sol, ...bsc];
  }

  // Source filter
  const source = searchParams.get("source");
  if (source && source !== "all") {
    wallets = wallets.filter((w) => w.source === source);
  }

  // Category filter
  const category = searchParams.get("category");
  if (category) {
    wallets = wallets.filter((w) => w.category === category);
  }

  // Tag filter
  const tag = searchParams.get("tag");
  if (tag) {
    wallets = wallets.filter((w) => w.tags.includes(tag));
  }

  // Search
  const search = searchParams.get("search")?.toLowerCase();
  if (search) {
    wallets = wallets.filter(
      (w) =>
        w.name.toLowerCase().includes(search) ||
        w.wallet_address.toLowerCase().includes(search) ||
        w.twitter?.toLowerCase().includes(search),
    );
  }

  // Min profit filter
  const minProfit = parseFloat(searchParams.get("minProfit") || "0");
  if (minProfit > 0) {
    wallets = wallets.filter((w) => w.profit_7d >= minProfit);
  }

  // Sort
  const sort = searchParams.get("sort") || "profit_7d";
  const order = searchParams.get("order") || "desc";
  const validSorts = [
    "profit_1d", "profit_7d", "profit_30d",
    "winrate_1d", "winrate_7d", "winrate_30d",
    "buys_7d", "sells_7d", "name",
  ];
  const sortField = validSorts.includes(sort) ? sort : "profit_7d";

  wallets.sort((a, b) => {
    const av = (a as any)[sortField] ?? 0;
    const bv = (b as any)[sortField] ?? 0;
    if (typeof av === "string") return order === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    return order === "asc" ? av - bv : bv - av;
  });

  // Discover categories and tags
  const categories = [...new Set(wallets.map((w) => w.category))];
  const tags = [...new Set(wallets.flatMap((w) => w.tags))];

  // Paginate
  const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 200);
  const total = wallets.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const data = wallets.slice(start, start + limit);

  return NextResponse.json({
    wallets: data,
    categories,
    tags,
    total,
    page,
    totalPages,
  });
}
