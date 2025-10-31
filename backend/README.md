# 🎲 Farcaster Polymarket Mini App

A Python backend for a Farcaster Mini App that enables seamless Polymarket trading with wallet management and SafeProxy integration on Polygon.

## 📋 Overview

This application provides a FastAPI backend that:
- ✅ Authenticates Farcaster users via Quick Auth
- ✅ Creates SafeProxy wallets on Polygon for secure trading
- ✅ Integrates with Polymarket CLOB for real-time market data
- ✅ Enables limit buy/sell orders in prediction markets
- ✅ Manages USDC deposits and trading balances

## 🏗️ Architecture

```
┌─────────────────────┐
│  Farcaster Client   │  (Mobile/Web)
│  (React + SDK)      │
└──────────┬──────────┘
           │ HTTPS
           ↓
┌─────────────────────┐
│   FastAPI Backend   │  (This App)
│  - Authentication   │
│  - Wallet Manager   │
│  - CLOB Client      │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    ↓             ↓
┌────────┐   ┌──────────┐
│Polygon │   │Polymarket│
│ Chain  │   │   CLOB   │
└────────┘   └──────────┘
```

## 📁 Project Structure

```
farcaster-polymarket-mini/
├── app.py                 # Main FastAPI application
├── clob_client.py        # Polymarket CLOB integration
├── wallet_utils.py       # Wallet management & SafeProxy
├── requirements.txt      # Python dependencies
├── .env                  # Environment configuration
└── README.md            # This file
```

## 🚀 Quick Start

### Prerequisites

- Python 3.9 or higher
- Polygon wallet with MATIC for gas fees
- Polymarket account (Email wallet or MetaMask)
- USDC on Polygon for trading

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd farcaster-polymarket-mini
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your credentials
```

5. **Run the server**
```bash
python app.py
```

The API will be available at `http://localhost:8000`

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```bash
# Server Configuration
ENVIRONMENT=development
PORT=8000

# Polygon Network
POLYGON_RPC_URL=https://polygon-rpc.com

# Deployer Account (for SafeProxy creation)
DEPLOYER_PRIVATE_KEY=your_deployer_private_key_here

# Polymarket Credentials
POLYMARKET_PRIVATE_KEY=your_polymarket_private_key
POLYMARKET_FUNDER_ADDRESS=your_polymarket_address
POLYMARKET_SIGNATURE_TYPE=1  # 1 for Email/Magic, 0 for EOA
```

### Signature Types

- **Type 0**: Standard EOA (MetaMask, Hardware Wallets)
- **Type 1**: Email/Magic Wallet (Recommended for Farcaster)
- **Type 2**: Browser Wallet Proxy

## 📡 API Endpoints

### Health Check
```http
GET /
```
Returns service status.

### Connect Wallet
```http
POST /connect
Content-Type: application/json

{
  "fid": 12345,
  "address": "0x..."
}
```

Creates/retrieves a SafeProxy wallet and establishes a session.

**Response:**
```json
{
  "success": true,
  "session_id": "session_12345_0x...",
  "safe_address": "0x...",
  "message": "Wallet connected successfully"
}
```

### Get Markets
```http
GET /markets
```

Returns 2-4 featured prediction markets.

**Response:**
```json
{
  "success": true,
  "markets": [
    {
      "condition_id": "...",
      "question": "Will X happen?",
      "tokens": [
        {
          "token_id": "...",
          "outcome": "Yes",
          "price": 0.55
        }
      ]
    }
  ]
}
```

### Get Market Details
```http
GET /markets/{token_id}
```

Get detailed orderbook and pricing for a specific token.

### Place Order
```http
POST /order
Content-Type: application/json

{
  "session_id": "session_...",
  "token_id": "token_...",
  "side": "BUY",
  "price": 0.45,
  "size": 10.0
}
```

Places a limit order on Polymarket.

**Response:**
```json
{
  "success": true,
  "order": {
    "orderID": "...",
    "status": "live"
  },
  "message": "BUY order placed for 10.0 @ $0.45"
}
```

### Cancel Order
```http
POST /cancel
Content-Type: application/json

{
  "session_id": "session_...",
  "order_id": "order_..."  // Optional, omit to cancel all
}
```

### Get Orders
```http
GET /orders
Headers:
  session_id: session_...
```

Returns user's open orders.

### Check Balance
```http
GET /balance
Headers:
  session_id: session_...
```

Returns USDC balance in SafeProxy wallet.

## 🔐 Security Considerations

### Private Keys
- **Never commit** private keys to version control
- Use environment variables or secure key management
- The deployer key only needs ~0.1 MATIC for gas

### Session Management
- Current implementation uses in-memory sessions (demo only)
- **Production**: Use Redis, PostgreSQL, or similar
- Implement proper session expiration and cleanup

### API Authentication
- Implement rate limiting for production
- Validate Farcaster Quick Auth tokens on sensitive endpoints
- Use HTTPS in production

## 🎯 Token Allowances (MetaMask/EOA Users)

Before trading with MetaMask or hardware wallets, you must approve token spending:

### Required Approvals

**USDC Token:** `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`

Approve for:
- Exchange: `0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E`
- NegRisk: `0xC5d563A36AE78145C45a50134d48A1215220f80a`
- NegRisk Adapter: `0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296`

**Conditional Token:** `0x4D97DCd97eC945f40cF65F87097ACe5EA0476045`

Approve for the same three contracts.

### Setting Allowances

Use this Python script or do it manually via Polygonscan:

