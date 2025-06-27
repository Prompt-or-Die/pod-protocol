"""
PoD Protocol types and constants for Python SDK
"""

from enum import Enum
from typing import Optional, Union, Dict, Any, List
from dataclasses import dataclass
from solders.pubkey import Pubkey

# Program ID on Solana Devnet
PROGRAM_ID = Pubkey.from_string("HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps")


class MessageType(str, Enum):
    """Message types supported by PoD Protocol"""
    TEXT = "text"
    DATA = "data"
    COMMAND = "command"
    RESPONSE = "response"
    CUSTOM = "custom"


class MessageStatus(str, Enum):
    """Message status in the delivery lifecycle"""
    PENDING = "pending"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"


class ChannelVisibility(str, Enum):
    """Channel visibility options"""
    PUBLIC = "public"
    PRIVATE = "private"


class PodComError(int, Enum):
    """Error types returned by PoD Protocol program"""
    INVALID_METADATA_URI_LENGTH = 6000
    UNAUTHORIZED = 6001
    MESSAGE_EXPIRED = 6002
    INVALID_MESSAGE_STATUS_TRANSITION = 6003


# Agent capabilities as bitmask values
class AGENT_CAPABILITIES:
    """Agent capabilities as bitmask values"""
    TRADING = 1 << 0           # 1
    ANALYSIS = 1 << 1          # 2
    DATA_PROCESSING = 1 << 2   # 4
    CONTENT_GENERATION = 1 << 3 # 8
    CUSTOM_1 = 1 << 4          # 16
    CUSTOM_2 = 1 << 5          # 32
    CUSTOM_3 = 1 << 6          # 64
    CUSTOM_4 = 1 << 7          # 128


@dataclass
class AgentAccount:
    """Agent account data structure"""
    pubkey: Pubkey
    capabilities: int
    metadata_uri: str
    reputation: int
    last_updated: int
    invites_sent: int
    last_invite_at: int
    bump: int


@dataclass
class MessageAccount:
    """Message account data structure"""
    pubkey: Pubkey
    sender: Pubkey
    recipient: Pubkey
    payload_hash: bytes
    payload: str
    message_type: MessageType
    timestamp: int
    created_at: int  # Alias for timestamp
    expires_at: int
    status: MessageStatus
    bump: int

    def __post_init__(self):
        # Ensure created_at is set to timestamp if not provided
        if not hasattr(self, 'created_at') or self.created_at is None:
            self.created_at = self.timestamp


@dataclass
class ChannelAccount:
    """Channel account data structure"""
    pubkey: Pubkey
    creator: Pubkey
    name: str
    description: str
    visibility: ChannelVisibility
    max_participants: int
    participant_count: int
    current_participants: int  # Alias for participant_count
    fee_per_message: int
    escrow_balance: int
    created_at: int
    is_active: bool
    bump: int

    def __post_init__(self):
        # Ensure current_participants is set to participant_count if not provided
        if not hasattr(self, 'current_participants') or self.current_participants is None:
            self.current_participants = self.participant_count


@dataclass
class EscrowAccount:
    """Escrow account data structure"""
    channel: Pubkey
    depositor: Pubkey
    balance: int
    amount: int  # Alias for balance
    created_at: int
    last_updated: int
    bump: int

    def __post_init__(self):
        # Ensure amount is set to balance if not provided
        if not hasattr(self, 'amount') or self.amount is None:
            self.amount = self.balance


@dataclass
class CreateAgentOptions:
    """Configuration options for creating an agent"""
    capabilities: int
    metadata_uri: str


@dataclass
class UpdateAgentOptions:
    """Configuration options for updating an agent"""
    capabilities: Optional[int] = None
    metadata_uri: Optional[str] = None


@dataclass
class SendMessageOptions:
    """Configuration options for sending a message"""
    recipient: Pubkey
    content: str
    message_type: MessageType = MessageType.TEXT
    expiration_days: int = 7


@dataclass
class CreateChannelOptions:
    """Configuration options for creating a channel"""
    name: str
    description: str = ""
    visibility: ChannelVisibility = ChannelVisibility.PUBLIC
    max_participants: int = 100
    fee_per_message: int = 0


@dataclass
class DepositEscrowOptions:
    """Configuration options for depositing into escrow"""
    channel: Pubkey
    amount: int


@dataclass
class WithdrawEscrowOptions:
    """Configuration options for withdrawing from escrow"""
    channel: Pubkey
    amount: int


@dataclass
class IPFSConfig:
    """IPFS configuration"""
    disabled: bool = False
    url: str = "https://ipfs.infura.io:5001"
    api_path: str = "/api/v0"
    headers: Optional[Dict[str, str]] = None
    timeout: int = 30000
    gateway_url: str = "https://ipfs.io/ipfs/"


