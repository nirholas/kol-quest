'use client';

interface RiskVerdictProps {
  score: number;
  flags: {
    positive: string[];
    warning: string[];
    critical: string[];
  };
}

export default function RiskVerdict({ score, flags }: RiskVerdictProps) {
  const getRiskLevel = () => {
    if (score >= 80) return { level: 'LOW RISK', color: 'text-green-500' };
    if (score >= 50) return { level: 'MEDIUM RISK', color: 'text-yellow-500' };
    return { level: 'HIGH RISK', color: 'text-red-500' };
  };

  const { level, color } = getRiskLevel();

  return (
    <div className="p-4 border rounded">
      <h2 className={`text-2xl font-bold ${color}`}>{level}</h2>
      <p className="text-lg">Overall Score: {score}/100</p>
      <div className="mt-4">
        <h3 className="font-bold">Quick Checks:</h3>
        <ul>
          {flags.positive.map((flag, i) => (
            <li key={i} className="flex items-center">
              <span className="text-green-500 mr-2">✅</span> {flag}
            </li>
          ))}
          {flags.warning.map((flag, i) => (
            <li key={i} className="flex items-center">
              <span className="text-yellow-500 mr-2">⚠️</span> {flag}
            </li>
          ))}
          {flags.critical.map((flag, i) => (
            <li key={i} className="flex items-center">
              <span className="text-red-500 mr-2">❌</span> {flag}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
