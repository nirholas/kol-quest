"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const RECENT_KEY = "kq_portfolio_recent";
const MAX_RECENT = 5;

function getRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function addRecent(addr: string) {
  const existing = getRecent().filter((a) => a !== addr);
  const updated = [addr, ...existing].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

export default function PortfolioInput() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setRecent(getRecent());
  }, []);

  function submit(addr: string) {
    const trimmed = addr.trim();
    if (!trimmed) return;
    addRecent(trimmed);
    router.push(`/portfolio/${encodeURIComponent(trimmed)}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit(address);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Paste any wallet address (Solana or 0x EVM)…"
            className="w-full px-4 py-3.5 bg-bg-card border border-border rounded-lg text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-zinc-500 transition-colors font-mono"
            autoFocus
            spellCheck={false}
            autoComplete="off"
          />
          {address && (
            <button
              type="button"
              onClick={() => setAddress("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
            >
              ✕
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={!address.trim()}
          className="w-full py-3 bg-accent hover:bg-accent/90 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Analyze Portfolio
        </button>
      </form>

      {/* Chain coverage note */}
      <div className="text-xs text-zinc-600 text-center space-y-1">
        <div>
          <span className="text-zinc-500">Solana</span> · <span className="text-zinc-500">Ethereum</span> ·{" "}
          <span className="text-zinc-500">BSC</span> · <span className="text-zinc-500">Base</span> ·{" "}
          <span className="text-zinc-500">Arbitrum</span> · <span className="text-zinc-500">Polygon</span> ·{" "}
          <span className="text-zinc-500">Optimism</span> · <span className="text-zinc-500">Avalanche</span>
        </div>
        <div>Chain auto-detected from address format</div>
      </div>

      {/* Recent searches */}
      {recent.length > 0 && (
        <div>
          <div className="text-xs text-zinc-600 font-mono uppercase tracking-wider mb-2">
            Recent
          </div>
          <div className="space-y-1">
            {recent.map((addr) => (
              <button
                key={addr}
                onClick={() => submit(addr)}
                className="w-full text-left px-3 py-2 bg-bg-card hover:bg-bg-hover border border-border rounded text-xs text-zinc-400 hover:text-white font-mono transition-colors truncate"
              >
                {addr}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
