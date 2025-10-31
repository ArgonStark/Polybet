"""
Wallet utilities for SafeProxy creation and management
Complete working version with proper Safe deployment
"""
import os
import logging
import time
from typing import Optional
from web3 import Web3
from eth_account import Account

logger = logging.getLogger(__name__)

# Polygon network configuration
POLYGON_RPC = os.getenv("POLYGON_RPC_URL", "https://polygon-rpc.com")
POLYGON_CHAIN_ID = 137

# Gnosis Safe contracts on Polygon
SAFE_FACTORY_ADDRESS = "0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2"
SAFE_MASTER_COPY = "0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552"
FALLBACK_HANDLER = "0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4"

USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"  # USDC on Polygon

# ProxyCreation event signature
PROXY_CREATION_EVENT = '0x4f51faf6c4561ff95f067657e43439f0f856d97c04d9ec9070a6199ad418e235'

# Gnosis Safe ProxyFactory ABI
PROXY_FACTORY_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "_singleton", "type": "address"},
            {"internalType": "bytes", "name": "initializer", "type": "bytes"},
            {"internalType": "uint256", "name": "saltNonce", "type": "uint256"}
        ],
        "name": "createProxyWithNonce",
        "outputs": [{"internalType": "contract GnosisSafeProxy", "name": "proxy", "type": "address"}],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

