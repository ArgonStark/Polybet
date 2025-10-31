"""
Polymarket CLOB Client
Handles market data fetching and order placement using py-clob-client
"""
import os
import logging
import requests
from typing import List, Dict, Optional
from py_clob_client.client import ClobClient
from py_clob_client.clob_types import OrderArgs, MarketOrderArgs, OrderType, OpenOrderParams, BookParams
from py_clob_client.order_builder.constants import BUY, SELL
from utils import (
    get_current_15min_timestamp,
    update_slug_with_current_timestamp,
    is_15min_interval_market,
    extract_timestamp_from_slug
)

logger = logging.getLogger(__name__)

# Polymarket configuration
CLOB_HOST = "https://clob.polymarket.com"
GAMMA_API = "https://gamma-api.polymarket.com"  # Gamma API for market data
CHAIN_ID = 137  # Polygon


class PolymarketClient:
    """
    Client for interacting with Polymarket CLOB
    Handles market data retrieval and order placement
    """
    
    def __init__(self):
        """Initialize Polymarket CLOB client"""
        # Get credentials from environment
        private_key = os.getenv("POLYMARKET_PRIVATE_KEY")
        funder_address = os.getenv("POLYMARKET_FUNDER_ADDRESS")
        signature_type = int(os.getenv("POLYMARKET_SIGNATURE_TYPE", "1"))
        
        # Initialize read-only client (no auth needed for market data)
        self.read_client = ClobClient(CLOB_HOST)
        logger.info("✅ Initialized read-only Polymarket client")
        
        # Initialize authenticated client if credentials are available
        if private_key and funder_address:
            try:
                self.trade_client = ClobClient(
                    CLOB_HOST,
                    key=private_key,
                    chain_id=CHAIN_ID,
                    signature_type=signature_type,
                    funder=funder_address
                )
                
                # Create or derive API credentials
                self.trade_client.set_api_creds(
                    self.trade_client.create_or_derive_api_creds()
                )
                
                logger.info("✅ Initialized authenticated Polymarket client")
                logger.info(f"   Funder: {funder_address}")
                logger.info(f"   Signature Type: {signature_type}")
                
            except Exception as e:
                logger.error(f"Failed to initialize trading client: {e}")
                self.trade_client = None
        else:
            logger.warning("⚠️  No trading credentials found. Trading will be disabled.")
            self.trade_client = None
        
        # Load featured markets from environment
        featured_env = os.getenv("FEATURED_MARKETS", "")
        if featured_env:
            self.featured_conditions = [
                cid.strip() for cid in featured_env.split(",") if cid.strip()
            ]
            logger.info(f"📌 Loaded {len(self.featured_conditions)} featured markets from .env")
            
            # Check for 15-minute interval markets
            self.has_15min_markets = any(
                is_15min_interval_market(cid) for cid in self.featured_conditions
            )
            if self.has_15min_markets:
                logger.info("🔄 Detected 15-minute interval markets - will auto-update every 15 minutes")
        else:
            self.featured_conditions = []
            self.has_15min_markets = False
            logger.warning("⚠️  No FEATURED_MARKETS set in .env, will show random markets")
    
    def _fetch_market_by_slug(self, slug: str) -> Optional[Dict]:
        """
        Fetch a market by slug using Gamma API
        Uses the official endpoint: GET /markets/slug/{slug}
        
        Reference: https://docs.polymarket.com/api-reference/markets/get-market-by-slug
        
        Args:
            slug: Market slug (e.g., 'btc-updown-15m-1761921000')
        
        Returns:
            Market data if found, None otherwise
        """
        try:
            slug_clean = slug.strip()
            logger.info(f"   🌐 Fetching market by slug: {slug_clean[:50]}...")
            
            # Use official Gamma API endpoint for slug-based lookup
            url = f"{GAMMA_API}/markets/slug/{slug_clean}"
            logger.info(f"   📡 Requesting: {url}")
            
            response = requests.get(url, timeout=10)
            
            if response.status_code == 404:
                logger.warning(f"   ⚠️  Market not found (404) for slug: {slug_clean[:50]}...")
                return None
            
            response.raise_for_status()
            market = response.json()
            
            # Check if market is active
            is_active = market.get("active", True) and not market.get("closed", False)
            
            if is_active:
                logger.info(f"   ✅ Found ACTIVE market by slug: {slug_clean[:50]}...")
            else:
                logger.warning(f"   ⚠️  Found CLOSED market by slug: {slug_clean[:50]}...")
            
            logger.info(f"      Question: {market.get('question', 'Unknown')[:60]}...")
            logger.info(f"      Active: {market.get('active')}, Closed: {market.get('closed')}")
            
            return market
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                logger.warning(f"   ⚠️  Market not found (404): {slug_clean[:50]}...")
            else:
                logger.warning(f"   ⚠️  HTTP error: {e.response.status_code} - {e.response.text[:100]}")
            return None
        except Exception as e:
            logger.warning(f"   ⚠️  Error fetching market by slug {slug[:30]}...: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return None
    
    def _fetch_active_market_by_pattern(self, slug_pattern: str) -> Optional[Dict]:
        """
        Fetch the current active market by slug pattern
        For 15-minute markets, tries slug with current timestamp, then searches if not found
        
        Args:
            slug_pattern: Base slug pattern like 'btc-updown-15m' or 'btc-updown-15m-1761921000'
        
        Returns:
            The most recent active market matching the pattern
        """
        try:
            # Extract base pattern (without timestamp)
            if "-" in slug_pattern and slug_pattern.split("-")[-1].isdigit():
                # Has timestamp, extract base
                base_parts = slug_pattern.split("-")[:-1]  # Remove timestamp part
                base_pattern = "-".join(base_parts)
            else:
                base_pattern = slug_pattern
            
            logger.info(f"   🔍 Searching for active market with pattern: {base_pattern}")
            
            # First, try to fetch with current timestamp (most likely to be active)
            current_timestamp = get_current_15min_timestamp()
            current_slug = f"{base_pattern}-{current_timestamp}"
            
            logger.info(f"   📡 Trying current interval slug: {current_slug[:50]}...")
            market = self._fetch_market_by_slug(current_slug)
            
            if market:
                is_active = market.get("active", True) and not market.get("closed", False)
                if is_active:
                    logger.info(f"   ✅ Found active market for current interval!")
                    return market
                else:
                    logger.warning(f"   ⚠️  Current interval market is closed, searching alternatives...")
            
            # If current timestamp doesn't work, try recent timestamps (within last hour)
            logger.info(f"   🔄 Searching for active market in recent intervals...")
            
            # Try next few intervals (forward and backward)
            for offset in [-900, -1800, 0, 900]:  # -15min, -30min, current, +15min
                test_timestamp = current_timestamp + offset
                test_slug = f"{base_pattern}-{test_timestamp}"
                logger.info(f"   📡 Trying slug: {test_slug[:50]}...")
                
                market = self._fetch_market_by_slug(test_slug)
                if market:
                    is_active = market.get("active", True) and not market.get("closed", False)
                    if is_active:
                        logger.info(f"   ✅ Found active market: {test_slug[:50]}...")
                        return market
            
            # Fallback: Search all markets and filter by pattern
            logger.info(f"   🔄 Slugs not found, searching all markets by pattern...")
            
            url = f"{GAMMA_API}/markets"
            params = {"limit": 500}  # Limit to reduce response size
            response = requests.get(url, params=params, timeout=20)
            response.raise_for_status()
            all_markets = response.json()
            
            if not isinstance(all_markets, list):
                all_markets = all_markets.get("data", []) if isinstance(all_markets, dict) else []
            
            logger.info(f"   📊 Retrieved {len(all_markets)} markets from Gamma API")
            
            # Filter markets matching the pattern
            matching_markets = []
            for market in all_markets:
                slug = market.get("slug", "")
                if not slug:
                    continue
                
                slug_lower = slug.lower()
                pattern_lower = base_pattern.lower()
                
                if pattern_lower in slug_lower or slug_lower.startswith(pattern_lower):
                    is_active = market.get("active", True) and not market.get("closed", False)
                    timestamp = extract_timestamp_from_slug(slug)
                    
                    matching_markets.append({
                        "market": market,
                        "slug": slug,
                        "timestamp": timestamp,
                        "active": is_active,
                        "closed": market.get("closed", False)
                    })
            
            if not matching_markets:
                logger.warning(f"   ⚠️  No markets found matching pattern: {base_pattern}")
                return None
            
            # Sort by timestamp (most recent first)
            matching_markets.sort(key=lambda x: x["timestamp"] or 0, reverse=True)
            
            # Only return active markets
            active_matches = [m for m in matching_markets if m["active"] and not m["closed"]]
            
            if active_matches:
                best_match = active_matches[0]
                market = best_match["market"]
                logger.info(f"   ✅ Found ACTIVE market via pattern search: {best_match['slug'][:50]}...")
                return market
            else:
                logger.warning(f"   ⚠️  Found {len(matching_markets)} matching markets but NONE are active")
                for i, match in enumerate(matching_markets[:3]):
                    logger.warning(f"      {i+1}. {match['slug'][:50]}... - Active: {match['active']}, Closed: {match['closed']}")
                return None
            
        except Exception as e:
            logger.warning(f"   ⚠️  Error searching for market pattern {slug_pattern[:30]}...: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return None
    
    def _fetch_market_by_slug_or_condition_id(self, identifier: str) -> Optional[Dict]:
        """
        Fetch a market by slug (preferred) or condition_id using Gamma API
        
        For slugs: Uses GET /markets/slug/{slug} endpoint
        Reference: https://docs.polymarket.com/api-reference/markets/get-market-by-slug
        
        For condition_ids: Falls back to condition_id lookup
        
        Args:
            identifier: Market slug (e.g., 'btc-updown-15m-1761921000') or condition_id
        """
        try:
            identifier_clean = identifier.strip()
            logger.info(f"   🌐 Fetching market for: {identifier_clean[:50]}...")
            
            # For 15-minute interval markets, use pattern search to find active market
            if is_15min_interval_market(identifier_clean):
                logger.info(f"   🔄 Detected 15-min market, searching by slug pattern...")
                market = self._fetch_active_market_by_pattern(identifier_clean)
                if market:
                    return market
                logger.warning(f"   ⚠️  Pattern search failed, trying direct slug lookup...")
            
            # Determine if it's a slug or condition_id
            # Slugs typically contain hyphens and don't start with 0x
            is_slug = "-" in identifier_clean and not identifier_clean.startswith("0x")
            
            market = None
            
            if is_slug:
                # Use slug-based endpoint (preferred method)
                logger.info(f"   📡 Using slug-based endpoint...")
                market = self._fetch_market_by_slug(identifier_clean)
                if market and market.get("active", True) and not market.get("closed", False):
                    return market
            
            # Fallback: Try condition_id lookup if slug lookup fails or market is closed
            if not market or not market.get("active", True) or market.get("closed", False):
                logger.info(f"   🔄 Trying condition_id lookup as fallback...")
                url = f"{GAMMA_API}/markets"
                params = {"condition_ids": identifier_clean}
                try:
                    response = requests.get(url, params=params, timeout=10)
                    if response.status_code == 200:
                        data = response.json()
                        if isinstance(data, list) and len(data) > 0:
                            # Filter for active markets
                            active_markets = [m for m in data if m.get("active", True) and not m.get("closed", False)]
                            if active_markets:
                                return active_markets[0]
                            return data[0] if data else None
                        elif isinstance(data, dict):
                            return data
                except:
                    pass
            
            logger.warning(f"   ❌ Market not found for: {identifier_clean[:50]}...")
            return None
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                logger.warning(f"   ⚠️  Market not found (404): {identifier_clean[:50]}...")
            else:
                logger.warning(f"   ⚠️  HTTP error: {e.response.status_code} - {e.response.text[:100]}")
            return None
        except Exception as e:
            logger.warning(f"   ⚠️  Error fetching market {identifier_clean[:30]}...: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return None
    
    def get_featured_markets(self, limit: int = 4) -> List[Dict]:
        """
        Get featured markets configured in .env
        
        Fetches each market directly by slug (preferred) or condition_id using Gamma API
        Uses GET /markets/slug/{slug} endpoint for slug-based markets
        Reference: https://docs.polymarket.com/api-reference/markets/get-market-by-slug
        """
        try:
            logger.info("Fetching featured markets from Polymarket")
            logger.info(f"📌 Looking for {len(self.featured_conditions)} featured markets (slugs/condition_ids)")
            for i, cid in enumerate(self.featured_conditions, 1):
                logger.info(f"   {i}. {cid[:50]}...")
            
            featured = []
            
            # If we have featured markets, fetch them directly by slug (preferred) or condition_id
            if self.featured_conditions:
                logger.info(f"🔍 Fetching {len(self.featured_conditions)} featured markets by slug/condition_id")
                
                for condition_id in self.featured_conditions:
                    cid = condition_id.strip()
                    
                    # Check if this is a 15-minute interval market
                    if is_15min_interval_market(cid):
                        logger.info(f"🔄 15-min market detected: {cid[:50]}...")
                        logger.info(f"   Searching for current active market by pattern...")
                        # Don't update timestamp - let _fetch_market_by_condition_id search for active markets
                        # It will use pattern matching to find the current active market
                    else:
                        logger.info(f"📊 Fetching market: {cid[:50]}...")
                    
                    # Try to fetch directly by slug (preferred) or condition_id
                    market = self._fetch_market_by_slug_or_condition_id(cid)
                    
                    if market:
                        try:
                            # Check if market is active before adding
                            is_active = market.get("active", True) and not market.get("closed", False)
                            if not is_active:
                                logger.warning(f"⚠️  Market is CLOSED: {market.get('question', 'Unknown')[:50]}...")
                                logger.warning(f"   Skipping closed market. Active: {market.get('active')}, Closed: {market.get('closed')}")
                                # For 15-minute markets, continue searching for active one
                                if is_15min_interval_market(condition_id):
                                    logger.info(f"   🔄 Continuing search for active 15-minute market...")
                                    continue
                            
                            formatted = self._format_market(market)
                            # Store the original condition_id pattern for reference
                            if is_15min_interval_market(condition_id):
                                formatted["_original_pattern"] = condition_id
                                formatted["_is_15min_interval"] = True
                            
                            # Verify it's active before adding
                            if formatted.get("active", True) and not formatted.get("closed", False):
                                featured.append(formatted)
                                logger.info(f"✅ Added ACTIVE market: {formatted.get('question', 'Unknown')[:50]}...")
                                logger.info(f"   Slug: {formatted.get('slug', 'N/A')[:50]}...")
                                logger.info(f"   Active: {formatted.get('active')}, Closed: {formatted.get('closed')}")
                            else:
                                logger.warning(f"⚠️  Market marked as inactive/closed, skipping")
                        except Exception as e:
                            logger.warning(f"❌ Error formatting market {cid[:30]}...: {e}")
                            import traceback
                            logger.error(traceback.format_exc())
                    else:
                        logger.warning(f"❌ Market not found: {cid[:50]}...")
                
                # Report final results
                if featured:
                    logger.info(f"✅ Retrieved {len(featured)} of {len(self.featured_conditions)} configured featured markets")
                    for m in featured:
                        logger.info(f"   ✓ {m.get('condition_id', 'N/A')[:30]}... - {m.get('question', 'Unknown')[:50]}...")
                    return featured
                else:
                    logger.error("❌ No featured markets found!")
                    logger.error("   Check that condition_ids in .env are correct and markets are active")
                    logger.error(f"   Searched for: {self.featured_conditions}")
                    return []  # Return empty instead of fallback
            
            # If no featured markets configured, use most popular (fallback mode)
            else:
                logger.info("⚠️  No FEATURED_MARKETS configured, using most popular markets as fallback")
                markets_response = self.read_client.get_simplified_markets()
                if markets_response and "data" in markets_response:
                    markets_data = markets_response["data"]
                    for market in markets_data[:limit]:
                        try:
                            formatted = self._format_market(market)
                            featured.append(formatted)
                        except Exception as e:
                            logger.warning(f"Error formatting market: {e}")
                            continue
            
            logger.info(f"✅ Retrieved {len(featured)} featured markets")
            return featured
            
        except Exception as e:
            logger.error(f"Error fetching markets: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return []
    
    def _format_market(self, market: Dict) -> Dict:
        """Format market data into consistent structure
        
        Handles both Gamma API and CLOB API formats
        """
        condition_id = market.get("condition_id", "")
        
        # Extract tokens - handle different API formats
        tokens = []
        
        # Method 1: Gamma API format - has clobTokenIds as comma-separated string
        clob_token_ids = market.get("clobTokenIds", "")
        if clob_token_ids:
            if isinstance(clob_token_ids, str):
                # Parse comma-separated string
                token_ids = [tid.strip() for tid in clob_token_ids.split(",") if tid.strip()]
            elif isinstance(clob_token_ids, list):
                token_ids = [str(tid).strip() for tid in clob_token_ids if tid]
            else:
                token_ids = []
            
            # Get outcomes from market data
            outcomes = market.get("outcomes", "")
            short_outcomes = market.get("shortOutcomes", "")
            
            # Parse outcomes
            outcome_list = []
            if outcomes:
                if isinstance(outcomes, str):
                    # Could be comma-separated or JSON string
                    try:
                        import json
                        outcome_list = json.loads(outcomes)
                    except:
                        outcome_list = [outcome.strip() for outcome in outcomes.split(",")]
                elif isinstance(outcomes, list):
                    outcome_list = outcomes
            
            # If no outcomes, try shortOutcomes
            if not outcome_list and short_outcomes:
                if isinstance(short_outcomes, str):
                    try:
                        import json
                        outcome_list = json.loads(short_outcomes)
                    except:
                        outcome_list = [outcome.strip() for outcome in short_outcomes.split(",")]
                elif isinstance(short_outcomes, list):
                    outcome_list = short_outcomes
            
            # Default outcomes if not found
            if not outcome_list:
                outcome_list = ["Yes", "No"]
            
            # Create tokens from token IDs and outcomes
            for i, token_id in enumerate(token_ids):
                outcome = outcome_list[i] if i < len(outcome_list) else f"Outcome {i+1}"
                # Get price from outcomePrices if available
                outcome_prices = market.get("outcomePrices", "")
                price = 0.5  # Default
                if outcome_prices:
                    try:
                        import json
                        prices = json.loads(outcome_prices) if isinstance(outcome_prices, str) else outcome_prices
                        if isinstance(prices, list) and i < len(prices):
                            price = float(prices[i])
                        elif isinstance(prices, dict) and outcome in prices:
                            price = float(prices[outcome])
                    except:
                        pass
                
                tokens.append({
                    "token_id": token_id,
                    "outcome": outcome,
                    "price": price,
                    "winner": False
                })
        
        # Method 2: CLOB API format - has tokens array
        elif market.get("tokens"):
            for token in market.get("tokens", []):
                if isinstance(token, dict):
                    tokens.append({
                        "token_id": token.get("token_id", ""),
                        "outcome": token.get("outcome", ""),
                        "price": float(token.get("price", 0.5)),
                        "winner": token.get("winner", False)
                    })
                elif isinstance(token, str):
                    # Just token ID
                    tokens.append({
                        "token_id": token,
                        "outcome": f"Outcome {len(tokens)+1}",
                        "price": 0.5,
                        "winner": False
                    })
        
        # Fallback: If no tokens found, try to construct from condition_id
        if not tokens and condition_id:
            logger.warning(f"⚠️  No tokens found for market {condition_id[:30]}... - RTDS may not work properly")
            logger.warning(f"   Market data keys: {list(market.keys())[:10]}...")
        
        formatted = {
            "condition_id": condition_id,
            "question": market.get("question", "Unknown Market"),
            "description": market.get("description", ""),
            "tokens": tokens,
            "active": market.get("active", True),
            "closed": market.get("closed", False),
            "end_date": market.get("end_date_iso", "") or market.get("endDate", ""),
            # Preserve slug information for 15-minute markets
            "slug": market.get("slug") or market.get("eventSlug", ""),
            "eventSlug": market.get("eventSlug") or market.get("slug", "")
        }
        
        return formatted
    
    def _get_fallback_markets(self) -> List[Dict]:
        """
        Return fallback markets if API call fails
        """
        return [
            {
                "condition_id": "demo_1",
                "question": "Demo Market 1 - Check your .env FEATURED_MARKETS",
                "description": "This is a demo market. Configure FEATURED_MARKETS in .env",
                "tokens": [
                    {"token_id": "demo_yes_1", "outcome": "Yes", "price": 0.55, "winner": False},
                    {"token_id": "demo_no_1", "outcome": "No", "price": 0.45, "winner": False}
                ],
                "active": True,
                "closed": False,
                "end_date": "2025-12-31T23:59:59Z"
            }
        ]
    
    def get_market_details(self, token_id: str) -> Dict:
        """
        Get detailed information about a specific market
        
        Args:
            token_id: The token ID to get details for
            
        Returns:
            Market details including orderbook and prices
        """
        try:
            logger.info(f"Fetching details for token: {token_id}")
            
            # Get order book
            order_book = self.read_client.get_order_book(token_id)
            
            # Get current price and midpoint
            buy_price = self.read_client.get_price(token_id, side="BUY")
            sell_price = self.read_client.get_price(token_id, side="SELL")
            midpoint = self.read_client.get_midpoint(token_id)
            
            # Get last trade price
            try:
                last_trade = self.read_client.get_last_trade_price(token_id)
            except:
                last_trade = midpoint
            
            details = {
                "token_id": token_id,
                "buy_price": float(buy_price) if buy_price else 0.5,
                "sell_price": float(sell_price) if sell_price else 0.5,
                "midpoint": float(midpoint) if midpoint else 0.5,
                "last_trade": float(last_trade) if last_trade else 0.5,
                "order_book": {
                    "market": order_book.market if order_book else token_id,
                    "bids": len(order_book.bids) if order_book else 0,
                    "asks": len(order_book.asks) if order_book else 0
                }
            }
            
            logger.info(f"✅ Retrieved market details")
            logger.info(f"   Midpoint: ${details['midpoint']:.4f}")
            logger.info(f"   Buy: ${details['buy_price']:.4f}, Sell: ${details['sell_price']:.4f}")
            
            return details
            
        except Exception as e:
            logger.error(f"Error fetching market details: {str(e)}")
            # Return default data
            return {
                "token_id": token_id,
                "buy_price": 0.5,
                "sell_price": 0.5,
                "midpoint": 0.5,
                "last_trade": 0.5,
                "order_book": {"market": token_id, "bids": 0, "asks": 0}
            }
    
    def place_limit_order(
        self,
        token_id: str,
        side: str,
        price: float,
        size: float
    ) -> Dict:
        """
        Place a limit order on Polymarket
        
        Args:
            token_id: Token ID to trade
            side: "BUY" or "SELL"
            price: Limit price (0.00 to 1.00)
            size: Order size in USDC
            
        Returns:
            Order response from CLOB
        """
        if not self.trade_client:
            raise Exception("Trading client not initialized. Check credentials.")
        
        try:
            logger.info(f"Creating limit order")
            logger.info(f"   Token: {token_id}")
            logger.info(f"   Side: {side}")
            logger.info(f"   Price: ${price}")
            logger.info(f"   Size: {size} USDC")
            
            # Convert side to constant
            order_side = BUY if side.upper() == "BUY" else SELL
            
            # Create order
            order = OrderArgs(
                token_id=token_id,
                price=price,
                size=size,
                side=order_side
            )
            
            # Sign the order
            signed_order = self.trade_client.create_order(order)
            
            # Post to CLOB
            response = self.trade_client.post_order(signed_order, OrderType.GTC)
            
            logger.info(f"✅ Order placed successfully")
            logger.info(f"   Order ID: {response.get('orderID', 'N/A')}")
            
            return response
            
        except Exception as e:
            logger.error(f"Error placing order: {str(e)}")
            raise
    
    def place_market_order(
        self,
        token_id: str,
        side: str,
        amount: float
    ) -> Dict:
        """
        Place a market order (Fill-or-Kill)
        
        Args:
            token_id: Token ID to trade
            side: "BUY" or "SELL"
            amount: Amount in USDC
            
        Returns:
            Order response from CLOB
        """
        if not self.trade_client:
            raise Exception("Trading client not initialized. Check credentials.")
        
        try:
            logger.info(f"Creating market order for {amount} USDC")
            
            # Convert side to constant
            order_side = BUY if side.upper() == "BUY" else SELL
            
            # Create market order (FOK)
            order = MarketOrderArgs(
                token_id=token_id,
                amount=amount,
                side=order_side,
                order_type=OrderType.FOK
            )
            
            # Sign and post
            signed_order = self.trade_client.create_market_order(order)
            response = self.trade_client.post_order(signed_order, OrderType.FOK)
            
            logger.info(f"✅ Market order executed")
            
            return response
            
        except Exception as e:
            logger.error(f"Error placing market order: {str(e)}")
            raise
    
    def get_open_orders(self) -> List[Dict]:
        """
        Get all open orders for the authenticated user
        
        Returns:
            List of open orders
        """
        if not self.trade_client:
            raise Exception("Trading client not initialized. Check credentials.")
        
        try:
            logger.info("Fetching open orders")
            
            orders = self.trade_client.get_orders(OpenOrderParams())
            
            logger.info(f"✅ Retrieved {len(orders)} open orders")
            
            return orders
            
        except Exception as e:
            logger.error(f"Error fetching orders: {str(e)}")
            return []
    
    def cancel_order(self, order_id: str) -> Dict:
        """
        Cancel a specific order
        
        Args:
            order_id: Order ID to cancel
            
        Returns:
            Cancellation response
        """
        if not self.trade_client:
            raise Exception("Trading client not initialized. Check credentials.")
        
        try:
            logger.info(f"Cancelling order: {order_id}")
            
            response = self.trade_client.cancel(order_id)
            
            logger.info(f"✅ Order cancelled: {order_id}")
            
            return response
            
        except Exception as e:
            logger.error(f"Error cancelling order: {str(e)}")
            raise
    
    def cancel_all_orders(self) -> Dict:
        """
        Cancel all open orders
        
        Returns:
            Cancellation response
        """
        if not self.trade_client:
            raise Exception("Trading client not initialized. Check credentials.")
        
        try:
            logger.info("Cancelling all orders")
            
            response = self.trade_client.cancel_all()
            
            logger.info(f"✅ All orders cancelled")
            
            return response
            
        except Exception as e:
            logger.error(f"Error cancelling all orders: {str(e)}")
            raise
    
    def get_trades(self, limit: int = 10) -> List[Dict]:
        """
        Get recent trades
        
        Args:
            limit: Number of trades to retrieve
            
        Returns:
            List of recent trades
        """
        try:
            logger.info(f"Fetching last {limit} trades")
            
            trades = self.trade_client.get_trades() if self.trade_client else []
            
            return trades[:limit]
            
        except Exception as e:
            logger.error(f"Error fetching trades: {str(e)}")
            return []