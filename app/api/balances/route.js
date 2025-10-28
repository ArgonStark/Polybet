import { NextResponse } from 'next/server';
import { authenticatedRequest, errorResponse } from '@/lib/polymarket';
import { getSession } from '@/lib/sessions';

const CLOB_HOST = process.env.POLY_CLOB_HOST || 'https://clob.polymarket.com';

export async function GET(request) {
  try {
    const sessionId = request.headers.get('x-session-id');
    
    if (!sessionId) {
      return errorResponse('Missing session ID', 401);
    }
    
    const session = getSession(sessionId);
    
    if (!session) {
      return errorResponse('Invalid or expired session', 401);
    }
    
    console.log('[balances] Fetching balances for:', session.address);
    
    // Use proxy wallet if available, otherwise use regular balances
    const balancesEndpoint = session.proxyWallet 
      ? `${CLOB_HOST}/v1/wallets/${session.proxyWallet.address}/balances`
      : `${CLOB_HOST}/v1/balances`;
    
    console.log('[balances] Using endpoint:', balancesEndpoint);
    
    // Fetch balances from Polymarket
    const balancesResponse = await authenticatedRequest(
      balancesEndpoint,
      {
        method: 'GET'
      },
      session.token
    );
    
    if (!balancesResponse.ok) {
      const error = await balancesResponse.text();
      console.error('[balances] Failed to fetch balances:', error);
      return errorResponse('Failed to fetch balances', 500);
    }
    
    const balances = await balancesResponse.json();
    console.log('[balances] Successfully fetched balances');
    
    return NextResponse.json({
      success: true,
      balances
    });
    
  } catch (error) {
    console.error('[balances] Error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
