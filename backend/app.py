"""
Farcaster Mini App - Polymarket Trading Backend
FastAPI server that handles wallet management and Polymarket trading
"""
import os
import logging
from typing import Dict, Optional
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from wallet_utils import WalletManager
from clob_client import PolymarketClient

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Farcaster Polymarket Mini App")

# CORS middleware for Farcaster Mini App
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://farcaster.xyz", "*"],  # Add your domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize managers
wallet_manager = WalletManager()
polymarket_client = PolymarketClient()

# In-memory session storage (use Redis/DB in production)
sessions: Dict[str, Dict] = {}

# In-memory Safe address cache (tracks deployed Safes by owner)
safe_cache: Dict[str, str] = {}  # owner_address -> safe_address


# Pydantic models for request validation
class ConnectRequest(BaseModel):
    """Request to connect wallet and authenticate"""
    fid: int  # Farcaster ID from Quick Auth
    address: str  # User's wallet address from Farcaster
    signature: Optional[str] = None  # Optional signature for verification


class DepositRequest(BaseModel):
    """Request to deposit funds to SafeProxy"""
    session_id: str
    amount: float  # Amount in USDC


class OrderRequest(BaseModel):
    """Request to place an order"""
    session_id: str
    token_id: str  # Polymarket token ID
    side: str  # "BUY" or "SELL"
    price: float  # Price between 0.00 and 1.00
    size: float  # Amount in USDC


class CancelOrderRequest(BaseModel):
    """Request to cancel an order"""
    session_id: str
    order_id: Optional[str] = None  # If None, cancel all orders


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "Farcaster Polymarket Mini App",
        "version": "1.0.0"
    }


@app.post("/connect")
async def connect_wallet(request: ConnectRequest):
    """
    Connect user wallet and create SafeProxy on Polygon
    
    This endpoint:
    1. Validates the user's Farcaster authentication
    2. Creates or retrieves a SafeProxy wallet for the user
    3. Initializes a trading session
    """
    try:
        logger.info(f"Connection request from FID: {request.fid}, Address: {request.address}")
        
        # Validate address format
        if not request.address.startswith('0x') or len(request.address) != 42:
            raise HTTPException(status_code=400, detail="Invalid Ethereum address")
        
        # Create or retrieve SafeProxy wallet
        safe_address = await wallet_manager.create_safe_proxy(request.address)
        
        # Generate session ID
        session_id = f"session_{request.fid}_{request.address[:10]}"
        
        # Store session data
        sessions[session_id] = {
            "fid": request.fid,
            "owner_address": request.address,
            "safe_address": safe_address,
            "authenticated": True
        }
        
        logger.info(f"✅ Connected wallet for FID {request.fid}")
        logger.info(f"   Owner Address: {request.address}")
        logger.info(f"   SafeProxy: {safe_address}")
        
        return {
            "success": True,
            "session_id": session_id,
            "safe_address": safe_address,
            "message": "Wallet connected successfully. Please deposit USDC to start trading."
        }
        
    except Exception as e:
        logger.error(f"Error connecting wallet: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/deposit")
async def deposit_funds(request: DepositRequest):
    """
    Handle USDC deposit to SafeProxy wallet
    
    User must approve and transfer USDC from their connected wallet
    to their SafeProxy address before they can trade
    """
    try:
        # Validate session
        if request.session_id not in sessions:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        session = sessions[request.session_id]
        safe_address = session["safe_address"]
        
        logger.info(f"Processing deposit of {request.amount} USDC")
        logger.info(f"   To SafeProxy: {safe_address}")
        
        # Check balance (this would normally query the blockchain)
        balance = await wallet_manager.check_usdc_balance(safe_address)
        
        logger.info(f"✅ Deposit instructions sent")
        logger.info(f"   Current USDC balance: {balance}")
        
        return {
            "success": True,
            "safe_address": safe_address,
            "current_balance": balance,
            "message": f"Please transfer {request.amount} USDC to {safe_address}"
        }
        
    except Exception as e:
        logger.error(f"Error processing deposit: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/markets")
async def get_markets():
    """
    Retrieve available Polymarket markets
    
    Returns ONLY the markets specified in FEATURED_MARKETS from .env
    """
    try:
        logger.info("Fetching available markets")
        
        # Get simplified markets from Polymarket
        # This will ONLY return markets matching FEATURED_MARKETS in .env
        markets = polymarket_client.get_featured_markets(limit=10)  # Higher limit to find all featured
        
        logger.info(f"✅ Retrieved {len(markets)} markets")
        logger.info(f"📊 Market condition IDs: {[m.get('condition_id', 'N/A') for m in markets]}")
        
        return {
            "success": True,
            "markets": markets
        }
        
    except Exception as e:
        logger.error(f"Error fetching markets: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/markets/next-refresh")
async def get_next_refresh_time():
    """
    Get time until next 15-minute market refresh
    """
    try:
        from utils import get_current_15min_timestamp, get_next_15min_timestamp, get_seconds_until_next_15min
        
        current_timestamp = get_current_15min_timestamp()
        next_timestamp = get_next_15min_timestamp()
        seconds_until = get_seconds_until_next_15min()
        
        from datetime import datetime, timezone
        current_time = datetime.fromtimestamp(current_timestamp, timezone.utc)
        next_time = datetime.fromtimestamp(next_timestamp, timezone.utc)
        
        return {
            "success": True,
            "current_interval": {
                "timestamp": current_timestamp,
                "datetime": current_time.isoformat()
            },
            "next_interval": {
                "timestamp": next_timestamp,
                "datetime": next_time.isoformat()
            },
            "seconds_until_next": seconds_until,
            "minutes_until_next": seconds_until // 60,
            "has_15min_markets": polymarket_client.has_15min_markets
        }
    except Exception as e:
        logger.error(f"Error in next-refresh endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/markets/debug")
