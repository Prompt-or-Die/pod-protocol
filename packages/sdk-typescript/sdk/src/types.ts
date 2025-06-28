import type { Address } from '@solana/addresses';
import { address } from '@solana/addresses';
import type { KeyPairSigner } from '@solana/signers';

/**
 * PoD Protocol Program ID on Solana Devnet
 */
export const PROGRAM_ID = address(
  "HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps",
);

/**
 * Message types supported by PoD Protocol
 */
export enum MessageType {
  TEXT = 0,
  IMAGE = 1,
  CODE = 2,
  FILE = 3,
}

/**
 * Message status in the delivery lifecycle
 */
export enum MessageStatus {
  PENDING = "pending",
  DELIVERED = "delivered", 
  READ = "read",
  FAILED = "failed",
}

/**
 * Channel visibility options
 */
export enum ChannelVisibility {
  Public = 0,
  Private = 1,
  Restricted = 2,
}

/**
 * Agent account data structure
 */
export interface AgentAccount {
  /** Agent's wallet public key */
  pubkey: Address;
  /** Bitmask representing agent capabilities */
  capabilities: number;
  /** URI to agent metadata (IPFS, Arweave, etc.) */
  metadataUri: string;
  /** Agent reputation score */
  reputation: number;
  /** Last update timestamp */
  lastUpdated: number;
  /** Number of invitations sent in current window */
  invitesSent: number;
  /** Timestamp of last invitation window */
  lastInviteAt: number;
  /** PDA bump seed */
  bump: number;
}

/**
 * Message account data structure
 */
export interface MessageAccount {
  /** Message account public key */
  pubkey: Address;
  /** Sender's public key */
  sender: Address;
  /** Recipient's public key */
  recipient: Address;
  /** SHA-256 hash of message payload */
  payloadHash: Uint8Array;
  /** Original message payload (for display) */
  payload: string;
  /** Type of message */
  messageType: MessageType;
  /** Creation timestamp */
  timestamp: number;
  /** Creation timestamp (alias for compatibility) */
  createdAt: number;
  /** Expiration timestamp */
  expiresAt: number;
  /** Current delivery status */
  status: MessageStatus;
  /** PDA bump seed */
  bump: number;
}

/**
 * Channel account data structure
 */
export interface ChannelAccount {
  /** Channel account public key */
  pubkey: Address;
  /** Channel creator's public key */
  creator: Address;
  /** Channel name */
  name: string;
  /** Channel description */
  description: string;
  /** Channel visibility setting */
  visibility: ChannelVisibility;
  /** Maximum number of participants allowed */
  maxMembers: number;
  /** Current number of participants */
  memberCount: number;
  /** Current number of participants (alias for compatibility) */
  currentParticipants: number;
  /** Legacy alias for maxMembers */
  maxParticipants: number;
  /** Legacy alias for memberCount */
  participantCount: number;
  /** Fee per message in lamports */
  feePerMessage: number;
  /** Total escrow balance in lamports */
  escrowBalance: number;
  /** Creation timestamp */
  createdAt: number;
  /** Last updated timestamp */
  lastUpdated: number;
  /** Whether channel is active */
  isActive: boolean;
  /** Whether channel requires approval to join */
  requiresApproval?: boolean;
  /** PDA bump seed */
  bump: number;
}

/**
 * Escrow account data structure
 */
export interface EscrowAccount {
  /** Associated channel public key */
  channel: Address;
  /** Depositor's public key */
  depositor: Address;
  /** Deposited amount in lamports */
  balance: number;
  /** Deposited amount in lamports (alias for compatibility) */
  amount: number;
  /** Deposit timestamp */
  createdAt: number;
  /** Last updated timestamp */
  lastUpdated: number;
  /** PDA bump seed */
  bump: number;
}

/**
 * Agent capabilities as bitmask values
 */
export const AGENT_CAPABILITIES = {
  TEXT: 1,
  IMAGE: 2,
  CODE: 4,
  ANALYSIS: 8,
  TRADING: 16,
  DATA_PROCESSING: 32,
  CONTENT_GENERATION: 64,
  CUSTOM1: 128,
  CUSTOM2: 256,
} as const;

/**
 * Error types returned by PoD Protocol program
 */
export enum PodComError {
  InvalidMetadataUriLength = 6000,
  Unauthorized = 6001,
  MessageExpired = 6002,
  InvalidMessageStatusTransition = 6003,
  InsufficientAccounts = 6004,
  InvalidAccountData = 6005,
  InvalidInstructionData = 6006,
}

