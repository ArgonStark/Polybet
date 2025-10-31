'use client';

interface Prediction {
  id: string;
  crypto: string;
  direction: 'UP' | 'DOWN';
  amount: number;
  price: number;
  timestamp: string;
  status: 'active' | 'won' | 'lost';
}

interface ActivePredictionsProps {
  predictions: Prediction[];
  onCancel?: (id: string) => void;
}

export function ActivePredictions({ predictions, onCancel }: ActivePredictionsProps) {
  if (predictions.length === 0) {
    return (
      <div className="bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl rounded-3xl p-8 border border-white/20 text-center">
        <div className="text-6xl mb-4">🎯</div>
        <h3 className="text-xl font-bold text-white mb-2">No Active Predictions</h3>
        <p className="text-purple-300">Make your first prediction above!</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl">
      <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <span>📊</span>
        Your Predictions
      </h3>
      <div className="space-y-3">
        {predictions.map((prediction) => (
          <div
            key={prediction.id}
            className="bg-black/40 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`text-2xl px-3 py-2 rounded-lg ${
                  prediction.direction === 'UP'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {prediction.direction === 'UP' ? '📈' : '📉'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white">{prediction.crypto}</span>
                    <span className={`text-sm font-semibold ${
                      prediction.direction === 'UP' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {prediction.direction}
                    </span>
                  </div>
                  <div className="text-sm text-purple-300">
                    ${prediction.amount} at ${prediction.price.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  prediction.status === 'active'
                    ? 'bg-blue-500/20 text-blue-400'
                    : prediction.status === 'won'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {prediction.status.toUpperCase()}
                </div>
                {onCancel && prediction.status === 'active' && (
                  <button
                    onClick={() => onCancel(prediction.id)}
                    className="text-xs text-red-400 hover:text-red-300 mt-2 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