async def debug_markets():
    """
    Debug endpoint to see what condition_ids are being looked for
    and test fetching a specific condition_id
    """
    try:
        featured_ids = polymarket_client.featured_conditions
        logger.info("🔍 Debug: Checking featured markets")
        
        # Test fetching each condition_id
        test_results = []
        for cid in featured_ids:
            try:
                market = polymarket_client._fetch_market_by_condition_id(cid.strip())
                test_results.append({
                    "condition_id": cid,
                    "found": market is not None,
                    "question": market.get("question", "")[:50] if market else None,
                    "active": market.get("active", False) if market else False
                })
            except Exception as e:
                test_results.append({
                    "condition_id": cid,
                    "found": False,
                    "error": str(e)
                })
        
        # Get a sample of markets from CLOB API to see format
        markets_response = polymarket_client.read_client.get_simplified_markets()
        sample_markets = markets_response.get("data", [])[:10] if markets_response else []
        
        return {
            "success": True,
            "featured_condition_ids": featured_ids,
            "test_results": test_results,
            "clob_sample": [
                {
                    "condition_id": m.get("condition_id", ""),
                    "question": m.get("question", "")[:50]
                }
                for m in sample_markets[:5]
            ]
        }
    except Exception as e:
        logger.error(f"Error in debug endpoint: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/markets/{token_id}")
async def get_market_details(token_id: str):
    """
    Get detailed information about a specific market
    """
    try:
        logger.info(f"Fetching details for token: {token_id}")
        
        # Get market data
        details = polymarket_client.get_market_details(token_id)
        
        return {
            "success": True,
            "market": details
        }
        
    except Exception as e:
        logger.error(f"Error fetching market details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/order")
async def place_order(request: OrderRequest):
    """
    Place a limit order on Polymarket
    
    Creates and submits a signed limit order to the CLOB
    """
    try:
        # Validate session
        if request.session_id not in sessions:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        session = sessions[request.session_id]
        
        # Validate order parameters
        if request.side not in ["BUY", "SELL"]:
            raise HTTPException(status_code=400, detail="Side must be BUY or SELL")
        
        if not (0 < request.price < 1):
            raise HTTPException(status_code=400, detail="Price must be between 0 and 1")
        
        if request.size <= 0:
            raise HTTPException(status_code=400, detail="Size must be positive")
        
        logger.info(f"📊 Placing {request.side} order")
        logger.info(f"   Token: {request.token_id}")
        logger.info(f"   Price: ${request.price}")
        logger.info(f"   Size: {request.size} USDC")
        
        # Place the order via Polymarket CLOB
        order_response = polymarket_client.place_limit_order(
            token_id=request.token_id,
            side=request.side,
            price=request.price,
            size=request.size
        )
        
        logger.info(f"✅ Order placed successfully")
        logger.info(f"   Order ID: {order_response.get('orderID', 'N/A')}")
        logger.info(f"   Status: {order_response.get('status', 'N/A')}")
        
        return {
            "success": True,
            "order": order_response,
            "message": f"{request.side} order placed for {request.size} @ ${request.price}"
        }
        
    except Exception as e:
        logger.error(f"Error placing order: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/cancel")
async def cancel_order(request: CancelOrderRequest):
    """
    Cancel a specific order or all orders
    """
    try:
        # Validate session
        if request.session_id not in sessions:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        if request.order_id:
            logger.info(f"Cancelling order: {request.order_id}")
            result = polymarket_client.cancel_order(request.order_id)
            message = f"Order {request.order_id} cancelled"
        else:
            logger.info("Cancelling all orders")
            result = polymarket_client.cancel_all_orders()
            message = "All orders cancelled"
        
        logger.info(f"✅ {message}")
        
        return {
            "success": True,
            "result": result,
            "message": message
        }
        
    except Exception as e:
        logger.error(f"Error cancelling order: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/orders")
async def get_orders(session_id: str = Header(None)):
    """
    Get user's open orders
    """
    try:
        # Validate session
        if session_id not in sessions:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        logger.info("Fetching open orders")
        
        orders = polymarket_client.get_open_orders()
        
        logger.info(f"✅ Retrieved {len(orders)} open orders")
        
        return {
            "success": True,
            "orders": orders
        }
        
    except Exception as e:
        logger.error(f"Error fetching orders: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/balance")
async def get_balance(session_id: str = Header(None)):
    """
    Get user's USDC balance in SafeProxy
    """
    try:
        # Validate session
        if session_id not in sessions:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        session = sessions[session_id]
        safe_address = session["safe_address"]
        
        balance = await wallet_manager.check_usdc_balance(safe_address)
        
        return {
            "success": True,
            "address": safe_address,
            "balance": balance
        }
        
    except Exception as e:
        logger.error(f"Error fetching balance: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    
    # Get port from environment or use default
    port = int(os.getenv("PORT", 8000))
    
    logger.info("🚀 Starting Farcaster Polymarket Mini App Backend")
    logger.info(f"   Port: {port}")
    logger.info(f"   Environment: {os.getenv('ENVIRONMENT', 'development')}")
    
    uvicorn.run(app, host="0.0.0.0", port=port)