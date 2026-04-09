"use client";

import { useState, useEffect } from "react";
import type { DefiPosition } from "@/lib/wallet-aggregator";
import { formatUsd } from "@/lib/format";

interface Props {
  address: string;
  chain: string;
}

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-zinc-800/60 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-zinc-700" />
            <div className="w-24 h-3 bg-zinc-700 rounded" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-8 bg-zinc-700/60 rounded" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const TYPE_BADGE: Record<string, string> = {
  lending: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  liquidity: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  staking: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  farming: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  other: "text-zinc-400 bg-zinc-800 border-zinc-700",
};

export default function DefiTab({ address, chain }: Props) {
  const [positions, setPositions] = useState<DefiPosition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/wallets/${address}/defi?chain=${chain}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setPositions(data); })
      .finally(() => setLoading(false));
  }, [address, chain]);

  if (loading) return <Skeleton />;

  if (positions.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-zinc-500 text-sm">No DeFi positions found.</p>
        <p className="text-zinc-600 text-xs mt-1">Requires DeBank API key and an EVM wallet.</p>
      </div>
    );
  }

  // Group by protocol
  const grouped = positions.reduce<Record<string, DefiPosition[]>>((acc, p) => {
    if (!acc[p.protocol]) acc[p.protocol] = [];
    acc[p.protocol].push(p);
    return acc;
  }, {});

  const totalValue = positions.reduce((s, p) => s + p.valueUsd, 0);
  const totalRewards = positions.reduce((s, p) => s + p.rewards, 0);

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm">
        <div>
          <span className="text-zinc-500">Total Value </span>
          <span className="text-white font-semibold">{formatUsd(totalValue)}</span>
        </div>
        {totalRewards > 0 && (
          <div>
            <span className="text-zinc-500">Pending Rewards </span>
            <span className="text-buy font-semibold">+{formatUsd(totalRewards)}</span>
          </div>
        )}
      </div>

      {Object.entries(grouped).map(([protocol, items]) => (
        <div key={protocol} className="bg-bg-secondary border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            {items[0].protocolLogo && (
              <img src={items[0].protocolLogo} alt={protocol} className="w-7 h-7 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            )}
            <span className="text-white font-semibold text-sm">{protocol}</span>
            <span className="text-zinc-600 text-xs">{items[0].chain}</span>
          </div>

          <div className="space-y-2">
            {items.map((pos, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border capitalize ${TYPE_BADGE[pos.type] || TYPE_BADGE.other}`}>
                    {pos.type}
                  </span>
                  <span className="text-zinc-400 text-xs">{pos.poolName}</span>
                </div>
                <div className="text-right">
                  <div className="text-white text-sm tabular-nums">{formatUsd(pos.valueUsd)}</div>
                  {pos.rewards > 0 && (
                    <div className="text-buy text-xs tabular-nums">+{formatUsd(pos.rewards)} rewards</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
