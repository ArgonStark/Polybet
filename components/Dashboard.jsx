'use client';

import { useState } from 'react';
import { ethers } from 'ethers';

export default function Dashboard({ address, sessionId, setSessionId }) {
  const [balances, setBalances] = useState(null);
  const [depositAddress, setDepositAddress] = useState(null);
  const [proxyWallet, setProxyWallet] = useState(null);
  const [loading, setLoading] = useState(false);

  const authenticate = async () => {
    try {
      if (!window.ethereum) return;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const message = 'Authenticate with Polymarket';
      const signature = await signer.signMessage(message);
      
      console.log('[Dashboard] Authenticating with:', { address, signature, message });
      
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature, message })
      });
      
      console.log('[Dashboard] Login response status:', res.status);
      const data = await res.json();
      console.log('[Dashboard] Login response data:', data);
      
      if (data.success) {
        setSessionId(data.sessionId);
        console.log('[Dashboard] Session ID set:', data.sessionId);
        // Auto-fetch proxy wallet after successful login
        await fetchProxyWallet();
      } else {
        console.error('[Dashboard] Login failed:', data.error);
      }
    } catch (error) {
      console.error('[Dashboard] Authentication error:', error);
    }
  };

  const fetchBalances = async () => {
    if (!sessionId) return;
    const res = await fetch('/api/balances', {
      headers: { 'x-session-id': sessionId }
    });
    const data = await res.json();
    if (data.success) setBalances(data.balances);
  };

  const fetchProxyWallet = async () => {
    if (!sessionId) return;
    
    try {
      console.log('[Dashboard] Fetching proxy wallet...');
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 
          'x-session-id': sessionId,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await res.json();
      console.log('[Dashboard] Proxy wallet response:', data);
      
      if (data.success && data.proxyWallet) {
        setProxyWallet(data.proxyWallet);
        setDepositAddress(data.proxyWallet.address);
      }
    } catch (error) {
      console.error('[Dashboard] Error fetching proxy wallet:', error);
    }
  };

  const getDepositAddress = async () => {
    if (!sessionId) {
      console.log('[Dashboard] No sessionId available');
      return;
    }
    console.log('[Dashboard] Getting deposit address with sessionId:', sessionId);
    console.log('[Dashboard] SessionId type:', typeof sessionId);
    const res = await fetch('/api/deposit', {
      headers: { 
        'x-session-id': sessionId,
        'Content-Type': 'application/json'
      }
    });
    console.log('[Dashboard] Deposit response status:', res.status);
    const data = await res.json();
    console.log('[Dashboard] Deposit response data:', data);
    if (data.success) setDepositAddress(data.depositAddress);
  };

  if (!sessionId && address) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Authenticate</h2>
        <button onClick={authenticate} className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600">Sign In with Polymarket</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Your Balances</h2>
        <button onClick={fetchBalances} className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Refresh Balances</button>
        {balances ? <pre className="bg-gray-50 p-4 rounded overflow-auto">{JSON.stringify(balances, null, 2)}</pre> : <p className="text-gray-600">Click to load balances</p>}
      </div>
      
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Polymarket Proxy Wallet</h2>
        <button onClick={fetchProxyWallet} className="mb-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">Fetch Proxy Wallet</button>
        {proxyWallet && (
          <div className="space-y-2">
            <div>
              <p className="text-sm text-gray-600">Address:</p>
              <p className="font-mono text-sm bg-gray-50 p-3 rounded break-all">{proxyWallet.address}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Owner:</p>
              <p className="font-mono text-xs bg-gray-50 p-2 rounded">{proxyWallet.owner}</p>
            </div>
            {proxyWallet.salt && (
              <div>
                <p className="text-sm text-gray-600">Salt:</p>
                <p className="font-mono text-xs bg-gray-50 p-2 rounded break-all">{proxyWallet.salt}</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Legacy Deposit Address</h2>
        <button onClick={getDepositAddress} className="mb-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">Get Deposit Address</button>
        {depositAddress && <p className="font-mono text-sm bg-gray-50 p-4 rounded">{depositAddress}</p>}
      </div>
    </div>
  );
}
