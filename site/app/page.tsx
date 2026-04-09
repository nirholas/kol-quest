import Link from "next/link";
import { getData, getSolGmgnData, getBscGmgnData } from "@/lib/data";

export default async function Home() {
  const [kolscanData, solGmgn, bscGmgn] = await Promise.all([
    getData(),
    getSolGmgnData(),
    getBscGmgnData(),
  ]);

  const dailyEntries = kolscanData.filter((e) => e.timeframe === 1);
  const topByProfit = [...dailyEntries].sort((a, b) => b.profit - a.profit).slice(0, 5);
  const topByWinRate = [...dailyEntries]
    .filter((e) => e.wins + e.losses >= 5)
    .sort((a, b) => {
      const ar = a.wins / (a.wins + a.losses);
      const br = b.wins / (b.wins + b.losses);
      return br - ar;
    })
    .slice(0, 5);
  const kolscanWallets = new Set(kolscanData.map((e) => e.wallet_address)).size;

  const topGmgnSol = [...solGmgn].sort((a, b) => b.realized_profit_7d - a.realized_profit_7d).slice(0, 5);
  const topGmgnBsc = [...bscGmgn].sort((a, b) => b.realized_profit_7d - a.realized_profit_7d).slice(0, 5);

  // Combined unique Solana wallets
  const allSolAddresses = new Set([
    ...kolscanData.map((e) => e.wallet_address),
    ...solGmgn.map((w) => w.wallet_address),
  ]);

  return (
    <main className="animate-fade-in">
      {/* Hero */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-20 sm:py-28">
          <h1 className="text-4xl sm:text-[3.5rem] font-extrabold text-white tracking-tight leading-[1.08] mb-5">
            Track the smartest<br />
            <span className="text-zinc-500">crypto wallets.</span>
          </h1>
          <p className="text-zinc-500 text-lg max-w-xl mb-10 leading-relaxed">
            {allSolAddresses.size.toLocaleString()} Solana + {bscGmgn.length.toLocaleString()} BSC wallets tracked.
            KolScan KOLs, GMGN smart money, snipers, degens, and more.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/all-solana"
              className="inline-flex items-center gap-2 bg-white hover:bg-zinc-200 text-black font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
            >
              All Solana Wallets
            </Link>
            <Link
              href="/bsc"
              className="inline-flex items-center gap-2 border border-border hover:border-zinc-600 text-zinc-300 hover:text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm"
            >
              BSC Wallets
            </Link>
            <a
              href="https://gmgn.ai/r/nichxbt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-border hover:border-zinc-600 text-zinc-300 hover:text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm"
            >
              Track on GMGN
            </a>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center gap-8 sm:gap-16 overflow-x-auto">
          {[
            { value: kolscanWallets.toString(), label: "KolScan KOLs" },
            { value: solGmgn.length.toLocaleString(), label: "GMGN Solana" },
            { value: bscGmgn.length.toLocaleString(), label: "GMGN BSC" },
            { value: allSolAddresses.size.toLocaleString(), label: "Total Solana" },
          ].map((s) => (
            <div key={s.label} className="shrink-0">
              <div className="text-2xl font-bold text-white tabular-nums">{s.value}</div>
              <div className="text-xs text-zinc-600 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Three-column preview tables */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* KolScan Top Profit */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider">KolScan KOLs</h2>
                <p className="text-[11px] text-zinc-600 mt-0.5">Top profit today</p>
              </div>
              <Link href="/leaderboard" className="text-xs text-zinc-600 hover:text-white transition-colors">View all →</Link>
            </div>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2.5 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-wider">#</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Name</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-medium text-zinc-600 uppercase tracking-wider">PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {topByProfit.map((e, i) => (
                    <tr key={e.wallet_address} className="border-b border-border/50 last:border-b-0 hover:bg-bg-card transition-colors">
                      <td className="px-3 py-2.5 text-xs text-zinc-600 tabular-nums">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <Link href={`/wallet/${e.wallet_address}`} className="text-sm text-white hover:text-accent transition-colors">
                          {e.name}
                        </Link>
                      </td>
                      <td className={`px-3 py-2.5 text-sm text-right tabular-nums font-medium ${e.profit > 0 ? "text-buy" : "text-sell"}`}>
                        {e.profit > 0 ? "+" : ""}{e.profit.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* GMGN Solana Top */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider">GMGN Solana</h2>
                <p className="text-[11px] text-zinc-600 mt-0.5">Top profit 7D</p>
              </div>
              <Link href="/gmgn-sol" className="text-xs text-zinc-600 hover:text-white transition-colors">View all →</Link>
            </div>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2.5 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-wider">#</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Name</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-medium text-zinc-600 uppercase tracking-wider">7D PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {topGmgnSol.map((w, i) => (
                    <tr key={w.wallet_address} className="border-b border-border/50 last:border-b-0 hover:bg-bg-card transition-colors">
                      <td className="px-3 py-2.5 text-xs text-zinc-600 tabular-nums">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <Link href={`/gmgn-wallet/${w.wallet_address}?chain=sol`} className="text-sm text-white hover:text-accent transition-colors">
                          {w.name}
                        </Link>
                      </td>
                      <td className={`px-3 py-2.5 text-sm text-right tabular-nums font-medium ${w.realized_profit_7d > 0 ? "text-buy" : "text-sell"}`}>
                        {w.realized_profit_7d > 0 ? "+" : ""}{w.realized_profit_7d >= 1000 ? `${(w.realized_profit_7d / 1000).toFixed(1)}k` : w.realized_profit_7d.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* GMGN BSC Top */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider">GMGN BSC</h2>
                <p className="text-[11px] text-zinc-600 mt-0.5">Top profit 7D</p>
              </div>
              <Link href="/bsc" className="text-xs text-zinc-600 hover:text-white transition-colors">View all →</Link>
            </div>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2.5 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-wider">#</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Name</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-medium text-zinc-600 uppercase tracking-wider">7D PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {topGmgnBsc.map((w, i) => (
                    <tr key={w.wallet_address} className="border-b border-border/50 last:border-b-0 hover:bg-bg-card transition-colors">
                      <td className="px-3 py-2.5 text-xs text-zinc-600 tabular-nums">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <Link href={`/gmgn-wallet/${w.wallet_address}?chain=bsc`} className="text-sm text-white hover:text-accent transition-colors">
                          {w.name}
                        </Link>
                      </td>
                      <td className={`px-3 py-2.5 text-sm text-right tabular-nums font-medium ${w.realized_profit_7d > 0 ? "text-buy" : "text-sell"}`}>
                        {w.realized_profit_7d > 0 ? "+" : ""}{w.realized_profit_7d >= 1000 ? `${(w.realized_profit_7d / 1000).toFixed(1)}k` : w.realized_profit_7d.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Source cards */}
      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "KolScan Leaderboard", desc: `${kolscanWallets} KOL wallets. Scraped from kolscan.io with Playwright.`, href: "/leaderboard", tag: "SOL" },
              { title: "GMGN Solana", desc: `${solGmgn.length.toLocaleString()} smart money wallets — degens, snipers, KOLs, launchpad traders.`, href: "/gmgn-sol", tag: "SOL" },
              { title: "GMGN BSC", desc: `${bscGmgn.length.toLocaleString()} BNB Chain wallets — smart degens, KOLs, snipers.`, href: "/bsc", tag: "BSC" },
              { title: "All Solana Combined", desc: `${allSolAddresses.size.toLocaleString()} unique wallets. KolScan + GMGN deduplicated.`, href: "/all-solana", tag: "SOL" },
            ].map((f) => (
              <Link key={f.title} href={f.href} className="bg-bg-card border border-border rounded-xl p-5 hover:border-zinc-600 transition-all group">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-white text-sm font-semibold group-hover:text-accent transition-colors">{f.title}</h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700">{f.tag}</span>
                </div>
                <p className="text-zinc-600 text-xs leading-relaxed">{f.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-zinc-600 text-xs">KolQuest</span>
          <div className="flex items-center gap-6 text-xs text-zinc-600">
            <a href="https://gmgn.ai/r/nichxbt" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GMGN</a>
            <a href="https://trade.padre.gg/rk/nich" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Padre</a>
            <Link href="/writeup" className="hover:text-white transition-colors">Writeup</Link>
            <a href="https://github.com/nirholas/scrape-kolscan-wallets" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
