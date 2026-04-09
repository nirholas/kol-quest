"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { shortAddr } from "@/lib/format";

interface Holder {
  address: string;
  amount: number;
  decimals: number;
  uiAmount: number;
  uiAmountString: string;
  owner: string;
}

interface KnownWallet {
  wallet_address: string;
  name: string;
  avatar: string | null;
  twitter_username: string | null;
}

function formatPct(pct: number) {
  return `${pct.toFixed(2)}%`;
}

export default function HolderList({
  chain,
  address,
  knownWallets,
}: {
  chain: "sol" | "bsc";
  address: string;
  knownWallets: KnownWallet[];
}) {
  const [holders, setHolders] = useState<Holder[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/token/${chain}/${address}/holders?limit=50`)
      .then((r) => r.json())
      .then(({ holders, total }) => {
        setHolders(holders ?? []);
        setTotal(total ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [chain, address]);

  if (chain !== "sol") {
    return (
      <div className="py-10 text-center text-zinc-600 text-sm">
        Holder analysis available for Solana tokens only.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!holders.length) {
    return (
      <div className="py-10 text-center text-zinc-600 text-sm">
        No holder data available.
      </div>
    );
  }

  const knownMap = new Map(knownWallets.map((w) => [w.wallet_address.toLowerCase(), w]));
  const totalAmount = holders.reduce((s, h) => s + h.uiAmount, 0);

  return (
    <div className="overflow-x-auto">
      {total != null && (
        <div className="px-4 py-2 border-b border-border text-xs text-zinc-500">
          Top {holders.length} of {total.toLocaleString()} holders
        </div>
      )}
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-bg-card/50">
            {["#", "Wallet", "Amount", "% of Supply", "Type"].map((h) => (
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
          {holders.map((holder, i) => {
            const known = knownMap.get(holder.owner?.toLowerCase());
            const pct = totalAmount > 0 ? (holder.uiAmount / totalAmount) * 100 : 0;

            return (
              <tr
                key={holder.owner ?? i}
                className="border-b border-border/50 last:border-0 hover:bg-bg-card/60 transition-colors"
              >
                <td className="px-4 py-3 text-xs text-zinc-600 tabular-nums w-8">
                  {i + 1}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {known ? (
                      <>
                        {known.avatar && (
                          <img
                            src={known.avatar}
                            alt=""
                            className="w-5 h-5 rounded-full flex-shrink-0"
                            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                          />
                        )}
                        <Link
                          href={`/wallet/${holder.owner}`}
                          className="text-sm text-accent hover:underline font-medium"
                        >
                          {known.name}
                        </Link>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-400 border border-purple-800/50">
                          KOL
                        </span>
                      </>
                    ) : (
                      <Link
                        href={`/wallet/${holder.owner}`}
                        className="text-sm text-zinc-300 hover:text-white font-mono transition-colors"
                      >
                        {shortAddr(holder.owner)}
                      </Link>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm tabular-nums text-zinc-300 whitespace-nowrap">
                  {holder.uiAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${Math.min(pct * 5, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-zinc-400">
                      {formatPct(pct)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-600">
                  {known ? "KOL Wallet" : "Unknown"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
