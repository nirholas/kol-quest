"use client";

import { useState } from "react";
import type { WalletToken, WalletPnl } from "@/lib/wallet-aggregator";
import HoldingsTab from "./HoldingsTab";
import TransactionsTab from "./TransactionsTab";
import PnlTab from "./PnlTab";
import DefiTab from "./DefiTab";
import NFTsTab from "./NFTsTab";
import ActivityFeed from "./ActivityFeed";

type Tab = "holdings" | "transactions" | "pnl" | "defi" | "nfts" | "activity";

interface Props {
  address: string;
  /** "sol" | "evm" — used to show/hide EVM-only tabs */
  chain: string;
  holdings?: WalletToken[];
  pnl?: WalletPnl | null;
}

const ALL_TABS: { id: Tab; label: string; evmOnly?: boolean }[] = [
  { id: "holdings", label: "Holdings" },
  { id: "transactions", label: "Transactions" },
  { id: "pnl", label: "PnL Analysis" },
  { id: "defi", label: "DeFi Positions", evmOnly: true },
  { id: "nfts", label: "NFTs", evmOnly: true },
  { id: "activity", label: "Activity Feed" },
];

// Map page chain label to aggregator chain type
function toAggregatorChain(chain: string): string {
  if (chain === "sol") return "solana";
  if (chain === "bsc") return "bsc";
  return "ethereum";
}

export default function WalletTabs({ address, chain, holdings = [], pnl }: Props) {
  const isEvm = chain !== "sol";
  const visibleTabs = ALL_TABS.filter(t => !t.evmOnly || isEvm);
  const [active, setActive] = useState<Tab>("holdings");
  const aggChain = toAggregatorChain(chain);

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto scrollbar-none border-b border-border mb-4 pb-px">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              active === tab.id
                ? "border-accent text-accent"
                : "border-transparent text-zinc-500 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-bg-card border border-border rounded-xl p-4">
        {active === "holdings" && (
          <HoldingsTab holdings={holdings} />
        )}
        {active === "transactions" && (
          <TransactionsTab address={address} chain={aggChain} />
        )}
        {active === "pnl" && (
          <PnlTab address={address} chain={aggChain} initialPnl={pnl} />
        )}
        {active === "defi" && (
          <DefiTab address={address} chain={aggChain} />
        )}
        {active === "nfts" && (
          <NFTsTab address={address} chain={aggChain} />
        )}
        {active === "activity" && (
          <ActivityFeed address={address} chain={aggChain} />
        )}
      </div>
    </div>
  );
}
