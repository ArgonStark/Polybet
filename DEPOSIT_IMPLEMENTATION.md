# Deposit Address Implementation

## Overview

This document describes the deposit address functionality implemented for the Polymarket Farcaster MiniApp.

## Architecture

### 1. Deposit Address Generation (`/api/deposit-address`)

**Purpose**: Generate safe deposit addresses for users to send USDC to fund their proxy wallets.

**Flow**:
1. User authenticates and gets a proxy wallet
2. Frontend calls `/api/deposit-address` with session ID
3. Backend generates a unique deposit address
4. Maps deposit address → proxy wallet in session
5. Returns deposit info to frontend

**Key Features**:
- One deposit address per proxy wallet (stored in session)
- USDC on Polygon network (0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174)
- Unique addresses to avoid collisions
- Linked to proxy wallet for automatic crediting

### 2. Deposit Monitoring (`/api/deposit-monitor`)

**Purpose**: Monitor blockchain for deposits and credit proxy wallets.

**Implementation Modes**:

1. **Periodic Polling** (Current):
   - Checks all active sessions for deposits
   - Runs every 60 seconds (configurable)
   - Calls Polymarket API to credit proxy wallets

2. **Webhook-based** (Recommended for production):
   - Polymarket relayer sends webhook on deposits
   - Instant credit to proxy wallet
   - More efficient than polling

**Monitoring Logic**:
```javascript
// Check each session for deposits to deposit addresses
for session in sessions:
  depositAddress = session.depositAddress
  proxyAddress = session.proxyWallet.address
  
  // Query blockchain for USDC transfers to deposit address
  deposits = checkUSDCDeposits(depositAddress)
  
  for each deposit:
    // Credit proxy wallet via Polymarket API
    creditProxyWallet(proxyAddress, amount)
```

### 3. Frontend Integration

**Components**:
- Dashboard shows proxy wallet info
- Prominent deposit address display
- Warning to only send USDC
- Balance refresh after deposit confirmation
- Shows linked proxy wallet address

**UI Elements**:
- "Get Deposit Address" button
- Warning banner (USDC only, Polygon network)
- Deposit address (large, copyable)
- Linked proxy wallet display
- Balance updates

## Security Considerations

### 1. Private Key Security
- `SERVER_PRIVATE_KEY` never exposed to frontend
- All Polymarket API calls signed server-side
- Keys stored in environment variables only

### 2. Deposit Address Security
- One deposit address per proxy wallet
- Addresses stored in secure session storage
- No private keys for deposit addresses
- Only USDC accepted (token validation)

### 3. Session Security
- Sessions expire after 1 hour
- UUID-based session IDs
- Global session storage (survives serverless cold starts)
- Automatic cleanup of expired sessions

## API Endpoints

### GET `/api/deposit-address`
Get or create deposit address for authenticated user.

**Headers**:
- `x-session-id`: User session ID

**Response**:
```json
{
  "success": true,
  "depositAddress": "0x...",
  "proxyAddress": "0x...",
  "token": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  "chainId": 137,
  "message": "Send USDC to this address to fund your proxy wallet"
}
```

### GET `/api/deposit-monitor`
Check deposit status for authenticated user.

**Headers**:
- `x-session-id`: User session ID

**Response**:
```json
{
  "success": true,
  "status": {
    "hasDepositAddress": true,
    "depositAddress": "0x...",
    "proxyAddress": "0x...",
    "lastChecked": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST `/api/deposit-monitor`
Manually trigger deposit check (for webhooks or admin).

## Integration with Polymarket Relayer

### Production Setup

Replace the mock implementations with real Polymarket relayer integration:

```javascript
// Replace lib/deposit-monitor.js with real blockchain queries
import { AlchemyProvider } from '@ethersproject/providers';

async function checkUSDCDeposits(address) {
  const provider = new AlchemyProvider(137, process.env.ALCHEMY_API_KEY);
  
  // Query for Transfer events to this address
  const filter = {
    address: POLYGON_USDC,
    topics: [
      ethers.id('Transfer(address,address,uint256)'),
      null,
      ethers.zeroPadValue(address, 32)
    ]
  };
  
  const logs = await provider.getLogs(filter);
  
  return logs.map(log => ({
    amount: parseUSDCAmount(log.data),
    blockNumber: log.blockNumber,
    transactionHash: log.transactionHash
  }));
}
```

### Webhook Endpoint

Add webhook support for instant deposit processing:

```javascript
// app/api/webhooks/polymarket/route.js
export async function POST(request) {
  const signature = request.headers.get('x-polymarket-signature');
  
  // Verify webhook signature
  if (!verifyWebhookSignature(signature, request.body)) {
    return errorResponse('Invalid signature', 401);
  }
  
  const { depositAddress, amount, transactionHash } = await request.json();
  
  // Find session with this deposit address
  const session = findSessionByDepositAddress(depositAddress);
  
  if (!session) {
    return errorResponse('Deposit address not found', 404);
  }
  
  // Credit proxy wallet
  await creditProxyWallet(session.proxyWallet.address, amount);
  
  return NextResponse.json({ success: true });
}
```

## Testing

### Mock Mode (Development)

In development, the system uses mock deposit addresses and balances:

```javascript
// Generates random addresses for testing
const mockDepositAddress = ethers.Wallet.createRandom().address;
```

### Production Testing

1. Connect wallet and get proxy wallet
2. Fetch deposit address
3. Send USDC from wallet to deposit address
4. Wait for monitoring to detect deposit
5. Check balances update

## Deployment Checklist

- [ ] Set `SERVER_PRIVATE_KEY` in Vercel
- [ ] Configure `POLYGON_RPC` URL
- [ ] Add webhook endpoint for deposit notifications (recommended)
- [ ] Set up Alchemy or Infura for blockchain queries
- [ ] Test deposit flow end-to-end
- [ ] Monitor deposit processing logs
- [ ] Set up alerts for failed deposits

## Future Enhancements

1. **Real-time Updates**: Use WebSockets for instant balance updates
2. **Multi-token Support**: Accept multiple tokens (USDC, USDT, etc.)
3. **Deposit History**: Track deposit transactions per user
4. **Auto-withdrawal**: Allow users to withdraw funds
5. **Gas Optimization**: Batch deposit processing

