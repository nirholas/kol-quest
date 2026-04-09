"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatUsd, formatNumber, shortAddr } from "@/lib/format";
import type { SmartMoneySignal } from "@/lib/smart-money-tracker";
import { cn } from "@/lib/utils";

function TokenLogo({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-sm text-gray-500">
        {alt.slice(0, 1).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      width={32}
      height={32}
      className="w-8 h-8 rounded-full"
      onError={() => setFailed(true)}
    />
  );
}

export default function AccumulationBoard() {
  const searchParams = useSearchParams();
  const chain = searchParams.get("chain");
  const period = searchParams.get("period") || "24h";

  const [signals, setSignals] = useState<SmartMoneySignal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (chain) params.set("chain", chain);
    if (period) params.set("period", period);
    
    fetch(`/api/smart-money/accumulation?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setSignals(data.signals || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Accumulation fetch error:", err);
        setLoading(false);
      });
  }, [chain, period]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold">Token Accumulation</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Tokens with the most smart money activity in the last {period}.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">Token</th>
              <th scope="col" className="px-6 py-3 text-right">Smart Buys</th>
              <th scope="col" className="px-6 py-3 text-right">Smart Sells</th>
              <th scope="col" className="px-6 py-3 text-right">Net Flow</th>
              <th scope="col" className="px-6 py-3 text-center"># Wallets</th>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="animate-pulse border-b dark:border-gray-700">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                    <div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-1"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 ml-auto"></div></td>
                <td className="px-6 py-4 text-right"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 ml-auto"></div></td>
                <td className="px-6 py-4 text-right"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 ml-auto"></div></td>
                <td className="px-6 py-4 text-center"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8 mx-auto"></div></td>
              </tr>
            ))}
            {!loading && signals.map((signal) => {
              const netColor = (signal.netFlowUsd ?? 0) >= 0 ? "text-green-500" : "text-red-500";
              const tokenHref = `/${signal.chain}/token/${signal.tokenAddress}`;
              
              return (
                <tr key={signal.id} className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    <Link href={tokenHref} className="flex items-center space-x-3 group">
                      <TokenLogo src={signal.tokenLogo || ""} alt={signal.tokenSymbol || "?"} />
                      <div>
                        <span className="group-hover:underline">{signal.tokenName || signal.tokenSymbol}</span>
                        <div className="text-xs text-gray-500 dark:text-gray-400">${signal.tokenSymbol}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-right text-green-500">{formatUsd(signal.totalBuyUsd, { notation: 'compact' })}</td>
                  <td className="px-6 py-4 text-right text-red-500">{formatUsd(signal.totalSellUsd, { notation: 'compact' })}</td>
                  <td className={cn("px-6 py-4 text-right font-semibold", netColor)}>{formatUsd(signal.netFlowUsd, { notation: 'compact' })}</td>
                  <td className="px-6 py-4 text-center">{formatNumber(signal.walletCount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && signals.length === 0 && (
          <div className="text-center p-8 text-gray-500">No significant accumulation signals found.</div>
        )}
      </div>
    </div>
  );
}
