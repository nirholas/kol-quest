"use client";

import { useState, useEffect } from "react";
import type { WalletPnl } from "@/lib/wallet-aggregator";
import { formatUsd } from "@/lib/format";

interface Props {
  address: string;
  chain: string;
  initialPnl?: WalletPnl | null;
}

function PnlSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-zinc-800/60 rounded-lg p-3">
            <div className="w-16 h-2 bg-zinc-700 rounded mb-2" />
            <div className="w-20 h-5 bg-zinc-700 rounded" />
          </div>
        ))}
      </div>
      <div className="h-32 bg-zinc-800/60 rounded-lg" />
    </div>
  );
}

function MiniBarChart({ data }: { data: { date: string; pnl: number }[] }) {
  if (data.length === 0) return null;
  const maxAbs = Math.max(...data.map(d => Math.abs(d.pnl)), 1);
  return (
    <div className="flex items-end gap-1 h-20">
      {data.map((d, i) => {
        const heightPct = (Math.abs(d.pnl) / maxAbs) * 100;
        return (
          <div key={i} className="flex-1 flex items-end" title={`${d.date}: ${d.pnl >= 0 ? "+" : ""}$${d.pnl.toFixed(0)}`}>
            <div
              className={`w-full rounded-sm ${d.pnl >= 0 ? "bg-buy/70" : "bg-sell/70"}`}
              style={{ height: `${Math.max(heightPct, 2)}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function PnlTab({ address, chain, initialPnl }: Props) {
  const [pnl, setPnl] = useState<WalletPnl | null>(initialPnl ?? null);
  const [loading, setLoading] = useState(!initialPnl);

  useEffect(() => {
    if (initialPnl) return;
    setLoading(true);
    fetch(`/api/wallets/${address}/pnl?chain=${chain}`)
      .then(r => r.json())
      .then(data => { if (!data.error) setPnl(data); })
      .finally(() => setLoading(false));
  }, [address, chain, initialPnl]);

  if (loading) return <PnlSkeleton />;
  if (!pnl) return <p className="text-zinc-600 text-sm py-6 text-center">No PnL data available.</p>;

  const winRate = pnl.winRate * 100;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-bg-secondary border border-border rounded-lg p-3">
          <div className="text-zinc-600 text-[11px] uppercase tracking-wider mb-1">Realized PnL</div>
          <div className={`text-xl font-bold tabular-nums ${pnl.realized >= 0 ? "text-buy" : "text-sell"}`}>
            {pnl.realized >= 0 ? "+" : ""}{formatUsd(pnl.realized)}
          </div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-lg p-3">
          <div className="text-zinc-600 text-[11px] uppercase tracking-wider mb-1">Unrealized</div>
          <div className={`text-xl font-bold tabular-nums ${pnl.unrealized >= 0 ? "text-buy" : "text-sell"}`}>
            {pnl.unrealized >= 0 ? "+" : ""}{formatUsd(pnl.unrealized)}
          </div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-lg p-3">
          <div className="text-zinc-600 text-[11px] uppercase tracking-wider mb-1">Win Rate</div>
          <div className={`text-xl font-bold tabular-nums ${winRate >= 50 ? "text-buy" : "text-sell"}`}>
            {winRate.toFixed(1)}%
          </div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-lg p-3">
          <div className="text-zinc-600 text-[11px] uppercase tracking-wider mb-1">Total Trades</div>
          <div className="text-xl font-bold text-white tabular-nums">{pnl.totalTrades.toLocaleString()}</div>
        </div>
      </div>

      {/* Daily PnL chart */}
      {pnl.dailyPnl.length > 0 && (
        <div className="bg-bg-secondary border border-border rounded-lg p-4">
          <div className="text-zinc-500 text-[11px] uppercase tracking-wider mb-3">Daily PnL</div>
          <MiniBarChart data={pnl.dailyPnl} />
          <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
            <span>{pnl.dailyPnl[0]?.date}</span>
            <span>{pnl.dailyPnl[pnl.dailyPnl.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Best / worst trade */}
      {(pnl.bestTrade || pnl.worstTrade) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {pnl.bestTrade && (
            <div className="bg-bg-secondary border border-border rounded-lg p-3">
              <div className="text-zinc-600 text-[11px] uppercase tracking-wider mb-1">Best Trade</div>
              <div className="font-semibold text-white text-sm">{pnl.bestTrade.token}</div>
              <div className="text-buy tabular-nums text-lg font-bold">+{formatUsd(pnl.bestTrade.profit)}</div>
            </div>
          )}
          {pnl.worstTrade && (
            <div className="bg-bg-secondary border border-border rounded-lg p-3">
              <div className="text-zinc-600 text-[11px] uppercase tracking-wider mb-1">Worst Trade</div>
              <div className="font-semibold text-white text-sm">{pnl.worstTrade.token}</div>
              <div className="text-sell tabular-nums text-lg font-bold">{formatUsd(pnl.worstTrade.profit)}</div>
            </div>
          )}
        </div>
      )}

      {/* Per-token breakdown */}
      {pnl.perToken.length > 0 && (
        <div className="bg-bg-secondary border border-border rounded-lg p-4">
          <div className="text-zinc-500 text-[11px] uppercase tracking-wider mb-3">Per-Token PnL</div>
          <div className="space-y-2">
            {pnl.perToken.slice(0, 10).map((t) => (
              <div key={t.address} className="flex items-center justify-between text-sm">
                <span className="text-zinc-300 font-medium">{t.symbol}</span>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-600 text-xs">{t.trades} trades</span>
                  <span className={`tabular-nums font-semibold ${t.pnl >= 0 ? "text-buy" : "text-sell"}`}>
                    {t.pnl >= 0 ? "+" : ""}{formatUsd(t.pnl)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
