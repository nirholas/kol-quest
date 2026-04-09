import { getAllWallets } from "@/lib/data";
import UnifiedTable from "@/app/components/UnifiedTable";

export const revalidate = 3600;

export const metadata = {
  title: "All Wallets | KolQuest",
  description:
    "Every tracked smart money wallet in one view — KolScan KOLs, GMGN smart degens, snipers, fresh wallets, top devs, KOLs, plus Polymarket prediction traders across all chains.",
};

export default async function AllWalletsPage() {
  const data = await getAllWallets();

  // Count by source for subtitle
  const sources = data.reduce<Record<string, number>>((acc, w) => {
    acc[w.source] = (acc[w.source] || 0) + 1;
    return acc;
  }, {});

  const sourceParts = Object.entries(sources)
    .sort((a, b) => b[1] - a[1])
    .map(([src, n]) => `${n.toLocaleString()} ${src}`)
    .join(" · ");

  return (
    <UnifiedTable
      data={data}
      title="All Wallets"
      subtitle={`${data.length.toLocaleString()} wallets — ${sourceParts}`}
      showSource={true}
      showCategory={true}
      chain="sol"
    />
  );
}
