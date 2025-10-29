import { NextResponse } from 'next/server'
import { getPolymarketClient } from '@/lib/polymarket'

export async function GET() {
  try {
    const client = getPolymarketClient()
    const markets = await client.getMarkets(20)

    return NextResponse.json({ markets })
  } catch (error: any) {
    console.error('Markets route error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch markets' },
      { status: 500 }
    )
  }
}