/**
 * SDK Error codes
 */
export enum ErrorCode {
  PROGRAM_ERROR = 'PROGRAM_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR', 
  RPC_ERROR = 'RPC_ERROR',
  ACCOUNT_ERROR = 'ACCOUNT_ERROR',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  INVALID_ACCOUNT_DATA = 'INVALID_ACCOUNT_DATA',
  TRANSACTION_ERROR = 'TRANSACTION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
}

/**
 * Configuration for PoD Protocol SDK
 */
export interface PodComConfig {
  /** Solana cluster endpoint */
  endpoint?: string;
  /** Program ID (defaults to devnet) */
  programId?: Address;
  /** Default commitment level */
  commitment?: "processed" | "confirmed" | "finalized";
  /** IPFS configuration for off-chain storage */
  ipfs?: {
    /** Disable IPFS functionality completely */
    disabled?: boolean;
    /** IPFS node URL - defaults to Infura public gateway */
    url?: string;
    /** IPFS API endpoint - defaults to /api/v0 */
    apiPath?: string;
    /** Authorization headers for private IPFS nodes */
    headers?: Record<string, string>;
    /** Timeout for IPFS operations in milliseconds */
    timeout?: number;
    /** Gateway URL for retrieving content */
    gatewayUrl?: string;
  };
  /** ZK Compression configuration for Light Protocol integration */
  zkCompression?: {
    /** Light Protocol Solana RPC endpoint */
    lightRpcUrl?: string;
    /** Light Protocol compression RPC endpoint */
    compressionRpcUrl?: string;
    /** Light Protocol prover endpoint */
    proverUrl?: string;
    /** Photon indexer endpoint */
    photonIndexerUrl?: string;
    /** Maximum batch size for compression operations */
    maxBatchSize?: number;
    /** Enable automatic batching */
    enableBatching?: boolean;
    /** Batch timeout in milliseconds */
    batchTimeout?: number;
    /** Light system program public key */
    lightSystemProgram?: Address;
    /** Nullifier queue public key */
    nullifierQueuePubkey?: Address;
    /** CPI authority PDA */
    cpiAuthorityPda?: Address;
    /** Compressed Token program */
    compressedTokenProgram?: Address;
    /** Registered Program ID */
    registeredProgramId?: Address;
    /** No-op Program */
    noopProgram?: Address;
    /** Account Compression authority */
    accountCompressionAuthority?: Address;
    /** Account Compression program */
    accountCompressionProgram?: Address;
  };
  /** Jito RPC URL for bundle transactions */
  jitoRpcUrl?: string;
  /** Session keys configuration */
  sessionKeys?: {
    /** Default session duration in hours */
    defaultDurationHours?: number;
    /** Maximum uses per session */
    defaultMaxUses?: number;
    /** Auto-cleanup expired sessions */
    autoCleanup?: boolean;
  };
}

/**
 * Options for creating a new agent
 */
export interface CreateAgentOptions {
  /** Agent capabilities bitmask */
  capabilities: number;
  /** Metadata URI */
  metadataUri: string;
}

/**
 * Options for updating an agent
 */
export interface UpdateAgentOptions {
  /** New capabilities (optional) */
  capabilities?: number;
  /** New metadata URI (optional) */
  metadataUri?: string;
}

/**
 * Options for updating a channel
 */
export interface UpdateChannelOptions {
  /** New name (optional) */
  name?: string;
  /** New description (optional) */
  description?: string;
  /** New visibility (optional) */
  visibility?: ChannelVisibility;
  /** New max members (optional) */
  maxMembers?: number;
}

/**
 * Options for sending a message
 */
export interface SendMessageOptions {
  /** Recipient's public key */
  recipient: Address;
  /** Message payload (will be hashed) */
  payload: string | Uint8Array;
  /** Message type */
  messageType: MessageType;
  /** Custom message type value (for Custom type) */
  customValue?: number;
  /** Message content for display */
  content?: string;
  /** Expiration in days */
  expirationDays?: number;
}

/**
 * Options for creating a channel
 */
export interface CreateChannelOptions {
  /** Channel name */
  name: string;
  /** Channel description */
  description: string;
  /** Channel visibility */
  visibility: ChannelVisibility;
  /** Maximum participants */
  maxMembers: number;
  /** Legacy alias for maxMembers */
  maxParticipants?: number;
  /** Fee per message in lamports */
  feePerMessage: number;
}

