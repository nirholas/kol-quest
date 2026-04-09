import { getData } from "@/lib/data";

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="text-muted text-xs mb-1">{label}</div>
      <div className={`text-xl font-bold ${color || "text-white"}`}>{value}</div>
    </div>
  );
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

  // Aggregate
  const totalProfit = entries.reduce((s, e) => s + e.profit, 0);
  const totalWins = entries.reduce((s, e) => s + e.wins, 0);
  const totalLosses = entries.reduce((s, e) => s + e.losses, 0);
  const winRate = totalWins + totalLosses > 0
    ? ((totalWins / (totalWins + totalLosses)) * 100).toFixed(1)
    : "N/A";

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">{name}</h1>
        <div className="flex items-center gap-3 mb-4">
          <a
            href={`https://solscan.io/account/${params.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm text-buy hover:underline"
          >
            {params.address}
          </a>
        </div>
        <div className="flex gap-2">
          {twitter && (
            <a
              href={twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-muted hover:text-white transition-colors"
            >
              𝕏 Twitter
            </a>
          )}
          {telegram && (
            <a
              href={telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-muted hover:text-blue-400 transition-colors"
            >
              ✈ Telegram
            </a>
          )}
          <a
            href={`https://gmgn.ai/sol/address/${params.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-muted hover:text-yellow-400 transition-colors"
          >
            GMGN
          </a>
        </div>
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <Stat
          label="Total Profit"
          value={`${totalProfit > 0 ? "+" : ""}${totalProfit.toFixed(2)} SOL`}
          color={totalProfit > 0 ? "text-buy" : totalProfit < 0 ? "text-sell" : undefined}
        />
        <Stat label="Total Wins" value={String(totalWins)} color="text-buy" />
        <Stat label="Total Losses" value={String(totalLosses)} color="text-sell" />
        <Stat
          label="Win Rate"
          value={winRate === "N/A" ? winRate : `${winRate}%`}
          color={
            winRate === "N/A"
              ? undefined
              : parseFloat(winRate) >= 50
              ? "text-buy"
              : "text-sell"
          }
        />
      </div>

      {/* Per-Timeframe */}
      <h2 className="text-xl font-bold text-white mb-4">Performance by Timeframe</h2>
      <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-muted font-medium">Timeframe</th>
              <th className="px-4 py-3 text-left text-muted font-medium">Profit (SOL)</th>
              <th className="px-4 py-3 text-left text-muted font-medium">Wins</th>
              <th className="px-4 py-3 text-left text-muted font-medium">Losses</th>
              <th className="px-4 py-3 text-left text-muted font-medium">Win Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entries.map((e) => {
              const total = e.wins + e.losses;
              const wr = total > 0 ? ((e.wins / total) * 100).toFixed(1) : "-";
              return (
                <tr key={e.timeframe} className="hover:bg-bg-hover transition-colors">
                  <td className="px-4 py-3 text-white font-medium">
                    {timeframeLabel(e.timeframe)}
                  </td>
                  <td
                    className={`px-4 py-3 font-medium ${
                      e.profit > 0
                        ? "text-buy"
                        : e.profit < 0
                        ? "text-sell"
                        : "text-muted"
                    }`}
                  >
                    {e.profit > 0 ? "+" : ""}
                    {e.profit.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-buy">{e.wins}</td>
                  <td className="px-4 py-3 text-sell">{e.losses}</td>
                  <td
                    className={`px-4 py-3 ${
                      wr === "-"
                        ? "text-muted"
                        : parseFloat(wr) >= 50
                        ? "text-buy"
                        : "text-sell"
                    }`}
                  >
                    {wr === "-" ? wr : `${wr}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
