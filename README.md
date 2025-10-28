# Polymarket Farcaster MiniApp

A complete Next.js 14 application for trading on Polymarket via Farcaster MiniApp.

## Features

- **Wallet Connection**: Support for Rabby, MetaMask, and Farcaster wallets
- **Polymarket Authentication**: Secure signature-based authentication
- **Proxy Wallets**: Automatic proxy wallet generation for each user
- **Deposit Addresses**: Safe USDC deposit addresses linked to proxy wallets
- **Balance Tracking**: View balances for proxy wallets
- **Session Management**: In-memory session storage with global persistence
- **Trade Execution**: Place trades via Polymarket CLOB API

## Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Configure environment**:
Create a `.env` file:
```env
POLY_CLOB_HOST=https://clob.polymarket.com
SERVER_PRIVATE_KEY=<your 32-byte hex private key>
FARCASTER_APP_URL=https://your-app.vercel.app
POLYGON_RPC=https://polygon-rpc.com
```

3. **Run development server**:
```bash
npm run dev
```

## Architecture

### API Routes
- `/api/login` - Polymarket authentication
- `/api/proxy` - Proxy wallet creation/retrieval
- `/api/deposit-address` - Get USDC deposit address
- `/api/balances` - Fetch wallet balances
- `/api/trade` - Execute trades
- `/api/deposit-monitor` - Monitor and process deposits

### Components
- `WalletConnect.jsx` - Wallet connection UI
- `Dashboard.jsx` - User dashboard with balances and deposits

### Library Functions
- `lib/sessions.js` - Session management with global storage
- `lib/proxyWallet.js` - Proxy wallet generation
- `lib/polymarket.js` - Polymarket API client
- `lib/deposit-monitor.js` - Deposit monitoring logic

## Proxy Wallet Flow

1. User connects wallet (Rabby/MetaMask/Farcaster)
2. Signs authentication message
3. Backend creates session and fetches/creates proxy wallet
4. User gets deposit address via `/api/deposit-address`
5. User sends USDC to deposit address
6. System monitors deposits and credits proxy wallet
7. User can trade with credited balance

## Deposit Addresses

The app generates unique deposit addresses for each user's proxy wallet:
- One deposit address per proxy wallet
- USDC only (Polygon network)
- Automatically linked to proxy wallet
- Monitored for incoming deposits

## Security

- Private keys never exposed to frontend
- All Polymarket API calls signed with server key
- Session-based authentication
- Expiring sessions with cleanup
- HTTPS-only in production

## Deployment

Deploy to Vercel:
```bash
vercel
```

Set environment variables in Vercel dashboard:
- `SERVER_PRIVATE_KEY`
- `POLY_CLOB_HOST`
- `FARCASTER_APP_URL`
- `POLYGON_RPC`

## Notes

- Proxy wallet SDK packages may need to be installed when available
- Deposit monitoring uses mock implementation (replace with blockchain queries)
- Session storage is in-memory (use Redis for production)
