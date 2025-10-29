'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useEffect, useState } from 'react'
import DepositButton from './DepositButton'
import axios from 'axios'

interface Balance {
  balances: Array<{ token: string; amount: string }>
  usdcBalance: string
  proxyAddress: string
}

export default function Dashboard() {
  const { user, logout } = usePrivy()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [proxyAddress, setProxyAddress] = useState<string>('')
  const [balance, setBalance] = useState<Balance | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.wallet?.address) {
      initializeSession()
    }
  }, [user])

  const initializeSession = async () => {
    try {
      const walletAddress = user?.wallet?.address
      if (!walletAddress) return

      // Login to create/get session
      const loginRes = await axios.post('/api/login', {
        walletAddress,
      })

      const { sessionId: sid, proxyAddress: proxy } = loginRes.data
      setSessionId(sid)
      setProxyAddress(proxy)

      // Fetch balances
      await fetchBalances(sid)
    } catch (error) {
      console.error('Failed to initialize session:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBalances = async (sid: string) => {
    try {
      const res = await axios.get('/api/balances', {
        headers: { 'x-session-id': sid },
      })
      setBalance(res.data)
    } catch (error) {
      console.error('Failed to fetch balances:', error)
    }
  }

  const handleRefresh = () => {
    if (sessionId) {
      fetchBalances(sessionId)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading your account...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                PolyBet Dashboard
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {user?.wallet?.address?.slice(0, 6)}...
                {user?.wallet?.address?.slice(-4)}
              </p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl p-6 text-white">
              <p className="text-sm opacity-90 mb-2">USDC Balance</p>
              <p className="text-3xl font-bold">
                {balance?.usdcBalance
                  ? parseFloat(balance.usdcBalance).toFixed(2)
                  : '0.00'}
              </p>
            </div>

            <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Proxy Wallet
              </p>
              <p className="text-sm font-mono text-gray-900 dark:text-white break-all">
                {proxyAddress || 'Loading...'}
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <DepositButton
              proxyAddress={proxyAddress}
              sessionId={sessionId}
              onDepositComplete={handleRefresh}
            />
            <button
              onClick={handleRefresh}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              Refresh Balances
            </button>
          </div>
        </div>

        <MarketsList />
      </div>
    </div>
  )
}

function MarketsList() {
  const [markets, setMarkets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMarkets()
  }, [])

  const fetchMarkets = async () => {
    try {
      const res = await axios.get('/api/markets')
      setMarkets(res.data.markets || [])
    } catch (error) {
      console.error('Failed to fetch markets:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
        <p className="text-center text-gray-600 dark:text-gray-400">
          Loading markets...
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Available Markets
      </h2>
      <div className="space-y-3">
        {markets.length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400 py-8">
            No markets available
          </p>
        ) : (
          markets.slice(0, 10).map((market, idx) => (
            <div
              key={idx}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <p className="text-gray-900 dark:text-white font-medium">
                {market.question || `Market ${idx + 1}`}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

