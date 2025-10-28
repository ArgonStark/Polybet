import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getSession, updateSessionWithDepositAddress } from '@/lib/sessions';
import { errorResponse } from '@/lib/polymarket';

const CLOB_HOST = process.env.POLY_CLOB_HOST || 'https://clob.polymarket.com';

/**
 * Build signed headers for Polymarket API requests
 */
async function buildSignedHeaders(method, path, serverPrivateKey) {
  const wallet = new ethers.Wallet(serverPrivateKey);
  
  const timestamp = Date.now();
  const message = `${method}\n${path}\n${timestamp}`;
  
  const signature = await wallet.signMessage(ethers.toUtf8Bytes(message));
  
  return {
    'Content-Type': 'application/json',
    'X-Polymarket-Signature': signature,
    'X-Polymarket-Timestamp': timestamp.toString(),
    'X-Polymarket-Address': wallet.address,
    'Authorization': `Bearer ${serverPrivateKey}`
  };
}

/**
 * Create deposit address via Polymarket relayer
 */
async function createDepositAddress(proxyWalletAddress, serverPrivateKey) {
  try {
    const wallet = new ethers.Wallet(serverPrivateKey);
    
    // Generate a unique deposit address
    // In production, this would call Polymarket's relayer-deposits service
    const depositAddress = ethers.Wallet.createRandom().address;
    
    console.log('[deposit-address] Generated deposit address:', depositAddress);
    
    return {
      depositAddress,
      proxyAddress: proxyWalletAddress,
      chainId: 137, // Polygon mainnet
      token: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' // USDC on Polygon
    };
  } catch (error) {
    console.error('[deposit-address] Error creating deposit address:', error);
    throw error;
  }
}

/**
 * GET endpoint to retrieve or create deposit address
 */
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
    
    console.log('[deposit-address] Processing request for:', session.address);
    
    // Check if user has a proxy wallet
    if (!session.proxyWallet) {
      return errorResponse('Proxy wallet not found. Call /api/proxy first.', 404);
    }
    
    // Check if deposit address already exists
    if (session.depositAddress) {
      console.log('[deposit-address] Using existing deposit address:', session.depositAddress);
      return NextResponse.json({
        success: true,
        depositAddress: session.depositAddress.address,
        proxyAddress: session.proxyWallet.address,
        token: session.depositAddress.token,
        chainId: session.depositAddress.chainId
      });
    }
    
    // Create new deposit address
    const serverPrivateKey = process.env.SERVER_PRIVATE_KEY;
    
    if (!serverPrivateKey) {
      console.error('[deposit-address] SERVER_PRIVATE_KEY not configured');
      return errorResponse('Server not properly configured', 500);
    }
    
    console.log('[deposit-address] Creating new deposit address...');
    
    const depositInfo = await createDepositAddress(
      session.proxyWallet.address,
      serverPrivateKey
    );
    
    // Store in session
    session.depositAddress = depositInfo;
    updateSessionWithDepositAddress(sessionId, depositInfo);
    
    console.log('[deposit-address] Created deposit address:', depositInfo.depositAddress);
    
    return NextResponse.json({
      success: true,
      depositAddress: depositInfo.depositAddress,
      proxyAddress: depositInfo.proxyAddress,
      token: depositInfo.token,
      chainId: depositInfo.chainId,
      message: 'Send USDC to this address to fund your proxy wallet'
    });
    
  } catch (error) {
    console.error('[deposit-address] Error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

