# Polymarket Farcaster MiniApp

A complete Next.js 14 application for Polymarket Farcaster MiniApp integration.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```
POLY_CLOB_HOST=https://clob.polymarket.com
SERVER_PRIVATE_KEY=<your 32-byte hex private key>
FARCASTER_APP_URL=https://your-app.vercel.app
```

3. Run the development server:
```bash
npm run dev
```

## Project Structure

- `/app/api` - API routes for login, balances, deposit, and trade
- `/components` - React components for wallet connection and dashboard
- `/lib` - Utility functions for sessions, proxy wallets, and Polymarket integration

## Features

- Wallet connection (Rabby, MetaMask, Farcaster)
- Polymarket authentication
- View balances
- Generate proxy wallet addresses
- Place trades

## Note

The Polymarket SDK packages mentioned in the requirements may not be available on npm yet. This implementation uses ethers.js directly. To integrate the official SDK, update the imports in `lib/polymarket.js` when available.

# Polybet
