import { ethers } from 'ethers';

export function createPolymarketClient(address, signMessage, clobHost) {
  return {
    createOrder: async (orderData) => {
      const response = await fetch(`${clobHost}/v1/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      return response.json();
    }
  };
}

export async function signPolymarketMessage(message, wallet) {
  const messageHash = ethers.id(message);
  const messageHashBytes = ethers.getBytes(messageHash);
  const signature = await wallet.signMessage(messageHashBytes);
  return signature;
}

export async function authenticatedRequest(url, options = {}, token) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(url, {
    ...options,
    headers
  });
}

export function errorResponse(message, status = 400) {
  return Response.json(
    { error: message },
    { status }
  );
}

