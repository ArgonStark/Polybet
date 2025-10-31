'use client';

import { useState } from 'react';

export interface CryptoCurrency {
  symbol: string;
  name: string;
  icon: string;
  price: number;
  change24h: number;
  tokenId: string;
  color: string;
}

interface CryptoCardProps {
  crypto: CryptoCurrency;
  onPredict: (symbol: string, direction: 'UP' | 'DOWN', amount: number) => void;
  isConnected: boolean;
  balance: number;
}

export function CryptoCard({ crypto, onPredict, isConnected, balance }: CryptoCardProps) {
  const [selectedDirection, setSelectedDirection] = useState<'UP' | 'DOWN' | null>(null);
  const [amount, setAmount] = useState<string>('10');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePredict = async () => {
    if (!selectedDirection) return;

    const betAmount = parseFloat(amount);
    if (isNaN(betAmount) || betAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (betAmount > balance) {
      alert('Insufficient balance');
      return;
    }

    setIsSubmitting(true);
    try {
      await onPredict(crypto.symbol, selectedDirection, betAmount);
      setSelectedDirection(null);
      setAmount('10');
    } catch (error) {
      console.error('Prediction failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPositive = crypto.change24h >= 0;

  return (
    <div
      className="bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-[1.02]"
      style={{
        boxShadow: `0 0 40px ${crypto.color}20`
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="text-4xl w-14 h-14 flex items-center justify-center rounded-2xl"
            style={{
              background: `linear-gradient(135deg, ${crypto.color}20, ${crypto.color}10)`,
              border: `2px solid ${crypto.color}40`
            }}
          >
            {crypto.icon}
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">{crypto.symbol}</h3>
            <p className="text-sm text-purple-300">{crypto.name}</p>
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="mb-6">
        <div className="text-3xl font-bold text-white mb-2">
          ${crypto.price.toLocaleString()}
        </div>
        <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
          isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          <span>{isPositive ? '↗' : '↘'}</span>
          <span>{isPositive ? '+' : ''}{crypto.change24h.toFixed(2)}%</span>
        </div>
      </div>

      {/* Prediction Buttons */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setSelectedDirection('UP')}
            disabled={!isConnected || isSubmitting}
            className={`py-4 rounded-xl font-bold text-lg transition-all transform ${
              selectedDirection === 'UP'
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white scale-105 shadow-lg shadow-green-500/50'
                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className="text-2xl block mb-1">📈</span>
            UP
          </button>
          <button
            onClick={() => setSelectedDirection('DOWN')}
            disabled={!isConnected || isSubmitting}
            className={`py-4 rounded-xl font-bold text-lg transition-all transform ${
              selectedDirection === 'DOWN'
                ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white scale-105 shadow-lg shadow-red-500/50'
                : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className="text-2xl block mb-1">📉</span>
            DOWN
          </button>
        </div>

        {/* Amount Input */}
        {selectedDirection && (
          <div className="space-y-3 animate-fadeIn">
            <div className="bg-black/40 rounded-xl p-4 border border-white/10">
              <label className="text-sm text-purple-300 mb-2 block">Bet Amount (USDC)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent text-white text-xl font-bold outline-none"
                placeholder="0.00"
                min="0"
                step="0.1"
              />
              <div className="flex gap-2 mt-3">
                {[5, 10, 25, 50].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setAmount(preset.toString())}
                    className="flex-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 py-2 rounded-lg text-sm font-semibold transition-colors"
                  >
                    ${preset}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handlePredict}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-purple-500/50"
            >
              {isSubmitting ? '⏳ Placing Prediction...' : `🎯 Predict ${selectedDirection}`}
            </button>
          </div>
        )}

        {!isConnected && (
          <div className="text-center text-sm text-purple-300 py-2">
            Connect wallet to predict
          </div>
        )}
      </div>
    </div>
  );
}
