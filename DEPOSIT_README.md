# USDC Deposit Feature

## Overview

The USDC deposit feature allows users to deposit USDC from their connected wallet (MetaMask, Rabby, or Farcaster wallet) directly to their Polymarket proxy wallet on the Base network.

## Architecture

### Frontend (`components/DepositButton.jsx`)

**Features:**
- Input field for USDC amount (with 6 decimal precision)
- Real-time status updates (idle, pending, success, error)
- Transaction hash display
- Automatic balance refresh after successful deposit
- Network validation and instructions

**Flow:**
1. User enters amount and clicks "Deposit USDC"
2. Component validates amount and fetches proxy wallet from session
3. Calls `/api/deposit` to validate deposit parameters
4. Executes USDC transfer transaction via user's wallet
5. Waits for transaction confirmation
6. Refreshes balances on success

### Backend (`app/api/deposit/route.js`)

**Responsibilities:**
- Session validation
- Proxy wallet verification from session
- Deposit address validation
- Returns deposit instructions to frontend

**Security:**
- Validates user session before allowing deposit
- Verifies proxy wallet exists in session
- Ensures deposit address matches proxy wallet
- No private key exposure

## Configuration

### Environment Variables

Add to `.env`:

```bash
# Base network RPC endpoint
BASE_RPC=https://mainnet.base.org

# Or use a provider like Alchemy or Infura
# BASE_RPC=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

### USDC Token Address

The Base USDC token address is hardcoded:
```javascript
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
```

## Usage

### Adding to Dashboard

The `DepositButton` is already integrated into the Dashboard. It appears automatically when:
- User is authenticated (has sessionId)
- User has a proxy wallet

### Manual Integration

```jsx
import DepositButton from './components/DepositButton';

function MyComponent() {
  return (
    <DepositButton 
      address={userAddress}
      sessionId={sessionId}
      onDepositSuccess={() => console.log('Deposit complete!')}
    />
  );
}
```

## Network Requirements

Users must:
1. Be connected to Base network (Chain ID: 8453)
2. Have USDC balance on Base network
3. Approve the transaction when prompted by their wallet

## Transaction Flow

```
1. User enters amount → 100.50 USDC
2. Input validation → amount > 0
3. Convert to wei → 100500000 (100.50 * 10^6)
4. Fetch proxy wallet from session
5. Validate with backend (/api/deposit)
6. Execute transfer: USDC.transfer(proxyAddress, amountInWei)
7. Wait for confirmation
8. Show success + transaction hash
9. Refresh balances
```

## Status States

### `idle`
- Default state
- Ready for input

### `pending`
- Transaction in progress
- Waiting for wallet confirmation
- Waiting for blockchain confirmation

### `success`
- Transaction confirmed
- Shows transaction hash
- Auto-refreshes balances
- Auto-resets after 5 seconds

### `error`
- Transaction failed
- Shows error message
- Auto-resets after 5 seconds

## Console Logging

All actions log to console with `[DepositButton]` prefix:
- `[DepositButton] Starting deposit for: <address>`
- `[DepositButton] Amount: <amount>`
- `[DepositButton] User wallet address: <address>`
- `[DepositButton] Proxy wallet address: <address>`
- `[DepositButton] Amount in wei: <amount>`
- `[DepositButton] Deposit validated, executing transfer...`
- `[DepositButton] Transaction sent: <hash>`
- `[DepositButton] Transaction confirmed: <receipt>`

## Error Handling

Common errors and solutions:

### "Please connect your wallet and authenticate first"
- **Solution:** User must complete login flow first

### "Please enter a valid amount"
- **Solution:** Enter a positive number greater than 0

### "No proxy wallet found"
- **Solution:** Proxy wallet must be created via `/api/proxy`

### "Invalid deposit address"
- **Solution:** Deposit address must match proxy wallet

### Transaction fails in wallet
- **Solution:** Check that user has sufficient USDC balance and is on Base network

## Testing

### Prerequisites
1. Connected to Base network
2. Have USDC on Base network
3. Authenticated user with proxy wallet

### Test Flow
1. Navigate to Dashboard
2. Click "Sign In with Polymarket"
3. Verify proxy wallet is loaded
4. Enter deposit amount (e.g., 10.00 USDC)
5. Click "Deposit USDC"
6. Approve transaction in wallet
7. Wait for confirmation
8. Verify balances refresh
9. Check transaction hash in UI

## Security Considerations

1. **No Private Keys**: All transactions signed by user's wallet
2. **Session Validation**: Backend validates session before allowing deposit
3. **Proxy Wallet Verification**: Ensures deposit goes to correct address
4. **No Server-Side Signing**: User must sign with their wallet
5. **Amount Validation**: Prevents invalid amounts

## Future Enhancements

- [ ] Support for multiple tokens (USDT, DAI)
- [ ] Approve/transfer pattern for better UX
- [ ] Gas estimation before transaction
- [ ] Transaction history
- [ ] Withdrawal feature
- [ ] Support for layer 2 networks (Polygon, Arbitrum)

