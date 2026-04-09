'use client';

interface KolCheckProps {
  data: any;
}

export default function KolCheck({ data }: KolCheckProps) {
    if (!data) return null;
  return (
    <div className="p-4 border rounded">
      <h2 className="text-xl font-bold mb-2">KOL Check</h2>
      <p>Total KOL Holdings: {data.totalKolHoldings}</p>
      <p>Recent Activity: {data.recentActivity}</p>
      <h3 className="font-semibold mt-2">KOLs Holding:</h3>
      <ul>
        {data.kols.map((kol: any, i: number) => (
          <li key={i}>
            {kol.name} - Holdings: {kol.holdings}, Entry: ${kol.entry}
          </li>
        ))}
      </ul>
    </div>
  );
}
