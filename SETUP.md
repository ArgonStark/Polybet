# Setup Guide

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   
   Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` with your credentials:
   - Get your Privy App ID from [https://privy.io](https://privy.io)
   - Get your Polymarket API credentials from Polymarket
   - Set your relayer private key (used for signing trades)

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Environment Variables Explained

### `NEXT_PUBLIC_PRIVY_APP_ID`
- Required for Privy authentication
- Get this from your Privy dashboard after creating an app
- Must be public (starts with `NEXT_PUBLIC_`) to work in the browser

### `POLYMARKET_API_KEY`
- Your Polymarket API key
- Used for authenticating API requests
- Keep this secret (server-side only)

### `POLYMARKET_RELAYER_KEY`
- Your relayer private key
- Used for signing trades and generating proxy wallets
- **NEVER expose this to the frontend**
- Must be a valid Ethereum private key (64 hex characters, no 0x prefix)

### `NEXT_PUBLIC_POLYMARKET_API_URL`
- Default: `https://clob.polymarket.com`
- Only change if using a testnet or custom endpoint

### `NEXT_PUBLIC_RELAYER_API_URL`
- Default: `https://clob.polymarket.com`
- Polymarket relayer API endpoint

### `NEXT_PUBLIC_BASE_URL`
- Your app's public URL
- Used for Farcaster frame metadata
- In development: `http://localhost:3000`
- In production: your actual domain (e.g., `https://polybet.xyz`)

### `NEXT_PUBLIC_USDC_ADDRESS`
- Default: `0x833589fcd6edb6e08f4c7c32d4f71b54bda02913` (Base USDC)
- Only change if using a different network or testnet

## Testing the Flow

1. **Start the app** and click "Sign in with Privy"
2. **Connect a wallet** (MetaMask, Rabby, etc.)
3. **View your dashboard** - you should see:
   - Your wallet address
   - Proxy wallet address (generated automatically)
   - USDC balance (will be 0 initially)
4. **Click "Deposit USDC"** to see your deposit address
5. **Send USDC** to the proxy address on Base network
6. **Refresh balances** to see your deposit credited

## Next Steps

- Customize the UI styling in `app/globals.css` and components
- Add more markets to the MarketsList component
- Implement trading UI for specific markets
- Set up production deployment on Vercel
- Configure Farcaster frame metadata for better frame experience

## Troubleshooting

### "Relayer key not configured"
- Make sure `POLYMARKET_RELAYER_KEY` is set in `.env`
- Ensure it's a valid private key (64 hex characters)

### Privy login not working
- Verify `NEXT_PUBLIC_PRIVY_APP_ID` is correct
- Check Privy dashboard for domain restrictions
- Make sure your localhost is allowed in Privy settings

### API errors
- Check that all environment variables are set
- Verify Polymarket API credentials are correct
- Check network connectivity

### Build errors
- Run `npm install` again to ensure all dependencies are installed
- Delete `.next` folder and try again: `rm -rf .next && npm run build`

