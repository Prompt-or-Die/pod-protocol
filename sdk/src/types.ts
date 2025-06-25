import { PublicKey } from "@solana/web3.js";

/**
 * PoD Protocol Program ID on Solana Devnet
 */
export const PROGRAM_ID = new PublicKey(
  "HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps",
);

/**
 * Message types supported by PoD Protocol
 */
export enum MessageType {
  Text = "text",
  Data = "data",
  Command = "command",
  Response = "response",
  Custom = "custom",
}

/**
 * Message status in the delivery lifecycle
 */
export enum MessageStatus {
  Pending = "pending",
  Delivered = "delivered",
  Read = "read",
  Failed = "failed",
}

/**
 * Channel visibility options
 */
export enum ChannelVisibility {
  Public = "public",
  Private = "private",
}

/**
 * Agent account data structure
 */
export interface AgentAccount {
  /** Agent's wallet public key */
  pubkey: PublicKey;
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
  pubkey: PublicKey;
  /** Sender's public key */
  sender: PublicKey;
  /** Recipient's public key */
  recipient: PublicKey;
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
  pubkey: PublicKey;
  /** Channel creator's public key */
  creator: PublicKey;
  /** Channel name */
  name: string;
  /** Channel description */
  description: string;
  /** Channel visibility setting */
  visibility: ChannelVisibility;
  /** Maximum number of participants allowed */
  maxParticipants: number;
  /** Current number of participants */
  participantCount: number;
  /** Current number of participants (alias for compatibility) */
  currentParticipants: number;
  /** Fee per message in lamports */
  feePerMessage: number;
  /** Total escrow balance in lamports */
  escrowBalance: number;
  /** Creation timestamp */
  createdAt: number;
  /** Whether channel is active */
  isActive: boolean;
  /** PDA bump seed */
  bump: number;
}

/**
 * Escrow account data structure
 */
export interface EscrowAccount {
  /** Associated channel public key */
  channel: PublicKey;
  /** Depositor's public key */
  depositor: PublicKey;
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
  TRADING: 1 << 0, // 1
  ANALYSIS: 1 << 1, // 2
  DATA_PROCESSING: 1 << 2, // 4
  CONTENT_GENERATION: 1 << 3, // 8
  CUSTOM_1: 1 << 4, // 16
  CUSTOM_2: 1 << 5, // 32
  CUSTOM_3: 1 << 6, // 64
  CUSTOM_4: 1 << 7, // 128
} as const;

/**
 * Error types returned by PoD Protocol program
 */
export enum PodComError {
  InvalidMetadataUriLength = 6000,
  Unauthorized = 6001,
  MessageExpired = 6002,
  InvalidMessageStatusTransition = 6003,
}

/**
 * Configuration for PoD Protocol SDK
 */
export interface PodComConfig {
  /** Solana cluster endpoint */
  endpoint?: string;
  /** Program ID (defaults to devnet) */
  programId?: PublicKey;
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
    lightSystemProgram?: PublicKey;
    /** Nullifier queue public key */
    nullifierQueuePubkey?: PublicKey;
    /** CPI authority PDA */
    cpiAuthorityPda?: PublicKey;
    /** Compressed Token program */
    compressedTokenProgram?: PublicKey;
    /** Registered Program ID */
    registeredProgramId?: PublicKey;
    /** No-op Program */
    noopProgram?: PublicKey;
    /** Account Compression authority */
    accountCompressionAuthority?: PublicKey;
    /** Account Compression program */
    accountCompressionProgram?: PublicKey;
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
 * Options for sending a message
 */
export interface SendMessageOptions {
  /** Recipient's public key */
  recipient: PublicKey;
  /** Message payload (will be hashed) */
  payload: string | Uint8Array;
  /** Message type */
  messageType: MessageType;
  /** Custom message type value (for Custom type) */
  customValue?: number;
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
  maxParticipants: number;
  /** Fee per message in lamports */
  feePerMessage: number;
}

/**
 * Options for depositing to escrow
 */
export interface DepositEscrowOptions {
  /** Channel public key */
  channel: PublicKey;
  /** Amount to deposit in lamports */
  amount: number;
}

/**
 * Options for withdrawing from escrow
 */
export interface WithdrawEscrowOptions {
  /** Channel public key */
  channel: PublicKey;
  /** Amount to withdraw in lamports */
  amount: number;
}

/**
 * Options for broadcasting a message to a channel
 */
export interface BroadcastMessageOptions {
  /** Channel public key */
  channelPDA: PublicKey;
  /** Message content */
  content: string;
  /** Message type (defaults to "Text") */
  messageType?: any;
  /** Optional reply-to message */
  replyTo?: PublicKey;
}
