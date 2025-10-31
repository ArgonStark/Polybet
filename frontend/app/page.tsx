'use client';

import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useAppStore } from '@/lib/store';
import { connectWallet, getBalance } from '@/lib/api';


export default function Home() {
  const [isSDKReady, setIsSDKReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const { 
    sessionId, 
    safeAddress, 
    fid,
    setSessionId, 
    setSafeAddress,
    setFid 
  } = useAppStore();
  // Initialize Farcaster SDK
  useEffect(() => {
    const initSDK = async () => {
      try {
        // Wait for SDK to be ready
        await sdk.actions.ready();
        setIsSDKReady(true);
        
        // Get user context from Farcaster - MUST AWAIT
        const context = await sdk.context;
        
        // Check if user data exists
        if (context?.user?.fid) {
          setFid(context.user.fid);
          console.log('✅ Farcaster SDK ready, FID:', context.user.fid);
        } else {
          console.log('⚠️  No Farcaster user context available (testing locally?)');
        }
      } catch (error) {
        console.error('Failed to initialize Farcaster SDK:', error);
        console.log('ℹ️  Running without Farcaster context (OK for local testing)');
      }
    };

    initSDK();
  }, [setFid]);

  // Auto-connect when wallet connects
  useEffect(() => {
    if (isConnected && address && !sessionId) {
      // Use FID if available, otherwise use a test FID for local development
      const effectiveFid = fid || 999999; // Fallback FID for local testing
      if (effectiveFid) {
        handleConnect();
      }
    }
  }, [isConnected, address, sessionId]);

  // Update balance when connected
  useEffect(() => {
    if (sessionId) {
      updateBalance();
    }
  }, [sessionId]);

  const handleConnectWallet = async () => {
    try {
      setLoading(true);
      await connect({ connector: injected() });
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!address) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Connecting to backend...');
      
      // Use FID if available, otherwise use test FID
      const effectiveFid = fid || 999999;
      console.log('   FID:', effectiveFid, fid ? '(real)' : '(test mode)');
      console.log('   Address:', address);

      const response = await connectWallet(effectiveFid, address);
      
      setSessionId(response.session_id);
      setSafeAddress(response.safe_address);
      
      console.log('✅ Connected successfully');
      console.log('   SafeProxy:', response.safe_address);
      
      alert(`Connected! Your SafeProxy wallet: ${response.safe_address.slice(0, 10)}...`);
      
      // Load balance
      await updateBalance();
    } catch (error: any) {
      console.error('Connection failed:', error);
      alert(`Connection failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };


  const updateBalance = async () => {
    if (!sessionId) return;
    
    try {
      const data = await getBalance(sessionId);
      setBalance(data.balance || 0);
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-block mb-4">
            <h1 className="text-6xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent mb-3 animate-pulse">
              🎲 Polymarket
            </h1>
            <div className="h-1 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"></div>
          </div>
          <p className="text-purple-200 text-lg font-medium">
            Farcaster Polymarket Integration
          </p>
          <p className="text-purple-300/70 text-sm mt-2">
            Secure wallet connection • Polygon Network
          </p>
        </div>

        {/* SDK Status */}
        {!isSDKReady && (
          <div className="bg-yellow-500 text-yellow-900 px-4 py-3 rounded-lg mb-6 text-center">
            ⏳ Initializing Farcaster SDK...
          </div>
        )}

        {/* Local Testing Notice */}
        {isSDKReady && !fid && (
          <div className="bg-blue-500/20 border border-blue-400 text-blue-200 px-4 py-3 rounded-lg mb-6 text-center text-sm">
            ℹ️ Running in test mode - Farcaster FID not detected (this is OK for local testing)
          </div>
        )}

        {/* Connection Status */}
        <div className="bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl rounded-3xl p-6 mb-8 border border-white/20 shadow-2xl shadow-purple-500/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Wallet Connection */}
            <div className="flex-1">
              <div className="text-sm text-purple-200 mb-1">Wallet Status</div>
              {isConnected ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-white font-mono text-sm">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                  <button
                    onClick={() => disconnect()}
                    className="text-xs text-purple-300 hover:text-white ml-2"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnectWallet}
                  disabled={loading}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {loading ? 'Connecting...' : 'Connect Wallet'}
                </button>
              )}
            </div>

            {/* Farcaster FID */}
            <div className="flex-1">
              <div className="text-sm text-purple-200 mb-1">Farcaster ID</div>
              <div className="text-white font-semibold">
                {fid ? `FID: ${fid}` : 'Test Mode (999999)'}
              </div>
            </div>

            {/* SafeProxy */}
            {safeAddress && (
              <div className="flex-1">
                <div className="text-sm text-purple-200 mb-1">SafeProxy</div>
                <div className="text-white font-mono text-sm">
                  {safeAddress.slice(0, 6)}...{safeAddress.slice(-4)}
                </div>
              </div>
            )}

            {/* Balance */}
            {sessionId && (
              <div className="flex-1">
                <div className="text-sm text-purple-200 mb-1">USDC Balance</div>
                <div className="text-white font-bold text-lg">
                  ${balance.toFixed(2)}
                </div>
              </div>
            )}

          </div>

          {/* Connect Button */}
          {isConnected && !sessionId && (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="w-full mt-4 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-8 py-3 rounded-lg font-bold text-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? '🔄 Connecting...' : '🚀 Connect to Polymarket'}
            </button>
          )}
        </div>

        {/* Deposit Info */}
        {sessionId && balance === 0 && (
          <div className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border-2 border-blue-400/50 rounded-2xl p-6 mb-8 backdrop-blur-lg shadow-lg">
            <div className="flex items-start gap-4">
              <div className="text-4xl animate-bounce">💰</div>
              <div className="flex-1">
                <h3 className="text-blue-100 font-bold text-xl mb-2">
                  Deposit USDC
                </h3>
                <p className="text-blue-200 mb-4">
                  Transfer USDC to your SafeProxy wallet:
                </p>
                <div className="bg-black/40 p-4 rounded-xl font-mono text-sm text-white break-all border border-blue-400/30 hover:border-blue-400/50 transition-colors">
                  {safeAddress}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(safeAddress || '')}
                  className="mt-3 text-blue-300 hover:text-blue-100 text-sm font-semibold transition-colors"
                >
                  📋 Copy Address
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Footer */}
        <div className="text-center text-purple-300/80 text-sm mt-16 pb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-lg">❤️</span>
            <p className="font-semibold">Built for the Farcaster Community</p>
          </div>
          <p className="text-xs text-purple-400/60">
            Powered by Polymarket CLOB • Polygon Network
          </p>
        </div>
      </div>
    </div>
  );
}