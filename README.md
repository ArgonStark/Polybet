# PolyBet - Farcaster Mini-App for Polymarket Trading

A Farcaster mini-app that enables seamless trading on Polymarket directly from Farcaster, integrating Privy for wallet authentication and Polymarket's CLOB for trading execution.

## 🚀 Features

- **Wallet Authentication**: Sign in with Privy (supports MetaMask, Rabby, Farcaster native wallets)
- **Proxy Wallet Architecture**: Unified trading and deposit wallet per user
- **Real-time Balances**: View USDC balances and positions
- **Deposit & Withdraw**: Seamless USDC deposits via Privy bridge
- **Market Trading**: Trade on Polymarket markets directly from Farcaster
- **Farcaster Frame Support**: Works as both web app and Farcaster frame

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- Privy App ID ([Get one here](https://privy.io))
- Polymarket API credentials
- Polymarket Relayer private key

## 🔧 Setup

1. **Clone and install dependencies:**

```bash
npm install
```

2. **Configure environment variables:**

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:
- `NEXT_PUBLIC_PRIVY_APP_ID`: Your Privy application ID
- `POLYMARKET_API_KEY`: Your Polymarket API key
- `POLYMARKET_RELAYER_KEY`: Your relayer private key (for signing trades)
- `NEXT_PUBLIC_BASE_URL`: Your app's public URL (for Farcaster frames)

3. **Run the development server:**

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🏗️ Architecture

### Core Flow

1. **Authentication**: User signs in with Privy wallet
2. **Session Creation**: Backend creates/retrieves session and proxy wallet
3. **Proxy Wallet**: Deterministic proxy wallet generated from relayer key + user address
4. **Trading & Deposits**: All operations use the same proxy wallet address
5. **Balance Sync**: Polymarket relayer automatically credits deposits

### Project Structure

```
PolyBet2/
├── app/
│   ├── api/
│   │   ├── login/          # Session creation endpoint
│   │   ├── proxy/          # Proxy wallet retrieval
│   │   ├── balances/       # Balance fetching
│   │   ├── markets/        # Market data
│   │   ├── trade/          # Place orders
│   │   └── deposit-address/ # Get deposit address
│   ├── frame/              # Farcaster frame handler
│   ├── layout.tsx          # Root layout with Privy provider
│   └── page.tsx            # Main app page
├── components/
│   ├── Dashboard.tsx       # Main trading dashboard
│   ├── DepositButton.tsx   # Deposit USDC interface
│   └── WalletConnect.tsx   # Privy connect button
├── lib/
│   ├── polymarket.ts       # Polymarket CLOB client
│   ├── sessions.ts         # Session management
│   └── proxyWallet.ts      # Proxy wallet generation
└── package.json
```

## 🔑 Key Concepts

### Proxy Wallet

The proxy wallet is a deterministic wallet generated for each user that:
- Serves as their trading identity on Polymarket
- Functions as their deposit address for USDC
- Is controlled by your backend relayer key
- Enables gasless trading (relayer pays gas)

### Session Management

Sessions link a user's Privy wallet to their proxy wallet. Sessions are:
- Stored in-memory (use Redis for production)
- Automatically cleaned up after 24 hours
- Used to authenticate API requests

### Deposit Flow

1. User clicks "Deposit USDC"
2. App fetches their proxy wallet address
3. Privy modal opens for bridging/transferring USDC
4. User sends USDC to proxy address on Base
5. Polymarket relayer detects and credits balance

### Trading Flow

1. User selects a market and creates an order
2. Backend signs order with relayer key
3. Order submitted via Polymarket CLOB API
4. Trade executes on-chain via relayer

## 📚 API Endpoints

### `POST /api/login`
Creates a new session and proxy wallet.

**Request:**
```json
{
  "walletAddress": "0x..."
}
```

**Response:**
```json
{
  "sessionId": "...",
  "proxyAddress": "0x..."
}
```

### `GET /api/proxy`
Get proxy wallet for current session.

**Headers:**
- `x-session-id: <sessionId>`

### `GET /api/balances`
Fetch user balances.

**Headers:**
- `x-session-id: <sessionId>`

### `POST /api/trade`
Place a trade order.

**Headers:**
- `x-session-id: <sessionId>`

**Body:**
```json
{
  "tokenID": "...",
  "price": "0.5",
  "side": "YES",
  "amount": "1000000"
}
```

### `GET /api/deposit-address`
Get deposit address (proxy wallet).

**Headers:**
- `x-session-id: <sessionId>`

## 🎨 Farcaster Frame Support

The app includes a `/frame` route that serves Farcaster frame metadata. When embedded in a Farcaster client:

- Users can click the frame button to open the full app
- Frame redirects to the main PolyBet interface
- Works seamlessly within Farcaster feeds

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

The app uses Next.js App Router and is optimized for Vercel's edge functions.

### Environment Variables for Production

Make sure to set all required environment variables in your hosting platform. Never commit `.env` files.

## 🔒 Security Notes

- **Relayer Key**: Keep `POLYMARKET_RELAYER_KEY` secure and never expose it to the frontend
- **Session Storage**: Use Redis or similar for production session storage
- **API Auth**: Implement proper request signing for Polymarket API calls
- **Rate Limiting**: Add rate limiting to API routes in production

## 📖 Resources

- [Privy Documentation](https://docs.privy.io)
- [Polymarket CLOB Client](https://github.com/Polymarket/clob-client)
- [Farcaster Mini Apps](https://docs.farcaster.xyz/build-a-mini-app/introduction)
- [Polymarket Relayer Docs](https://github.com/Polymarket/builder-relayer-client)

## 🐛 Troubleshooting

### "Relayer key not configured"
Make sure `POLYMARKET_RELAYER_KEY` is set in your `.env` file.

### "Failed to create proxy wallet"
Check that your Polymarket API credentials are correct and have proper permissions.

### Privy login not working
Verify `NEXT_PUBLIC_PRIVY_APP_ID` is correct and your Privy app is configured for your domain.

## 📝 License

MIT

# Polybet
# Polybet
