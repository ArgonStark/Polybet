import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getAllSessions } from '@/lib/sessions';
import { errorResponse } from '@/lib/polymarket';

const CLOB_HOST = process.env.POLY_CLOB_HOST || 'https://clob.polymarket.com';

/**
 * Monitor deposits and credit proxy wallets
 */
async function monitorDeposits() {
  console.log('[deposit-monitor] Checking for pending deposits...');
  
  const sessions = getAllSessions();
  let processed = 0;
  
  for (const [sessionId, session] of sessions.entries()) {
    if (!session.depositAddress) continue;
    
    try {
      // In production, this would:
      // 1. Check blockchain for deposits to session.depositAddress.address
      // 2. Call Polymarket /v1/deposit endpoint to credit the proxy wallet
      // 3. Update session with deposit status
      
      const depositAddress = session.depositAddress.address;
      
      // Mock checking for deposits
      console.log('[deposit-monitor] Checking deposits for:', depositAddress);
      
      // In real implementation:
      // 1. Query blockchain or Polymarket API for deposits
      // 2. If deposit found, credit proxy wallet via Polymarket API
      // 3. Update session balance
      
    } catch (error) {
      console.error('[deposit-monitor] Error checking deposits:', error);
    }
  }
  
  return processed;
}

/**
 * POST endpoint to manually trigger deposit check
 */
export async function POST(request) {
  try {
    const serverPrivateKey = process.env.SERVER_PRIVATE_KEY;
    
    if (!serverPrivateKey) {
      return errorResponse('Server not properly configured', 500);
    }
    
    // Validate request comes from authorized source (e.g., webhook secret)
    // For now, skip validation in development
    
    const count = await monitorDeposits();
    
    return NextResponse.json({
      success: true,
      depositsProcessed: count,
      message: 'Deposit monitoring completed'
    });
    
  } catch (error) {
    console.error('[deposit-monitor] Error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

/**
 * GET endpoint to check status of deposits
 */
export async function GET(request) {
  try {
    const sessionId = request.headers.get('x-session-id');
    
    if (!sessionId) {
      return errorResponse('Missing session ID', 401);
    }
    
    const { getSession } = await import('@/lib/sessions');
    const session = getSession(sessionId);
    
    if (!session) {
      return errorResponse('Invalid session', 401);
    }
    
    // Return deposit status
    const depositStatus = {
      hasDepositAddress: !!session.depositAddress,
      depositAddress: session.depositAddress?.address || null,
      proxyAddress: session.proxyWallet?.address || null,
      lastChecked: new Date().toISOString()
    };
    
    return NextResponse.json({
      success: true,
      status: depositStatus
    });
    
  } catch (error) {
    console.error('[deposit-monitor] Error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

