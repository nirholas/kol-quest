"use client";

import { useState, useEffect, useCallback } from "react";
import type { TrendingToken, TrendingResponse } from "@/lib/trending-aggregator";
import { SUPPORTED_CHAINS, TRENDING_CATEGORIES } from "@/lib/trending-aggregator";
import TrendingCard from "./TrendingCard";

interface TrendingGridProps {
  initialTokens?: TrendingToken[];
}

const TIMEFRAMES = [
  { id: "1h", label: "1H" },
  { id: "24h", label: "24H" },
  { id: "7d", label: "7D" },
] as const;

export default function TrendingGrid({ initialTokens = [] }: TrendingGridProps) {
  const [tokens, setTokens] = useState<TrendingToken[]>(initialTokens);
  const [loading, setLoading] = useState(initialTokens.length === 0);
  const [sources, setSources] = useState<TrendingResponse["sources"] | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Filters
  const [chain, setChain] = useState("all");
  const [category, setCategory] = useState("all");
  const [timeframe, setTimeframe] = useState<"1h" | "24h" | "7d">("24h");
  const [minLiquidity, setMinLiquidity] = useState(0);
  const [hideRugs, setHideRugs] = useState(false);

  const fetchTrending = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (chain !== "all") params.set("chain", chain);
      if (category !== "all") params.set("category", category);
      params.set("timeframe", timeframe);
      params.set("limit", "50");
      if (minLiquidity > 0) params.set("minLiquidity", String(minLiquidity));
      if (hideRugs) params.set("hideRugs", "true");

      const res = await fetch(`/api/trending?${params}`);
      const data: TrendingResponse = await res.json();
      setTokens(data.tokens ?? []);
      setSources(data.sources ?? null);
      setLastUpdated(data.lastUpdated ?? null);
    } catch (err) {
      console.error("Failed to fetch trending:", err);
    } finally {
      setLoading(false);
    }
  }, [chain, category, timeframe, minLiquidity, hideRugs]);

  // Initial fetch
  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchTrending, 60_000);
    return () => clearInterval(interval);
  }, [fetchTrending]);

  const topThree = tokens.slice(0, 3);
  const rest = tokens.slice(3);

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg border border-border bg-bg-card">
        {/* Chain selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500">Chain</label>
          <select
            value={chain}
            onChange={(e) => setChain(e.target.value)}
            className="px-2 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:border-accent"
          >
            {SUPPORTED_CHAINS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Category selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-2 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:border-accent"
          >
            <option value="all">All Categories</option>
            {TRENDING_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center gap-1 bg-zinc-900 rounded border border-zinc-700">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              onClick={() => setTimeframe(tf.id)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                timeframe === tf.id
                  ? "bg-accent text-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Min liquidity */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500">Min Liq</label>
          <select
            value={minLiquidity}
            onChange={(e) => setMinLiquidity(Number(e.target.value))}
            className="px-2 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:border-accent"
          >
            <option value="0">Any</option>
            <option value="1000">$1K+</option>
            <option value="10000">$10K+</option>
            <option value="100000">$100K+</option>
            <option value="1000000">$1M+</option>
          </select>
        </div>

        {/* Hide rugs toggle */}
        <label className="flex items-center gap-2 cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={hideRugs}
            onChange={(e) => setHideRugs(e.target.checked)}
            className="w-4 h-4 rounded border-zinc-600 bg-zinc-900 text-accent focus:ring-accent"
          />
          <span className="text-xs text-zinc-400">Hide risky</span>
        </label>

        {/* Refresh button */}
        <button
          onClick={fetchTrending}
          disabled={loading}
          className="px-3 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors disabled:opacity-50"
        >
          {loading ? "⟳" : "Refresh"}
        </button>
      </div>

      {/* Sources status */}
      {sources && (
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-zinc-600">Sources:</span>
          {Object.entries(sources).map(([src, active]) => (
            <span
              key={src}
              className={`px-1.5 py-0.5 rounded ${
                active ? "bg-green-900/50 text-green-400" : "bg-zinc-800 text-zinc-600"
              }`}
            >
              {src}
            </span>
          ))}
          {lastUpdated && (
            <span className="ml-auto text-zinc-600">
              Updated {new Date(lastUpdated).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading && tokens.length === 0 && (
        <div className="space-y-3">
          {/* Hero skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-bg-card border border-border rounded-lg animate-pulse" />
            ))}
          </div>
          {/* Grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-24 bg-bg-card border border-border rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && tokens.length === 0 && (
        <div className="text-center py-20">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-white mb-2">No Trending Tokens Found</h2>
          <p className="text-zinc-500 text-sm max-w-md mx-auto">
            Try adjusting your filters or check back later. Different data sources may have varying coverage.
          </p>
        </div>
      )}

      {/* Hero section - Top 3 */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topThree.map((token, i) => (
            <TrendingCard key={`${token.chain}:${token.address}`} token={token} rank={i + 1} variant="large" />
          ))}
        </div>
      )}

      {/* Main grid */}
      {rest.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {rest.map((token, i) => (
            <TrendingCard
              key={`${token.chain}:${token.address}`}
              token={token}
              rank={i + 4}
              variant="compact"
            />
          ))}
        </div>
      )}

      {/* Live indicator */}
      {!loading && tokens.length > 0 && (
        <div className="flex items-center justify-center gap-2 text-xs text-zinc-600">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          Auto-refreshing every 60s
        </div>
      )}
    </div>
  );
}
