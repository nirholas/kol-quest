"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface WalletStat {
  address: string;
  label: string | null;
  buys: number;
  sells: number;
  totalBuyUsd: number;
  totalSellUsd: number;
  realizedProfit: number;
  lastTrade: string;
}

interface RecentTrade {
  id: string;
  walletAddress: string;
  walletLabel: string | null;
  type: "buy" | "sell";
  amountUsd: number | null;
  realizedProfit: number | null;
  txHash: string | null;
  tradedAt: string;
}

interface TokenData {
  token: {
    address: string;
    symbol: string | null;
    name: string | null;
    logo: string | null;
    launchpad: string | null;
    chain: string;
  } | null;
  totalTrades: number;
  uniqueWallets: number;
  totalBuyVolume: number;
  totalSellVolume: number;
  wallets: WalletStat[];
  recentTrades: RecentTrade[];
}

function formatUsd(v: number | null): string {
  if (v == null) return "—";
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
  return `$${v.toFixed(2)}`;
}

function shortAddr(addr: string): string {
  return addr.slice(0, 4) + "…" + addr.slice(-4);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function TokenClient({
  address,
  chain,
}: {
  address: string;
  chain: string;
}) {
  const [data, setData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"wallets" | "trades">("wallets");

  useEffect(() => {
    fetch(`/api/token?token=${address}&chain=${chain}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [address, chain]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-bg-card border border-border rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data || !data.token) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-white mb-2">No Trade Data</h2>
        <p className="text-zinc-500 text-sm">No trades found for this token from tracked wallets.</p>
      </div>
    );
  }

  const { token, totalTrades, uniqueWallets, totalBuyVolume, totalSellVolume, wallets, recentTrades } = data;
  const netFlow = totalBuyVolume - totalSellVolume;

  return (
    <div className="space-y-6">
      {/* Token header */}
      <div className="flex items-center gap-4">
        {token.logo ? (
          <img src={token.logo} alt="" className="w-12 h-12 rounded-full" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-bold text-zinc-500">
            {(token.symbol || "?")[0]}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">{token.name || token.symbol || shortAddr(token.address)}</h1>
            {token.symbol && <span className="text-zinc-500 text-sm">${token.symbol}</span>}
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-600 font-mono">
            <span>{shortAddr(token.address)}</span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 uppercase">{token.chain}</span>
            {token.launchpad && (
              <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700">{token.launchpad}</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Tracked Trades", value: totalTrades.toString() },
          { label: "Unique Wallets", value: uniqueWallets.toString() },
          { label: "Buy Volume", value: formatUsd(totalBuyVolume) },
          { label: "Net Flow", value: formatUsd(netFlow), color: netFlow > 0 ? "text-buy" : "text-sell" },
        ].map((s) => (
          <div key={s.label} className="bg-bg-card border border-border rounded-lg p-4">
            <div className="text-[11px] text-zinc-600 uppercase tracking-wider mb-1">{s.label}</div>
            <div className={`text-xl font-bold tabular-nums ${s.color || "text-white"}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {(["wallets", "trades"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-xs font-mono uppercase tracking-wider border-b-2 transition-colors ${
              tab === t
                ? "text-white border-white"
                : "text-zinc-600 border-transparent hover:text-zinc-400"
            }`}
          >
            {t === "wallets" ? `Wallets (${uniqueWallets})` : `Trades (${totalTrades})`}
          </button>
        ))}
      </div>

      {/* Wallets tab */}
      {tab === "wallets" && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2.5 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Wallet</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Buys</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Sells</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Buy Vol</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Sell Vol</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-medium text-zinc-600 uppercase tracking-wider">PnL</th>
              </tr>
            </thead>
            <tbody>
              {wallets.map((w) => (
                <tr key={w.address} className="border-b border-border/50 last:border-b-0 hover:bg-bg-card transition-colors">
                  <td className="px-3 py-2.5">
                    <Link href={`/wallet/${w.address}`} className="text-sm text-white hover:text-accent transition-colors">
                      {w.label || shortAddr(w.address)}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm text-buy tabular-nums">{w.buys}</td>
                  <td className="px-3 py-2.5 text-right text-sm text-sell tabular-nums">{w.sells}</td>
                  <td className="px-3 py-2.5 text-right text-sm text-white tabular-nums">{formatUsd(w.totalBuyUsd)}</td>
                  <td className="px-3 py-2.5 text-right text-sm text-white tabular-nums">{formatUsd(w.totalSellUsd)}</td>
                  <td className={`px-3 py-2.5 text-right text-sm tabular-nums font-medium ${w.realizedProfit > 0 ? "text-buy" : w.realizedProfit < 0 ? "text-sell" : "text-zinc-500"}`}>
                    {w.realizedProfit > 0 ? "+" : ""}{formatUsd(w.realizedProfit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Trades tab */}
      {tab === "trades" && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2.5 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Time</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Wallet</th>
                <th className="px-3 py-2.5 text-center text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Type</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Amount</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-medium text-zinc-600 uppercase tracking-wider">PnL</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Tx</th>
              </tr>
            </thead>
            <tbody>
              {recentTrades.map((t) => (
                <tr key={t.id} className="border-b border-border/50 last:border-b-0 hover:bg-bg-card transition-colors">
                  <td className="px-3 py-2.5 text-xs text-zinc-600">{timeAgo(t.tradedAt)}</td>
                  <td className="px-3 py-2.5">
                    <Link href={`/wallet/${t.walletAddress}`} className="text-sm text-white hover:text-accent transition-colors">
                      {t.walletLabel || shortAddr(t.walletAddress)}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${t.type === "buy" ? "bg-buy/15 text-buy" : "bg-sell/15 text-sell"}`}>
                      {t.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm text-white tabular-nums">{formatUsd(t.amountUsd)}</td>
                  <td className={`px-3 py-2.5 text-right text-sm tabular-nums ${(t.realizedProfit || 0) > 0 ? "text-buy" : (t.realizedProfit || 0) < 0 ? "text-sell" : "text-zinc-500"}`}>
                    {t.realizedProfit != null ? formatUsd(t.realizedProfit) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {t.txHash && (
                      <a href={`https://solscan.io/tx/${t.txHash}`} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] text-zinc-600 hover:text-accent transition-colors font-mono">
                        {t.txHash.slice(0, 6)}…
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
