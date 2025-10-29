import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/sessions'
import { getPolymarketClient } from '@/lib/polymarket'

export async function GET(request: NextRequest) {
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

    const client = getPolymarketClient()
    const balances = await client.getBalances(session.proxyAddress)
    const usdcBalance = await client.getUSDCBalance(session.proxyAddress)

    return NextResponse.json({
      balances,
      usdcBalance,
      proxyAddress: session.proxyAddress,
    })
  } catch (error: any) {
    console.error('Balances route error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch balances' },
      { status: 500 }
    )
  }
}

