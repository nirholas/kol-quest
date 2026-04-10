"use client";

import { useState, useMemo, useEffect } from "react";
import type { WalletTransaction } from "@/lib/wallet-aggregator";
import { formatUsd } from "@/lib/format";

type TxType = "all" | "swap" | "transfer" | "mint" | "nft";

interface Props {
  address: string;
  chain: string;
  initialTransactions?: WalletTransaction[];
}

function TxSkeleton() {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-zinc-800" />
        <div>
          <div className="w-20 h-3 bg-zinc-800 rounded mb-1" />
          <div className="w-32 h-2 bg-zinc-800/60 rounded" />
        </div>
      </div>
      <div className="w-16 h-3 bg-zinc-800 rounded" />
    </div>
  );
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

export default function TransactionsTab({ address, chain, initialTransactions = [] }: Props) {
  const [transactions, setTransactions] = useState<WalletTransaction[]>(initialTransactions);
  const [loading, setLoading] = useState(initialTransactions.length === 0);
  const [filter, setFilter] = useState<TxType>("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (initialTransactions.length > 0) return;
    setLoading(true);
    fetch(`/api/wallets/${address}/transactions?chain=${chain}&limit=100`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setTransactions(data);
      })
      .finally(() => setLoading(false));
  }, [address, chain, initialTransactions.length]);

  const filtered = useMemo(() => {
    if (filter === "all") return transactions;
    return transactions.filter(t => t.type === filter);
  }, [transactions, filter]);

  const displayed = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = displayed.length < filtered.length;

  if (loading) {
    return <div className="divide-y divide-border/30">{Array.from({ length: 10 }).map((_, i) => <TxSkeleton key={i} />)}</div>;
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {(["all", "swap", "transfer", "mint", "nft"] as TxType[]).map((t) => (
          <button
            key={t}
            onClick={() => { setFilter(t); setPage(1); }}
            className={`px-2.5 py-1 rounded text-xs capitalize transition-colors border ${filter === t ? "bg-accent/20 text-accent border-accent/30" : "bg-zinc-800/60 text-zinc-500 hover:text-white border-transparent"}`}
          >
            {t}
          </button>
        ))}
        <span className="ml-auto text-xs text-zinc-500 self-center">{filtered.length} txs</span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-zinc-600 text-sm py-6 text-center">No transactions found.</p>
      ) : (
        <div className="divide-y divide-border/30">
          {displayed.map((tx) => (
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
                  <div className="text-zinc-600 text-[11px]">
                    {relativeTime(tx.timestamp)} · {tx.source}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {tx.valueUsd != null && (
                  <span className="text-zinc-300 text-sm tabular-nums">{formatUsd(tx.valueUsd)}</span>
                )}
                {tx.hash && (
                  <a
                    href={explorerUrl(chain, tx.hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-600 hover:text-accent text-xs transition-colors"
                    title="View on explorer"
                  >
                    ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <button
          onClick={() => setPage(p => p + 1)}
          className="w-full mt-4 py-2 text-xs text-zinc-500 hover:text-white border border-border hover:border-zinc-600 rounded transition-colors"
        >
          Load more
        </button>
      )}
    </div>
  );
}
