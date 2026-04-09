'use client';

interface HolderAnalysisProps {
  data: any;
}

export default function HolderAnalysis({ data }: HolderAnalysisProps) {
    if (!data) return null;
  return (
    <div className="p-4 border rounded">
      <h2 className="text-xl font-bold mb-2">Holder Analysis</h2>
      <ul>
        {Object.entries(data).map(([key, value]) => (
          <li key={key}>{`${key}: ${value}`}</li>
        ))}
      </ul>
    </div>
  );
}
