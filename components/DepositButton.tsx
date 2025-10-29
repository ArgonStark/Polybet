'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useState } from 'react'
import axios from 'axios'

interface DepositButtonProps {
  proxyAddress: string
  sessionId: string | null
  onDepositComplete?: () => void
}

export default function DepositButton({
  proxyAddress,
  sessionId,
  onDepositComplete,
}: DepositButtonProps) {
  const { ready } = usePrivy()
  const [showModal, setShowModal] = useState(false)
  const [depositInfo, setDepositInfo] = useState<{
    depositAddress: string
    network: string
    token: string
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleDeposit = async () => {
    if (!sessionId) {
      alert('Please wait for session to initialize')
      return
    }

    try {
      setLoading(true)
      const res = await axios.get('/api/deposit-address', {
        headers: { 'x-session-id': sessionId },
      })
      setDepositInfo(res.data)
      setShowModal(true)
    } catch (error: any) {
      console.error('Failed to get deposit address:', error)
      alert('Failed to get deposit address: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Address copied to clipboard!')
  }

  if (!ready) {
    return (
      <button
        disabled
        className="px-6 py-3 bg-gray-300 dark:bg-gray-600 text-gray-500 rounded-lg cursor-not-allowed"
      >
        Loading...
      </button>
    )
  }

  return (
    <>
      <button
        onClick={handleDeposit}
        disabled={loading || !proxyAddress}
        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
      >
        {loading ? 'Loading...' : 'Deposit USDC'}
      </button>

      {showModal && depositInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Deposit USDC
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Network: <span className="font-semibold">Base</span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Token: <span className="font-semibold">USDC</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Deposit Address (your proxy wallet):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={depositInfo.depositAddress}
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-mono text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(depositInfo.depositAddress)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-300">
                  <strong>Note:</strong> Send USDC to this address on Base network.
                  Your balance will be automatically credited once the transaction
                  is confirmed. The relayer monitors this address for deposits.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowModal(false)
                  onDepositComplete?.()
                }}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition font-semibold"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

