'use client';

import { useState } from 'react';
import { ethers } from 'ethers';

// Base network USDC token address
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base
const USDC_DECIMALS = 6;

export default function DepositButton({ address, sessionId, onDepositSuccess }) {
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('idle'); // idle, pending, success, error
  const [message, setMessage] = useState('');
  const [txHash, setTxHash] = useState('');

  const handleDeposit = async () => {
    if (!address || !sessionId) {
      setStatus('error');
      setMessage('Please connect your wallet and authenticate first');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setStatus('error');
      setMessage('Please enter a valid amount');
      return;
    }

    // Check network
    if (window.ethereum) {
      try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        const baseChainId = '0x2105'; // Base mainnet
        
        if (chainId !== baseChainId) {
          setStatus('error');
          setMessage('Please switch to Base network (Chain ID: 8453) before depositing.');
          return;
        }
      } catch (error) {
        console.warn('[DepositButton] Could not check chain ID:', error);
      }
    }

    try {
      setStatus('pending');
      setMessage('Initiating deposit...');

      console.log('[DepositButton] Starting deposit for:', address);
      console.log('[DepositButton] Amount:', amount);

      // Get connected wallet
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      console.log('[DepositButton] User wallet address:', userAddress);

      // Fetch proxy wallet from session
      const proxyRes = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 
          'x-session-id': sessionId,
          'Content-Type': 'application/json'
        }
      });

      if (!proxyRes.ok) {
        throw new Error('Failed to get proxy wallet');
      }

      const proxyData = await proxyRes.json();
      if (!proxyData.success || !proxyData.proxyWallet) {
        throw new Error('No proxy wallet found');
      }

      const proxyAddress = proxyData.proxyWallet.address;
      console.log('[DepositButton] Proxy wallet address:', proxyAddress);

      // Convert amount to USDC decimals
      const amountInWei = ethers.parseUnits(amount, USDC_DECIMALS);
      console.log('[DepositButton] Amount in wei:', amountInWei.toString());

      // Validate deposit with backend
      const depositRes = await fetch('/api/deposit', {
        method: 'POST',
        headers: { 
          'x-session-id': sessionId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amountInWei.toString(),
          fromAddress: userAddress,
          toAddress: proxyAddress,
          tokenAddress: BASE_USDC
        })
      });

      const depositData = await depositRes.json();
      
      if (!depositData.success) {
        throw new Error(depositData.error || 'Deposit validation failed');
      }

      console.log('[DepositButton] Deposit validated, executing transfer...');

      // Execute USDC transfer from user's wallet to proxy wallet
      const usdcABI = ['function transfer(address to, uint256 amount) returns (bool)'];
      const usdcContract = new ethers.Contract(BASE_USDC, usdcABI, signer);

      console.log('[DepositButton] Sending USDC transfer transaction...');
      setMessage('Please confirm the transaction in your wallet...');

      // Execute transfer
      const tx = await usdcContract.transfer(proxyAddress, amountInWei);
      
      console.log('[DepositButton] Transaction sent:', tx.hash);
      setMessage('Transaction pending... Waiting for confirmation...');

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      console.log('[DepositButton] Transaction confirmed:', receipt);
      
      setTxHash(receipt.hash);
      setStatus('success');
      setMessage(`Deposit confirmed! Transaction: ${receipt.hash.slice(0, 10)}...`);

      // Refresh balances
      if (onDepositSuccess) {
        onDepositSuccess();
      }

      // Reset after 5 seconds
      setTimeout(() => {
        setStatus('idle');
        setAmount('');
        setMessage('');
        setTxHash('');
      }, 5000);

    } catch (error) {
      console.error('[DepositButton] Deposit error:', error);
      
      let errorMessage = 'Deposit failed. Please try again.';
      
      // Check for specific error types
      if (error.message?.includes('transfer amount exceeds balance')) {
        errorMessage = 'Insufficient USDC balance on Base network. Please add USDC to your wallet first.';
      } else if (error.message?.includes('user rejected')) {
        errorMessage = 'Transaction cancelled by user.';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for gas. Please add ETH for gas fees.';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network mismatch. Please switch to Base network (Chain ID: 8453).';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setStatus('error');
      setMessage(errorMessage);
      
      setTimeout(() => {
        setStatus('idle');
      }, 7000); // Longer timeout for errors
    }
  };

  const getButtonColor = () => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'success':
        return 'bg-green-500 hover:bg-green-600';
      case 'error':
        return 'bg-red-500 hover:bg-red-600';
      default:
        return 'bg-purple-600 hover:bg-purple-700';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Deposit USDC</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (USDC)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.000001"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={status === 'pending'}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
            />
            <div className="absolute right-4 top-3 text-gray-500">
              USDC
            </div>
          </div>
        </div>

        <button
          onClick={handleDeposit}
          disabled={status === 'pending' || !amount || parseFloat(amount) <= 0}
          className={`w-full px-6 py-3 text-white rounded-lg font-medium transition-colors ${getButtonColor()} disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
        >
          {status === 'idle' && 'Deposit USDC'}
          {status === 'pending' && <span className="flex items-center gap-2"><span className="animate-spin">⏳</span> Processing...</span>}
          {status === 'success' && <span className="flex items-center gap-2">{getStatusIcon()} Success!</span>}
          {status === 'error' && <span className="flex items-center gap-2">{getStatusIcon()} Error</span>}
        </button>

        {message && (
          <div className={`p-3 rounded-lg ${
            status === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            status === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-yellow-50 text-yellow-800 border border-yellow-200'
          }`}>
            <p className="text-sm">{getStatusIcon()} {message}</p>
          </div>
        )}

        {txHash && (
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Transaction Hash:</p>
            <p className="font-mono text-xs break-all">{txHash}</p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Network:</strong> Base (Chain ID: 8453)
          </p>
          <p className="text-xs text-blue-700 mt-1">
            USDC will be deposited to your Polymarket proxy wallet. Make sure you're connected to Base network.
          </p>
          <p className="text-xs text-blue-700 mt-1">
            <strong>Important:</strong> You need USDC on Base network to make a deposit.
          </p>
          <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded">
            <p className="text-xs text-yellow-800">
              💡 <strong>Tip:</strong> Make sure you have USDC balance on Base network. You can bridge USDC from other networks or purchase directly on Base.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

