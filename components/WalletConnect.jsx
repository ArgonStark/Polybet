'use client';

import { useState, useEffect } from 'react';

export default function WalletConnect({ onConnect }) {
  const [address, setAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          setIsConnected(true);
          if (onConnect) onConnect(accounts[0]);
        }
      } catch (err) {
        console.error('Error:', err);
      }
    }
  };

  const connectWallet = async (provider) => {
    try {
      setError(null);
      let ethereum;
      if (provider === 'rabby') {
        ethereum = window.rabby?.ethereum || window.ethereum;
      } else if (provider === 'metamask') {
        ethereum = window.ethereum;
      } else if (provider === 'farcaster') {
        ethereum = window.farcaster;
      }
      if (!ethereum) throw new Error('Wallet not found');
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      setAddress(accounts[0]);
      setIsConnected(true);
      if (onConnect) onConnect(accounts[0]);
    } catch (err) {
      setError(err.message);
    }
  };

  if (isConnected) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-green-800 font-medium">Connected</p>
            <p className="text-xs text-green-600 font-mono">{address}</p>
          </div>
          <button onClick={() => {setIsConnected(false); setAddress(null);}} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Disconnect</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Connect Wallet</h2>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">{error}</div>}
      <div className="space-y-3">
        <button onClick={() => connectWallet('rabby')} className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium">Connect Rabby</button>
        <button onClick={() => connectWallet('metamask')} className="w-full px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium">Connect MetaMask</button>
        <button onClick={() => connectWallet('farcaster')} className="w-full px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-medium">Connect Farcaster Wallet</button>
      </div>
      <p className="text-gray-600 text-center mt-4">Choose your wallet to get started</p>
    </div>
  );
}
