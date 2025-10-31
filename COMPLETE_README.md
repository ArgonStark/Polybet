# Farcaster-Polymarket Mini

A mini application for trading on Polymarket directly via Farcaster integration. This project consists of a FastAPI backend for handling trading operations and a Next.js frontend for the user interface.

## Project Structure

```
farcaster-polymarket-mini/
├── backend/
│   ├── app.py              # FastAPI server
│   ├── clob_client.py      # Polymarket integration
│   ├── wallet_utils.py     # Wallet & SafeProxy
│   ├── requirements.txt    # Python dependencies
│   ├── .env               # Backend config
│   └── README.md          # Backend docs
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx     # Root layout
│   │   ├── page.tsx       # Main trading UI
│   │   ├── providers.tsx  # Wagmi/React Query
│   │   └── globals.css    # Global styles
│   ├── components/
│   │   ├── MarketCard.tsx # Market display
│   │   └── OrderForm.tsx  # Order placement
│   ├── lib/
│   │   ├── api.ts         # Backend API client
│   │   └── store.ts       # State management
│   ├── package.json       # Node dependencies
│   ├── next.config.js     # Next.js config
│   ├── tailwind.config.ts # Tailwind config
│   ├── tsconfig.json      # TypeScript config
│   └── .env.local         # Frontend config
│
└── COMPLETE_README.md     # This file
```

## Getting Started

### Prerequisites

- Python 3.8+ (for backend)
- Node.js 18+ (for frontend)
- npm or yarn (for frontend)
- A Web3 wallet (MetaMask, WalletConnect, etc.)
- WalletConnect Project ID (get from https://cloud.walletconnect.com)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment variables:
```bash
cp .env.example .env  # If you have an example file
# Edit .env with your configuration
```

5. Run the server:
```bash
python app.py
# Or with uvicorn directly:
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
# Or
yarn install
```

3. Configure environment variables:
```bash
cp .env.local.example .env.local  # If you have an example file
# Edit .env.local with your configuration
```

4. Run the development server:
```bash
npm run dev
# Or
yarn dev
```

The frontend will be available at `http://localhost:3000`

## Features

- **Market Display**: View Polymarket markets with YES/NO prices
- **Order Placement**: Place BUY/SELL orders on Polymarket
- **Wallet Integration**: Connect your wallet using Wagmi and ConnectKit
- **SafeProxy Support**: Optional SafeProxy for secure trading
- **Real-time Updates**: React Query for efficient data fetching

## API Endpoints

### Backend API

- `GET /` - API info
- `GET /health` - Health check
- `POST /api/markets/{market_id}` - Get market information
- `POST /api/orders` - Place an order
- `GET /api/orders/{user_address}` - Get user orders
- `POST /api/safe-proxy/deploy` - Deploy a SafeProxy
- `GET /api/safe-proxy/{user_address}` - Get user's SafeProxy address

## Technology Stack

### Backend
- **FastAPI**: Modern Python web framework
- **Web3.py**: Ethereum blockchain interactions
- **Uvicorn**: ASGI server
- **Python-dotenv**: Environment variable management

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe JavaScript
- **Wagmi**: React Hooks for Ethereum
- **ConnectKit**: Wallet connection UI
- **TanStack Query**: Data fetching and caching
- **Tailwind CSS**: Utility-first CSS framework
- **Zustand**: Lightweight state management

## Development

### Backend Development

The backend uses FastAPI for the API server. Key files:
- `app.py`: Main FastAPI application and routes
- `clob_client.py`: Polymarket API client
- `wallet_utils.py`: Wallet and SafeProxy management

### Frontend Development

The frontend uses Next.js with the App Router. Key files:
- `app/page.tsx`: Main trading interface
- `components/MarketCard.tsx`: Market display component
- `components/OrderForm.tsx`: Order placement form
- `lib/api.ts`: Backend API client
- `lib/store.ts`: Global state management

## Configuration

### Backend (.env)

```env
POLYMARKET_API_URL=https://clob.polymarket.com
POLYMARKET_RPC_URL=https://polygon-rpc.com
ALLOWED_ORIGINS=http://localhost:3000
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

## Notes

- Most wallet operations require client-side signing for security
- SafeProxy deployment requires a factory contract
- Order placement needs integration with Polymarket smart contracts
- The current implementation includes placeholder functions that need to be completed with actual contract interactions

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

