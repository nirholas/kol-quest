"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import ShareButtons from "../components/ShareButtons";

interface TrendingToken {
  tokenAddress: string;
  tokenSymbol: string | null;
  tokenName: string | null;
  tokenLogo: string | null;
  chain: string;
  buyCount: number;
  sellCount: number;
  uniqueBuyers: number;
  totalBuyUsd: number;
  totalSellUsd: number;
  netFlow: number;
  firstSeen: string;
  lastSeen: string;
}

type TimeFilter = "1h" | "6h" | "24h";
type GroupFilter = "all";

function formatMC(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(1)}`;
}

function formatInflow(v: number): string {
  const abs = Math.abs(v);
  let s: string;
  if (abs >= 1_000) s = `${(abs / 1_000).toFixed(2)}K`;
  else s = abs.toFixed(2);
  return v >= 0 ? `$+${s}` : `$-${s}`;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default function TrackClient() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("24h");
  const [search, setSearch] = useState("");
  const [advOpen, setAdvOpen] = useState(false);
  const [tokens, setTokens] = useState<TrendingToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [minBuyers, setMinBuyers] = useState("");
  const [minNetFlow, setMinNetFlow] = useState("");
  const refreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTokens = () => {
    setLoading(true);
    fetch("/api/trending")
      .then((r) => r.json())
      .then((d) => {
        setTokens(d.tokens ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchTokens();
    refreshRef.current = setInterval(fetchTokens, 30_000);
    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, []);

  const filtered = useMemo(() => {
    let list = tokens;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          (t.tokenSymbol ?? "").toLowerCase().includes(q) ||
          (t.tokenName ?? "").toLowerCase().includes(q) ||
          t.tokenAddress.toLowerCase().includes(q),
      );
    }
    const minB = parseInt(minBuyers, 10);
    if (!isNaN(minB) && minB > 0) list = list.filter((t) => t.uniqueBuyers >= minB);
    const minF = parseFloat(minNetFlow);
    if (!isNaN(minF)) list = list.filter((t) => t.netFlow >= minF);
    return list;
  }, [tokens, search, minBuyers, minNetFlow]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Track</h1>
          <p className="text-sm text-zinc-500 mt-0.5">New tokens spotted by tracked wallets</p>
        </div>

        {/* Time filter + Advanced */}
        <div className="flex items-center gap-2">
          {(["5m", "1h", "6h", "24h"] as TimeFilter[]).map((t) => (
            <button
              key={t}
              onClick={() => setTimeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                timeFilter === t
                  ? "bg-white text-black"
                  : "bg-bg-card text-zinc-400 hover:text-white hover:bg-bg-hover border border-border"
              }`}
            >
              {t}
            </button>
          ))}
          <button
            onClick={() => setAdvOpen(!advOpen)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
              advOpen
                ? "bg-accent text-white"
                : "bg-bg-card text-zinc-400 hover:text-white hover:bg-bg-hover border border-border"
            }`}
          >
            Adv.
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>
          <ShareButtons title="KolQuest Token Tracker" />
        </div>
      </div>

      {/* Advanced filters panel */}
      {advOpen && (
        <div className="bg-bg-card border border-border rounded-xl p-4 animate-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1 block">Min MC</label>
              <input
                type="text"
                placeholder="e.g. 1000"
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1 block">Max MC</label>
              <input
                type="text"
                placeholder="e.g. 1000000"
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1 block">Min Wallets</label>
              <input
                type="text"
                placeholder="e.g. 3"
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1 block">Min Inflow</label>
              <input
                type="text"
                placeholder="e.g. 100"
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>
      )}

      {/* Portfolio group tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {/* Counter badges */}
        <div className="flex items-center gap-1.5 mr-3 shrink-0">
          <span className="text-xs text-zinc-500">P1</span>
          <span className="text-xs text-zinc-500">P2</span>
          <span className="text-xs text-zinc-500">P3</span>
        </div>
        <div className="h-4 w-px bg-border mr-2 shrink-0" />

        {(["all", "default", "axiom"] as GroupFilter[]).map((g) => (
          <button
            key={g}
            onClick={() => setGroup(g)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
              group === g
                ? "bg-bg-hover text-white border border-border-light"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-bg-hover"
            }`}
          >
            {g === "default" && <span className="text-yellow-400">⭐</span>}
            {g === "axiom" && <span className="text-yellow-400">⭐</span>}
            <span className="capitalize">{g === "all" ? "All" : g.charAt(0).toUpperCase() + g.slice(1)}</span>
            <span className="text-[11px] text-zinc-600 tabular-nums">{groupCounts[g]}</span>
          </button>
        ))}

        <div className="h-4 w-px bg-border mx-1 shrink-0" />
        <span className="text-[11px] text-zinc-600 shrink-0">Groups</span>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search token or wallet…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 bg-bg-card border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] text-zinc-500 uppercase tracking-wider border-b border-border">
              <th className="text-left px-4 py-3 font-medium">Token / Wallet</th>
              <th className="text-right px-4 py-3 font-medium">MC / Bal</th>
              <th className="text-right px-4 py-3 font-medium whitespace-nowrap">{timeFilter} TXs</th>
              <th className="text-right px-4 py-3 font-medium whitespace-nowrap">{timeFilter} Inflow</th>
              <th className="text-right px-4 py-3 font-medium">Age</th>
              <th className="text-center px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((token, i) => (
              <tr
                key={`${token.address}-${i}`}
                className="hover:bg-bg-hover transition-colors duration-150 cursor-pointer group"
              >
                {/* Token / Wallet */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-bg-elevated border border-border flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0">
                      {token.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="text-white font-medium truncate block">{token.name}</span>
                    </div>
                  </div>
                </td>

                {/* MC */}
                <td className="px-4 py-3 text-right font-mono text-zinc-300 whitespace-nowrap">
                  {formatMC(token.marketCap)}
                </td>

                {/* TXs */}
                <td className="px-4 py-3 text-right font-mono text-zinc-400 whitespace-nowrap">
                  <span className="text-buy">{token.txBuy24h.toLocaleString()}</span>
                  <span className="text-zinc-600 mx-1">/</span>
                  <span className="text-sell">{token.txSell24h.toLocaleString()}</span>
                </td>

                {/* Inflow */}
                <td className={`px-4 py-3 text-right font-mono whitespace-nowrap ${
                  token.inflow24h >= 0 ? "text-buy" : "text-sell"
                }`}>
                  {formatInflow(token.inflow24h)}
                </td>

                {/* Age */}
                <td className="px-4 py-3 text-right text-zinc-500 whitespace-nowrap">
                  {token.age}
                </td>

                {/* Action */}
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-buy/10 text-buy border border-buy/20">
                    Created
                  </span>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-zinc-600">
                  No tokens match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between text-[11px] text-zinc-600 px-1">
        <span>{filtered.length} token{filtered.length !== 1 ? "s" : ""} tracked</span>
        <span>Auto-refresh in 15s</span>
      </div>
    </div>
  );
}
