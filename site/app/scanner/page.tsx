import TokenInput from './components/TokenInput';
import CompareMode from './components/CompareMode';

export default function ScannerPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Token Security Scanner</h1>
      <p className="text-gray-500 mb-6">
        Input any token address to get comprehensive security and analytics analysis.
      </p>
      <TokenInput />
      <div className="mt-8">
        <CompareMode />
      </div>
    </div>
  );
}
