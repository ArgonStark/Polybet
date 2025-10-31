import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    throw error.response?.data || error;
  }
);

export interface ConnectWalletResponse {
  success: boolean;
  session_id: string;
  safe_address: string;
  message: string;
}


export interface OrderRequest {
  session_id: string;
  token_id: string;
  side: 'BUY' | 'SELL';
  price: number;
  size: number;
}

export interface OrderResponse {
  success: boolean;
  order: {
    orderID?: string;
    status?: string;
  };
  message: string;
}

export interface BalanceResponse {
  success: boolean;
  address: string;
  balance: number;
}

/**
 * Connect wallet and create SafeProxy
 */
export async function connectWallet(
  fid: number,
  address: string
): Promise<ConnectWalletResponse> {
  const { data } = await api.post<ConnectWalletResponse>('/connect', {
    fid,
    address,
  });
  return data;
}


// /**
//  * Place an order
//  */
// export async function placeOrder(
//   orderData: OrderRequest
// ): Promise<OrderResponse> {
//   const { data } = await api.post<OrderResponse>('/order', orderData);
//   return data;
// }

// Remove or deprecate the old placeOrder function
// Add new validation function

/**
 * Validate order parameters before user signs
 */
export async function validateOrder(
    tokenId: string,
    price: number,
    size: number
  ): Promise<any> {
    const { data } = await api.post('/order/validate', {
      token_id: tokenId,
      price,
      size
    });
    return data;
  }
  
  /**
   * Get order template (optional helper)
   */
  export async function getOrderTemplate(
    tokenId: string,
    side: 'BUY' | 'SELL',
    price: number,
    size: number
  ): Promise<any> {
    const { data } = await api.post('/order/template', {
      token_id: tokenId,
      side,
      price,
      size
    });
    return data;
  }
  
  // DEPRECATED - Remove this or mark as deprecated
  export async function placeOrder(orderData: OrderRequest): Promise<OrderResponse> {
    throw new Error(
      'Backend order placement deprecated. Use usePolymarketOrders() hook instead.'
    );
  }

/**
 * Cancel an order
 */
export async function cancelOrder(
  sessionId: string,
  orderId?: string
): Promise<any> {
  const { data } = await api.post('/cancel', {
    session_id: sessionId,
    order_id: orderId,
  });
  return data;
}

/**
 * Get open orders
 */
export async function getOrders(sessionId: string): Promise<any> {
  const { data } = await api.get('/orders', {
    headers: {
      session_id: sessionId,
    },
  });
  return data;
}

/**
 * Get USDC balance
 */
export async function getBalance(sessionId: string): Promise<BalanceResponse> {
  const { data } = await api.get<BalanceResponse>('/balance', {
    headers: {
      session_id: sessionId,
    },
  });
  return data;
}

/**
 * Health check
 */
export async function healthCheck(): Promise<any> {
  const { data } = await api.get('/');
  return data;
}

/**
 * Get available markets
 */
export async function getMarkets(): Promise<any> {
  const { data } = await api.get('/markets');
  return data;
}

/**
 * Get market details by token ID
 */
export async function getMarketDetails(tokenId: string): Promise<any> {
  const { data } = await api.get(`/markets/${tokenId}`);
  return data;
}

/**
 * Get next refresh time for markets
 */
export async function getNextRefreshTime(): Promise<any> {
  const { data } = await api.get('/markets/next-refresh');
  return data;
}

export default api;