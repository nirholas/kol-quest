import Link from "next/link";
import { getData, getXProfiles, getXProfile } from "@/lib/data";
import PnlCalendar from "@/app/components/PnlCalendar";

function truncate(addr: string) {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function profitColor(v: number) {
  return v > 0 ? "text-buy" : v < 0 ? "text-sell" : "text-zinc-500";
}

function fmt(v: number) {
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(2)} SOL`;
}

export async function generateStaticParams() {
  const data = await getData();
  const addresses = [...new Set(data.map((e) => e.wallet_address))];
  return addresses.map((address) => ({ address }));
}

export async function generateMetadata({ params }: { params: { address: string } }) {
  const data = await getData();
  const entry = data.find((e) => e.wallet_address === params.address);
  const name = entry?.name || params.address.slice(0, 8);
  const title = `${name} Wallet`;
  const description = `KolScan wallet profile and PnL for ${name} — profit, win rate, and trade history on Solana.`;
  return {
    title,
    description,
    openGraph: { title: `${title} | KolQuest`, description },
  };
}

export default async function WalletPage({ params }: { params: { address: string } }) {
  const [data, xProfiles] = await Promise.all([getData(), getXProfiles()]);
  const entries = data.filter((e) => e.wallet_address === params.address);

  if (entries.length === 0) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-20 text-center animate-fade-in">
        <h1 className="text-2xl font-bold text-white mb-2">Wallet Not Found</h1>
        <p className="text-zinc-500">No data found for this address.</p>
      </main>
    );
  }

  const name = entries[0].name;
  const twitter = entries[0].twitter;
  const telegram = entries[0].telegram;
  const xProfile = getXProfile(xProfiles, twitter);

  const timeframeLabel = (tf: number) => tf === 1 ? "Daily" : tf === 7 ? "Weekly" : "Monthly";

  const totalProfit = entries.reduce((s, e) => s + e.profit, 0);
  const totalWins = entries.reduce((s, e) => s + e.wins, 0);
  const totalLosses = entries.reduce((s, e) => s + e.losses, 0);
  const totalTrades = totalWins + totalLosses;
  const winRatePct = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
  const best = entries.reduce((a, b) => (a.profit > b.profit ? a : b));

  const ranks = entries.map((e) => {
    const peers = data.filter((d) => d.timeframe === e.timeframe).sort((a, b) => b.profit - a.profit);
    const rank = peers.findIndex((p) => p.wallet_address === e.wallet_address) + 1;
    return { timeframe: e.timeframe, rank, total: peers.length, entry: e };
  });

  const topWallets = data
    .filter((d) => d.timeframe === 1 && d.wallet_address !== params.address && d.profit > 0)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 6);

  const quickLinks = [
    { href: `https://solscan.io/account/${params.address}`, label: "Solscan" },
    { href: `https://gmgn.ai/sol/address/${params.address}?ref=nichxbt`, label: "GMGN" },
    { href: `https://trade.padre.gg/rk/nich?wallet=${params.address}`, label: "Padre" },
    { href: `https://kolscan.io/${params.address}`, label: "KolScan" },
    { href: `https://birdeye.so/profile/${params.address}?chain=solana`, label: "Birdeye" },
  ];

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 animate-fade-in">

      {/* ── Compact Header ── */}
      <div className="flex items-center gap-3 mb-5">
        {xProfile?.avatar ? (
          <img src={xProfile.avatar} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-buy to-emerald-600 flex items-center justify-center text-base font-bold text-white flex-shrink-0">
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-bold text-base">{name}</span>
            {xProfile?.verified && <span className="text-blue-400 text-xs">✓</span>}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-buy/15 text-buy border border-buy/25">KolScan</span>
            {twitter && (
              <a href={twitter} target="_blank" rel="noopener noreferrer"
                className="text-zinc-500 hover:text-white transition-colors text-sm leading-none">𝕏</a>
            )}
            {telegram && (
              <a href={telegram} target="_blank" rel="noopener noreferrer"
                className="text-zinc-500 hover:text-blue-400 transition-colors text-sm leading-none">✈</a>
            )}
            {xProfile && (
              <span className="text-zinc-600 text-xs">
                {xProfile.followers >= 1000 ? `${(xProfile.followers / 1000).toFixed(1)}K` : xProfile.followers} followers
              </span>
            )}
          </div>
          {xProfile?.bio && (
            <p className="text-zinc-500 text-[11px] mt-0.5 line-clamp-1 max-w-lg">{xProfile.bio}</p>
          )}
          <a href={`https://solscan.io/account/${params.address}`} target="_blank" rel="noopener noreferrer"
            className="font-mono text-[11px] text-zinc-600 hover:text-buy transition-colors">
            {truncate(params.address)}
          </a>
        </div>

        <div className="flex gap-1.5 flex-shrink-0">
          {quickLinks.map((link) => (
            <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
              className="bg-bg-card border border-border rounded-lg px-2.5 py-1 text-xs text-zinc-500 hover:text-white hover:border-zinc-600 transition-all">
              {link.label}
            </a>
          ))}
        </div>
      </div>

      {/* ── 3-Column Dashboard ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">

        {/* Left: Total Profit */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="text-zinc-500 text-[11px] uppercase tracking-wider mb-2">Total Profit · SOL</div>
          <div className={`text-3xl font-bold tabular-nums leading-none mb-1 ${profitColor(totalProfit)}`}>
            {totalProfit >= 0 ? "+" : ""}{totalProfit.toFixed(2)}
          </div>
          <div className="text-zinc-500 text-xs mb-4">SOL across all timeframes</div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">Best Timeframe</span>
              <span className="text-white font-medium">{timeframeLabel(best.timeframe)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Best Profit</span>
              <span className={`tabular-nums font-medium ${profitColor(best.profit)}`}>{fmt(best.profit)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Total Trades</span>
              <span className="text-white tabular-nums font-medium">{totalTrades}</span>
            </div>
          </div>

          {/* Leaderboard ranks */}
          <div className="mt-4 space-y-2">
            {ranks.map((r) => {
              const pct = r.total > 0 ? (r.rank / r.total) * 100 : 0;
              return (
                <div key={r.timeframe}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-zinc-500">{timeframeLabel(r.timeframe)}</span>
                    <span className="text-zinc-400 tabular-nums">#{r.rank}/{r.total}</span>
                  </div>
                  <div className="w-full bg-bg-primary rounded-full h-1">
                    <div
                      className={`h-1 rounded-full ${r.rank <= 10 ? "bg-buy" : r.rank <= 25 ? "bg-yellow-500" : "bg-zinc-600"}`}
                      style={{ width: `${Math.max(100 - pct, 5)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: Win Rate + Per-timeframe stats */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="text-zinc-500 text-[11px] uppercase tracking-wider mb-2">Win Rate</div>
          <div className={`text-3xl font-bold tabular-nums leading-none mb-4 ${winRatePct >= 50 ? "text-buy" : totalTrades > 0 ? "text-sell" : "text-zinc-500"}`}>
            {totalTrades > 0 ? `${winRatePct.toFixed(1)}%` : "—"}
          </div>

          <div className="space-y-2 text-xs">
            {[
              { label: "Wins", value: totalWins.toString(), color: "text-buy" },
              { label: "Losses", value: totalLosses.toString(), color: "text-sell" },
              { label: "Total Trades", value: totalTrades.toString(), color: "text-white" },
            ].map((row) => (
              <div key={row.label} className="flex justify-between">
                <span className="text-zinc-500">{row.label}</span>
                <span className={`tabular-nums font-medium ${row.color}`}>{row.value}</span>
              </div>
            ))}

            <div className="border-t border-border/50 pt-2 mt-1 space-y-2">
              {entries.map((e) => {
                const total = e.wins + e.losses;
                const wr = total > 0 ? ((e.wins / total) * 100).toFixed(1) : "—";
                return (
                  <div key={e.timeframe} className="flex justify-between">
                    <span className="text-zinc-600">{timeframeLabel(e.timeframe)}</span>
                    <div className="flex gap-3">
                      <span className="text-zinc-500 tabular-nums">
                        <span className="text-buy">{e.wins}</span>/<span className="text-sell">{e.losses}</span>
                      </span>
                      <span className={`tabular-nums font-medium ${wr !== "—" ? (parseFloat(wr) >= 50 ? "text-buy" : "text-sell") : "text-zinc-600"}`}>
                        {wr !== "—" ? `${wr}%` : "—"}
                      </span>
                      <span className={`tabular-nums font-medium ${profitColor(e.profit)}`}>{fmt(e.profit)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: X Profile / Social */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          {xProfile ? (
            <>
              <div className="text-zinc-500 text-[11px] uppercase tracking-wider mb-3">X / Twitter</div>
              {xProfile.header && (
                <div className="rounded-lg overflow-hidden mb-3 -mx-1">
                  <img src={xProfile.header} alt="" className="w-full h-20 object-cover" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs mb-3">
                {[
                  { label: "Followers", value: xProfile.followers.toLocaleString() },
                  { label: "Following", value: xProfile.following.toLocaleString() },
                  { label: "Tweets", value: xProfile.tweets.toLocaleString() },
                  { label: "Likes", value: (xProfile.likes ?? 0).toLocaleString() },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="text-white font-bold tabular-nums">{s.value}</div>
                    <div className="text-zinc-600 text-[10px]">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-1 text-[11px] text-zinc-500">
                {xProfile.location && <div>📍 {xProfile.location}</div>}
                {xProfile.website && (
                  <div>
                    <a href={xProfile.website} target="_blank" rel="noopener noreferrer"
                      className="hover:text-white transition-colors truncate block max-w-full">
                      🔗 {xProfile.website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}
                {xProfile.joinDate && (
                  <div>📅 Joined {new Date(xProfile.joinDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col justify-between">
              <div className="text-zinc-500 text-[11px] uppercase tracking-wider mb-3">Rankings</div>
              <div className="space-y-3">
                {ranks.map((r) => {
                  const pct = r.total > 0 ? (r.rank / r.total) * 100 : 0;
                  return (
                    <div key={r.timeframe} className="bg-bg-elevated/30 rounded-lg p-3">
                      <div className="flex justify-between items-baseline mb-1.5">
                        <span className="text-white text-xs font-medium">{timeframeLabel(r.timeframe)}</span>
                        <span className="text-zinc-500 text-[11px] tabular-nums">#{r.rank}/{r.total}</span>
                      </div>
                      <div className="w-full bg-bg-primary rounded-full h-1 mb-2">
                        <div
                          className={`h-1 rounded-full ${r.rank <= 10 ? "bg-buy" : r.rank <= 25 ? "bg-yellow-500" : "bg-zinc-600"}`}
                          style={{ width: `${Math.max(100 - pct, 5)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs tabular-nums">
                        <span className={profitColor(r.entry.profit)}>{fmt(r.entry.profit)}</span>
                        <span><span className="text-buy">{r.entry.wins}</span>/<span className="text-sell">{r.entry.losses}</span></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── PnL Calendar ── */}
      <div className="bg-bg-card border border-border rounded-xl p-4 mb-4">
        <div className="text-zinc-500 text-[11px] uppercase tracking-wider mb-3">PnL Calendar</div>
        <PnlCalendar entries={entries} walletAddress={params.address} walletName={name} />
      </div>

      {/* ── Top KOLs (compact) ── */}
      {topWallets.length > 0 && (
        <div className="mb-4">
          <div className="text-zinc-500 text-[11px] uppercase tracking-wider mb-2">Top KOLs Today</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {topWallets.map((w) => {
              const wTotal = w.wins + w.losses;
              const wRate = wTotal > 0 ? ((w.wins / wTotal) * 100).toFixed(0) : "0";
              return (
                <Link key={w.wallet_address} href={`/wallet/${w.wallet_address}`}
                  className="group bg-bg-card border border-border rounded-xl p-3 hover:border-buy/30 transition-all">
                  <div className="text-white text-xs font-medium truncate group-hover:text-buy transition-colors mb-1">{w.name}</div>
                  <div className={`text-xs font-bold tabular-nums ${profitColor(w.profit)}`}>{fmt(w.profit)}</div>
                  <div className="text-[10px] text-zinc-600 tabular-nums mt-0.5">
                    <span className="text-buy">{w.wins}</span>/<span className="text-sell">{w.losses}</span>
                    <span className="ml-1">({wRate}%)</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Full Address ── */}
      <div className="border border-border/50 rounded-xl p-3 text-center">
        <span className="text-zinc-600 text-[11px] uppercase tracking-wider">Full Address · </span>
        <a href={`https://solscan.io/account/${params.address}`} target="_blank" rel="noopener noreferrer"
          className="font-mono text-xs text-buy hover:underline break-all">{params.address}</a>
      </div>
    </main>
  );
}
