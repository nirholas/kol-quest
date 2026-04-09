import { getSolGmgnData, getBscGmgnData, getXProfiles, getXProfile } from "@/lib/data";

function truncate(addr: string) {
  if (addr.startsWith("0x")) return addr.slice(0, 6) + "..." + addr.slice(-4);
  return addr.slice(0, 4) + "..." + addr.slice(-4);
}

function profitColor(v: number) {
  return v > 0 ? "text-buy" : v < 0 ? "text-sell" : "text-zinc-500";
}

function fmt(v: number) {
  const abs = Math.abs(v);
  const sign = v >= 0 ? "+" : "-";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(2)}`;
}

function fmtHold(secs: number) {
  if (secs >= 86400) return `${(secs / 86400).toFixed(1)}d`;
  if (secs >= 3600) return `${(secs / 3600).toFixed(1)}h`;
  if (secs >= 60) return `${(secs / 60).toFixed(0)}m`;
  return `${secs.toFixed(0)}s`;
}

const CATEGORY_LABELS: Record<string, string> = {
  smart_degen: "Smart Degen",
  kol: "KOL",
  launchpad_smart: "Launchpad",
  fresh_wallet: "Fresh Wallet",
  snipe_bot: "Sniper",
  live: "Live",
  top_followed: "Top Followed",
  top_renamed: "Top Renamed",
};

export async function generateStaticParams() {
  const [sol, bsc] = await Promise.all([getSolGmgnData(), getBscGmgnData()]);
  return [...sol, ...bsc].map((w) => ({ address: w.wallet_address }));
}

export async function generateMetadata({ params }: { params: { address: string } }) {
  const [sol, bsc] = await Promise.all([getSolGmgnData(), getBscGmgnData()]);
  const w = [...sol, ...bsc].find((e) => e.wallet_address === params.address);
  const name = w?.name || params.address.slice(0, 8);
  const title = `${name} Wallet`;
  const description = `GMGN smart money profile for ${name} — realized profit, win rate, and token trades.`;
  return {
    title,
    description,
    openGraph: { title: `${title} | KolQuest`, description },
  };
}

export default async function GmgnWalletPage({ params }: { params: { address: string } }) {
  const [sol, bsc, xProfiles] = await Promise.all([getSolGmgnData(), getBscGmgnData(), getXProfiles()]);
  const wallet = [...sol, ...bsc].find((w) => w.wallet_address === params.address);

  if (!wallet) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-20 text-center animate-fade-in">
        <h1 className="text-2xl font-bold text-white mb-2">Wallet Not Found</h1>
        <p className="text-zinc-500">No GMGN data found for this address.</p>
      </main>
    );
  }

  const xProfile = getXProfile(xProfiles, wallet.twitter_username);
  const chain = wallet.chain;
  const nativeSymbol = chain === "bsc" ? "BNB" : "SOL";
  const explorer = chain === "bsc" ? "https://bscscan.com/address" : "https://solscan.io/account";

  const pnl7dPct = wallet.pnl_7d * 100;
  const winrate7d = wallet.winrate_7d * 100;

  const dist7d = [
    { label: "<-50%", value: wallet.pnl_lt_minus_dot5_num_7d, color: "bg-red-500" },
    { label: "-50%–0", value: wallet.pnl_minus_dot5_0x_num_7d, color: "bg-orange-500" },
    { label: "0–2x", value: wallet.pnl_lt_2x_num_7d, color: "bg-zinc-500" },
    { label: "2–5x", value: wallet.pnl_2x_5x_num_7d, color: "bg-emerald-500" },
    { label: ">5x", value: wallet.pnl_gt_5x_num_7d, color: "bg-green-400" },
  ];
  const distTotal = dist7d.reduce((s, d) => s + d.value, 0);

  const dailyProfits = wallet.daily_profit_7d;
  const maxAbs = Math.max(...dailyProfits.map((d) => Math.abs(d.profit)), 1);

  const timeframes = [
    { label: "Daily (1D)", profit: wallet.realized_profit_1d, buys: wallet.buy_1d, sells: wallet.sell_1d, winrate: wallet.winrate_1d, txs: wallet.txs_1d },
    { label: "Weekly (7D)", profit: wallet.realized_profit_7d, buys: wallet.buy_7d, sells: wallet.sell_7d, winrate: wallet.winrate_7d, txs: wallet.txs_7d },
    { label: "Monthly (30D)", profit: wallet.realized_profit_30d, buys: wallet.buy_30d, sells: wallet.sell_30d, winrate: wallet.winrate_30d, txs: wallet.txs_30d },
  ];

  const quickLinks = [
    { href: `https://gmgn.ai/${chain === "bsc" ? "bsc" : "sol"}/address/${params.address}?ref=nichxbt`, label: "GMGN" },
    { href: `https://trade.padre.gg/rk/nich?wallet=${params.address}`, label: "Padre" },
    { href: `${explorer}/${params.address}`, label: chain === "bsc" ? "BscScan" : "Solscan" },
    ...(chain === "sol" ? [{ href: `https://birdeye.so/profile/${params.address}?chain=solana`, label: "Birdeye" }] : []),
  ];

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 animate-fade-in">

      {/* ── Compact Header ── */}
      <div className="flex items-center gap-3 mb-5">
        {(xProfile?.avatar || wallet.avatar) ? (
          <img src={xProfile?.avatar || wallet.avatar!} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-base font-bold text-white flex-shrink-0">
            {wallet.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-bold text-base">{wallet.name}</span>
            {xProfile?.verified && <span className="text-blue-400 text-xs">✓</span>}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 uppercase tracking-wide">{chain}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">GMGN</span>
            {wallet.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/25">
                {CATEGORY_LABELS[tag] || tag}
              </span>
            ))}
            {wallet.twitter_username && (
              <a href={`https://x.com/${wallet.twitter_username}`} target="_blank" rel="noopener noreferrer"
                className="text-zinc-500 hover:text-white transition-colors text-sm leading-none">𝕏</a>
            )}
            {(xProfile?.followers ?? wallet.follow_count) > 0 && (
              <span className="text-zinc-600 text-xs">
                {(() => {
                  const n = xProfile?.followers ?? wallet.follow_count;
                  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n;
                })()} followers
              </span>
            )}
          </div>
          <a href={`${explorer}/${params.address}`} target="_blank" rel="noopener noreferrer"
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
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr] gap-3 mb-4">

        {/* Left: PnL + Sparkline */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="text-zinc-500 text-[11px] uppercase tracking-wider mb-2">7D Realized PnL · {nativeSymbol}</div>
          <div className={`text-3xl font-bold tabular-nums leading-none mb-1 ${profitColor(pnl7dPct)}`}>
            {pnl7dPct >= 0 ? "+" : ""}{pnl7dPct.toFixed(2)}%
          </div>
          <div className={`text-sm font-medium tabular-nums mb-3 ${profitColor(wallet.realized_profit_7d)}`}>
            {fmt(wallet.realized_profit_7d)}
          </div>
          <div className="space-y-1 text-xs mb-4">
            <div className="flex justify-between">
              <span className="text-zinc-500">Total PnL</span>
              <span className={`tabular-nums font-medium ${profitColor(wallet.realized_profit_1d + wallet.realized_profit_7d + wallet.realized_profit_30d)}`}>
                {fmt(wallet.realized_profit_1d + wallet.realized_profit_7d + wallet.realized_profit_30d)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Balance</span>
              <span className="text-white tabular-nums font-medium">{wallet.balance.toFixed(2)} {nativeSymbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Last Active</span>
              <span className="text-zinc-400 tabular-nums">
                {wallet.last_active > 0 ? new Date(wallet.last_active * 1000).toLocaleDateString() : "N/A"}
              </span>
            </div>
          </div>

          {/* Daily sparkline */}
          {dailyProfits.length > 0 && (
            <div>
              <div className="flex items-end gap-1 h-16">
                {dailyProfits.map((d) => {
                  const pct = Math.abs(d.profit) / maxAbs;
                  return (
                    <div key={d.timestamp} className="flex-1 flex flex-col items-center justify-end h-full">
                      <div
                        className={`w-full rounded-sm ${d.profit >= 0 ? "bg-buy/70" : "bg-sell/60"}`}
                        style={{ height: `${Math.max(pct * 100, 4)}%` }}
                        title={`${d.profit >= 0 ? "+" : ""}${d.profit.toFixed(2)}`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-1 mt-1">
                {dailyProfits.map((d) => (
                  <div key={d.timestamp} className="flex-1 text-center text-[9px] text-zinc-700">
                    {new Date(d.timestamp * 1000).toLocaleDateString(undefined, { weekday: "short" })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center: Win Rate + Analysis */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="text-zinc-500 text-[11px] uppercase tracking-wider mb-2">Win Rate</div>
          <div className={`text-3xl font-bold tabular-nums leading-none mb-4 ${winrate7d >= 50 ? "text-buy" : winrate7d > 0 ? "text-sell" : "text-zinc-500"}`}>
            {winrate7d > 0 ? `${winrate7d.toFixed(2)}%` : "—"}
          </div>

          <div className="space-y-2 text-xs">
            {[
              { label: "7D Txs", value: `${wallet.buy_7d} / ${wallet.sell_7d}`, note: `${wallet.txs_7d} total` },
              { label: "Volume 7D", value: fmt(wallet.volume_7d).replace(/^\+/, "") },
              { label: "Avg Cost 7D", value: wallet.avg_cost_7d > 0 ? fmt(wallet.avg_cost_7d).replace(/^\+/, "") : "—" },
              { label: "Avg Hold 7D", value: wallet.avg_holding_period_7d > 0 ? fmtHold(wallet.avg_holding_period_7d) : "—" },
              { label: "ROI 7D", value: `${pnl7dPct >= 0 ? "+" : ""}${pnl7dPct.toFixed(1)}%`, color: profitColor(pnl7dPct) },
              { label: "ROI 30D", value: `${wallet.pnl_30d >= 0 ? "+" : ""}${(wallet.pnl_30d * 100).toFixed(1)}%`, color: profitColor(wallet.pnl_30d) },
              { label: "Net Inflow 7D", value: fmt(wallet.net_inflow_7d), color: profitColor(wallet.net_inflow_7d) },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-baseline">
                <span className="text-zinc-500">{row.label}</span>
                <span className={`tabular-nums font-medium ${(row as any).color || "text-white"}`}>
                  {row.value}
                  {(row as any).note && <span className="text-zinc-600 ml-1 font-normal">({(row as any).note})</span>}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Distribution */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-zinc-500 text-[11px] uppercase tracking-wider">PnL Distribution (7D)</span>
            {distTotal > 0 && <span className="text-zinc-600 text-[11px]">{distTotal} trades</span>}
          </div>

          {distTotal > 0 ? (
            <>
              <div className="flex rounded overflow-hidden h-2.5 mb-3">
                {dist7d.map((d) => d.value > 0 ? (
                  <div key={d.label} className={`${d.color} transition-all`}
                    style={{ width: `${(d.value / distTotal) * 100}%` }}
                    title={`${d.label}: ${d.value}`} />
                ) : null)}
              </div>
              <div className="space-y-1.5 mb-4">
                {dist7d.map((d) => (
                  <div key={d.label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-sm flex-shrink-0 ${d.color}`} />
                      <span className="text-zinc-500">{d.label}</span>
                    </div>
                    <span className="text-white tabular-nums font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-zinc-600 text-xs mb-4">No distribution data</div>
          )}

          <div className="border-t border-border/50 pt-3">
            <div className="text-zinc-500 text-[11px] uppercase tracking-wider mb-2">Timeframes</div>
            <div className="space-y-1.5">
              {timeframes.map((tf) => (
                <div key={tf.label} className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">{tf.label.split(" ")[0]}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-600 tabular-nums">
                      <span className="text-buy">{tf.buys}</span>/<span className="text-sell">{tf.sells}</span>
                    </span>
                    <span className={`tabular-nums font-medium ${profitColor(tf.profit)}`}>{fmt(tf.profit)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── PnL by Timeframe (compact) ── */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {timeframes.map((tf) => {
          const total = tf.buys + tf.sells;
          return (
            <div key={tf.label} className="bg-bg-card border border-border rounded-xl p-3">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-zinc-400 text-xs font-medium">{tf.label}</span>
                <span className={`text-sm font-bold tabular-nums ${profitColor(tf.profit)}`}>{fmt(tf.profit)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <div>
                  <span className="text-zinc-600">Buys </span>
                  <span className="text-buy tabular-nums font-medium">{tf.buys}</span>
                </div>
                <div>
                  <span className="text-zinc-600">Sells </span>
                  <span className="text-sell tabular-nums font-medium">{tf.sells}</span>
                </div>
                <div>
                  <span className="text-zinc-600">Txs </span>
                  <span className="text-white tabular-nums font-medium">{tf.txs || total}</span>
                </div>
                {tf.winrate > 0 && (
                  <div>
                    <span className={`tabular-nums font-medium ${tf.winrate >= 0.5 ? "text-buy" : "text-sell"}`}>
                      {(tf.winrate * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── X Profile (if available, compact) ── */}
      {xProfile && (
        <div className="bg-bg-card border border-border rounded-xl p-4 mb-4">
          <div className="flex items-start gap-4">
            {xProfile.header && (
              <div className="flex-shrink-0 w-24 h-14 rounded-lg overflow-hidden">
                <img src={xProfile.header} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              {xProfile.bio && <p className="text-zinc-400 text-xs mb-2 line-clamp-1">{xProfile.bio}</p>}
              <div className="flex gap-4 flex-wrap text-xs">
                {[
                  { label: "Followers", value: xProfile.followers.toLocaleString() },
                  { label: "Following", value: xProfile.following.toLocaleString() },
                  { label: "Tweets", value: xProfile.tweets.toLocaleString() },
                  { label: "Likes", value: (xProfile.likes ?? 0).toLocaleString() },
                ].map((s) => (
                  <div key={s.label}>
                    <span className="text-white font-bold tabular-nums">{s.value}</span>
                    <span className="text-zinc-600 ml-1">{s.label}</span>
                  </div>
                ))}
                {xProfile.location && <span className="text-zinc-500">📍 {xProfile.location}</span>}
                {xProfile.joinDate && (
                  <span className="text-zinc-500">
                    Joined {new Date(xProfile.joinDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Full Address ── */}
      <div className="border border-border/50 rounded-xl p-3 text-center">
        <span className="text-zinc-600 text-[11px] uppercase tracking-wider">Full Address · </span>
        <a href={`${explorer}/${params.address}`} target="_blank" rel="noopener noreferrer"
          className="font-mono text-xs text-buy hover:underline break-all">{params.address}</a>
      </div>
    </main>
  );
}
