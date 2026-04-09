"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { KolEntry, SortField, SortDir, Timeframe } from "@/lib/types";

function WinRate({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses;
  if (total === 0) return <span className="text-muted">-</span>;
  const pct = (wins / total) * 100;
  return (
    <span className={pct >= 50 ? "text-buy" : "text-sell"}>
      {pct.toFixed(1)}%
    </span>
  );
}

function SortIcon({ field, current, dir }: { field: SortField; current: SortField; dir: SortDir }) {
  if (field !== current) return <span className="text-muted/30 ml-1">↕</span>;
  return <span className="text-buy ml-1">{dir === "desc" ? "↓" : "↑"}</span>;
}

function truncate(addr: string) {
  return addr.slice(0, 4) + "..." + addr.slice(-4);
}

export default function LeaderboardClient({ data }: { data: KolEntry[] }) {
  const [timeframe, setTimeframe] = useState<Timeframe>(1);
  const [sortField, setSortField] = useState<SortField>("profit");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let entries = data.filter((e) => e.timeframe === timeframe);
    if (search) {
      const q = search.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.wallet_address.toLowerCase().includes(q)
      );
    }
    entries.sort((a, b) => {
      let av: number, bv: number;
      if (sortField === "name") {
        return sortDir === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      if (sortField === "winrate") {
        const at = a.wins + a.losses;
        const bt = b.wins + b.losses;
        av = at === 0 ? -1 : a.wins / at;
        bv = bt === 0 ? -1 : b.wins / bt;
      } else {
        av = a[sortField];
        bv = b[sortField];
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return entries;
  }, [data, timeframe, sortField, sortDir, search]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  const timeframes: { label: string; value: Timeframe }[] = [
    { label: "Daily", value: 1 },
    { label: "Weekly", value: 7 },
    { label: "Monthly", value: 30 },
  ];

  const thClass = "px-3 py-3 text-left font-medium text-muted cursor-pointer hover:text-white select-none whitespace-nowrap text-sm";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">KOL Leaderboard</h1>
        <p className="text-muted text-sm">
          {filtered.length} entries · Sorted by {sortField} ({sortDir})
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        {/* Timeframe Tabs */}
        <div className="flex bg-bg-card border border-border rounded-lg overflow-hidden">
          {timeframes.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                timeframe === tf.value
                  ? "bg-buy text-black"
                  : "text-muted hover:text-white hover:bg-bg-hover"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or wallet..."
          className="bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted/50 outline-none focus:border-buy/50 w-full sm:w-64 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr>
                <th className="px-3 py-3 text-left font-medium text-muted text-sm w-12">#</th>
                <th className={thClass} onClick={() => toggleSort("name")}>
                  Name <SortIcon field="name" current={sortField} dir={sortDir} />
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted text-sm">Wallet</th>
                <th className={thClass} onClick={() => toggleSort("profit")}>
                  Profit (SOL) <SortIcon field="profit" current={sortField} dir={sortDir} />
                </th>
                <th className={thClass} onClick={() => toggleSort("wins")}>
                  Wins <SortIcon field="wins" current={sortField} dir={sortDir} />
                </th>
                <th className={thClass} onClick={() => toggleSort("losses")}>
                  Losses <SortIcon field="losses" current={sortField} dir={sortDir} />
                </th>
                <th className={thClass} onClick={() => toggleSort("winrate")}>
                  Win Rate <SortIcon field="winrate" current={sortField} dir={sortDir} />
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted text-sm">Links</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((entry, i) => (
                <tr
                  key={`${entry.wallet_address}-${entry.timeframe}`}
                  className="hover:bg-bg-hover transition-colors"
                >
                  <td className="px-3 py-2.5 text-muted text-sm">{i + 1}</td>
                  <td className="px-3 py-2.5 text-white text-sm font-medium">
                    <Link
                      href={`/wallet/${entry.wallet_address}`}
                      className="hover:text-buy transition-colors"
                    >
                      {entry.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <a
                      href={`https://solscan.io/account/${entry.wallet_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-buy hover:underline"
                      title={entry.wallet_address}
                    >
                      {truncate(entry.wallet_address)}
                    </a>
                  </td>
                  <td className={`px-3 py-2.5 text-sm font-medium ${
                    entry.profit > 0 ? "text-buy" : entry.profit < 0 ? "text-sell" : "text-muted"
                  }`}>
                    {entry.profit > 0 ? "+" : ""}
                    {entry.profit.toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-buy">{entry.wins}</td>
                  <td className="px-3 py-2.5 text-sm text-sell">{entry.losses}</td>
                  <td className="px-3 py-2.5 text-sm">
                    <WinRate wins={entry.wins} losses={entry.losses} />
                  </td>
                  <td className="px-3 py-2.5 text-sm flex gap-2">
                    {entry.twitter && (
                      <a
                        href={entry.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted hover:text-white transition-colors"
                        title="Twitter/X"
                      >
                        𝕏
                      </a>
                    )}
                    {entry.telegram && (
                      <a
                        href={entry.telegram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted hover:text-blue-400 transition-colors"
                        title="Telegram"
                      >
                        ✈
                      </a>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted text-sm">
                    No entries found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
