import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/polymarket';
import { createPolymarketClient } from '@/lib/polymarket';
import { getSession } from '@/lib/sessions';

const CLOB_HOST = process.env.POLY_CLOB_HOST || 'https://clob.polymarket.com';

export async function POST(request) {
  try {
    const sessionId = request.headers.get('x-session-id');
    
    if (!sessionId) {
      return errorResponse('Missing session ID', 401);
    }
    
    const session = getSession(sessionId);
    
    if (!session) {
      return errorResponse('Invalid or expired session', 401);
    }
    
    const { orderData } = await request.json();
    
    if (!orderData) {
      return errorResponse('Missing order data', 400);
    }
    
    console.log('[trade] Placing trade for:', session.address);
    
    const client = createPolymarketClient(session.address, null, CLOB_HOST);
    
    const tradeResponse = await client.createOrder(orderData);
    
    console.log('[trade] Trade placed successfully');
    
    return NextResponse.json({
      success: true,
      orderId: tradeResponse.order_id || tradeResponse.id,
      order: tradeResponse
    });
    
  } catch (error) {
    console.error('[trade] Error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