# Gnosis Safe ABI (setup function)
GNOSIS_SAFE_ABI = [
    {
        "inputs": [
            {"internalType": "address[]", "name": "_owners", "type": "address[]"},
            {"internalType": "uint256", "name": "_threshold", "type": "uint256"},
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "bytes", "name": "data", "type": "bytes"},
            {"internalType": "address", "name": "fallbackHandler", "type": "address"},
            {"internalType": "address", "name": "paymentToken", "type": "address"},
            {"internalType": "uint256", "name": "payment", "type": "uint256"},
            {"internalType": "address payable", "name": "paymentReceiver", "type": "address"}
        ],
        "name": "setup",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

# ERC20 ABI
ERC20_ABI = [
    {
        "constant": True,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    },
    {
        "constant": False,
        "inputs": [
            {"name": "_spender", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "approve",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    }
]


class WalletManager:
    """
    Manages wallet operations including SafeProxy creation
    """
    
    def __init__(self):
        """Initialize Web3 connection and contracts"""
        self.w3 = Web3(Web3.HTTPProvider(POLYGON_RPC))
        
        # Check connection
        if not self.w3.is_connected():
            logger.error("❌ Not connected to Polygon network")
            raise Exception("Cannot connect to Polygon RPC")
        
        logger.info(f"✅ Connected to Polygon (Chain ID: {self.w3.eth.chain_id})")
        
        # Initialize contracts
        self.safe_factory = self.w3.eth.contract(
            address=Web3.to_checksum_address(SAFE_FACTORY_ADDRESS),
            abi=PROXY_FACTORY_ABI
        )
        
        self.safe_master = self.w3.eth.contract(
            address=Web3.to_checksum_address(SAFE_MASTER_COPY),
            abi=GNOSIS_SAFE_ABI
        )
        
        self.usdc_contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(USDC_ADDRESS),
            abi=ERC20_ABI
        )
        
        # Load deployer private key
        self.deployer_key = os.getenv("DEPLOYER_PRIVATE_KEY")
        if not self.deployer_key:
            logger.error("❌ DEPLOYER_PRIVATE_KEY not found in .env")
            raise Exception("DEPLOYER_PRIVATE_KEY required for Safe deployment")
        
        self.deployer_account = Account.from_key(self.deployer_key)
        logger.info(f"💰 Deployer account: {self.deployer_account.address}")
        
        # Check deployer balance
        balance = self.w3.eth.get_balance(self.deployer_account.address)
        balance_matic = balance / 10**18
        logger.info(f"💎 Deployer MATIC balance: {balance_matic:.4f} MATIC")
        
        if balance_matic < 0.01:
            logger.warning(f"⚠️  Low MATIC balance! You have {balance_matic:.4f} MATIC")
            logger.warning(f"⚠️  Need at least 0.01 MATIC to deploy Safes")
    
    async def create_safe_proxy(self, owner_address: str) -> str:
        """
        Deploy a Gnosis Safe for the user
        
        Args:
            owner_address: The user's EOA address that will own the Safe
            
        Returns:
            Address of the DEPLOYED SafeProxy
        """
        owner_address = Web3.to_checksum_address(owner_address)
        
        logger.info(f"🚀 Deploying Gnosis Safe for owner: {owner_address}")
        logger.info(f"   Factory: {SAFE_FACTORY_ADDRESS}")
        logger.info(f"   Master Copy: {SAFE_MASTER_COPY}")
        
        # Generate unique salt nonce (timestamp + owner hash)
        salt_nonce = int(time.time() * 1000) + (int(owner_address, 16) % 1000000)
        logger.info(f"🎲 Salt nonce: {salt_nonce}")
        
        # Prepare Safe setup parameters
        owners = [owner_address]
        threshold = 1
        to_address = "0x0000000000000000000000000000000000000000"
        data = b''
        fallback_handler = Web3.to_checksum_address(FALLBACK_HANDLER)
        payment_token = "0x0000000000000000000000000000000000000000"
        payment = 0
        payment_receiver = "0x0000000000000000000000000000000000000000"
        
        logger.info(f"📝 Safe configuration:")
        logger.info(f"   Owner: {owner_address}")
        logger.info(f"   Threshold: {threshold}")
        
        # Encode the setup call
        setup_data = self.safe_master.functions.setup(
            owners,
            threshold,
            to_address,
            data,
            fallback_handler,
            payment_token,
            payment,
            payment_receiver
        )._encode_transaction_data()
        
        logger.info(f"✅ Setup data encoded ({len(setup_data)} bytes)")
        
        # Build deployment transaction
        logger.info("🔨 Building deployment transaction...")
        
        gas_price = self.w3.eth.gas_price
        logger.info(f"⛽ Gas price: {gas_price / 10**9:.2f} Gwei")
        
        tx = self.safe_factory.functions.createProxyWithNonce(
            Web3.to_checksum_address(SAFE_MASTER_COPY),
            setup_data,
            salt_nonce
        ).build_transaction({
            'from': self.deployer_account.address,
            'nonce': self.w3.eth.get_transaction_count(self.deployer_account.address),
            'gas': 600000,
            'gasPrice': gas_price,
            'chainId': POLYGON_CHAIN_ID
        })
        
        estimated_cost = (tx['gas'] * tx['gasPrice']) / 10**18
        logger.info(f"💰 Estimated cost: {estimated_cost:.6f} MATIC")
        
        # Sign transaction
        logger.info("✍️  Signing transaction...")
        signed_tx = self.w3.eth.account.sign_transaction(tx, self.deployer_key)
        
        # Send to blockchain
        logger.info("📤 Sending transaction to Polygon...")
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        tx_hash_hex = tx_hash.hex()
        
        logger.info(f"⏳ Transaction sent: {tx_hash_hex}")
        logger.info(f"🔗 Polygonscan: https://polygonscan.com/tx/{tx_hash_hex}")
        
        # Wait for confirmation
        logger.info("⏳ Waiting for confirmation...")
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if receipt['status'] != 1:
            logger.error(f"❌ Transaction REVERTED!")
            logger.error(f"Gas used: {receipt['gasUsed']}")
            raise Exception(f"Safe deployment failed. TX: https://polygonscan.com/tx/{tx_hash_hex}")
        
        logger.info("✅ Transaction confirmed!")
        
        # Extract Safe address from ProxyCreation event
        safe_address = None
        
        for log in receipt['logs']:
            try:
                # Look for ProxyCreation event from Safe factory
                # Event: ProxyCreation(address indexed proxy, address singleton)
                if (log['address'].lower() == SAFE_FACTORY_ADDRESS.lower() and
                    len(log['topics']) > 0 and 
                    log['topics'][0].hex() == PROXY_CREATION_EVENT):
                    
                    # The proxy address is in the data field
                    # Format: 0x + padding + proxy_address (40 chars) + singleton_address (40 chars)
                    data_hex = log['data'].hex()
                    
                    # Remove '0x' prefix if present
                    if data_hex.startswith('0x'):
                        data_hex = data_hex[2:]
                    
                    # Extract proxy address (first 32 bytes, last 40 chars are the address)
                    proxy_hex = '0x' + data_hex[24:64]
                    safe_address = Web3.to_checksum_address(proxy_hex)
                    
                    logger.info(f"✅ Found Safe in ProxyCreation event")
                    logger.info(f"   Safe Address: {safe_address}")
                    break
                    
            except Exception as e:
                logger.debug(f"Error parsing log: {e}")
                continue
        
        if not safe_address:
            # Fallback: Try to find any contract creation in the receipt
            logger.warning("Could not find ProxyCreation event, checking all logs...")
            
            for log in receipt['logs']:
                try:
                    # Look for any log from the factory
                    if log['address'].lower() == SAFE_FACTORY_ADDRESS.lower():
                        data_hex = log['data'].hex()
                        if data_hex.startswith('0x'):
                            data_hex = data_hex[2:]
                        
                        # Try to extract an address from data
                        if len(data_hex) >= 64:
                            potential_address = '0x' + data_hex[24:64]
                            if potential_address.startswith('0x0'):
                                # Try next 64 chars
                                potential_address = '0x' + data_hex[88:128] if len(data_hex) >= 128 else potential_address
                            
                            try:
                                safe_address = Web3.to_checksum_address(potential_address)
                                logger.info(f"✅ Extracted address from fallback: {safe_address}")
                                break
                            except:
                                continue
                except Exception as e:
                    continue
        
        if not safe_address:
            logger.error("❌ Could not extract Safe address from logs!")
            logger.error(f"All logs: {receipt['logs']}")
            raise Exception("Could not determine deployed Safe address")
        
        # Calculate actual cost
        actual_cost = (receipt['gasUsed'] * tx['gasPrice']) / 10**18
        logger.info(f"💰 Actual cost: {actual_cost:.6f} MATIC (~${actual_cost * 0.9:.4f})")
        logger.info(f"✅ Safe DEPLOYED: {safe_address}")
        logger.info(f"🔗 View Safe: https://polygonscan.com/address/{safe_address}")
        
        # Verify deployment
        code = self.w3.eth.get_code(safe_address)
        if code == b'' or code == '0x':
            logger.error("❌ Safe address has no code!")
            raise Exception("Safe deployment verification failed")
        
        logger.info(f"✅ Safe verified on-chain (code: {len(code)} bytes)")
        
        return safe_address
    
    async def check_usdc_balance(self, address: str) -> float:
        """
        Check USDC balance of an address
        
        Args:
            address: Ethereum address to check
            
        Returns:
            USDC balance as float
        """
        try:
            address = Web3.to_checksum_address(address)
            balance_wei = self.usdc_contract.functions.balanceOf(address).call()
            balance_usdc = balance_wei / 10**6
            logger.info(f"💵 USDC balance for {address}: {balance_usdc:.2f}")
            return balance_usdc
        except Exception as e:
            logger.error(f"Error checking USDC balance: {str(e)}")
            return 0.0
    
    async def is_valid_safe(self, address: str) -> bool:
        """
        Check if address is a deployed contract
        
        Args:
            address: Address to check
            
        Returns:
            True if contract exists
        """
        try:
            address = Web3.to_checksum_address(address)
            code = self.w3.eth.get_code(address)
            return code != b'' and code != '0x'
        except:
            return False
    
    def approve_usdc_spending(self, spender: str, amount: float) -> str:
        """
        Approve USDC spending
        
        Args:
            spender: Address to approve
            amount: Amount of USDC
            
        Returns:
            Transaction hash
        """
        try:
            spender = Web3.to_checksum_address(spender)
            amount_wei = int(amount * 10**6)
            
            logger.info(f"Approving {amount} USDC for {spender}")
            
            tx = self.usdc_contract.functions.approve(
                spender,
                amount_wei
            ).build_transaction({
                'from': self.deployer_account.address,
                'nonce': self.w3.eth.get_transaction_count(self.deployer_account.address),
                'gas': 100000,
                'gasPrice': self.w3.eth.gas_price,
                'chainId': POLYGON_CHAIN_ID
            })
            
            signed_tx = self.w3.eth.account.sign_transaction(tx, self.deployer_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            
            logger.info(f"✅ USDC approval sent: {tx_hash.hex()}")
            return tx_hash.hex()
            
        except Exception as e:
            logger.error(f"Error approving USDC: {str(e)}")
            raise
    
    def get_transaction_receipt(self, tx_hash: str) -> dict:
        """
        Get transaction receipt
        
        Args:
            tx_hash: Transaction hash
            
        Returns:
            Transaction receipt
        """
        try:
            receipt = self.w3.eth.get_transaction_receipt(tx_hash)
            return dict(receipt)
        except Exception as e:
            logger.error(f"Error getting receipt: {str(e)}")
            raise