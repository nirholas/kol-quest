"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  PortfolioSummary,
  PortfolioAsset,
  DefiPosition,
  NftItem,
} from "@/lib/portfolio-aggregator";
import PortfolioSummaryCard from "../components/PortfolioSummary";
import HoldingsTable from "../components/HoldingsTable";
import DefiPositions from "../components/DefiPositions";
import NftGallery from "../components/NftGallery";
import PerformanceChart from "../components/PerformanceChart";
import CompareMode from "./CompareMode";

type Tab = "summary" | "holdings" | "defi" | "nfts" | "chart" | "compare";

const TABS: { id: Tab; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "holdings", label: "Holdings" },
  { id: "defi", label: "DeFi" },
  { id: "nfts", label: "NFTs" },
  { id: "chart", label: "Chart" },
  { id: "compare", label: "Compare" },
];

interface Props {
  address: string;
  initialSummary: PortfolioSummary | null;
}

export default function PortfolioDashboard({ address, initialSummary }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [refreshKey, setRefreshKey] = useState(0);

  // Data states
  const [summary, setSummary] = useState<PortfolioSummary | null>(initialSummary);
  const [summaryLoading, setSummaryLoading] = useState(!initialSummary);

  const [holdings, setHoldings] = useState<PortfolioAsset[]>([]);
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [holdingsLoaded, setHoldingsLoaded] = useState(false);

  const [defi, setDefi] = useState<DefiPosition[]>([]);
  const [defiLoading, setDefiLoading] = useState(false);
  const [defiLoaded, setDefiLoaded] = useState(false);

  const [nfts, setNfts] = useState<NftItem[]>([]);
  const [nftsLoading, setNftsLoading] = useState(false);
  const [nftsLoaded, setNftsLoaded] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/portfolio/${encodeURIComponent(address)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load portfolio");
      setSummary(json.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading portfolio");
    } finally {
      setSummaryLoading(false);
    }
  }, [address]);

  const loadHoldings = useCallback(async () => {
    if (holdingsLoaded && refreshKey === 0) return;
    setHoldingsLoading(true);
    try {
      const res = await fetch(`/api/portfolio/${encodeURIComponent(address)}/holdings`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load holdings");
      setHoldings(json.holdings ?? []);
      setHoldingsLoaded(true);
    } catch (err) {
      console.error("[portfolio] holdings:", err);
    } finally {
      setHoldingsLoading(false);
    }
  }, [address, holdingsLoaded, refreshKey]);

  const loadDefi = useCallback(async () => {
    if (defiLoaded && refreshKey === 0) return;
    setDefiLoading(true);
    try {
      const res = await fetch(`/api/portfolio/${encodeURIComponent(address)}/defi`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load DeFi");
      setDefi(json.positions ?? []);
      setDefiLoaded(true);
    } catch (err) {
      console.error("[portfolio] defi:", err);
    } finally {
      setDefiLoading(false);
    }
  }, [address, defiLoaded, refreshKey]);

  const loadNfts = useCallback(async () => {
    if (nftsLoaded && refreshKey === 0) return;
    setNftsLoading(true);
    try {
      const res = await fetch(`/api/portfolio/${encodeURIComponent(address)}/nfts`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load NFTs");
      setNfts(json.nfts ?? []);
      setNftsLoaded(true);
    } catch (err) {
      console.error("[portfolio] nfts:", err);
    } finally {
      setNftsLoading(false);
    }
  }, [address, nftsLoaded, refreshKey]);

  // Initial load: always fetch summary and holdings
  useEffect(() => {
    if (!initialSummary) loadSummary();
    loadHoldings();
  }, [initialSummary, loadSummary, loadHoldings]);

  // Lazy-load tabs on first visit
  useEffect(() => {
    if (activeTab === "defi") loadDefi();
    if (activeTab === "nfts") loadNfts();
  }, [activeTab, loadDefi, loadNfts]);

  function handleRefresh() {
    setHoldingsLoaded(false);
    setDefiLoaded(false);
    setNftsLoaded(false);
    setRefreshKey((k) => k + 1);
    loadSummary();
    loadHoldings();
    if (activeTab === "defi") loadDefi();
    if (activeTab === "nfts") loadNfts();
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-border overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-mono uppercase tracking-wider transition-colors shrink-0 border-b-2 -mb-px ${
              activeTab === tab.id
                ? "text-white border-accent"
                : "text-zinc-500 border-transparent hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={handleRefresh}
          className="ml-auto shrink-0 px-3 py-2 text-xs text-zinc-600 hover:text-white hover:bg-bg-hover rounded transition-colors"
          title="Force refresh"
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-sell/10 border border-sell/20 rounded text-sell text-sm">
          {error}
        </div>
      )}

      {/* Tab content */}
      {activeTab === "summary" && (
        <div>
          {summaryLoading && !summary && (
            <div className="bg-bg-card border border-border rounded-lg p-8 text-center text-zinc-600 text-sm animate-pulse">
              Loading portfolio summary...
            </div>
          )}
          {summary && (
            <PortfolioSummaryCard summary={summary} address={address} />
          )}
        </div>
      )}

      {activeTab === "holdings" && (
        <HoldingsTable holdings={holdings} loading={holdingsLoading} />
      )}

      {activeTab === "defi" && (
        <DefiPositions positions={defi} loading={defiLoading} />
      )}

      {activeTab === "nfts" && (
        <NftGallery nfts={nfts} loading={nftsLoading} />
      )}

      {activeTab === "chart" && (
        <PerformanceChart address={address} />
      )}

      {activeTab === "compare" && (
        <CompareMode address={address} holdings={holdings} />
      )}
    </div>
  );
}
