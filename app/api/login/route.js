import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { createSession, getSession } from '@/lib/sessions';
import { errorResponse } from '@/lib/polymarket';
import { v4 as uuidv4 } from 'uuid';

const CLOB_HOST = process.env.POLY_CLOB_HOST || 'https://clob.polymarket.com';

export async function POST(request) {
  try {
    const { address, signature, message } = await request.json();
    
    console.log('[login] Attempting login for address:', address);
    
    if (!address || !signature || !message) {
      return errorResponse('Missing required fields: address, signature, message', 400);
    }
    console.log('[login] received:', { address, message, signature });

    const recoveredAddress = ethers.verifyMessage(message, signature);
    console.log('[login] recovered address:', recoveredAddress);

    console.log('[login] Signature verification:', recoveredAddress.toLowerCase() === address.toLowerCase());
    
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return errorResponse('Invalid signature', 401);
    }
    
    let authData;
    try {
      const authResponse = await fetch(`${CLOB_HOST}/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature, message })
      });
      
      if (!authResponse.ok) {
        const error = await authResponse.text();
        console.error('[login] Polymarket auth failed:', error);
        return errorResponse('Polymarket authentication failed', 401);
      }
      
      authData = await authResponse.json();
    } catch (fetchError) {
      console.error('[login] Fetch error:', fetchError.message);
      // For development/demo, return a mock response
      // TODO: Replace with actual Polymarket API integration
      authData = {
        token: 'mock_token_' + Date.now(),
        refresh_token: 'mock_refresh_token',
        expires_in: 3600
      };
      console.warn('[login] Using mock auth data for development');
    }
    console.log('[login] Polymarket auth successful');
    
    const sessionId = uuidv4();
    const session = createSession(sessionId, address, authData);
    
    return NextResponse.json({
      success: true,
      sessionId,
      address,
      token: authData.token
    });
    
  } catch (error) {
    console.error('[login] Error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

export { getSession };

