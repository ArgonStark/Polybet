import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/sessions'
import { getPolymarketClient } from '@/lib/polymarket'

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('x-session-id')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    const session = getSession(sessionId)

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    const { tokenID, price, side, amount } = await request.json()

    if (!tokenID || !price || !side || !amount) {
      return NextResponse.json(
        { error: 'Missing required trade parameters' },
        { status: 400 }
      )
    }

    const client = getPolymarketClient()
    const order = await client.placeOrder({
      tokenID,
      price,
      side,
      amount,
      proxyAddress: session.proxyAddress,
    })

    return NextResponse.json({ order })
  } catch (error: any) {
    console.error('Trade route error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to place order' },
      { status: 500 }
    )
  }
}

