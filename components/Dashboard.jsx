'use client';

import { useState } from 'react';
import { ethers } from 'ethers';

export default function Dashboard({ address, sessionId, setSessionId }) {
  const [balances, setBalances] = useState(null);
  const [depositAddress, setDepositAddress] = useState(null);
  const [proxyWallet, setProxyWallet] = useState(null);
  const [depositInfo, setDepositInfo] = useState(null);
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
    if (!sessionId) return false;
    
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
        return true; // Success
      }
      return false;
    } catch (error) {
      console.error('[Dashboard] Error fetching proxy wallet:', error);
      return false;
    }
  };

  const fetchDepositAddress = async () => {
    if (!sessionId) return;
    
    try {
      // Ensure proxy wallet exists first
      let hasProxyWallet = !!proxyWallet;
      
      if (!hasProxyWallet) {
        console.log('[Dashboard] Proxy wallet not found, fetching it first...');
        hasProxyWallet = await fetchProxyWallet();
        
        // Wait a moment for session to update
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      if (!hasProxyWallet) {
        alert('Failed to create proxy wallet. Please try again.');
        return;
      }
      
      console.log('[Dashboard] Fetching deposit address...');
      const res = await fetch('/api/deposit-address', {
        headers: { 
          'x-session-id': sessionId,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await res.json();
      console.log('[Dashboard] Deposit address response:', data);
      
      if (data.success) {
        setDepositInfo(data);
        setDepositAddress(data.depositAddress);
      } else {
        console.error('[Dashboard] Deposit address error:', data.error);
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('[Dashboard] Error fetching deposit address:', error);
    }
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
      {/* Proxy Wallet Info */}
      {proxyWallet && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Your Proxy Wallet</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600 mb-1">Proxy Address:</p>
              <p className="font-mono text-sm bg-gray-50 p-3 rounded break-all">{proxyWallet.address}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Owner:</p>
              <p className="font-mono text-xs bg-gray-50 p-2 rounded">{proxyWallet.owner}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Deposit Section */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-2">Fund Your Wallet</h2>
        <p className="text-sm text-gray-600 mb-4">Send USDC to the address below to fund your proxy wallet</p>
        
        <button 
          onClick={fetchDepositAddress} 
          className="mb-4 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
        >
          Get Deposit Address
        </button>
        
        {depositInfo && (
          <div className="space-y-3">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-sm font-medium text-yellow-800">Only send USDC to this address!</p>
              <p className="text-xs text-yellow-700 mt-1">Chain: Polygon (Chain ID: {depositInfo.chainId})</p>
            </div>
            
            <div className="bg-white rounded p-4 border-2 border-purple-300">
              <p className="text-xs text-gray-500 mb-1">Deposit Address:</p>
              <p className="font-mono text-sm break-all font-bold text-purple-900">{depositInfo.depositAddress}</p>
            </div>
            
            <div className="bg-white rounded p-3 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Linked to Proxy:</p>
              <p className="font-mono text-xs break-all">{depositInfo.proxyAddress}</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Balances */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Your Balances</h2>
        <button onClick={fetchBalances} className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Refresh Balances</button>
        {balances ? <pre className="bg-gray-50 p-4 rounded overflow-auto text-xs">{JSON.stringify(balances, null, 2)}</pre> : <p className="text-gray-600">Click to load balances</p>}
      </div>
    </div>
  );
}