```python
from wallet_utils import WalletManager

wallet = WalletManager()

# Approve USDC
wallet.approve_usdc_spending(
    spender="0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E",
    amount=1000000  # Large amount for convenience
)
```

**Note:** Email/Magic wallets set allowances automatically.

## 📱 Frontend Integration

The backend is designed to work with a Farcaster Mini App frontend using the official SDK.

### Example Frontend Code (React)

```javascript
import { sdk } from '@farcaster/miniapp-sdk';

// Initialize the Mini App
await sdk.actions.ready();

// Get authenticated user
const { token } = await sdk.quickAuth.getToken();

// Connect wallet
const response = await fetch('http://localhost:8000/connect', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    fid: context.user.fid,
    address: context.user.walletAddress
  })
});

const { session_id, safe_address } = await response.json();
```

### Wallet Integration (Wagmi)

```javascript
import { useAccount } from 'wagmi';

function TradingInterface() {
  const { address, isConnected } = useAccount();
  
  // Place order
  const placeOrder = async () => {
    await fetch('http://localhost:8000/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id,
        token_id: selectedToken,
        side: 'BUY',
        price: 0.55,
        size: 10
      })
    });
  };
}
```

## 🧪 Testing

### Manual Testing with cURL

```bash
# Health check
curl http://localhost:8000/

# Connect wallet
curl -X POST http://localhost:8000/connect \
  -H "Content-Type: application/json" \
  -d '{"fid": 123, "address": "0x1234..."}'

# Get markets
curl http://localhost:8000/markets

# Place order
curl -X POST http://localhost:8000/order \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "session_...",
    "token_id": "...",
    "side": "BUY",
    "price": 0.45,
    "size": 10
  }'
```

### Python Testing

```python
import requests

# Connect
response = requests.post('http://localhost:8000/connect', json={
    'fid': 123,
    'address': '0x...'
})
session_id = response.json()['session_id']

# Get markets
markets = requests.get('http://localhost:8000/markets').json()

# Place order
order = requests.post('http://localhost:8000/order', json={
    'session_id': session_id,
    'token_id': markets['markets'][0]['tokens'][0]['token_id'],
    'side': 'BUY',
    'price': 0.50,
    'size': 5.0
}).json()

print(f"Order placed: {order}")
```

## 📊 Logging

All trading actions are logged to the console:

```
2025-10-31 10:00:00 - INFO - 🚀 Starting Farcaster Polymarket Mini App
2025-10-31 10:00:01 - INFO - ✅ Connected to Polygon (Chain ID: 137)
2025-10-31 10:00:05 - INFO - 📊 Placing BUY order
2025-10-31 10:00:05 - INFO -    Token: 0x123...
2025-10-31 10:00:05 - INFO -    Price: $0.55
2025-10-31 10:00:05 - INFO -    Size: 10.0 USDC
2025-10-31 10:00:06 - INFO - ✅ Order placed successfully
2025-10-31 10:00:06 - INFO -    Order ID: abc123
```

## 🔗 Resources

### Official Documentation
- [Farcaster Mini Apps](https://miniapps.farcaster.xyz/docs/getting-started)
- [Polymarket CLOB Client](https://github.com/Polymarket/py-clob-client)
- [SafeProxy Contract](https://polygonscan.com/address/0xaacfeea03eb1561c4e67d661e40682bd20e3541b#code)
- [Polymarket Markets API](https://docs.polymarket.com/developers/gamma-markets-api/get-markets)

### Tools
- [Polygon RPC](https://polygon.technology/developers)
- [Alchemy](https://www.alchemy.com/) - Enhanced RPC provider
- [Infura](https://www.infura.io/) - Web3 infrastructure

## 🐛 Troubleshooting

### "No trading credentials found"
- Check `.env` file has `POLYMARKET_PRIVATE_KEY` and `POLYMARKET_FUNDER_ADDRESS`
- Verify signature type matches your wallet type

### "Failed to place order"
- Ensure USDC allowances are set (for MetaMask/EOA)
- Check sufficient USDC balance
- Verify price is between 0.00 and 1.00

### "Not connected to Polygon network"
- Check `POLYGON_RPC_URL` is correct
- Try alternative RPC: `https://polygon-mainnet.infura.io/v3/YOUR_KEY`
- Verify network connectivity

### "Invalid session"
- Session may have expired (in-memory storage)
- Call `/connect` again to create new session

## 🚀 Production Deployment

### Recommendations

1. **Use a proper database** for session storage (PostgreSQL, MongoDB)
2. **Add authentication middleware** to verify Farcaster Quick Auth tokens
3. **Implement rate limiting** to prevent abuse
4. **Use environment-specific configs** for dev/staging/prod
5. **Enable HTTPS** with SSL certificates
6. **Monitor logs** with services like Datadog or Sentry
7. **Use managed RPC** like Alchemy or Infura
8. **Set up CI/CD** for automated deployments

### Example Production .env

```bash
ENVIRONMENT=production
PORT=443

POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
DEPLOYER_PRIVATE_KEY=...
POLYMARKET_PRIVATE_KEY=...
POLYMARKET_FUNDER_ADDRESS=...

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Monitoring
SENTRY_DSN=https://...
```

## 📄 License

MIT License - feel free to use this code for your own projects!

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 💬 Support

For issues and questions:
- Open a GitHub issue
- Check Farcaster docs: https://miniapps.farcaster.xyz
- Check Polymarket docs: https://docs.polymarket.com

---

**Built with ❤️ for the Farcaster community**