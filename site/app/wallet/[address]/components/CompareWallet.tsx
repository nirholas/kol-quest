"use client";

import { useState } from "react";
import { formatUsd } from "@/lib/format";

interface WalletSummaryData {
  totalValueUsd: number;
  pnl24h: number;
  pnl7d: number;
  pnl30d: number;
}

interface Props {
  address: string;
  chain: string;
}

export default function CompareWallet({ address, chain }: Props) {
  const [open, setOpen] = useState(false);
  const [compareAddress, setCompareAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{
    a: WalletSummaryData | null;
    b: WalletSummaryData | null;
  } | null>(null);

  async function compare() {
    if (!compareAddress.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const [aRes, bRes] = await Promise.all([
        fetch(`/api/wallets/${address}?chain=${chain}`).then(r => r.json()),
        fetch(`/api/wallets/${compareAddress.trim()}?chain=${chain}`).then(r => r.json()),
      ]);
      if (aRes.error) throw new Error(aRes.error);
      if (bRes.error) throw new Error(bRes.error);
      setResults({ a: aRes, b: bRes });
    } catch (e: any) {
      setError(e.message || "Failed to compare wallets");
    } finally {
      setLoading(false);
    }
  }

  const metrics: { label: string; key: keyof WalletSummaryData; format: (v: number) => string }[] = [
    { label: "Portfolio Value", key: "totalValueUsd", format: formatUsd },
    { label: "24h PnL", key: "pnl24h", format: (v) => `${v >= 0 ? "+" : ""}${formatUsd(v)}` },
    { label: "7d PnL", key: "pnl7d", format: (v) => `${v >= 0 ? "+" : ""}${formatUsd(v)}` },
    { label: "30d PnL", key: "pnl30d", format: (v) => `${v >= 0 ? "+" : ""}${formatUsd(v)}` },
  ];

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-zinc-500 hover:text-white border border-border hover:border-zinc-600 rounded px-3 py-1.5 transition-colors"
      >
        Compare wallets
      </button>
    );
  }

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-zinc-400 text-sm font-medium">Compare Wallets</span>
        <button onClick={() => setOpen(false)} className="text-zinc-600 hover:text-white text-xs transition-colors">✕</button>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={compareAddress}
          onChange={e => setCompareAddress(e.target.value)}
          placeholder="Enter wallet address to compare…"
          className="flex-1 bg-bg-secondary border border-border rounded px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
          onKeyDown={e => e.key === "Enter" && compare()}
        />
        <button
          onClick={compare}
          disabled={loading || !compareAddress.trim()}
          className="px-4 py-2 bg-accent/20 text-accent border border-accent/30 rounded text-sm hover:bg-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "…" : "Compare"}
        </button>
      </div>

      {error && <p className="text-sell text-xs mb-3">{error}</p>}

      {results && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-600 text-xs uppercase tracking-wider">
                <th className="text-left pb-2 font-normal">Metric</th>
                <th className="text-right pb-2 font-normal">This wallet</th>
                <th className="text-right pb-2 font-normal">Compared wallet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {metrics.map(m => {
                const aVal = results.a?.[m.key] ?? 0;
                const bVal = results.b?.[m.key] ?? 0;
                return (
                  <tr key={m.key}>
                    <td className="py-2 text-zinc-500">{m.label}</td>
                    <td className={`py-2 text-right tabular-nums font-semibold ${typeof aVal === "number" && aVal >= 0 ? "text-white" : "text-sell"}`}>
                      {m.format(aVal as number)}
                    </td>
                    <td className={`py-2 text-right tabular-nums font-semibold ${typeof bVal === "number" && bVal >= 0 ? "text-white" : "text-sell"}`}>
                      {m.format(bVal as number)}
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