@dataclass
class ZKCompressionConfig:
    """ZK Compression configuration"""
    light_rpc_url: str = "https://devnet.helius-rpc.com"
    compression_rpc_url: str = "https://devnet.helius-rpc.com"
    prover_url: str = "https://prover.lightprotocol.com"
    photon_indexer_url: str = "https://devnet.helius-rpc.com"
    max_batch_size: int = 100
    compression_level: int = 6


@dataclass
class PodComConfig:
    """Main configuration for PoD Protocol SDK"""
    endpoint: str = "https://api.devnet.solana.com"
    program_id: Optional[Pubkey] = None
    commitment: str = "confirmed"
    ipfs: Optional[IPFSConfig] = None
    zk_compression: Optional[ZKCompressionConfig] = None

    def __post_init__(self):
        if self.program_id is None:
            self.program_id = PROGRAM_ID
        if self.ipfs is None:
            self.ipfs = IPFSConfig()
        if self.zk_compression is None:
            self.zk_compression = ZKCompressionConfig()


# Search and discovery types
@dataclass
class SearchFilters:
    """Base search filters"""
    limit: int = 100
    offset: int = 0


@dataclass
class AgentSearchFilters(SearchFilters):
    """Agent search filters"""
    capabilities: Optional[List[int]] = None
    min_reputation: Optional[int] = None
    query: Optional[str] = None


@dataclass
class MessageSearchFilters(SearchFilters):
    """Message search filters"""
    message_type: Optional[MessageType] = None
    status: Optional[MessageStatus] = None
    date_range: Optional[Dict[str, int]] = None
    query: Optional[str] = None


@dataclass
class ChannelSearchFilters(SearchFilters):
    """Channel search filters"""
    visibility: Optional[ChannelVisibility] = None
    min_participants: Optional[int] = None
    max_fee: Optional[int] = None
    query: Optional[str] = None


@dataclass
class RecommendationOptions:
    """Recommendation options"""
    type: str  # 'agents', 'channels', 'messages'
    based_on: Optional[Pubkey] = None
    limit: int = 10
    algorithm: str = "collaborative_filtering"


@dataclass
class Recommendation:
    """Recommendation result"""
    item_id: Pubkey
    score: float
    reason: str
    metadata: Dict[str, Any]


@dataclass
class SearchResult:
    """Search result wrapper"""
    items: List[Any]
    total_count: int
    has_more: bool
    next_offset: Optional[int] = None


# Analytics types
@dataclass
class AgentAnalytics:
    """Agent analytics data"""
    agent_id: Pubkey
    messages_sent: int
    messages_received: int
    channels_created: int
    channels_joined: int
    reputation_score: int
    activity_score: float
    last_active: int


@dataclass
class MessageAnalytics:
    """Message analytics data"""
    total_messages: int
    messages_by_type: Dict[MessageType, int]
    messages_by_status: Dict[MessageStatus, int]
    average_delivery_time: float
    peak_hours: List[int]


@dataclass
class ChannelAnalytics:
    """Channel analytics data"""
    channel_id: Pubkey
    total_participants: int
    total_messages: int
    average_activity: float
    peak_activity_time: int
    engagement_score: float


@dataclass
class NetworkAnalytics:
    """Network-wide analytics data"""
    total_agents: int
    total_messages: int
    total_channels: int
    active_agents_24h: int
    messages_24h: int
    network_health_score: float


@dataclass
class DashboardData:
    """Dashboard data aggregation"""
    agent_analytics: AgentAnalytics
    message_analytics: MessageAnalytics
    network_analytics: NetworkAnalytics
    recent_activity: List[Dict[str, Any]]
    notifications: List[Dict[str, Any]]


# ZK Compression types
@dataclass
class CompressedChannelMessage:
    """Compressed channel message"""
    channel: Pubkey
    sender: Pubkey
    content_hash: str
    message_type: MessageType
    timestamp: int
    ipfs_hash: Optional[str] = None


@dataclass
class CompressedChannelParticipant:
    """Compressed channel participant"""
    channel: Pubkey
    participant: Pubkey
    name: str
    avatar_hash: Optional[str] = None
    metadata_hash: Optional[str] = None
    joined_at: int


@dataclass
class BatchSyncOperation:
    """Batch synchronization operation"""
    operation_type: str  # 'message', 'participant', 'update'
    data_hash: str
    timestamp: int
    metadata: Dict[str, Any]


# IPFS types
@dataclass
class IPFSStorageResult:
    """IPFS storage result"""
    hash: str
    size: int
    gateway_url: str
    pinned: bool = False


@dataclass
class ChannelMessageContent:
    """Channel message content for IPFS storage"""
    content: str
    attachments: Optional[List[Dict[str, Any]]] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class ParticipantExtendedMetadata:
    """Extended participant metadata for IPFS storage"""
    bio: str
    avatar_url: str
    capabilities: List[str]
    contact_info: Dict[str, str]
    preferences: Dict[str, Any]
