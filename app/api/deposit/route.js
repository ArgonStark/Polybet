import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getSession } from '@/lib/sessions';
import { errorResponse } from '@/lib/polymarket';

// Base network configuration
const BASE_RPC = process.env.BASE_RPC || 'https://mainnet.base.org';
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base

// USDC ABI for transfer function
const USDC_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

/**
 * POST endpoint to handle USDC deposits to proxy wallet
 * This route validates the user session and returns deposit instructions
 */
export async function POST(request) {
  try {
    const sessionId = request.headers.get('x-session-id');
    console.log('[deposit] POST request received');
    
    if (!sessionId) {
      console.log('[deposit] Missing session ID');
      return errorResponse('Missing session ID', 401);
    }
    
    const session = getSession(sessionId);
    
    if (!session) {
      console.log('[deposit] Invalid or expired session');
      return errorResponse('Invalid or expired session', 401);
    }

    const { amount, fromAddress, toAddress, tokenAddress } = await request.json();
    
    console.log('[deposit] Processing deposit:', {
      amount,
      fromAddress,
      toAddress,
      tokenAddress
    });

    // Validate inputs
    if (!amount || !fromAddress || !toAddress) {
      console.error('[deposit] Missing required fields');
      return errorResponse('Missing required fields: amount, fromAddress, toAddress', 400);
    }

    // Get proxy wallet from session
    const proxyAddress = session.proxyWallet?.address;
    if (!proxyAddress) {
      console.error('[deposit] No proxy wallet found in session');
      return errorResponse('No proxy wallet found. Please set up proxy wallet first.', 400);
    }

    if (toAddress.toLowerCase() !== proxyAddress.toLowerCase()) {
      console.error('[deposit] Invalid deposit address:', toAddress, 'expected:', proxyAddress);
      return errorResponse('Invalid deposit address', 400);
    }

    // This is a client-side transaction, so we return deposit instructions
    // The actual transaction is signed by the user's wallet in the frontend
    
    console.log('[deposit] Deposit approved for:', {
      from: fromAddress,
      to: proxyAddress,
      amount: amount
    });

    return NextResponse.json({
      success: true,
      message: 'Please sign the transaction in your wallet to complete the deposit',
      fromAddress,
      toAddress: proxyAddress,
      amount,
      tokenAddress: BASE_USDC,
      network: 'Base',
      chainId: 8453
    });

  } catch (error) {
    console.error('[deposit] Error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

/**
 * Helper function to execute USDC transfer on Base
 * This would be called from the frontend after user signs the transaction
 */
export async function executeDeposit(amount, fromAddress, toAddress, userWallet) {
  try {
    console.log('[deposit] Executing USDC transfer...');
    
    const provider = new ethers.JsonRpcProvider(BASE_RPC);
    const erc20 = new ethers.Contract(BASE_USDC, USDC_ABI, provider);
    
    // Create transaction to transfer USDC
    const tx = await erc20.transfer.populateTransaction(toAddress, amount);
    
    console.log('[deposit] Transaction prepared:', {
      to: toAddress,
      amount: amount.toString(),
      token: BASE_USDC
    });

    return {
      success: true,
      to: BASE_USDC,
      data: tx.data,
      value: '0'
    };

  } catch (error) {
    console.error('[deposit] Execute error:', error);
    throw error;
  }
}
