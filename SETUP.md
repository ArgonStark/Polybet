# Setup Instructions

## 1. Install Dependencies

```bash
npm install
```

## 2. Environment Configuration

Create a `.env` file in the root directory with:

```env
POLY_CLOB_HOST=https://clob.polymarket.com
SERVER_PRIVATE_KEY=0x<your 32-byte hex private key>
FARCASTER_APP_URL=https://your-app.vercel.app
```

## 3. Run Development Server

```bash
npm run dev
```

The app will be available at http://localhost:3000

## 4. Deploy to Vercel

```bash
vercel
```

Make sure to add your environment variables in the Vercel dashboard.

## Architecture

- **Frontend**: Next.js 14 with App Router
- **Backend**: API Routes in `/app/api`
- **Session Management**: In-memory sessions (for demo, use Redis in production)
- **Proxy Wallets**: Deterministic wallet generation based on user address
- **Authentication**: Ethereum signature verification

## Features Implemented

✅ Wallet connection (Rabby, MetaMask, Farcaster)
✅ Polymarket authentication
✅ View balances
✅ Generate proxy wallet addresses
✅ Place trades (basic implementation)

## Notes

- The Polymarket official SDK packages may not be available on npm yet
- This implementation uses ethers.js directly for signing
- Session storage is in-memory (implement Redis for production)
- Replace the placeholder Polymarket client implementation when the official SDK is available
