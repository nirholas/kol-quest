"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { shortAddr, timeAgo, explorerUrl } from "@/lib/format";

interface BirdeyeTrade {
  txHash: string;
  blockUnixTime: number;
  source: string;
  owner: string;
  side: "buy" | "sell";
  from: { symbol: string; decimals: number; address: string; amount: number; uiAmount: number; uiAmountString: string };
  to: { symbol: string; decimals: number; address: string; amount: number; uiAmount: number; uiAmountString: string };
  tokenAddress?: string;
  volumeUSD: number;
  price: number;
}

type Filter = "all" | "buy" | "sell" | "whale";

const WHALE_THRESHOLD = 10_000; // $10k

function fmt(v: number | null, prefix = "$") {
  if (v == null) return "—";
  if (Math.abs(v) >= 1_000_000) return `${prefix}${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `${prefix}${(v / 1_000).toFixed(1)}K`;
  if (Math.abs(v) >= 1) return `${prefix}${v.toFixed(2)}`;
  return `${prefix}${v.toPrecision(4)}`;
}

export default function TradesFeed({
  chain,
  address,
}: {
  chain: "sol" | "bsc";
  address: string;
}) {
  const [trades, setTrades] = useState<BirdeyeTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  const loadTrades = useCallback(async () => {
    if (chain !== "sol") { setLoading(false); return; }
    try {
      const r = await fetch(`/api/token/${chain}/${address}/trades?limit=100`);
      const json = await r.json();
      setTrades(json.trades ?? []);
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  }, [chain, address]);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  // Poll every 30s
  useEffect(() => {
    const id = setInterval(() => loadTrades(), 30_000);
    return () => clearInterval(id);
  }, [loadTrades]);

  if (chain !== "sol") {
    return (
      <div className="py-10 text-center text-zinc-600 text-sm">
        Live trade feed available for Solana tokens only.
      </div>
    );
  }

  const filtered = trades.filter((t) => {
    if (filter === "buy") return t.side === "buy";
    if (filter === "sell") return t.side === "sell";
    if (filter === "whale") return (t.volumeUSD ?? 0) >= WHALE_THRESHOLD;
    return true;
  });

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        {(["all", "buy", "sell", "whale"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-all ${
              filter === f
                ? f === "buy"
                  ? "bg-buy/20 text-buy border border-buy/30"
                  : f === "sell"
                  ? "bg-sell/20 text-sell border border-sell/30"
                  : f === "whale"
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                  : "bg-white/10 text-white border border-white/20"
                : "text-zinc-500 border border-transparent hover:text-zinc-300"
            }`}
          >
            {f === "whale" ? `🐋 Whale (>$10K)` : f}
          </button>
        ))}
        <span className="ml-auto text-xs text-zinc-600">
          {filtered.length} trades · auto-refresh 30s
        </span>
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
        </div>
      ) : !filtered.length ? (
        <div className="py-10 text-center text-zinc-600 text-sm">No trades found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-bg-card/50">
                {["Time", "Type", "Wallet", "Amount", "Price", "DEX"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const isWhale = (t.volumeUSD ?? 0) >= WHALE_THRESHOLD;
                return (
                  <tr
                    key={t.txHash}
                    className={`border-b border-border/50 last:border-0 transition-colors ${
                      isWhale ? "bg-purple-900/5" : "hover:bg-bg-card/60"
                    }`}
                  >
                    <td className="px-4 py-3 text-xs text-zinc-500 tabular-nums whitespace-nowrap">
                      {timeAgo(new Date(t.blockUnixTime * 1000).toISOString())}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                          t.side === "buy"
                            ? "bg-buy/10 text-buy"
                            : "bg-sell/10 text-sell"
                        }`}
                      >
                        {t.side}
                      </span>
                      {isWhale && <span className="ml-1 text-[10px]">🐋</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/wallet/${t.owner}`}
                        className="text-sm text-zinc-300 hover:text-white font-mono transition-colors"
                      >
                        {shortAddr(t.owner)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums text-zinc-300 whitespace-nowrap">
                      {fmt(t.volumeUSD)}
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-zinc-500 whitespace-nowrap">
                      {t.price ? fmt(t.price) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={explorerUrl(chain, t.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-zinc-600 hover:text-accent transition-colors"
                      >
                        {t.source ?? shortAddr(t.txHash)}↗
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
