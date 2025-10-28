import { NextResponse } from 'next/server';
import { generateProxyWallet } from '@/lib/proxyWallet';
import { errorResponse } from '@/lib/polymarket';
import { getSession } from '@/lib/sessions';

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
    
    const serverPrivateKey = process.env.SERVER_PRIVATE_KEY;
    
    if (!serverPrivateKey) {
      console.error('[deposit] SERVER_PRIVATE_KEY not configured');
      return errorResponse('Server not properly configured', 500);
    }
    
    console.log('[deposit] Generating proxy wallet for:', session.address);
    
    // Generate deterministic proxy wallet
    const proxyWallet = generateProxyWallet(serverPrivateKey, session.address);
    
    console.log('[deposit] Proxy wallet generated:', proxyWallet.address);
    
    return NextResponse.json({
      success: true,
      depositAddress: proxyWallet.address,
      proxyAddress: proxyWallet.address
    });
    
  } catch (error) {
    console.error('[deposit] Error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
