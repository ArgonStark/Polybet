import { RealTimeDataClient } from '@polymarket/real-time-data-client';

export type MarketUpdate = {
  topic: string;
  type: string;
  payload: any;
  timestamp: number;
};

export type MarketUpdateCallback = (update: MarketUpdate) => void;

/**
 * Real-time market data service for Polymarket
 * Subscribes to price changes and market updates
 */
export class PolymarketRealTimeService {
  private client: RealTimeDataClient | null = null;
  private callbacks: Set<MarketUpdateCallback> = new Set();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  /**
   * Initialize and connect to real-time data stream
   */
  connect(): void {
    if (this.client) {
      console.warn('Real-time client already connected');
      return;
    }

    console.log('🔌 Connecting to Polymarket real-time data...');

    this.client = new RealTimeDataClient({
      onMessage: (message: any) => {
        this.handleMessage(message);
      },
      onConnect: () => {
        console.log('✅ Connected to Polymarket real-time data');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.subscribeToMarkets();
      }
    });

    this.client.connect();
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      if (!this.isConnected && this.client) {
        this.client.connect();
      }
    }, delay);
  }

  /**
   * Subscribe to market updates
   */
  private subscribeToMarkets(): void {
    if (!this.client) return;

    console.log('📡 Subscribing to market updates...');

    // Subscribe to price changes for all markets
    this.client.subscribe({
      subscriptions: [
        {
          topic: 'clob_market',
          type: 'price_change',
          filters: '*' // Subscribe to all market price changes
        },
        {
          topic: 'activity',
          type: 'trades',
          filters: '*' // Subscribe to all trades
        },
        {
          topic: 'crypto_prices',
          type: 'update',
          filters: '*' // Subscribe to crypto price updates
        }
      ]
    });

    console.log('✅ Subscribed to market updates');
  }

  /**
   * Subscribe to specific market by condition_id
   */
  subscribeToMarket(conditionId: string): void {
    if (!this.client) {
      console.warn('Client not connected, cannot subscribe to market');
      return;
    }

    this.client.subscribe({
      subscriptions: [
        {
          topic: 'clob_market',
          type: 'price_change',
          filters: JSON.stringify({ condition_id: conditionId })
        }
      ]
    });

    console.log(`📡 Subscribed to market: ${conditionId}`);
  }

  /**
   * Unsubscribe from specific market
   */
  unsubscribeFromMarket(conditionId: string): void {
    if (!this.client) return;

    this.client.unsubscribe({
      subscriptions: [
        {
          topic: 'clob_market',
          type: 'price_change',
          filters: JSON.stringify({ condition_id: conditionId })
        }
      ]
    });

    console.log(`🔕 Unsubscribed from market: ${conditionId}`);
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: any): void {
    try {
      const update: MarketUpdate = {
        topic: message.topic || '',
        type: message.type || '',
        payload: message.payload || message,
        timestamp: Date.now()
      };

      // Notify all callbacks
      this.callbacks.forEach(callback => {
        try {
          callback(update);
        } catch (error) {
          console.error('Error in market update callback:', error);
        }
      });
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  /**
   * Register a callback for market updates
   */
  onUpdate(callback: MarketUpdateCallback): () => void {
    this.callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Disconnect from real-time data
   */
  disconnect(): void {
    if (this.client) {
      console.log('🔌 Disconnecting from real-time data...');
      this.client.disconnect();
      this.client = null;
      this.isConnected = false;
      this.callbacks.clear();
    }
  }

  /**
   * Check if connected
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
let realtimeService: PolymarketRealTimeService | null = null;

/**
 * Get or create the singleton real-time service instance
 */
export function getRealtimeService(): PolymarketRealTimeService {
  if (!realtimeService) {
    realtimeService = new PolymarketRealTimeService();
  }
  return realtimeService;
}
