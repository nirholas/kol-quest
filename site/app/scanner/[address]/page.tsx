import RiskVerdict from '../components/RiskVerdict';
import SecurityDetails from '../components/SecurityDetails';
import HolderAnalysis from '../components/HolderAnalysis';
import KolCheck from '../components/KolCheck';

async function getScanData(address: string, chain: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/scanner/${address}?chain=${chain}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error('Failed to fetch scan data');
  }
  return res.json();
}

interface PageProps {
  params: Promise<{ address: string }>;
  searchParams: Promise<{ chain?: string }>;
}

export default async function TokenDetailPage({ params: rawParams, searchParams: rawSearchParams }: PageProps) {
  const { address } = await rawParams;
  const searchParams = await rawSearchParams;
  const chain = searchParams.chain || 'solana';

  let scanData: any = null;
  let error: string | null = null;

  try {
    scanData = await getScanData(address, chain);
  } catch (e) {
    error = 'Failed to load scan data. Please try again.';
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2 truncate">Token: {address}</h1>
      <p className="text-gray-400 mb-6 text-sm">Chain: {chain}</p>

      {scanData && (
        <div className="grid grid-cols-1 gap-6">
          <RiskVerdict
            score={scanData.riskScore.overall}
            flags={scanData.riskScore.flags}
          />
          <SecurityDetails data={scanData.security} />
          <HolderAnalysis data={scanData.holders} />
          <KolCheck data={scanData.kolCheck} />
        </div>
      )}
    </div>
  );
}
