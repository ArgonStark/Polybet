'use client'

import { usePrivy } from '@privy-io/react-auth'

export default function WalletConnect() {
  const { login, authenticated, ready } = usePrivy()

  if (!ready) {
    return (
      <button
        disabled
        className="w-full bg-gray-300 text-gray-500 font-semibold py-3 px-6 rounded-lg cursor-not-allowed"
      >
        Loading...
      </button>
    )
  }

  if (authenticated) {
    return null
  }

  return (
    <button
      onClick={login}
      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
    >
      Sign in with Privy
    </button>
  )
}

