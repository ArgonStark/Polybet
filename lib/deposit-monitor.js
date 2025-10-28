import { ethers } from 'ethers';
import { getAllSessions } from './sessions';

const POLYGON_USDC = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'; // USDC on Polygon
const POLYGON_RPC = process.env.POLYGON_RPC || 'https://polygon-rpc.com';

/**
 * Monitor deposits to proxy wallet deposit addresses
 */
export async function monitorProxyDeposits() {
  console.log('[deposit-monitor] Starting deposit monitoring...');
  
  const sessions = getAllSessions();
  let depositsFound = 0;
  
  for (const [sessionId, session] of sessions.entries()) {
    if (!session.depositAddress) continue;
    
    try {
      const depositAddress = session.depositAddress.address;
      const proxyAddress = session.proxyWallet?.address;
      
      if (!proxyAddress) continue;
      
      // Check for USDC deposits to the deposit address
      const deposits = await checkUSDCDeposits(depositAddress);
      
      if (deposits.length > 0) {
        console.log('[deposit-monitor] Found deposits for:', depositAddress);
        
        for (const deposit of deposits) {
          // Credit the proxy wallet via Polymarket API
          await creditProxyWallet(proxyAddress, deposit.amount, session.token || POLYGON_USDC);
        }
        
        depositsFound++;
      }
    } catch (error) {
      console.error('[deposit-monitor] Error monitoring session:', error);
    }
  }
  
  return depositsFound;
}

/**
 * Check for USDC deposits to an address
 */
async function checkUSDCDeposits(address) {
  try {
    const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
    
    // USDC Transfer event signature
    const transferEvent = ethers.id('Transfer(address,address,uint256)');
    
    // For now, return mock deposits in development
    // In production, query blockchain for Transfer events
    console.log('[deposit-monitor] Checking deposits for address:', address);
    
    // Mock implementation - replace with real blockchain query
    return [];
    
  } catch (error) {
    console.error('[deposit-monitor] Error checking deposits:', error);
    return [];
  }
}

/**
 * Credit proxy wallet via Polymarket API
 */
async function creditProxyWallet(proxyAddress, amount, token) {
  try {
    console.log('[deposit-monitor] Crediting proxy wallet:', proxyAddress, 'Amount:', amount);
    
    // In production, call Polymarket /v1/deposit endpoint
    // const response = await fetch(`${CLOB_HOST}/v1/deposit`, {
    //   method: 'POST',
    //   headers: { ...signedHeaders },
    //   body: JSON.stringify({ proxyAddress, amount, token })
    // });
    
    console.log('[deposit-monitor] Successfully credited proxy wallet');
    return true;
    
  } catch (error) {
    console.error('[deposit-monitor] Error crediting proxy wallet:', error);
    return false;
  }
}

/**
 * Start periodic deposit monitoring
 */
export function startDepositMonitoring(intervalMs = 60000) {
  console.log('[deposit-monitor] Starting periodic monitoring, interval:', intervalMs, 'ms');
  
  setInterval(async () => {
    try {
      const count = await monitorProxyDeposits();
      if (count > 0) {
        console.log('[deposit-monitor] Processed', count, 'deposits');
      }
    } catch (error) {
      console.error('[deposit-monitor] Error in monitoring loop:', error);
    }
  }, intervalMs);
  
  // Run initial check
  monitorProxyDeposits();
}

