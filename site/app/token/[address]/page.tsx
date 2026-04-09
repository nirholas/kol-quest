import type { Metadata } from "next";
import TokenClient from "./TokenClient";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { address: string };
  searchParams: { chain?: string };
}): Promise<Metadata> {
  const addr = params.address;
  const short = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  return {
    title: `Token ${short}`,
    description: `Smart wallet activity for token ${short} — who's buying, selling, and profiting.`,
    openGraph: {
      title: `Token ${short} | KolQuest`,
      description: `Track smart money activity for token ${short}`,
    },
  };
}

export default function TokenPage({
  params,
  searchParams,
}: {
  params: { address: string };
  searchParams: { chain?: string };
}) {
  return (
    <main className="max-w-6xl mx-auto px-6 py-8 animate-fade-in">
      <TokenClient address={params.address} chain={searchParams.chain || "sol"} />
    </main>
  );
}
