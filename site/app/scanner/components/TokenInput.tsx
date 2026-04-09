'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TokenInput() {
  const [address, setAddress] = useState('');
  const router = useRouter();

  const handleScan = () => {
    if (address) {
      router.push(`/scanner/${address}`);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <input
        type="text"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Paste token address"
        className="flex-grow p-2 border rounded"
      />
      <button onClick={handleScan} className="p-2 bg-blue-500 text-white rounded">
        Scan
      </button>
    </div>
  );
}
