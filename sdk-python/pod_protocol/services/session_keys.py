"""
Session Keys Service for PoD Protocol Python SDK

Provides secure session key management for automated transactions
and seamless AI agent interactions with proper Web3.js v2 equivalent patterns.
"""

import asyncio
import time
from typing import Optional, List, Dict, Any, Union
from dataclasses import dataclass
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.transaction import Transaction
from solders.system_program import create_account, CreateAccountParams
from solders.instruction import Instruction
from anchorpy import Program
import httpx

from .base import BaseService
from ..exceptions import PodProtocolError, UnauthorizedError
from ..utils import SecureMemoryManager


@dataclass
class SessionKeyConfig:
    """Session key configuration"""
    target_programs: List[Pubkey]
    expiry_time: int
    max_uses: Optional[int] = None
    allowed_instructions: Optional[List[str]] = None
    rate_limit_per_minute: int = 60


@dataclass
class SessionTokenData:
    """Session token data structure"""
    session_keypair: Keypair
    token_account: Pubkey
    config: SessionKeyConfig
    created_at: int
    uses_remaining: int
    is_active: bool


class SessionKeysService(BaseService):
    """
    Service for managing session keys for AI agent interactions
    
    Provides ephemeral key management following Gum protocol patterns
    with enhanced security and Web3.js v2 equivalent functionality.
    """
    
    def __init__(self, config: dict):
        super().__init__(config)
        self.sessions: Dict[str, SessionTokenData] = {}
        self.wallet: Optional[Union[Keypair, Any]] = None
        self.secure_memory = SecureMemoryManager()
        
        # Rate limiting
        self.rate_limit_cache: Dict[str, List[float]] = {}
        
        # Session management
        self.auto_cleanup_interval = 300  # 5 minutes
        self._cleanup_task: Optional[asyncio.Task] = None
    
    def set_wallet(self, wallet: Union[Keypair, Any]) -> None:
        """Set the wallet for session operations"""
        self.wallet = wallet
        
        # Start auto-cleanup task
        if self._cleanup_task is None:
            self._cleanup_task = asyncio.create_task(self._auto_cleanup_sessions())
    
    async def create_session(
        self,
        config: SessionKeyConfig,
        wallet: Optional[Union[Keypair, Any]] = None
    ) -> str:
        """
        Create a new session key
        
        Args:
            config: Session configuration
            wallet: Wallet to use (optional, uses default if not provided)
            
        Returns:
            Session token string
            
        Raises:
            PodProtocolError: If session creation fails
        """
        try:
            effective_wallet = wallet or self.wallet
            if not effective_wallet:
                raise PodProtocolError("No wallet available for session creation")
            
            # Generate session keypair
            session_keypair = Keypair()
            
            # Derive session token account PDA
            session_token_account = self._derive_session_token_account(
                effective_wallet.pubkey(),
                session_keypair.pubkey()
            )
            
            # Create session token account
            instruction = await self._create_session_instruction(
                effective_wallet.pubkey(),
                session_keypair.pubkey(),
                session_token_account,
                config
            )
            
            # Build and send transaction
            transaction = Transaction([instruction])
            signature = await self._send_transaction(transaction, [session_keypair])
            
            # Store session data
            session_token = self._generate_session_token(
                session_keypair.pubkey(),
                effective_wallet.pubkey()
            )
            
            self.sessions[session_token] = SessionTokenData(
                session_keypair=session_keypair,
                token_account=session_token_account,
                config=config,
                created_at=int(time.time()),
                uses_remaining=config.max_uses or -1,
                is_active=True
            )
            
            return session_token
            
        except Exception as e:
            raise PodProtocolError(f"Failed to create session: {e}")
    
    async def use_session(
        self,
        session_token: str,
        instructions: List[Instruction],
        description: str = "Session transaction"
    ) -> str:
        """
        Execute instructions using a session key
        
        Args:
            session_token: Session token
            instructions: Instructions to execute
            description: Transaction description
            
        Returns:
            Transaction signature
            
        Raises:
            UnauthorizedError: If session is invalid or expired
            PodProtocolError: If execution fails
        """
        try:
            # Validate session
            session_data = await self._validate_session(session_token)
            
            # Check rate limiting
            await self._check_rate_limit(session_token)
            
            # Build transaction with session key
            transaction = Transaction(instructions)
            
            # Sign with session keypair
            signature = await self._send_transaction(
                transaction,
                [session_data.session_keypair]
            )
            
            # Update usage count
            if session_data.uses_remaining > 0:
                session_data.uses_remaining -= 1
                if session_data.uses_remaining == 0:
                    session_data.is_active = False
            
            # Update rate limit cache
            self._update_rate_limit_cache(session_token)
            
            return signature
            
        except Exception as e:
            if isinstance(e, (UnauthorizedError, PodProtocolError)):
                raise
            raise PodProtocolError(f"Failed to use session: {e}")
    
    async def revoke_session(
        self,
        session_token: str,
        wallet: Optional[Union[Keypair, Any]] = None
    ) -> str:
        """
        Revoke a session key
        
        Args:
            session_token: Session token to revoke
            wallet: Wallet to use for revocation
            
        Returns:
            Transaction signature
        """
        try:
            effective_wallet = wallet or self.wallet
            if not effective_wallet:
                raise PodProtocolError("No wallet available for session revocation")
            
            session_data = self.sessions.get(session_token)
            if not session_data:
                raise UnauthorizedError("Session not found")
            
            # Create revoke instruction
            instruction = await self._create_revoke_instruction(
                effective_wallet.pubkey(),
                session_data.token_account
            )
            
            # Send transaction
            transaction = Transaction([instruction])
            signature = await self._send_transaction(transaction)
            
            # Remove from local cache
            session_data.is_active = False
            del self.sessions[session_token]
            
            return signature
            
        except Exception as e:
            if isinstance(e, (UnauthorizedError, PodProtocolError)):
                raise
            raise PodProtocolError(f"Failed to revoke session: {e}")
    
    async def get_session_info(self, session_token: str) -> Dict[str, Any]:
        """
        Get session information
        
        Args:
            session_token: Session token
            
        Returns:
            Dictionary containing session info
        """
        session_data = self.sessions.get(session_token)
        if not session_data:
            raise UnauthorizedError("Session not found")
        
        return {
            'token_account': str(session_data.token_account),
            'created_at': session_data.created_at,
            'expiry_time': session_data.config.expiry_time,
            'uses_remaining': session_data.uses_remaining,
            'is_active': session_data.is_active,
            'is_expired': int(time.time()) > session_data.config.expiry_time,
            'target_programs': [str(p) for p in session_data.config.target_programs],
            'rate_limit_per_minute': session_data.config.rate_limit_per_minute
        }
    
    async def list_active_sessions(self) -> List[Dict[str, Any]]:
        """
        List all active sessions
        
        Returns:
            List of active session info
        """
        active_sessions = []
        current_time = int(time.time())
        
        for token, session_data in self.sessions.items():
            if (session_data.is_active and 
                current_time < session_data.config.expiry_time):
                active_sessions.append({
                    'token': token[:16] + '...',  # Truncated for security
                    'created_at': session_data.created_at,
                    'expiry_time': session_data.config.expiry_time,
                    'uses_remaining': session_data.uses_remaining,
                    'target_programs': [str(p) for p in session_data.config.target_programs]
                })
        
        return active_sessions
    
    async def _validate_session(self, session_token: str) -> SessionTokenData:
        """Validate session token and return session data"""
        session_data = self.sessions.get(session_token)
        if not session_data:
            raise UnauthorizedError("Invalid session token")
        
        if not session_data.is_active:
            raise UnauthorizedError("Session is inactive")
        
        current_time = int(time.time())
        if current_time > session_data.config.expiry_time:
            session_data.is_active = False
            raise UnauthorizedError("Session has expired")
        
        if session_data.uses_remaining == 0:
            session_data.is_active = False
            raise UnauthorizedError("Session usage limit exceeded")
        
        return session_data
    
    async def _check_rate_limit(self, session_token: str) -> None:
        """Check rate limiting for session"""
        session_data = self.sessions.get(session_token)
        if not session_data:
            return
        
        current_time = time.time()
        rate_limit = session_data.config.rate_limit_per_minute
        
        # Clean old entries (older than 1 minute)
        if session_token in self.rate_limit_cache:
            self.rate_limit_cache[session_token] = [
                timestamp for timestamp in self.rate_limit_cache[session_token]
                if current_time - timestamp < 60
            ]
        else:
            self.rate_limit_cache[session_token] = []
        
        # Check rate limit
        if len(self.rate_limit_cache[session_token]) >= rate_limit:
            raise PodProtocolError(f"Rate limit exceeded: {rate_limit} requests per minute")
    
    def _update_rate_limit_cache(self, session_token: str) -> None:
        """Update rate limit cache"""
        current_time = time.time()
        if session_token not in self.rate_limit_cache:
            self.rate_limit_cache[session_token] = []
        self.rate_limit_cache[session_token].append(current_time)
    
    def _derive_session_token_account(
        self,
        wallet_pubkey: Pubkey,
        session_pubkey: Pubkey
    ) -> Pubkey:
        """Derive session token account PDA"""
        # This would use proper PDA derivation in production
        # For now, using a simple approach
        seeds = [
            b"session",
            bytes(wallet_pubkey),
            bytes(session_pubkey)
        ]
        pda, bump = Pubkey.find_program_address(seeds, self.program_id)
        return pda
    
    async def _create_session_instruction(
        self,
        wallet_pubkey: Pubkey,
        session_pubkey: Pubkey,
        session_token_account: Pubkey,
        config: SessionKeyConfig
    ) -> Instruction:
        """Create session token instruction"""
        # This would create the actual instruction using the program
        # For now, using a placeholder
        return create_account(
            CreateAccountParams(
                from_pubkey=wallet_pubkey,
                to_pubkey=session_token_account,
                lamports=1000000,  # Rent exemption
                space=256,  # Account size
                owner=self.program_id
            )
        )
    
    async def _create_revoke_instruction(
        self,
        wallet_pubkey: Pubkey,
        session_token_account: Pubkey
    ) -> Instruction:
        """Create session revoke instruction"""
        # This would create the actual revoke instruction
        # For now, using a placeholder
        return create_account(
            CreateAccountParams(
                from_pubkey=wallet_pubkey,
                to_pubkey=session_token_account,
                lamports=0,
                space=0,
                owner=self.program_id
            )
        )
    
    async def _send_transaction(
        self,
        transaction: Transaction,
        signers: Optional[List[Keypair]] = None
    ) -> str:
        """Send transaction with proper signing"""
        if not self.connection:
            raise PodProtocolError("No connection available")
        
        # Get recent blockhash
        latest_blockhash = await self.connection.get_latest_blockhash()
        transaction.recent_blockhash = latest_blockhash.value.blockhash
        
        # Set fee payer
        if self.wallet:
            transaction.fee_payer = self.wallet.pubkey()
        
        # Sign transaction
        if signers:
            for signer in signers:
                transaction.sign([signer])
        
        if self.wallet:
            if hasattr(self.wallet, 'sign_transaction'):
                transaction = await self.wallet.sign_transaction(transaction)
            else:
                transaction.sign([self.wallet])
        
        # Send transaction
        signature = await self.connection.send_raw_transaction(
            transaction.serialize()
        )
        
        # Confirm transaction
        await self.connection.confirm_transaction(signature)
        
        return str(signature)
    
    def _generate_session_token(
        self,
        session_pubkey: Pubkey,
        wallet_pubkey: Pubkey
    ) -> str:
        """Generate unique session token"""
        import hashlib
        import secrets
        
        # Create unique token using session pubkey, wallet pubkey, and random data
        token_data = f"{session_pubkey}{wallet_pubkey}{secrets.token_hex(16)}"
        return hashlib.sha256(token_data.encode()).hexdigest()
    
    async def _auto_cleanup_sessions(self) -> None:
        """Automatically cleanup expired sessions"""
        while True:
            try:
                await asyncio.sleep(self.auto_cleanup_interval)
                
                current_time = int(time.time())
                expired_tokens = []
                
                for token, session_data in self.sessions.items():
                    if (not session_data.is_active or 
                        current_time > session_data.config.expiry_time):
                        expired_tokens.append(token)
                
                # Remove expired sessions
                for token in expired_tokens:
                    del self.sessions[token]
                    if token in self.rate_limit_cache:
                        del self.rate_limit_cache[token]
                
                # Clean rate limit cache
                for token in list(self.rate_limit_cache.keys()):
                    if token not in self.sessions:
                        del self.rate_limit_cache[token]
                
            except Exception as e:
                print(f"Error in auto cleanup: {e}")
    
    async def cleanup(self) -> None:
        """Cleanup service resources"""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        
        # Cleanup sessions
        self.sessions.clear()
        self.rate_limit_cache.clear()
        
        # Cleanup secure memory
        if self.secure_memory:
            self.secure_memory.cleanup()
        
        await super().cleanup() 