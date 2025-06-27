"""
Main PoD Protocol SDK client for Python applications
"""

import asyncio
from typing import Optional, Union
from solana.rpc.async_api import AsyncClient
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from anchorpy import Wallet, Provider, Program, Context

from .types import PROGRAM_ID, PodComConfig
from .services import (
    BaseService,
    AgentService,
    MessageService,
    ChannelService,
    EscrowService,
    AnalyticsService,
    DiscoveryService,
    IPFSService,
    ZKCompressionService,
    SessionKeysService,
    JitoBundlesService,
)
from .utils import SecureMemoryManager
from .exceptions import PodProtocolError, ConfigurationError


class PodComClient:
    """
    Main PoD Protocol SDK client for Python applications
    
    A comprehensive Python client for interacting with the PoD Protocol
    (Prompt or Die) AI Agent Communication Protocol on Solana.
    
    Example:
        ```python
        import asyncio
        from pod_protocol import PodComClient, AGENT_CAPABILITIES
        from solders.keypair import Keypair
        
        async def main():
            # Create client
            client = PodComClient({
                'endpoint': 'https://api.devnet.solana.com',
                'commitment': 'confirmed'
            })
            
            # Initialize with wallet
            wallet = Keypair()
            await client.initialize(wallet)
            
            # Register an agent
            agent_tx = await client.agents.register({
                'capabilities': AGENT_CAPABILITIES.ANALYSIS | AGENT_CAPABILITIES.TRADING,
                'metadata_uri': 'https://my-agent-metadata.json'
            }, wallet)
            
            print(f'Agent registered: {agent_tx}')
        
        asyncio.run(main())
        ```
    """
    
    def __init__(self, config: Optional[Union[dict, PodComConfig]] = None):
        """
        Initialize the PoD Protocol client
        
        Args:
            config: Configuration object or dictionary
        """
        # Handle config conversion
        if config is None:
            self.config = PodComConfig()
        elif isinstance(config, dict):
            self.config = PodComConfig(**config)
        else:
            self.config = config
            
        # Initialize connection
        self.connection = AsyncClient(
            self.config.endpoint,
            commitment=self.config.commitment
        )
        
        self.program_id = self.config.program_id or PROGRAM_ID
        self.commitment = self.config.commitment
        self.program: Optional[Program] = None
        self.provider: Optional[Provider] = None
        
        # Initialize secure memory manager
        self.secure_memory = SecureMemoryManager()
        
        # Initialize services
        service_config = {
            'connection': self.connection,
            'program_id': self.program_id,
            'commitment': self.commitment
        }
        
        self.agents = AgentService(service_config)
        self.messages = MessageService(service_config)
        self.channels = ChannelService(service_config)
        self.escrow = EscrowService(service_config)
        self.analytics = AnalyticsService(service_config)
        self.discovery = DiscoveryService(service_config)
        self.ipfs = IPFSService(service_config, self.config.ipfs)
        self.zk_compression = ZKCompressionService(
            service_config,
            self.config.zk_compression,
            self.ipfs
        )
        
        # Initialize new services
        self.session_keys = SessionKeysService(service_config)
        
        # Get Jito RPC URL from config if available
        jito_rpc_url = getattr(self.config, 'jito_rpc_url', None)
        self.jito_bundles = JitoBundlesService(service_config, jito_rpc_url)
    
    async def initialize(self, wallet: Optional[Union[Keypair, Wallet]] = None) -> None:
        """
        Initialize the client with a wallet
        Must be called before using wallet-dependent operations
        
        Args:
            wallet: Solana wallet or keypair. If None, client runs in read-only mode
            
        Raises:
            ConfigurationError: If initialization fails
            
        Example:
            ```python
            wallet = Keypair()
            await client.initialize(wallet)
            ```
        """
        try:
            if wallet:
                # Create wallet adapter if needed
                if isinstance(wallet, Keypair):
                    wallet_adapter = Wallet(wallet)
                else:
                    wallet_adapter = wallet
                
                # Create provider and program
                self.provider = Provider(
                    self.connection,
                    wallet_adapter,
                    opts={'commitment': self.commitment, 'skip_preflight': True}
                )
                
                # Load program IDL (in real implementation, this would be imported or fetched)
                # For now, we'll assume the IDL is available
                try:
                    self.program = await Program.at(
                        self.program_id,
                        self.provider
                    )
                except Exception as e:
                    raise ConfigurationError(
                        f"Failed to load program IDL: {e}. "
                        "Ensure the program is deployed and IDL is available."
                    )
                
                # Initialize services with program
                await self._initialize_services(self.program)
                
                # Set wallet for services that need it
                self.session_keys.set_wallet(wallet_adapter)
                self.jito_bundles.set_wallet(wallet_adapter)
                
            else:
                # Read-only mode - create provider without wallet
                self.provider = Provider(
                    self.connection,
                    None,
                    opts={'commitment': self.commitment, 'skip_preflight': True}
                )
                
                try:
                    self.program = await Program.at(
                        self.program_id,
                        self.provider
                    )
                    await self._initialize_services(self.program)
                except Exception as e:
                    raise ConfigurationError(
                        f"Failed to initialize read-only client: {e}"
                    )
                    
        except Exception as e:
            raise ConfigurationError(f"Failed to initialize client: {e}")
    
    async def _initialize_services(self, program: Program) -> None:
        """Initialize all services with the program instance"""
        services = [
            self.agents, self.messages, self.channels, self.escrow,
            self.analytics, self.discovery, self.ipfs, self.zk_compression,
            self.session_keys, self.jito_bundles
        ]
        
        for service in services:
            if hasattr(service, 'set_program'):
                service.set_program(program)
    
    def get_connection_info(self) -> dict:
        """
        Get connection information
        
        Returns:
            Dictionary containing connection details
        """
        return {
            'endpoint': self.connection._provider.endpoint_uri,
            'commitment': self.commitment,
            'program_id': str(self.program_id)
        }
    
    def is_initialized(self) -> bool:
        """
        Check if client is initialized
        
        Returns:
            True if client is initialized with program
        """
        return self.program is not None
    
    def is_read_only(self) -> bool:
        """
        Check if client is in read-only mode
        
        Returns:
            True if client has no wallet
        """
        return self.provider is None or self.provider.wallet is None
    
    async def cleanup(self) -> None:
        """
        Clean up resources and secure memory
        Call this when done with the client
        """
        # Cleanup secure memory
        if self.secure_memory:
            self.secure_memory.cleanup()
        
        # Cleanup services
        services = [
            self.agents, self.messages, self.channels, self.escrow,
            self.analytics, self.discovery, self.ipfs, self.zk_compression,
            self.session_keys, self.jito_bundles
        ]
        
        for service in services:
            if hasattr(service, 'cleanup'):
                await service.cleanup()
        
        # Close connection
        if self.connection:
            await self.connection.close()
    
    async def __aenter__(self):
        """Async context manager entry"""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.cleanup()
    
    def get_program(self) -> Optional[Program]:
        """
        Get the Anchor program instance
        
        Returns:
            Anchor program instance or None if not initialized
        """
        return self.program
    
    def get_connection(self) -> AsyncClient:
        """
        Get the Solana connection instance
        
        Returns:
            Solana AsyncClient instance
        """
        return self.connection
    
    def get_provider(self) -> Optional[Provider]:
        """
        Get the Anchor provider instance
        
        Returns:
            Anchor provider instance or None if not initialized
        """
        return self.provider
    
    async def health_check(self) -> dict:
        """
        Perform a health check on the client and connection
        
        Returns:
            Dictionary containing health status
            
        Example:
            ```python
            health = await client.health_check()
            print(f"Client healthy: {health['healthy']}")
            print(f"Network: {health['network']}")
            ```
        """
        try:
            # Check connection
            version = await self.connection.get_version()
            
            # Check program
            if self.program:
                try:
                    # Try to fetch program account
                    await self.connection.get_account_info(self.program_id)
                    program_healthy = True
                except:
                    program_healthy = False
            else:
                program_healthy = False
            
            # Check services
            services_healthy = all([
                service.is_initialized() for service in [
                    self.agents, self.messages, self.channels, self.escrow
                ]
            ])
            
            # Check new services
            session_keys_healthy = self.session_keys.is_initialized()
            jito_bundles_healthy = self.jito_bundles.is_initialized()
            
            return {
                'healthy': bool(version and program_healthy and services_healthy),
                'network': version.get('solana-core') if version else None,
                'program_initialized': program_healthy,
                'services_initialized': services_healthy,
                'session_keys_initialized': session_keys_healthy,
                'jito_bundles_initialized': jito_bundles_healthy,
                'read_only': self.is_read_only(),
                'endpoint': self.connection._provider.endpoint_uri
            }
            
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'endpoint': self.connection._provider.endpoint_uri
            }
    
    # Convenience methods for new services
    async def create_session(self, config, wallet=None):
        """
        Create a new session key for automated transactions
        
        Args:
            config: Session configuration
            wallet: Wallet to use (optional)
            
        Returns:
            Session token string
        """
        return await self.session_keys.create_session(config, wallet)
    
    async def send_bundle(self, transactions, tip_lamports=10000):
        """
        Send a bundle of transactions through Jito for MEV protection
        
        Args:
            transactions: List of bundle transactions
            tip_lamports: Tip amount in lamports
            
        Returns:
            Bundle execution result
        """
        return await self.jito_bundles.send_bundle(transactions, tip_lamports)
    
    async def get_bundle_statistics(self):
        """
        Get bundle execution statistics
        
        Returns:
            Dictionary containing bundle statistics
        """
        return await self.jito_bundles.get_bundle_statistics()
    
    async def estimate_bundle_fee(self, transaction_count, priority_level="medium"):
        """
        Estimate bundle execution fees
        
        Args:
            transaction_count: Number of transactions in bundle
            priority_level: Priority level ("low", "medium", "high")
            
        Returns:
            Fee estimation breakdown
        """
        return await self.jito_bundles.estimate_bundle_fee(transaction_count, priority_level)
