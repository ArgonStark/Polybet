import { useEffect, useState, useCallback } from 'react';
import { fetchCrypto15MinMarkets, MarketData, fetchMarketByConditionId } from '../polymarket-markets';
import { getRealtimeService, MarketUpdate } from '../polymarket-realtime';

export interface CryptoMarket extends MarketData {
  upPrice: number;
  downPrice: number;
  volume?: number;
  lastUpdate?: number;
}

/**
 * Hook to fetch and monitor crypto 15-minute markets
 */
export function usePolymarketMarkets() {
  const [markets, setMarkets] = useState<CryptoMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  // Fetch markets
  const fetchMarkets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const cryptoMarkets = await fetchCrypto15MinMarkets();

      // Transform to CryptoMarket format
      const formattedMarkets: CryptoMarket[] = cryptoMarkets.map(market => ({
        ...market,
        upPrice: market.tokens.find(t => t.outcome.toLowerCase().includes('up') || t.outcome.toLowerCase().includes('yes'))?.price || 0.5,
        downPrice: market.tokens.find(t => t.outcome.toLowerCase().includes('down') || t.outcome.toLowerCase().includes('no'))?.price || 0.5,
        lastUpdate: Date.now(),
      }));

      setMarkets(formattedMarkets);
      setLastUpdate(Date.now());
    } catch (err: any) {
      console.error('Error fetching markets:', err);
      setError(err.message || 'Failed to fetch markets');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  // Set up real-time updates
  useEffect(() => {
    const realtimeService = getRealtimeService();

    // Connect to real-time data
    if (!realtimeService.getConnectionStatus()) {
      realtimeService.connect();
    }

    // Subscribe to updates
    const unsubscribe = realtimeService.onUpdate((update: MarketUpdate) => {
      // Handle price change updates
      if (update.topic === 'clob_market' && update.type === 'price_change') {
        handlePriceUpdate(update.payload);
      }

      // Handle trade updates
      if (update.topic === 'activity' && update.type === 'trades') {
        handleTradeUpdate(update.payload);
      }
    });

    // Refresh markets every 15 minutes
    const refreshInterval = setInterval(() => {
      fetchMarkets();
    }, 15 * 60 * 1000); // 15 minutes

    return () => {
      unsubscribe();
      clearInterval(refreshInterval);
      // Note: Don't disconnect the service here as other components might be using it
    };
  }, [fetchMarkets]);

  // Handle price updates from real-time feed
  const handlePriceUpdate = useCallback((payload: any) => {
    setMarkets(prevMarkets => {
      return prevMarkets.map(market => {
        // Find if this update is for this market
        const isForThisMarket = payload.condition_id === market.slug ||
                                payload.market_slug === market.slug;

        if (!isForThisMarket) return market;

        // Update prices
        const updatedMarket = { ...market };

        if (payload.tokens && Array.isArray(payload.tokens)) {
          payload.tokens.forEach((token: any) => {
            if (token.outcome.toLowerCase().includes('up') || token.outcome.toLowerCase().includes('yes')) {
              updatedMarket.upPrice = token.price;
            } else if (token.outcome.toLowerCase().includes('down') || token.outcome.toLowerCase().includes('no')) {
              updatedMarket.downPrice = token.price;
            }
          });
        }

        updatedMarket.lastUpdate = Date.now();
        return updatedMarket;
      });
    });

    setLastUpdate(Date.now());
  }, []);

  // Handle trade updates
  const handleTradeUpdate = useCallback((payload: any) => {
    // Update volume or other trade-related data if needed
    console.log('Trade update:', payload);
  }, []);

  return {
    markets,
    loading,
    error,
    lastUpdate,
    refresh: fetchMarkets,
  };
}

/**
 * Hook to monitor a specific crypto market
 */
export function useCryptoMarket(crypto: 'BTC' | 'ETH' | 'SOL' | 'XRP') {
  const { markets, loading, error, lastUpdate, refresh } = usePolymarketMarkets();

  const market = markets.find(m => m.crypto === crypto);

  return {
    market,
    loading,
    error,
    lastUpdate,
    refresh,
  };
}
