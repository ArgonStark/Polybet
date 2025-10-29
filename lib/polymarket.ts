import { ClobClient } from '@polymarket/clob-client'
import axios from 'axios'
import { ethers } from 'ethers'

const POLYMARKET_API_URL = process.env.NEXT_PUBLIC_POLYMARKET_API_URL || 'https://clob.polymarket.com'
const RELAYER_API_URL = process.env.NEXT_PUBLIC_RELAYER_API_URL || 'https://clob.polymarket.com'

export interface Balance {
  token: string
  amount: string
}

export interface Market {
  id: string
  question: string
  outcomeTokens: string[]
  marketMaker: string
}

export class PolymarketClient {
  private client: ClobClient
  private apiKey: string
  private apiSecret: string
  private signer: ethers.Wallet | null = null

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey
    this.apiSecret = apiSecret
    
    // Initialize signer if we have a relayer key
    if (apiSecret && ethers.isHexString(apiSecret, 32)) {
      try {
        this.signer = new ethers.Wallet(apiSecret)
      } catch (e) {
        console.warn('Could not initialize wallet from relayer key:', e)
      }
    }

    this.client = new ClobClient({
      chainId: 8453, // Base
      apiUrl: POLYMARKET_API_URL,
      privateKey: apiSecret, // Pass to ClobClient if it needs it
    })
  }

  /**
   * Get user balances from Polymarket
   */
  async getBalances(walletAddress: string): Promise<Balance[]> {
    try {
      const response = await axios.get(
        `${RELAYER_API_URL}/wallets/${walletAddress}/balances`,
        {
          headers: this.getAuthHeaders(),
        }
      )
      return response.data || []
    } catch (error) {
      console.error('Error fetching balances:', error)
      return []
    }
  }

  /**
   * Get markets
   */
  async getMarkets(limit = 20): Promise<Market[]> {
    try {
      const response = await axios.get(`${POLYMARKET_API_URL}/markets`, {
        params: { limit },
      })
      return response.data || []
    } catch (error) {
      console.error('Error fetching markets:', error)
      return []
    }
  }

  /**
   * Create a proxy wallet for a user
   * This is done via the relayer API
   */
  async createProxyWallet(userAddress: string): Promise<string> {
    try {
      // The relayer deterministically generates a proxy wallet
      // based on the relayer key and user address
      const response = await axios.post(
        `${RELAYER_API_URL}/proxy-wallet`,
        { userAddress },
        {
          headers: this.getAuthHeaders(),
        }
      )
      return response.data.proxyAddress
    } catch (error) {
      console.error('Error creating proxy wallet:', error)
      throw error
    }
  }

  /**
   * Place a trade order
   * Note: In production, orders should be signed using the proxy wallet's private key
   * or via the relayer API that handles signing on behalf of the proxy wallet
   */
  async placeOrder(orderParams: {
    tokenID: string
    price: string
    side: 'YES' | 'NO'
    amount: string
    proxyAddress: string
  }): Promise<any> {
    try {
      // Initialize a temporary signer for the proxy wallet if needed
      // In production, use the relayer's signing endpoint
      let signedOrder

      if (this.client && typeof (this.client as any).createSignedOrder === 'function') {
        // Use ClobClient's signing if available
        signedOrder = await (this.client as any).createSignedOrder({
          tokenID: orderParams.tokenID,
          price: orderParams.price,
          side: orderParams.side.toLowerCase() as 'yes' | 'no',
          amount: orderParams.amount,
          walletAddress: orderParams.proxyAddress,
        })
      } else {
        // Fallback: submit order params to relayer which will sign
        signedOrder = {
          tokenID: orderParams.tokenID,
          price: orderParams.price,
          side: orderParams.side.toLowerCase(),
          amount: orderParams.amount,
          walletAddress: orderParams.proxyAddress,
        }
      }

      const response = await axios.post(
        `${RELAYER_API_URL}/orders`,
        signedOrder,
        {
          headers: this.getAuthHeaders(),
        }
      )

      return response.data
    } catch (error) {
      console.error('Error placing order:', error)
      throw error
    }
  }

  /**
   * Get authentication headers for API requests
   */
  private getAuthHeaders(): Record<string, string> {
    // In production, this should sign requests with the relayer private key
    // For now, return basic auth headers
    return {
      'Content-Type': 'application/json',
      'X-API-KEY': this.apiKey,
    }
  }

  /**
   * Get USDC balance for a wallet
   */
  async getUSDCBalance(walletAddress: string): Promise<string> {
    const balances = await this.getBalances(walletAddress)
    const usdcBalance = balances.find((b) => 
      b.token.toLowerCase() === process.env.NEXT_PUBLIC_USDC_ADDRESS?.toLowerCase() ||
      b.token.toLowerCase() === '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' // Base USDC
    )
    return usdcBalance?.amount || '0'
  }
}

// Singleton instance (will be initialized with env vars)
let polymarketClient: PolymarketClient | null = null

export function getPolymarketClient(): PolymarketClient {
  if (!polymarketClient) {
    const apiKey = process.env.POLYMARKET_API_KEY || ''
    const apiSecret = process.env.POLYMARKET_RELAYER_KEY || ''
    polymarketClient = new PolymarketClient(apiKey, apiSecret)
  }
  return polymarketClient
}

