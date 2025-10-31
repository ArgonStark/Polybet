'use client';

import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useAppStore } from '@/lib/store';
import { connectWallet, getBalance, placeOrder } from '@/lib/api';
import { CountdownTimer } from '@/components/CountdownTimer';
import { CryptoCard, CryptoCurrency } from '@/components/CryptoCard';
import { ActivePredictions } from '@/components/ActivePredictions';

// Mock crypto data - In production, this would come from an API
const CRYPTOCURRENCIES: CryptoCurrency[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    icon: '₿',
    price: 67420,
    change24h: 2.34,
    tokenId: 'btc-token-id',
    color: '#F7931A'
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    icon: 'Ξ',
    price: 3245,
    change24h: -1.23,
    tokenId: 'eth-token-id',
    color: '#627EEA'
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    icon: '◎',
    price: 142,
    change24h: 5.67,
    tokenId: 'sol-token-id',
    color: '#14F195'
  },
  {
    symbol: 'XRP',
    name: 'Ripple',
    icon: '✕',
    price: 0.54,
    change24h: -0.89,
    tokenId: 'xrp-token-id',
    color: '#23292F'
  }
];

export default function Home() {
  const [isSDKReady, setIsSDKReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [showWalletSetup, setShowWalletSetup] = useState(false);

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
        await sdk.actions.ready();
        setIsSDKReady(true);

        const context = await sdk.context;

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
      const effectiveFid = fid || 999999;
      if (effectiveFid) {
        handleConnect();
      }
    }
  }, [isConnected, address, sessionId]);

  // Update balance when connected
  useEffect(() => {
    if (sessionId) {
      updateBalance();
      const interval = setInterval(updateBalance, 30000); // Update every 30s
      return () => clearInterval(interval);
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

      const effectiveFid = fid || 999999;
      console.log('   FID:', effectiveFid, fid ? '(real)' : '(test mode)');
      console.log('   Address:', address);

      const response = await connectWallet(effectiveFid, address);

      setSessionId(response.session_id);
      setSafeAddress(response.safe_address);

      console.log('✅ Connected successfully');
      console.log('   SafeProxy:', response.safe_address);

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

  const handlePredict = async (symbol: string, direction: 'UP' | 'DOWN', amount: number) => {
    if (!sessionId) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      console.log(`🎯 Making prediction: ${symbol} ${direction} with $${amount}`);

      // In a real implementation, you would:
      // 1. Get the correct token_id for the crypto symbol
      // 2. Calculate the correct price based on direction
      // 3. Place the order through the backend

      // For now, add to predictions list
      const newPrediction = {
        id: `pred_${Date.now()}`,
        crypto: symbol,
        direction,
        amount,
        price: CRYPTOCURRENCIES.find(c => c.symbol === symbol)?.price || 0,
        timestamp: new Date().toISOString(),
        status: 'active' as const
      };

      setPredictions(prev => [newPrediction, ...prev]);

      alert(`✅ Prediction placed: ${symbol} ${direction} with $${amount}`);

      // Update balance
      await updateBalance();
    } catch (error: any) {
      console.error('Prediction failed:', error);
      alert(`Failed to place prediction: ${error.message}`);
    }
  };

  const handleCancelPrediction = async (id: string) => {
    try {
      // In production, call the cancel order API
      setPredictions(prev => prev.filter(p => p.id !== id));
      alert('Prediction cancelled');
    } catch (error) {
      console.error('Cancel failed:', error);
    }
  };

  // Show wallet setup if not connected
  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-6xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent mb-3">
              🎯 CryptoPredict
            </h1>
            <p className="text-purple-200 text-xl font-medium mb-2">
              Predict Crypto Prices Every 15 Minutes
            </p>
            <p className="text-purple-300/70 text-sm">
              BTC • ETH • SOL • XRP
            </p>
          </div>

          {/* SDK Status */}
          {!isSDKReady && (
            <div className="bg-yellow-500/20 border border-yellow-400 text-yellow-200 px-4 py-3 rounded-xl mb-6 text-center">
              ⏳ Initializing Farcaster SDK...
            </div>
          )}

          {/* Local Testing Notice */}
          {isSDKReady && !fid && (
            <div className="bg-blue-500/20 border border-blue-400 text-blue-200 px-4 py-3 rounded-xl mb-6 text-center text-sm">
              ℹ️ Running in test mode - Farcaster FID not detected
            </div>
          )}

          {/* Connection Card */}
          <div className="bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl mb-8">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">👛</div>
              <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
              <p className="text-purple-300">Get started with crypto predictions</p>
            </div>

            {!isConnected ? (
              <button
                onClick={handleConnectWallet}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-purple-500/50"
              >
                {loading ? '🔄 Connecting...' : '🚀 Connect Wallet'}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="bg-black/40 rounded-xl p-4 border border-white/10">
                  <div className="text-sm text-purple-300 mb-1">Connected Address</div>
                  <div className="text-white font-mono text-lg">
                    {address?.slice(0, 10)}...{address?.slice(-8)}
                  </div>
                </div>
                <button
                  onClick={handleConnect}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-purple-500/50"
                >
                  {loading ? '⏳ Setting up SafeProxy...' : '✨ Create Trading Account'}
                </button>
              </div>
            )}
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-4 text-center">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <div className="text-4xl mb-3">⚡</div>
              <div className="text-white font-semibold mb-1">15-Min Markets</div>
              <div className="text-purple-300 text-sm">Fast-paced predictions</div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <div className="text-4xl mb-3">🔒</div>
              <div className="text-white font-semibold mb-1">Secure Trading</div>
              <div className="text-purple-300 text-sm">SafeProxy wallets</div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <div className="text-4xl mb-3">💰</div>
              <div className="text-white font-semibold mb-1">Real Money</div>
              <div className="text-purple-300 text-sm">USDC payouts</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main App Interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 pb-12">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
              🎯 CryptoPredict
            </h1>
            <p className="text-purple-300 text-sm mt-1">15-Minute Crypto Predictions</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Balance */}
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-xl rounded-2xl px-6 py-3 border border-green-400/30">
              <div className="text-xs text-green-300 mb-1">Balance</div>
              <div className="text-2xl font-bold text-white">${balance.toFixed(2)}</div>
            </div>
            {/* Wallet */}
            <button
              onClick={() => setShowWalletSetup(true)}
              className="bg-white/10 backdrop-blur-xl rounded-2xl px-4 py-3 border border-white/20 hover:bg-white/20 transition-all"
            >
              <div className="text-xs text-purple-300 mb-1">Wallet</div>
              <div className="text-sm font-mono text-white">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
            </button>
          </div>
        </div>

        {/* Countdown Timer */}
        <div className="mb-8">
          <CountdownTimer />
        </div>

        {/* Deposit Notice if balance is 0 */}
        {balance === 0 && (
          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-400/50 rounded-2xl p-6 mb-8 backdrop-blur-lg">
            <div className="flex items-start gap-4">
              <div className="text-4xl">💰</div>
              <div className="flex-1">
                <h3 className="text-yellow-100 font-bold text-xl mb-2">
                  Deposit USDC to Start Predicting
                </h3>
                <p className="text-yellow-200 mb-3">
                  Transfer USDC to your SafeProxy wallet:
                </p>
                <div className="bg-black/40 p-4 rounded-xl font-mono text-sm text-white break-all border border-yellow-400/30">
                  {safeAddress}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(safeAddress || '')}
                  className="mt-3 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  📋 Copy Address
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Crypto Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {CRYPTOCURRENCIES.map((crypto) => (
            <CryptoCard
              key={crypto.symbol}
              crypto={crypto}
              onPredict={handlePredict}
              isConnected={!!sessionId}
              balance={balance}
            />
          ))}
        </div>

        {/* Active Predictions */}
        <ActivePredictions
          predictions={predictions}
          onCancel={handleCancelPrediction}
        />

        {/* Footer */}
        <div className="text-center text-purple-300/60 text-sm mt-12">
          <p>Powered by Polymarket • Polygon Network • Farcaster</p>
        </div>
      </div>

      {/* Wallet Details Modal */}
      {showWalletSetup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowWalletSetup(false)}>
          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-3xl p-8 max-w-md w-full border border-white/20" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-white mb-6">Wallet Details</h3>

            <div className="space-y-4 mb-6">
              <div className="bg-black/40 rounded-xl p-4 border border-white/10">
                <div className="text-sm text-purple-300 mb-2">Connected Address</div>
                <div className="text-white font-mono text-sm break-all">{address}</div>
              </div>

              <div className="bg-black/40 rounded-xl p-4 border border-white/10">
                <div className="text-sm text-purple-300 mb-2">SafeProxy Address</div>
                <div className="text-white font-mono text-sm break-all">{safeAddress}</div>
                <button
                  onClick={() => navigator.clipboard.writeText(safeAddress || '')}
                  className="mt-2 text-xs text-purple-400 hover:text-purple-300"
                >
                  📋 Copy Address
                </button>
              </div>

              <div className="bg-black/40 rounded-xl p-4 border border-white/10">
                <div className="text-sm text-purple-300 mb-2">Farcaster ID</div>
                <div className="text-white font-semibold">{fid || 'Test Mode (999999)'}</div>
              </div>

              <div className="bg-black/40 rounded-xl p-4 border border-white/10">
                <div className="text-sm text-purple-300 mb-2">Balance</div>
                <div className="text-white font-bold text-2xl">${balance.toFixed(2)}</div>
              </div>
            </div>

            <button
              onClick={() => disconnect()}
              className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 px-6 py-3 rounded-xl font-semibold transition-colors mb-3"
            >
              Disconnect Wallet
            </button>

            <button
              onClick={() => setShowWalletSetup(false)}
              className="w-full bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
