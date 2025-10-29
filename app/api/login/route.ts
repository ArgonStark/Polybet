import { NextRequest, NextResponse } from 'next/server'
import { createSession, getSessionByWallet } from '@/lib/sessions'
import { getProxyWallet } from '@/lib/proxyWallet'

// Simple UUID v4 generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json()

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Check if user already has a session
    let session = getSessionByWallet(walletAddress)

    if (!session) {
      // Generate or retrieve proxy wallet
      const relayerKey = process.env.POLYMARKET_RELAYER_KEY || ''
      if (!relayerKey) {
        return NextResponse.json(
          { error: 'Relayer key not configured' },
          { status: 500 }
        )
      }

      const proxyAddress = await getProxyWallet(walletAddress, relayerKey)
      const sessionId = generateUUID()

      session = createSession(sessionId, walletAddress, proxyAddress)
    }

    return NextResponse.json({
      sessionId: session.sessionId,
      proxyAddress: session.proxyAddress,
    })
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 500 }
    )
  }
}

