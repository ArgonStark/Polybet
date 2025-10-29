import { ethers } from 'ethers'

/**
 * Deterministically generate a proxy wallet address
 * This mimics Polymarket's relayer behavior
 * 
 * In production, the relayer handles this via their API,
 * but we can create a deterministic address here for development
 */
export function generateProxyAddress(
  userAddress: string,
  relayerPrivateKey: string
): string {
  // Create a deterministic message using user address + relayer key
  const message = ethers.solidityPackedKeccak256(
    ['address', 'bytes32'],
    [userAddress, ethers.keccak256(ethers.toUtf8Bytes(relayerPrivateKey))]
  )

  // Derive address from message
  // Note: This is a simplified version. In production, Polymarket's relayer
  // uses a more sophisticated method for generating proxy wallets
  const wallet = new ethers.Wallet(message)
  return wallet.address
}

/**
 * Get or create proxy wallet address for a user
 * Checks if one exists in storage, otherwise generates one
 */
export async function getProxyWallet(
  userAddress: string,
  relayerPrivateKey: string
): Promise<string> {
  // In a real implementation, you'd check a database first
  // For now, we'll always generate deterministically
  return generateProxyAddress(userAddress, relayerPrivateKey)
}

