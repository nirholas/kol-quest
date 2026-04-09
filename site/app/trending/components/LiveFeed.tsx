"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { TrendingToken } from "@/lib/trending-aggregator";
import { formatUsd, timeAgo } from "@/lib/format";

interface LiveFeedProps {
  tokens: TrendingToken[];
}

interface FeedItem {
  id: string;
  type: "new" | "pump" | "whale" | "viral";
  token: TrendingToken;
  timestamp: Date;
  message: string;
}

const FEED_ICONS: Record<string, string> = {
  new: "🆕",
  pump: "🚀",
  whale: "🐋",
  viral: "🔥",
};

const FEED_COLORS: Record<string, string> = {
  new: "border-l-green-500",
  pump: "border-l-orange-500",
  whale: "border-l-blue-500",
  viral: "border-l-pink-500",
};

function generateFeedItems(tokens: TrendingToken[]): FeedItem[] {
  const items: FeedItem[] = [];
  const now = new Date();

  tokens.slice(0, 20).forEach((token, i) => {
    // New tokens (launched < 24h ago)
    if (token.isNew) {
      items.push({
        id: `new-${token.address}`,
        type: "new",
        token,
        timestamp: token.launchedAt ? new Date(token.launchedAt) : now,
        message: `New listing on ${token.chain.toUpperCase()}`,
      });
    }

    // Pumping tokens (high momentum)
    if (token.momentum === "rising" && token.priceChange24h > 50) {
      items.push({
        id: `pump-${token.address}`,
        type: "pump",
        token,
        timestamp: new Date(now.getTime() - i * 120000), // stagger
        message: `+${token.priceChange24h.toFixed(0)}% in 24h`,
      });
    }

    // Viral tokens (many sources)
    if (Object.keys(token.sources).length >= 3) {
      items.push({
        id: `viral-${token.address}`,
        type: "viral",
        token,
        timestamp: new Date(now.getTime() - i * 180000),
        message: `Trending on ${Object.keys(token.sources).length} platforms`,
      });
    }

    // High volume relative to liquidity (whale activity indicator)
    if (token.volume24h > token.liquidity * 2 && token.liquidity > 10000) {
      items.push({
        id: `whale-${token.address}`,
        type: "whale",
        token,
        timestamp: new Date(now.getTime() - i * 150000),
        message: `High volume: ${formatUsd(token.volume24h)}`,
      });
    }
  });

  // Sort by timestamp (most recent first)
  items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Dedupe by token (keep first/latest)
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.token.address;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);
}

export default function LiveFeed({ tokens }: LiveFeedProps) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [newItems, setNewItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const newFeed = generateFeedItems(tokens);

    // Mark items that weren't in the previous list as "new"
    const previousIds = new Set(items.map((i) => i.id));
    const justAdded = new Set<string>();
    newFeed.forEach((item) => {
      if (!previousIds.has(item.id)) {
        justAdded.add(item.id);
      }
    });

    setItems(newFeed);
    setNewItems(justAdded);

    // Clear "new" highlighting after 3 seconds
    const timer = setTimeout(() => setNewItems(new Set()), 3000);
    return () => clearTimeout(timer);
  }, [tokens]);

  if (items.length === 0) {
    return (
      <div className="p-4 text-center text-zinc-500 text-sm">
        <div className="text-2xl mb-2">📡</div>
        No live activity yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/token/${item.token.chain}/${item.token.address}`}
          className={`
            block p-3 rounded-lg border border-border bg-bg-card border-l-2 ${FEED_COLORS[item.type]}
            hover:border-accent/50 transition-all
            ${newItems.has(item.id) ? "animate-pulse bg-accent/5" : ""}
          `}
        >
          <div className="flex items-start gap-2">
            <span className="text-lg flex-shrink-0">{FEED_ICONS[item.type]}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-sm truncate">
                  {item.token.symbol}
                </span>
                <span className="text-[10px] text-zinc-600 px-1 py-0.5 rounded bg-zinc-800">
                  {item.token.chain.toUpperCase()}
                </span>
              </div>
              <div className="text-xs text-zinc-400 mt-0.5">{item.message}</div>
              <div className="text-[10px] text-zinc-600 mt-1">
                {timeAgo(item.timestamp.toISOString())}
              </div>
            </div>
            {/* Price change indicator */}
            {item.token.priceChange24h !== 0 && (
              <span
                className={`text-xs font-medium ${
                  item.token.priceChange24h > 0 ? "text-buy" : "text-sell"
                }`}
              >
                {item.token.priceChange24h > 0 ? "+" : ""}
                {item.token.priceChange24h.toFixed(1)}%
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
