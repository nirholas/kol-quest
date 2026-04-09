"use client";

import { useState, useCallback } from "react";
import type { PortfolioAsset } from "@/lib/portfolio-aggregator";
import { formatUsd, truncateAddr } from "@/lib/format";
import { useRouter } from "next/navigation";

interface Props {
  address: string;
  holdings: PortfolioAsset[];
}

interface ComparedState {
  address: string;
  holdings: PortfolioAsset[];
  loading: boolean;
  error: string | null;
}

function OverlapRow({
  symbol,
  name,
  logo,
  leftValue,
  rightValue,
}: {
  symbol: string;
  name: string;
  logo: string | null;
  leftValue: number;
  rightValue: number;
}) {
  return (
    <tr className="border-b border-border">
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={symbol} className="w-5 h-5 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <div className="w-5 h-5 rounded-full bg-bg-hover text-[9px] flex items-center justify-center text-zinc-500 font-mono">{symbol.slice(0, 2)}</div>
          )}
          <div>
            <div className="text-xs text-white">{symbol}</div>
            <div className="text-[10px] text-zinc-600 truncate max-w-[100px]">{name}</div>
          </div>
        </div>
      </td>
      <td className="px-3 py-2 text-xs font-mono text-zinc-300 text-right">{formatUsd(leftValue)}</td>
      <td className="px-3 py-2 text-xs font-mono text-zinc-300 text-right">{formatUsd(rightValue)}</td>
    </tr>
  );
}

export default function CompareMode({ address, holdings }: Props) {
  const router = useRouter();
  const [compareAddr, setCompareAddr] = useState("");
  const [compared, setCompared] = useState<ComparedState | null>(null);

  const load = useCallback(async (addr: string) => {
    setCompared({ address: addr, holdings: [], loading: true, error: null });
    try {
      const res = await fetch(`/api/portfolio/${encodeURIComponent(addr)}/holdings`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setCompared({ address: addr, holdings: json.holdings ?? [], loading: false, error: null });
    } catch (err) {
      setCompared({ address: addr, holdings: [], loading: false, error: err instanceof Error ? err.message : "Error" });
    }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = compareAddr.trim();
    if (!trimmed || trimmed === address) return;
    load(trimmed);
  }

  // Build overlap: tokens held by both
  const overlap = compared?.holdings
    ? (() => {
        const rightBySymbol = new Map<string, PortfolioAsset>();
        for (const h of compared.holdings) rightBySymbol.set(`${h.chain}:${h.symbol}`, h);

        return holdings
          .filter((h) => rightBySymbol.has(`${h.chain}:${h.symbol}`))
          .map((h) => ({
            ...h,
            rightValue: rightBySymbol.get(`${h.chain}:${h.symbol}`)!.valueUsd,
          }))
          .sort((a, b) => b.valueUsd - a.valueUsd);
      })()
    : [];

  const leftTotal = holdings.reduce((s, h) => s + h.valueUsd, 0);
  const rightTotal = compared?.holdings.reduce((s, h) => s + h.valueUsd, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="bg-bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-medium text-white mb-4">Compare with another wallet</h2>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={compareAddr}
            onChange={(e) => setCompareAddr(e.target.value)}
            placeholder="Enter second wallet address…"
            className="flex-1 px-3 py-2 bg-bg-hover border border-border rounded text-xs text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-zinc-500"
            spellCheck={false}
          />
          <button
            type="submit"
            disabled={!compareAddr.trim() || compareAddr.trim() === address}
            className="px-4 py-2 bg-accent hover:bg-accent/90 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs rounded transition-colors"
          >
            Compare
          </button>
        </form>
      </div>

      {compared && (
        <div className="space-y-4">
          {/* Header comparison */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-bg-card border border-border rounded-lg p-4">
              <div className="text-xs text-zinc-500 font-mono mb-1">Wallet A</div>
              <div className="text-xs text-zinc-400 font-mono truncate mb-2">{truncateAddr(address)}</div>
              <div className="text-xl font-bold text-white font-mono">{formatUsd(leftTotal)}</div>
              <div className="text-xs text-zinc-600 mt-1">{holdings.length} assets</div>
            </div>
            <div className="bg-bg-card border border-border rounded-lg p-4">
              <div className="text-xs text-zinc-500 font-mono mb-1">Wallet B</div>
              <div
                className="text-xs text-accent font-mono truncate mb-2 cursor-pointer hover:underline"
                onClick={() => router.push(`/portfolio/${encodeURIComponent(compared.address)}`)}
              >
                {truncateAddr(compared.address)}
              </div>
              {compared.loading ? (
                <div className="text-zinc-600 text-sm animate-pulse">Loading…</div>
              ) : compared.error ? (
                <div className="text-sell text-xs">{compared.error}</div>
              ) : (
                <>
                  <div className="text-xl font-bold text-white font-mono">{formatUsd(rightTotal)}</div>
                  <div className="text-xs text-zinc-600 mt-1">{compared.holdings.length} assets</div>
                </>
              )}
            </div>
          </div>

          {/* Overlap */}
          {!compared.loading && overlap.length > 0 && (
            <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
              <div className="p-4 border-b border-border">
                <div className="text-sm font-medium text-white">
                  Shared Holdings{" "}
                  <span className="text-zinc-600 text-xs font-normal ml-1">
                    {overlap.length} token{overlap.length !== 1 ? "s" : ""} in common
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-mono uppercase tracking-wider text-zinc-500">Asset</th>
                      <th className="px-3 py-2 text-right text-xs font-mono uppercase tracking-wider text-zinc-500">Wallet A</th>
                      <th className="px-3 py-2 text-right text-xs font-mono uppercase tracking-wider text-zinc-500">Wallet B</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overlap.map((item) => (
                      <OverlapRow
                        key={`${item.chain}-${item.symbol}`}
                        symbol={item.symbol}
                        name={item.name}
                        logo={item.logo}
                        leftValue={item.valueUsd}
                        rightValue={item.rightValue}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!compared.loading && !compared.error && overlap.length === 0 && compared.holdings.length > 0 && (
            <div className="bg-bg-card border border-border rounded-lg p-6 text-center text-zinc-600 text-sm">
              No shared token holdings between these wallets.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
