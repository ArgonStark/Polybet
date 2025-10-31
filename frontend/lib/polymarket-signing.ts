'use client';

/**
 * Polymarket Order Signing - Client Side
 * Users sign orders with their own wallets
 */
import { useAccount, useWalletClient } from 'wagmi';
import { useState } from 'react';
import axios from 'axios';

const CLOB_URL = 'https://clob.polymarket.com';
const POLYGON_CHAIN_ID = 137;

export interface OrderData {
  token_id: string;
  side: 'BUY' | 'SELL';
  price: number;
  size: number;
}

export interface SignedOrder {
  orderID?: string;
  status?: string;
  error?: string;
}

export function usePolymarketOrders() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [isPlacing, setIsPlacing] = useState(false);

  /**
   * Place an order - User signs with their wallet
   */
  const placeOrder = async (orderData: OrderData): Promise<SignedOrder> => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsPlacing(true);

    try {
      console.log('🔐 User signing order with their wallet...');
      console.log('   Token:', orderData.token_id);
      console.log('   Side:', orderData.side);
      console.log('   Price:', orderData.price);
      console.log('   Size:', orderData.size);

      // Create order payload
      const orderPayload = {
        maker: address.toLowerCase(),
        taker: '0x0000000000000000000000000000000000000000',
        tokenId: orderData.token_id,
        makerAmount: orderData.side === 'BUY' 
          ? Math.floor(orderData.size * 1e6).toString() // USDC has 6 decimals
          : Math.floor(orderData.size / orderData.price * 1e6).toString(),
        takerAmount: orderData.side === 'BUY'
          ? Math.floor(orderData.size / orderData.price * 1e6).toString()
          : Math.floor(orderData.size * 1e6).toString(),
        side: orderData.side === 'BUY' ? 0 : 1,
        feeRateBps: '0',
        nonce: Date.now().toString(),
        signer: address.toLowerCase(),
        expiration: Math.floor(Date.now() / 1000) + 86400, // 24 hours
        signatureType: 0 // EOA signature
      };

      // Create EIP-712 typed data for signing
      const domain = {
        name: 'Polymarket CTF Exchange',
        version: '1',
        chainId: POLYGON_CHAIN_ID,
        verifyingContract: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E' as `0x${string}`
      };

      const types = {
        Order: [
          { name: 'maker', type: 'address' },
          { name: 'taker', type: 'address' },
          { name: 'tokenId', type: 'uint256' },
          { name: 'makerAmount', type: 'uint256' },
          { name: 'takerAmount', type: 'uint256' },
          { name: 'side', type: 'uint8' },
          { name: 'feeRateBps', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'signer', type: 'address' },
          { name: 'expiration', type: 'uint256' },
          { name: 'signatureType', type: 'uint8' }
        ]
      };

      // Request signature from user's wallet
      console.log('📝 Requesting signature from wallet...');
      
      const signature = await walletClient.signTypedData({
        domain,
        types,
        primaryType: 'Order',
        message: orderPayload as any
      });

      console.log('✅ Order signed by user!');

      // Submit signed order to Polymarket CLOB
      const response = await axios.post(`${CLOB_URL}/order`, {
        ...orderPayload,
        signature
      });

      console.log('✅ Order submitted to Polymarket');
      console.log('   Order ID:', response.data.orderID);

      return response.data;

    } catch (error: any) {
      console.error('❌ Order failed:', error);
      
      // Handle user rejection
      if (error.message?.includes('User rejected')) {
        throw new Error('Signature rejected by user');
      }
      
      throw new Error(error.response?.data?.message || error.message || 'Order failed');
    } finally {
      setIsPlacing(false);
    }
  };

  /**
   * Get user's open orders
   */
  const getMyOrders = async () => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    try {
      const response = await axios.get(`${CLOB_URL}/orders`, {
        params: { maker: address.toLowerCase() }
      });

      return response.data;
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  };

  /**
   * Cancel an order
   */
  const cancelOrder = async (orderId: string) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    try {
      // Create cancellation message
      const message = `Cancel order ${orderId}`;
      
      // Sign cancellation
      const signature = await walletClient.signMessage({ 
        message: message as `0x${string}` 
      });

      // Submit cancellation
      const response = await axios.delete(`${CLOB_URL}/order`, {
        data: { orderId, signature }
      });

      return response.data;
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  };

  return {
    placeOrder,
    getMyOrders,
    cancelOrder,
    isPlacing
  };
}