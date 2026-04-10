"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createChart, IChartApi, ISeriesApi, CandlestickData, HistogramData, CrosshairMode, UTCTimestamp } from "lightweight-charts";

type Resolution = "5m" | "15m" | "1H" | "4H" | "1D";

const RESOLUTIONS: { label: string; value: Resolution }[] = [
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1H", value: "1H" },
  { label: "4H", value: "4H" },
  { label: "1D", value: "1D" },
];

export default function PriceChart({
  chain,
  address,
  symbol,
}: {
  chain: "sol" | "bsc";
  address: string;
  symbol: string | null;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const candleSeries = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeries = useRef<ISeriesApi<"Histogram"> | null>(null);

  const [resolution, setResolution] = useState<Resolution>("1H");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize chart
  useEffect(() => {
    if (!chartRef.current) return;

    chart.current = createChart(chartRef.current, {
      layout: {
        background: { color: "#0e0e12" },
        textColor: "#71717a",
      },
      grid: {
        vertLines: { color: "#1c1c24" },
        horzLines: { color: "#1c1c24" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#404058", style: 0 },
        horzLine: { color: "#404058", style: 0 },
      },
      rightPriceScale: {
        borderColor: "#27272a",
        textColor: "#71717a",
      },
      timeScale: {
        borderColor: "#27272a",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    candleSeries.current = chart.current.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    volumeSeries.current = chart.current.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      color: "#4f46e5",
    });
    chart.current.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    const handleResize = () => {
      if (chartRef.current && chart.current) {
        chart.current.applyOptions({ width: chartRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.current?.remove();
    };
  }, []);

  const loadData = useCallback(async (res: Resolution) => {
    if (chain !== "sol") return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/token/${chain}/${address}/ohlcv?resolution=${res}`);
      const json = await r.json();
      if (json.error) throw new Error(json.error);

      const items: any[] = json.ohlcv ?? [];
      if (!items.length) {
        setError("No price data available");
        setLoading(false);
        return;
      }

      const candles: CandlestickData[] = items.map((d: any) => ({
        time: d.unixTime as UTCTimestamp,
        open: d.o,
        high: d.h,
        low: d.l,
        close: d.c,
      }));

      const volumes: HistogramData[] = items.map((d: any) => ({
        time: d.unixTime as UTCTimestamp,
        value: d.v ?? 0,
        color: d.c >= d.o ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)",
      }));

      candleSeries.current?.setData(candles);
      volumeSeries.current?.setData(volumes);
      chart.current?.timeScale().fitContent();
    } catch (e: any) {
      setError(e.message ?? "Failed to load chart data");
    } finally {
      setLoading(false);
    }
  }, [chain, address]);

  useEffect(() => {
    loadData(resolution);
  }, [resolution, loadData]);

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(() => loadData(resolution), 30_000);
    return () => clearInterval(id);
  }, [resolution, loadData]);

  const isEvm = chain === "bsc";

  return (
    <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-medium text-white">
          {symbol ? `${symbol} / USD` : "Price Chart"}
        </span>
        <div className="flex items-center gap-1">
          {!isEvm && RESOLUTIONS.map((r) => (
            <button
              key={r.value}
              onClick={() => setResolution(r.value)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                resolution === r.value
                  ? "bg-white text-black"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative" style={{ height: 420 }}>
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg-card/70">
            <div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {isEvm ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2 text-sm">
            <span>Price chart via DexScreener / GeckoTerminal (see above)</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
            <span className="text-sm">{error}</span>
          </div>
        ) : (
          <div ref={chartRef} className="w-full h-full" />
        )}
      </div>
    </div>
  );
}
