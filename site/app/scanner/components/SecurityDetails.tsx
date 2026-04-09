'use client';

interface SecurityDetailsProps {
  data: any;
}

export default function SecurityDetails({ data }: SecurityDetailsProps) {
  if (!data) return null;

  return (
    <div className="p-4 border rounded">
      <h2 className="text-xl font-bold mb-2">Detailed Security Analysis</h2>
      
      <div className="mb-4">
        <h3 className="font-semibold">Contract Analysis</h3>
        <ul>
          {Object.entries(data.contractAnalysis).map(([key, value]) => (
            <li key={key}>{`${key}: ${value}`}</li>
          ))}
        </ul>
      </div>

      <div className="mb-4">
        <h3 className="font-semibold">Liquidity Analysis</h3>
        <ul>
           {Object.entries(data.liquidityAnalysis).map(([key, value]) => (
            <li key={key}>{`${key}: ${value}`}</li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="font-semibold">Social Verification</h3>
        <ul>
           {Object.entries(data.socialVerification).map(([key, value]) => (
            <li key={key}>{`${key}: ${value}`}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
