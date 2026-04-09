"use client";

import { useState, useEffect } from "react";
import type { NFTItem } from "@/lib/wallet-aggregator";
import { formatUsd } from "@/lib/format";

interface Props {
  address: string;
  chain: string;
}

function Skeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-lg overflow-hidden bg-zinc-800/60">
          <div className="aspect-square bg-zinc-700" />
          <div className="p-2">
            <div className="w-16 h-2 bg-zinc-700 rounded mb-1" />
            <div className="w-10 h-2 bg-zinc-700/60 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NFTsTab({ address, chain }: Props) {
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/wallets/${address}/nfts?chain=${chain}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setNfts(data); })
      .finally(() => setLoading(false));
  }, [address, chain]);

  if (loading) return <Skeleton />;

  if (nfts.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-zinc-500 text-sm">No NFTs found.</p>
        <p className="text-zinc-600 text-xs mt-1">Requires Moralis API key and an EVM wallet.</p>
      </div>
    );
  }

  // Group by collection
  const grouped = nfts.reduce<Record<string, NFTItem[]>>((acc, n) => {
    if (!acc[n.collection]) acc[n.collection] = [];
    acc[n.collection].push(n);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([collection, items]) => (
        <div key={collection}>
          <div className="flex items-center gap-2 mb-3">
            {items[0].collectionImage && (
              <img src={items[0].collectionImage} alt={collection} className="w-6 h-6 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            )}
            <span className="text-zinc-300 font-semibold text-sm">{collection}</span>
            <span className="text-zinc-600 text-xs">({items.length})</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {items.map((nft) => (
              <div key={`${nft.address}-${nft.tokenId}`} className="bg-bg-secondary border border-border rounded-lg overflow-hidden hover:border-zinc-600 transition-colors">
                <div className="aspect-square bg-zinc-800 flex items-center justify-center overflow-hidden">
                  {nft.image ? (
                    <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <span className="text-zinc-600 text-xs">No image</span>
                  )}
                </div>
                <div className="p-2">
                  <div className="text-white text-xs font-medium truncate">{nft.name}</div>
                  {nft.floorPrice != null && (
                    <div className="text-zinc-500 text-[10px] mt-0.5">Floor: {formatUsd(nft.floorPrice)}</div>
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
