"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AvatarFallback } from "./FallbackImg";
import { timeAgo, shortAddr, formatUsd } from "@/lib/format";

interface Trade {
  id: string;
  walletAddress: string;
  walletLabel: string | null;
  walletAvatar: string | null;
  chain: string;
  type: "buy" | "sell";
  tokenSymbol: string | null;
  amountUsd: number | null;
  tradedAt: string;
}

export default function RecentTradesPreview() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/trades?limit=8")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setTrades(data.trades || []);
        setLoaded(true);
      })
      .catch(() => {
        setError(true);
        setLoaded(true);
      });
  }, []);

  if (loaded && (trades.length === 0 || error)) return null;

  return (
    <div className="border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Latest Trades</h2>
            <span className="flex items-center gap-1.5 text-[11px] text-buy">
              <span className="w-1.5 h-1.5 rounded-full bg-buy animate-pulse" />
              Live
            </span>
          </div>
          <Link href="/feed" className="text-xs text-zinc-600 hover:text-white transition-colors">
            View all →
          </Link>
        </div>

        {!loaded ? (
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="shrink-0 w-48 h-20 rounded-lg bg-bg-card border border-border animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {trades.map((t) => (
              <Link
                key={t.id}
                href={`/wallet/${t.walletAddress}`}
                className="shrink-0 bg-bg-card border border-border rounded-lg px-4 py-3 min-w-[180px] hover:border-zinc-600 transition-colors block"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                      t.type === "buy" ? "bg-buy/10 text-buy" : "bg-sell/10 text-sell"
                    }`}
                  >
                    {t.type}
                  </span>
                  <span className="text-[10px] text-zinc-600 tabular-nums">{timeAgo(t.tradedAt)}</span>
                </div>
                <div className="text-sm text-white font-medium truncate">
                  {t.tokenSymbol || "???"}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="flex items-center gap-1.5 text-[11px] text-zinc-500 truncate min-w-0">
                    <AvatarFallback
                      src={t.walletAvatar}
                      seed={t.walletAddress}
                      label={t.walletLabel || t.walletAddress}
                      size="w-4 h-4"
                      textSize="text-[8px]"
                    />
                    <span className="truncate">{t.walletLabel || shortAddr(t.walletAddress)}</span>
                  </span>
                  {t.amountUsd != null && (
                    <span className="text-[11px] text-zinc-400 tabular-nums ml-2">
                      {formatUsd(t.amountUsd)}
                    </span>
                  )}
                </div>
                <span className="text-[9px] px-1 py-0.5 rounded bg-zinc-800 text-zinc-600 border border-zinc-700 uppercase mt-1 inline-block">
                  {t.chain}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
