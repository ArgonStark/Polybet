'use client'

import { usePrivy } from '@privy-io/react-auth'
import Dashboard from '@/components/Dashboard'

export default function Home() {
  const { ready, authenticated } = usePrivy()

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-center mb-2 text-gray-900 dark:text-white">
            PolyBet
          </h1>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
            Trade on Polymarket directly from Farcaster
          </p>
          <WalletConnect />
        </div>
      </div>
    )
  }

  return <Dashboard />
}

function WalletConnect() {
  const { login } = usePrivy()

  return (
    <button
      onClick={login}
      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
    >
      Sign in with Privy
    </button>
  )
}

