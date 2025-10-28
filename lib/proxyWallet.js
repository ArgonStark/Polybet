import { ethers } from 'ethers';

export function generateProxyWallet(serverPrivateKey, userAddress) {
  const wallet = new ethers.Wallet(serverPrivateKey);
  const data = ethers.AbiCoder.defaultAbiCoder().encode(
    ['address', 'address'],
    [wallet.address, userAddress]
  );
  const hash = ethers.keccak256(data);
  const derivedKey = hash.slice(0, 66);
  const proxyWallet = new ethers.Wallet(derivedKey);
  
  console.log('[proxyWallet] Generated proxy wallet:', proxyWallet.address);
  
  return {
    address: proxyWallet.address,
    privateKey: proxyWallet.privateKey,
    wallet: proxyWallet
  };
}

