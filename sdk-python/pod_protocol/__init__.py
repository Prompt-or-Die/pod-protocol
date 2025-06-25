"""
PoD Protocol Python SDK

A comprehensive Python SDK for interacting with the PoD Protocol
(Prompt or Die) AI Agent Communication Protocol on Solana.

Enhanced with Web3.js v2 equivalent functionality including:
- Session key management for automated transactions
- MEV protection through Jito bundles
- Real-time message subscriptions
- Advanced filtering and search capabilities
- Enterprise-grade security and performance optimization
"""

__version__ = "1.5.3"
__author__ = "PoD Protocol Team"
__email__ = "dev@pod-protocol.com"

from .client import PodComClient
from .types import (
    PROGRAM_ID,
    PodComConfig,
    MessageType,
    MessageStatus,
    ChannelVisibility,
    AGENT_CAPABILITIES,
    PodComError,
    AgentAccount,
    MessageAccount,
    ChannelAccount,
    EscrowAccount,
    CreateAgentOptions,
    UpdateAgentOptions,
    SendMessageOptions,
    CreateChannelOptions,
    DepositEscrowOptions,
    WithdrawEscrowOptions,
    IPFSConfig,
    ZKCompressionConfig,
    SearchFilters,
    AgentSearchFilters,
    MessageSearchFilters,
    ChannelSearchFilters,
    RecommendationOptions,
    Recommendation,
    SearchResult,
    AgentAnalytics,
    MessageAnalytics,
    ChannelAnalytics,
    NetworkAnalytics,
    DashboardData,
    CompressedChannelMessage,
    CompressedChannelParticipant,
    BatchSyncOperation,
    IPFSStorageResult,
    ChannelMessageContent,
    ParticipantExtendedMetadata,
)
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
from .services.session_keys import (
    SessionKeyConfig,
    SessionTokenData,
)
from .services.jito_bundles import (
    JitoConfig,
    BundleTransaction,
    BundleResult,
)
from .services.message import (
    MessageFilter,
    MessageBatch,
    MessageStats,
)
from .utils import (
    find_agent_pda,
    find_message_pda,
    find_channel_pda,
    find_escrow_pda,
    hash_payload,
    verify_payload_hash,
    lamports_to_sol,
    sol_to_lamports,
    is_valid_public_key,
    SecureMemoryManager,
)
from .exceptions import (
    PodProtocolError,
    ConfigurationError,
    ValidationError,
    NetworkError,
    UnauthorizedError,
)

__all__ = [
    # Core
    "PodComClient",
    "__version__",
    "__author__",
    "__email__",
    
    # Constants and configurations
    "PROGRAM_ID",
    "AGENT_CAPABILITIES",
    
    # Core types
    "PodComConfig",
    "MessageType",
    "MessageStatus", 
    "ChannelVisibility",
    
    # Account types
    "AgentAccount",
    "MessageAccount",
    "ChannelAccount",
    "EscrowAccount",
    
    # Option types
    "CreateAgentOptions",
    "UpdateAgentOptions",
    "SendMessageOptions",
    "CreateChannelOptions",
    "DepositEscrowOptions",
    "WithdrawEscrowOptions",
    
    # Configuration types
    "IPFSConfig",
    "ZKCompressionConfig",
    
    # Search and discovery types
    "SearchFilters",
    "AgentSearchFilters",
    "MessageSearchFilters",
    "ChannelSearchFilters",
    "RecommendationOptions",
    "Recommendation",
    "SearchResult",
    
    # Analytics types
    "AgentAnalytics",
    "MessageAnalytics",
    "ChannelAnalytics",
    "NetworkAnalytics",
    "DashboardData",
    
    # ZK compression types
    "CompressedChannelMessage",
    "CompressedChannelParticipant",
    "BatchSyncOperation",
    
    # IPFS types
    "IPFSStorageResult",
    "ChannelMessageContent",
    "ParticipantExtendedMetadata",
    
    # All services
    "BaseService",
    "AgentService",
    "MessageService",
    "ChannelService",
    "EscrowService",
    "AnalyticsService",
    "DiscoveryService",
    "IPFSService",
    "ZKCompressionService",
    "SessionKeysService",
    "JitoBundlesService",
    
    # New service types
    "SessionKeyConfig",
    "SessionTokenData",
    "JitoConfig",
    "BundleTransaction",
    "BundleResult",
    "MessageFilter",
    "MessageBatch",
    "MessageStats",
    
    # Utilities
    "find_agent_pda",
    "find_message_pda",
    "find_channel_pda",
    "find_escrow_pda",
    "hash_payload",
    "verify_payload_hash",
    "lamports_to_sol",
    "sol_to_lamports",
    "is_valid_public_key",
    "SecureMemoryManager",
    
    # Exceptions
    "PodProtocolError",
    "ConfigurationError",
    "ValidationError",
    "NetworkError",
    "UnauthorizedError",
]
