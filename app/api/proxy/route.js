import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getSession, updateSessionWithProxy } from '@/lib/sessions';
import { errorResponse } from '@/lib/polymarket';

const CLOB_HOST = process.env.POLY_CLOB_HOST || 'https://clob.polymarket.com';

/**
 * Build signed headers for Polymarket API requests
 */
async function buildSignedHeaders(method, path, serverPrivateKey) {
  const wallet = new ethers.Wallet(serverPrivateKey);
  
  // Create message to sign
  const timestamp = Date.now();
  const message = `${method}\n${path}\n${timestamp}`;
  
  // Sign the message using ethers v6 signature format
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
 * Get or create proxy wallet for a user
 */
export async function POST(request) {
  try {
    const sessionId = request.headers.get('x-session-id');
    console.log('[proxy] Request received with sessionId:', sessionId);
    
    if (!sessionId) {
      console.error('[proxy] Missing session ID');
      return errorResponse('Missing session ID', 401);
    }
    
    const session = getSession(sessionId);
    console.log('[proxy] Session lookup:', session ? 'found' : 'not found');
    
    if (!session) {
      console.error('[proxy] Invalid or expired session');
      return errorResponse('Invalid or expired session', 401);
    }
    
    const serverPrivateKey = process.env.SERVER_PRIVATE_KEY;
    console.log('[proxy] Server private key configured:', !!serverPrivateKey);
    
    if (!serverPrivateKey) {
      console.error('[proxy] SERVER_PRIVATE_KEY not configured');
      return errorResponse('Server not properly configured', 500);
    }
    
    const userAddress = session.address;
    console.log('[proxy] Processing proxy wallet for user:', userAddress);
    
    // Check if user already has a proxy wallet in session
    if (session.proxyWallet) {
      console.log('[proxy] Using existing proxy wallet from session:', session.proxyWallet.address);
      return NextResponse.json({
        success: true,
        proxyWallet: session.proxyWallet
      });
    }
    
    // Try to get existing proxy wallet from Polymarket
    try {
      const path = `/v1/proxy-wallets/${userAddress}`;
      const headers = await buildSignedHeaders('GET', path, serverPrivateKey);
      
      console.log('[proxy] Fetching existing proxy wallet...');
      const response = await fetch(`${CLOB_HOST}${path}`, {
        method: 'GET',
        headers
      });
      
      if (response.ok) {
        const proxyData = await response.json();
        console.log('[proxy] Found existing proxy wallet:', proxyData.address);
        
        // Store in session
        session.proxyWallet = proxyData;
        updateSessionWithProxy(sessionId, proxyData);
        
        return NextResponse.json({
          success: true,
          proxyWallet: proxyData
        });
      } else {
        console.log('[proxy] No existing proxy wallet found, creating new one...');
      }
    } catch (error) {
      console.error('[proxy] Error fetching existing wallet:', error);
    }
    
    // Create new proxy wallet using deterministic generation
    console.log('[proxy] Creating deterministic proxy wallet...');
    
    try {
      const salt = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['address'], [userAddress]));
      console.log('[proxy] Using deterministic salt for user:', userAddress);
      
      // Skip API call for now, create deterministic mock proxy wallet
      // Create a wallet from the server key to get its address
      const serverWallet = new ethers.Wallet(serverPrivateKey);
      const serverAddress = serverWallet.address;
      
      const deterministicHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'address'],
          [userAddress, serverAddress]
        )
      );
      
      const mockProxyWallet = {
        address: ethers.getAddress('0x' + deterministicHash.slice(26)), // Last 20 bytes
        owner: userAddress,
        chain_id: 137,
        salt: salt
      };
      
      console.log('[proxy] Created deterministic mock proxy wallet:', mockProxyWallet.address);
      
      session.proxyWallet = mockProxyWallet;
      updateSessionWithProxy(sessionId, mockProxyWallet);
      
      return NextResponse.json({
        success: true,
        proxyWallet: mockProxyWallet,
        isMock: true
      });
      
    } catch (error) {
      console.error('[proxy] Error in proxy wallet creation:', error);
      return errorResponse('Failed to create proxy wallet: ' + error.message, 500);
    }
    
  } catch (error) {
    console.error('[proxy] Error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

/**
 * GET endpoint to retrieve user's proxy wallet if exists
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
    
    if (!session.proxyWallet) {
      return errorResponse('No proxy wallet found. Call POST /api/proxy to create one.', 404);
    }
    
    return NextResponse.json({
      success: true,
      proxyWallet: session.proxyWallet
    });
    
  } catch (error) {
    console.error('[proxy] Error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

