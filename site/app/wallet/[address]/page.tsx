import Link from "next/link";
import { getData } from "@/lib/data";

function truncate(addr: string) {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function profitColor(v: number) {
  return v > 0 ? "text-buy" : v < 0 ? "text-sell" : "text-muted";
}

function formatProfit(v: number) {
  return `${v > 0 ? "+" : ""}${v.toFixed(2)} Sol`;
}

export async function generateStaticParams() {
  const data = await getData();
  const addresses = [...new Set(data.map((e) => e.wallet_address))];
  return addresses.map((address) => ({ address }));
}

export async function generateMetadata({ params }: { params: { address: string } }) {
  const data = await getData();
  const entry = data.find((e) => e.wallet_address === params.address);
  return {
    title: `${entry?.name || params.address.slice(0, 8)} | KolScan Explorer`,
    description: `Wallet details for ${entry?.name || params.address}`,
  };
}

export default async function WalletPage({ params }: { params: { address: string } }) {
  const data = await getData();
  const entries = data.filter((e) => e.wallet_address === params.address);

  if (entries.length === 0) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Wallet Not Found</h1>
        <p className="text-muted">No data found for {params.address}</p>
      </main>
    );
  }

  const name = entries[0].name;
  const twitter = entries[0].twitter;
  const telegram = entries[0].telegram;

  const timeframeLabel = (tf: number) =>
    tf === 1 ? "Daily" : tf === 7 ? "Weekly" : "Monthly";

  // Aggregate stats
  const totalProfit = entries.reduce((s, e) => s + e.profit, 0);
  const totalWins = entries.reduce((s, e) => s + e.wins, 0);
  const totalLosses = entries.reduce((s, e) => s + e.losses, 0);
  const totalTrades = totalWins + totalLosses;
  const winRate = totalTrades > 0
    ? ((totalWins / totalTrades) * 100).toFixed(1)
    : "N/A";

  // Best timeframe
  const best = entries.reduce((a, b) => (a.profit > b.profit ? a : b));

  // Find rank per timeframe
  const ranks = entries.map((e) => {
    const peers = data
      .filter((d) => d.timeframe === e.timeframe)
      .sort((a, b) => b.profit - a.profit);
    const rank = peers.findIndex((p) => p.wallet_address === e.wallet_address) + 1;
    return { timeframe: e.timeframe, rank, total: peers.length };
  });

  // Get other top wallets for "similar traders" section
  const topWallets = data
    .filter((d) => d.timeframe === 1 && d.wallet_address !== params.address && d.profit > 0)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 6);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      {/* Header — KolScan style */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-bg-card border border-border flex items-center justify-center text-2xl font-bold text-buy">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{name}</h1>
            {twitter && (
              <a href={twitter} target="_blank" rel="noopener noreferrer"
                className="text-muted hover:text-white transition-colors text-lg" title="Twitter/X">
                𝕏
              </a>
            )}
            {telegram && (
              <a href={telegram} target="_blank" rel="noopener noreferrer"
                className="text-muted hover:text-blue-400 transition-colors text-lg" title="Telegram">
                ✈
              </a>
            )}
          </div>
          <a
            href={`https://solscan.io/account/${params.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm text-muted hover:text-buy transition-colors"
          >
            {truncate(params.address)}
          </a>
        </div>
        {/* Quick links */}
        <div className="flex gap-2">
          <a href={`https://solscan.io/account/${params.address}`} target="_blank" rel="noopener noreferrer"
            className="bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-muted hover:text-white transition-colors">
            Solscan
          </a>
          <a href={`https://gmgn.ai/sol/address/${params.address}`} target="_blank" rel="noopener noreferrer"
            className="bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-muted hover:text-yellow-400 transition-colors">
            GMGN
          </a>
          <a href={`https://kolscan.io/${params.address}`} target="_blank" rel="noopener noreferrer"
            className="bg-buy/10 border border-buy/20 rounded-lg px-3 py-1.5 text-sm text-buy hover:bg-buy/20 transition-colors">
            KolScan
          </a>
        </div>
      </div>

      {/* Two-column layout like KolScan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Stats panel */}
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <h2 className="text-muted text-sm font-medium mb-4 uppercase tracking-wider">Stats</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted text-sm">Win Rate</span>
              <span className={`text-sm font-medium ${winRate !== "N/A" && parseFloat(winRate) >= 50 ? "text-buy" : winRate !== "N/A" ? "text-sell" : "text-white"}`}>
                {winRate === "N/A" ? "N/A" : `${winRate}%`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted text-sm">Total Trades</span>
              <span className="text-sm text-white font-medium">{totalTrades}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted text-sm">Wins</span>
              <span className="text-sm text-buy font-medium">{totalWins}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted text-sm">Losses</span>
              <span className="text-sm text-sell font-medium">{totalLosses}</span>
            </div>
            <div className="border-t border-border my-2" />
            <div className="flex justify-between">
              <span className="text-muted text-sm">Total Profit</span>
              <span className={`text-sm font-bold ${profitColor(totalProfit)}`}>
                {formatProfit(totalProfit)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted text-sm">Best Timeframe</span>
              <span className="text-sm text-white font-medium">{timeframeLabel(best.timeframe)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted text-sm">Best Profit</span>
              <span className={`text-sm font-medium ${profitColor(best.profit)}`}>
                {formatProfit(best.profit)}
              </span>
            </div>
          </div>
        </div>

        {/* Rankings panel */}
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <h2 className="text-muted text-sm font-medium mb-4 uppercase tracking-wider">Leaderboard Rankings</h2>
          <div className="space-y-3">
            {ranks.map((r) => {
              const entry = entries.find((e) => e.timeframe === r.timeframe)!;
              const pct = r.total > 0 ? ((r.rank / r.total) * 100).toFixed(0) : "0";
              return (
                <div key={r.timeframe} className="bg-bg-hover rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white text-sm font-medium">{timeframeLabel(r.timeframe)}</span>
                    <span className="text-muted text-xs">#{r.rank} / {r.total}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-bg-primary rounded-full h-1.5 mb-2">
                    <div
                      className={`h-1.5 rounded-full ${r.rank <= 10 ? "bg-buy" : r.rank <= 25 ? "bg-yellow-500" : "bg-muted"}`}
                      style={{ width: `${Math.max(100 - Number(pct), 5)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className={profitColor(entry.profit)}>{formatProfit(entry.profit)}</span>
                    <span className="text-muted">
                      <span className="text-buy">{entry.wins}</span>/<span className="text-sell">{entry.losses}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* PnL by Timeframe — card grid like KolScan Token PnL */}
      <h2 className="text-lg font-bold text-white mb-4">
        PnL by Timeframe
        <span className="ml-3 text-sm font-normal">
          <span className="text-buy">{totalWins}</span>
          <span className="text-muted">/</span>
          <span className="text-sell">{totalLosses}</span>
          <span className={`ml-2 font-bold ${profitColor(totalProfit)}`}>
            {formatProfit(totalProfit)}
          </span>
        </span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {entries.map((e) => {
          const total = e.wins + e.losses;
          const wr = total > 0 ? ((e.wins / total) * 100).toFixed(1) : "0";
          const roi = total > 0 ? ((e.wins / total) * 100 - 50).toFixed(1) : "0";
          return (
            <div key={e.timeframe} className="bg-bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white font-semibold">{timeframeLabel(e.timeframe)}</span>
                <span className={`text-sm font-bold ${profitColor(e.profit)}`}>
                  {formatProfit(e.profit)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <div className="text-muted">Wins</div>
                  <div className="text-buy font-medium">{e.wins}</div>
                </div>
                <div>
                  <div className="text-muted">Losses</div>
                  <div className="text-sell font-medium">{e.losses}</div>
                </div>
                <div>
                  <div className="text-muted">Win Rate</div>
                  <div className={`font-medium ${parseFloat(wr) >= 50 ? "text-buy" : "text-sell"}`}>
                    {total > 0 ? `${wr}%` : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-muted">Edge</div>
                  <div className={`font-medium ${parseFloat(roi) >= 0 ? "text-buy" : "text-sell"}`}>
                    {total > 0 ? `${parseFloat(roi) > 0 ? "+" : ""}${roi}%` : "-"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* External Links */}
      <div className="bg-bg-card border border-border rounded-xl p-5 mb-8">
        <h2 className="text-muted text-sm font-medium mb-3 uppercase tracking-wider">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          <a href={`https://kolscan.io/${params.address}`} target="_blank" rel="noopener noreferrer"
            className="bg-bg-hover border border-border rounded-lg px-4 py-2 text-sm text-white hover:border-buy/50 transition-colors">
            View on KolScan →
          </a>
          <a href={`https://gmgn.ai/sol/address/${params.address}`} target="_blank" rel="noopener noreferrer"
            className="bg-bg-hover border border-border rounded-lg px-4 py-2 text-sm text-white hover:border-yellow-500/50 transition-colors">
            Track on GMGN →
          </a>
          <a href={`https://solscan.io/account/${params.address}`} target="_blank" rel="noopener noreferrer"
            className="bg-bg-hover border border-border rounded-lg px-4 py-2 text-sm text-white hover:border-blue-500/50 transition-colors">
            View on Solscan →
          </a>
          <a href={`https://birdeye.so/profile/${params.address}?chain=solana`} target="_blank" rel="noopener noreferrer"
            className="bg-bg-hover border border-border rounded-lg px-4 py-2 text-sm text-white hover:border-purple-500/50 transition-colors">
            View on Birdeye →
          </a>
        </div>
      </div>

      {/* Similar Traders */}
      {topWallets.length > 0 && (
        <>
          <h2 className="text-lg font-bold text-white mb-4">Top KOLs Today</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
            {topWallets.map((w) => {
              const wTotal = w.wins + w.losses;
              const wRate = wTotal > 0 ? ((w.wins / wTotal) * 100).toFixed(0) : "0";
              return (
                <Link
                  key={w.wallet_address}
                  href={`/wallet/${w.wallet_address}`}
                  className="bg-bg-card border border-border rounded-xl p-4 hover:border-buy/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium text-sm">{w.name}</span>
                    <span className={`text-xs font-bold ${profitColor(w.profit)}`}>
                      {formatProfit(w.profit)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-muted">
                    <span>{truncate(w.wallet_address)}</span>
                    <span>
                      <span className="text-buy">{w.wins}</span>/<span className="text-sell">{w.losses}</span>
                      {wTotal > 0 && <span className="ml-1 text-muted">({wRate}%)</span>}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* Full Address */}
      <div className="bg-bg-card border border-border rounded-xl p-4 text-center">
        <span className="text-muted text-xs">Full Address</span>
        <div className="font-mono text-sm text-buy break-all mt-1">{params.address}</div>
      </div>
    </main>
  );
}
