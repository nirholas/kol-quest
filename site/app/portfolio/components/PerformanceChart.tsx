"use client";

import { useState } from "react";
import type { PortfolioHistory } from "@/lib/portfolio-aggregator";
import { formatUsd } from "@/lib/format";

type Period = "7d" | "30d" | "90d" | "1y";

const PERIOD_LABELS: Record<Period, string> = {
  "7d": "7D",
  "30d": "30D",
  "90d": "90D",
  "1y": "1Y",
};

interface Props {
  address: string;
  initialPeriod?: Period;
}

interface FetchState {
  data: PortfolioHistory | null;
  loading: boolean;
  error: string | null;
}

function LineChart({ timestamps, values }: { timestamps: number[]; values: number[] }) {
  if (timestamps.length < 2) {
    return (
      <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">
        Not enough data to render chart.
      </div>
    );
  }

  const W = 800;
  const H = 200;
  const PADDING = { top: 16, right: 16, bottom: 32, left: 64 };

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const minTs = timestamps[0];
  const maxTs = timestamps[timestamps.length - 1];
  const tsRange = maxTs - minTs || 1;

  function toX(ts: number) {
    return PADDING.left + ((ts - minTs) / tsRange) * (W - PADDING.left - PADDING.right);
  }
  function toY(val: number) {
    return PADDING.top + (1 - (val - minVal) / range) * (H - PADDING.top - PADDING.bottom);
  }

  const points = timestamps.map((ts, i) => `${toX(ts)},${toY(values[i])}`).join(" ");
  const areaPoints = [
    `${toX(timestamps[0])},${H - PADDING.bottom}`,
    ...timestamps.map((ts, i) => `${toX(ts)},${toY(values[i])}`),
    `${toX(timestamps[timestamps.length - 1])},${H - PADDING.bottom}`,
  ].join(" ");

  const isUp = values[values.length - 1] >= values[0];
  const lineColor = isUp ? "#4ade80" : "#f87171";
  const areaColor = isUp ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)";

  // Y-axis labels (5 marks)
  const yTicks = Array.from({ length: 5 }, (_, i) => ({
    val: minVal + (range * i) / 4,
    y: toY(minVal + (range * i) / 4),
  }));

  // X-axis labels (up to 6 marks)
  const xTickCount = Math.min(6, timestamps.length);
  const xTicks = Array.from({ length: xTickCount }, (_, i) => {
    const idx = Math.round((i / (xTickCount - 1)) * (timestamps.length - 1));
    return { ts: timestamps[idx], x: toX(timestamps[idx]) };
  });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-48"
      preserveAspectRatio="none"
    >
      {/* Grid lines */}
      {yTicks.map(({ y }, i) => (
        <line
          key={i}
          x1={PADDING.left}
          x2={W - PADDING.right}
          y1={y}
          y2={y}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={1}
        />
      ))}

      {/* Area */}
      <polygon points={areaPoints} fill={areaColor} />

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={lineColor}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Y labels */}
      {yTicks.map(({ val, y }, i) => (
        <text key={i} x={PADDING.left - 4} y={y + 4} fontSize={9} fill="#71717a" textAnchor="end">
          {formatUsd(val)}
        </text>
      ))}

      {/* X labels */}
      {xTicks.map(({ ts, x }, i) => (
        <text key={i} x={x} y={H - 4} fontSize={9} fill="#71717a" textAnchor="middle">
          {new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </text>
      ))}
    </svg>
  );
}

export default function PerformanceChart({ address, initialPeriod = "30d" }: Props) {
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [cache, setCache] = useState<Partial<Record<Period, FetchState>>>({});

  const currentState: FetchState = cache[period] ?? { data: null, loading: false, error: null };

  async function load(p: Period) {
    if (cache[p]?.data || cache[p]?.loading) return;
    setCache((prev) => ({ ...prev, [p]: { data: null, loading: true, error: null } }));
    try {
      const res = await fetch(`/api/portfolio/${encodeURIComponent(address)}/history?period=${p}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setCache((prev) => ({ ...prev, [p]: { data: json.history, loading: false, error: null } }));
    } catch (err) {
      setCache((prev) => ({
        ...prev,
        [p]: { data: null, loading: false, error: err instanceof Error ? err.message : "Error" },
      }));
    }
  }

  function selectPeriod(p: Period) {
    setPeriod(p);
    load(p);
  }

  // Trigger load for initial period on mount (via useEffect-like pattern)
  // We use a ref-style approach to avoid running on every render
  if (!cache[period] && !currentState.loading) {
    // Schedule async load without blocking render
    setTimeout(() => load(period), 0);
  }

  const hist = currentState.data;

  let pnlPercent: number | null = null;
  let pnlValue: number | null = null;
  if (hist && hist.values.length >= 2) {
    const first = hist.values[0];
    const last = hist.values[hist.values.length - 1];
    pnlValue = last - first;
    pnlPercent = first > 0 ? (pnlValue / first) * 100 : null;
  }

  return (
    <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs text-zinc-500 font-mono uppercase">Portfolio Performance</div>
          {pnlValue != null && (
            <div
              className={`text-sm font-mono mt-0.5 ${
                pnlValue >= 0 ? "text-buy" : "text-sell"
              }`}
            >
              {pnlValue >= 0 ? "+" : ""}
              {formatUsd(pnlValue)}
              {pnlPercent != null && (
                <span className="ml-1 text-zinc-500">
                  ({pnlPercent >= 0 ? "+" : ""}
                  {pnlPercent.toFixed(2)}%)
                </span>
              )}
              <span className="ml-1 text-zinc-600 text-xs">{PERIOD_LABELS[period]}</span>
            </div>
          )}
        </div>

        <div className="flex gap-1">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => selectPeriod(p)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                period === p
                  ? "bg-accent text-white"
                  : "text-zinc-500 hover:text-white hover:bg-bg-hover"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {currentState.loading && (
          <div className="h-48 flex items-center justify-center text-zinc-600 text-sm animate-pulse">
            Loading chart data...
          </div>
        )}
        {currentState.error && (
          <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">
            {currentState.error}
          </div>
        )}
        {hist && !currentState.loading && (
          <>
            {hist.timestamps.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">
                No historical data available.{" "}
                <span className="text-zinc-700 ml-1">(Requires DEBANK_API_KEY)</span>
              </div>
            ) : (
              <LineChart timestamps={hist.timestamps} values={hist.values} />
            )}
          </>
        )}
        {!hist && !currentState.loading && !currentState.error && (
          <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">
            Select a period to load chart.
          </div>
        )}
      </div>
    </div>
  );
}
