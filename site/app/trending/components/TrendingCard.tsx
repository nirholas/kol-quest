"use client";

import { useState } from "react";
import NextImage from "next/image";
import Link from "next/link";
import type { TrendingToken } from "@/lib/trending-aggregator";
import { formatUsd, shortAddr } from "@/lib/format";

const SOURCE_ICONS: Record<string, { label: string; color: string }> = {
  dexscreener: { label: "DS", color: "bg-green-600" },
  geckoterminal: { label: "GT", color: "bg-purple-600" },
  coingecko: { label: "CG", color: "bg-lime-600" },
  birdeye: { label: "BE", color: "bg-orange-500" },
  gmgn: { label: "GM", color: "bg-cyan-500" },
  jupiter: { label: "JUP", color: "bg-gradient-to-r from-orange-500 to-pink-500" },
};

const CHAIN_COLORS: Record<string, string> = {
  sol: "bg-purple-600",
  eth: "bg-blue-600",
  bsc: "bg-yellow-600",
  base: "bg-blue-500",
  arbitrum: "bg-blue-400",
  polygon: "bg-violet-500",
  multi: "bg-gray-600",
};

interface TrendingCardProps {
  token: TrendingToken;
  rank?: number;
  variant?: "compact" | "large";
}

function TokenLogo({ src, symbol }: { src: string | null; symbol: string }) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-400 flex-shrink-0">
        {symbol[0]?.toUpperCase() ?? "?"}
      </div>
    );
  }

  return (
    <NextImage
      src={src}
      alt={symbol}
      width={40}
      height={40}
      className="w-10 h-10 rounded-full flex-shrink-0 object-cover"
      onError={() => setFailed(true)}
      unoptimized
    />
  );
}

function ScoreBadge({ score }: { score: number }) {
  const bg = score >= 70 ? "bg-green-600" : score >= 40 ? "bg-yellow-600" : "bg-red-600";
  return (
    <div className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${bg}`}>
      {score}
    </div>
  );
}

function MomentumIndicator({ momentum }: { momentum: "rising" | "falling" | "stable" }) {
  if (momentum === "rising") return <span className="text-buy">↑</span>;
  if (momentum === "falling") return <span className="text-sell">↓</span>;
  return <span className="text-zinc-500">→</span>;
}

export default function TrendingCard({ token, rank, variant = "compact" }: TrendingCardProps) {
  const isLarge = variant === "large";

  return (
    <Link
      href={`/token/${token.chain}/${token.address}`}
      className={`
        group relative flex gap-3 p-4 rounded-lg border border-border bg-bg-card
        hover:border-accent/50 hover:bg-bg-card/80 transition-all
        ${isLarge ? "flex-col items-center text-center" : "items-center"}
      `}
    >
      {/* Rank badge */}
      {rank !== undefined && (
        <div className="absolute top-2 left-2 text-[10px] font-bold text-zinc-600">
          #{rank}
        </div>
      )}

      {/* New badge */}
      {token.isNew && (
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent text-black">
          NEW
        </div>
      )}

      {/* Token logo */}
      <div className={`relative ${isLarge ? "mb-2" : ""}`}>
        <TokenLogo src={token.logo} symbol={token.symbol} />
        {/* Chain badge */}
        <div
          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${CHAIN_COLORS[token.chain] ?? "bg-gray-600"} 
          flex items-center justify-center text-[8px] font-bold text-white border border-bg-card`}
        >
          {token.chain[0]?.toUpperCase()}
        </div>
      </div>

      {/* Token info */}
      <div className={`flex-1 min-w-0 ${isLarge ? "w-full" : ""}`}>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white truncate group-hover:text-accent transition-colors">
            {token.name || token.symbol}
          </span>
          <MomentumIndicator momentum={token.momentum} />
        </div>
        <div className="text-xs text-zinc-500 flex items-center gap-1.5 flex-wrap">
          <span>${token.symbol}</span>
          <span className="text-zinc-700">•</span>
          <span className="font-mono">{shortAddr(token.address)}</span>
        </div>

        {/* Price and change */}
        <div className={`mt-1.5 flex items-center gap-3 ${isLarge ? "justify-center" : ""}`}>
          <span className="text-sm font-medium text-white">
            {token.price > 0 ? `$${token.price < 0.01 ? token.price.toExponential(2) : token.price.toFixed(4)}` : "—"}
          </span>
          <span
            className={`text-xs font-medium ${
              token.priceChange24h > 0 ? "text-buy" : token.priceChange24h < 0 ? "text-sell" : "text-zinc-500"
            }`}
          >
            {token.priceChange24h > 0 ? "+" : ""}
            {token.priceChange24h.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Stats column */}
      <div className={`flex flex-col items-end gap-1 ${isLarge ? "hidden" : ""}`}>
        <ScoreBadge score={token.trendingScore} />
        <div className="text-[10px] text-zinc-500">
          Vol {formatUsd(token.volume24h)}
        </div>
        <div className="text-[10px] text-zinc-500">
          Liq {formatUsd(token.liquidity)}
        </div>
      </div>

      {/* Source badges */}
      <div className={`flex gap-0.5 ${isLarge ? "mt-2" : "absolute bottom-2 right-2"}`}>
        {Object.entries(token.sources).map(([source, rank]) => {
          const info = SOURCE_ICONS[source];
          if (!info) return null;
          return (
            <div
              key={source}
              className={`px-1 py-0.5 rounded text-[8px] font-bold text-white ${info.color}`}
              title={`${source}: #${rank}`}
            >
              {info.label}
            </div>
          );
        })}
      </div>

      {/* Large variant stats */}
      {isLarge && (
        <div className="w-full mt-2 pt-2 border-t border-border grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[10px] text-zinc-500">Volume</div>
            <div className="text-xs font-medium text-white">{formatUsd(token.volume24h)}</div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-500">Liquidity</div>
            <div className="text-xs font-medium text-white">{formatUsd(token.liquidity)}</div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-500">Score</div>
            <div className="flex justify-center">
              <ScoreBadge score={token.trendingScore} />
            </div>
          </div>
        </div>
      )}
    </Link>
  );
}
