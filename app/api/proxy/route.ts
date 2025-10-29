import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/sessions'

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

    return NextResponse.json({
      proxyAddress: session.proxyAddress,
      walletAddress: session.walletAddress,
    })
  } catch (error: any) {
    console.error('Proxy route error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get proxy address' },
      { status: 500 }
    )
  }
}

