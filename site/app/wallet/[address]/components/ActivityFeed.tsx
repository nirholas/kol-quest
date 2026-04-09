"use client";

import { useState, useEffect, useCallback } from "react";
import type { WalletTransaction } from "@/lib/wallet-aggregator";
import { formatUsd } from "@/lib/format";

interface Props {
  address: string;
  chain: string;
}

const TYPE_COLORS: Record<string, string> = {
  swap: "text-accent bg-accent/10 border-accent/20",
  transfer: "text-zinc-400 bg-zinc-800 border-zinc-700",
  mint: "text-buy bg-buy/10 border-buy/20",
  burn: "text-sell bg-sell/10 border-sell/20",
  nft: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  defi: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  unknown: "text-zinc-600 bg-zinc-800/60 border-zinc-700/50",
};

const TYPE_FILTERS = ["all", "swap", "transfer", "defi"] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number];

function relativeTime(ts: number): string {
  const diff = Date.now() - ts * 1000;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

function explorerUrl(chain: string, hash: string): string {
  if (chain === "solana") return `https://solscan.io/tx/${hash}`;
  if (chain === "bsc") return `https://bscscan.com/tx/${hash}`;
  return `https://etherscan.io/tx/${hash}`;
}

export default function ActivityFeed({ address, chain }: Props) {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TypeFilter>("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const POLL_MS = 30_000;

  const fetchActivity = useCallback(() => {
    fetch(`/api/wallets/${address}/transactions?chain=${chain}&limit=20`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTransactions(data);
          setLastUpdated(new Date());
        }
      })
      .finally(() => setLoading(false));
  }, [address, chain]);

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  const filtered = filter === "all" ? transactions : transactions.filter(t => t.type === filter);

  return (
    <div>
      {/* Filter + status bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-1">
          {TYPE_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded text-xs capitalize transition-colors border ${filter === f ? "bg-accent/20 text-accent border-accent/30" : "bg-zinc-800/60 text-zinc-500 hover:text-white border-transparent"}`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 text-[11px] text-zinc-600">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-buy opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-buy/60" />
          </span>
          {lastUpdated ? `Updated ${relativeTime(Math.floor(lastUpdated.getTime() / 1000))}` : "Loading…"}
          <button onClick={fetchActivity} className="text-zinc-600 hover:text-white transition-colors ml-1">↻</button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-zinc-800/60 rounded" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-zinc-600 text-sm py-6 text-center">No recent activity.</p>
      ) : (
        <div className="divide-y divide-border/30">
          {filtered.map((tx) => (
            <div key={tx.hash} className="flex items-center justify-between py-2.5 hover:bg-white/[0.02] -mx-2 px-2 rounded transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded border flex-shrink-0 ${TYPE_COLORS[tx.type] || TYPE_COLORS.unknown}`}>
                  {tx.type}
                </span>
                <div className="min-w-0">
                  {tx.tokenIn && tx.tokenOut ? (
                    <div className="text-zinc-300 text-xs truncate">
                      <span className="text-sell">{tx.tokenIn.symbol}</span>
                      <span className="text-zinc-600 mx-1">→</span>
                      <span className="text-buy">{tx.tokenOut.symbol}</span>
                    </div>
                  ) : (
                    <div className="text-zinc-500 text-xs font-mono truncate">{tx.hash.slice(0, 20)}…</div>
                  )}
                  <div className="text-zinc-600 text-[11px]">{relativeTime(tx.timestamp)}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {tx.valueUsd != null && (
                  <span className="text-zinc-300 text-sm tabular-nums">{formatUsd(tx.valueUsd)}</span>
                )}
                {tx.hash && (
                  <a href={explorerUrl(chain, tx.hash)} target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-accent text-xs transition-colors">
                    ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