/**
 * Options for depositing to escrow
 */
export interface DepositEscrowOptions {
  /** Channel public key */
  channel: Address;
  /** Amount to deposit in lamports */
  amount: number;
}

/**
 * Options for withdrawing from escrow
 */
export interface WithdrawEscrowOptions {
  /** Channel public key */
  channel: Address;
  /** Amount to withdraw in lamports */
  amount: number;
}

/**
 * Options for broadcasting a message to a channel
 */
export interface BroadcastMessageOptions {
  /** Channel public key */
  channelPDA: Address;
  /** Message content */
  content: string;
  /** Message type (defaults to TEXT) */
  messageType?: MessageType;
  /** Optional reply-to message */
  replyTo?: Address;
}

// Analytics interfaces
export interface AgentMetrics {
  agentAddress: Address;
  messagesSent: number;
  messagesReceived: number;
  channelsJoined: number;
  averageResponseTime: number;
  reputation: number;
  lastActive: number;
  totalInteractions: number;
  successRate: number;
  peakActivityHours: number[];
}

export interface MessageMetrics {
  totalMessages: number;
  deliveredMessages: number;
  failedMessages: number;
  averageDeliveryTime: number;
  deliveryRate: number;
  messageVolume: number;
  peakHours: number[];
  timeframe: string;
}

export interface ChannelMetrics {
  totalChannels: number;
  activeChannels: number;
  totalMembers: number;
  averageMembers: number;
  messageActivity: number;
  growthRate: number;
  mostActiveChannels: Address[];
}

export interface NetworkMetrics {
  totalValueLocked: number;
  activeEscrows: number;
  networkHealth: number;
  averageTps: number;
  blockTime: number;
  currentSlot: number;
  activeNodes: number;
  consensusHealth: number;
  messageVolume24h: number;
  activeAgents24h: number;
  peakUsageHours: number[];
}

export interface PerformanceMetrics {
  avgConfirmationTime: number;
  avgTransactionFee: number;
  successRate: number;
  throughput: number;
  errorRate: number;
  networkLatency: number;
  resourceUtilization: number;
  queueDepth: number;
}

// Discovery interfaces
export interface AgentSearchFilters {
  capabilities?: number[];
  minReputation?: number;
  maxReputation?: number;
  metadataContains?: string;
  lastActiveAfter?: number;
  lastActiveBefore?: number;
  limit?: number;
  offset?: number;
  sortBy?: "relevance" | "recent" | "popular" | "reputation";
  sortOrder?: "asc" | "desc";
}

export interface MessageSearchFilters {
  sender?: Address;
  recipient?: Address;
  messageType?: MessageType | MessageType[];
  status?: MessageStatus[];
  limit?: number;
  offset?: number;
  payloadContains?: string;
  createdAfter?: number;
  createdBefore?: number;
  content?: string;
  dateFrom?: number;
  dateTo?: number;
  sortBy?: "relevance" | "recent";
  sortOrder?: "asc" | "desc";
}

export interface ChannelSearchFilters {
  creator?: Address;
  visibility?: ChannelVisibility | ChannelVisibility[];
  minMembers?: number;
  maxMembers?: number;
  minParticipants?: number;
  maxParticipants?: number;
  maxFeePerMessage?: number;
  hasEscrow?: boolean;
  limit?: number;
  offset?: number;
  nameContains?: string;
  descriptionContains?: string;
  createdAfter?: number;
  createdBefore?: number;
  sortBy?: "popular" | "recent" | "relevance";
  sortOrder?: "asc" | "desc";
}

export interface RecommendationOptions {
  limit?: number;
}

export interface NetworkStatistics {
  totalAgents: number;
  totalMessages: number;
  totalChannels: number;
  activeAgents24h: number;
  messageVolume24h: number;
  averageReputation: number;
  networkHealth: number;
}

// Migration interfaces
export interface MigrationStatus {
  isComplete: boolean;
  version: string;
  compatibility: string;
  features: {
    rpc: boolean;
    address: boolean;
    transactions: boolean;
    programs: boolean;
  };
  lastChecked: number;
  error?: string;
}

export interface V2FeatureMap {
  [key: string]: {
    available: boolean;
    description: string;
  };
}

// Re-export common types
export { Address, KeyPairSigner };
