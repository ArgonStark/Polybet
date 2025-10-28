'use client';

import { useState } from 'react';
import WalletConnect from '@/components/WalletConnect';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const [address, setAddress] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  const handleConnect = (addr) => {
    setAddress(addr);
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Polymarket Farcaster MiniApp</h1>
        
        <div className="space-y-6">
          <WalletConnect onConnect={handleConnect} />
          
          {address && (
            <Dashboard address={address} sessionId={sessionId} setSessionId={setSessionId} />
          )}
        </div>
      </div>
    </main>
  );
}

