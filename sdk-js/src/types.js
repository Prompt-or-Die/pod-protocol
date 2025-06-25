/**
 * PoD Protocol types and constants for JavaScript SDK
 */

import { Address, address } from '@solana/web3.js';

/**
 * PoD Protocol Program ID on Solana Devnet
 */
export const PROGRAM_ID = new Address('HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps');

/**
 * Message types supported by PoD Protocol
 * @enum {string}
 */
export const MessageType = {
  TEXT: 'text',
  DATA: 'data',
  COMMAND: 'command',
  RESPONSE: 'response',
  CUSTOM: 'custom'
};

/**
 * Message status in the delivery lifecycle
 * @enum {string}
 */
export const MessageStatus = {
  PENDING: 'pending',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed'
};

/**
 * Channel visibility options
 * @enum {string}
 */
export const ChannelVisibility = {
  PUBLIC: 'public',
  PRIVATE: 'private'
};

/**
 * Agent capabilities as bitmask values
 * @readonly
 */
export const AGENT_CAPABILITIES = Object.freeze({
  TRADING: 1 << 0,           // 1
  ANALYSIS: 1 << 1,          // 2
  DATA_PROCESSING: 1 << 2,   // 4
  CONTENT_GENERATION: 1 << 3, // 8
  CUSTOM_1: 1 << 4,          // 16
  CUSTOM_2: 1 << 5,          // 32
  CUSTOM_3: 1 << 6,          // 64
  CUSTOM_4: 1 << 7           // 128
});

/**
 * Error types returned by PoD Protocol program
 * @enum {number}
 */
export const PodComError = {
  INVALID_METADATA_URI_LENGTH: 6000,
  UNAUTHORIZED: 6001,
  MESSAGE_EXPIRED: 6002,
  INVALID_MESSAGE_STATUS_TRANSITION: 6003
};

/**
 * Agent account data structure
 * @typedef {Object} AgentAccount
 * @property {Address} pubkey - Agent's wallet public key
 * @property {number} capabilities - Bitmask representing agent capabilities
 * @property {string} metadataUri - URI to agent metadata (IPFS, Arweave, etc.)
 * @property {number} reputation - Agent reputation score
 * @property {number} lastUpdated - Last update timestamp
 * @property {number} invitesSent - Number of invitations sent in current window
 * @property {number} lastInviteAt - Timestamp of last invitation window
 * @property {number} bump - PDA bump seed
 */

/**
 * Message account data structure
 * @typedef {Object} MessageAccount
 * @property {Address} pubkey - Message account public key
 * @property {Address} sender - Sender's public key
 * @property {Address} recipient - Recipient's public key
 * @property {Uint8Array} payloadHash - SHA-256 hash of message payload
 * @property {string} payload - Original message payload (for display)
 * @property {MessageType} messageType - Type of message
 * @property {number} timestamp - Creation timestamp
 * @property {number} createdAt - Creation timestamp (alias for compatibility)
 * @property {number} expiresAt - Expiration timestamp
 * @property {MessageStatus} status - Current delivery status
 * @property {number} bump - PDA bump seed
 */

/**
 * Channel account data structure
 * @typedef {Object} ChannelAccount
 * @property {Address} pubkey - Channel account public key
 * @property {Address} creator - Channel creator's public key
 * @property {string} name - Channel name
 * @property {string} description - Channel description
 * @property {ChannelVisibility} visibility - Channel visibility setting
 * @property {number} maxParticipants - Maximum number of participants allowed
 * @property {number} participantCount - Current number of participants
 * @property {number} currentParticipants - Current number of participants (alias)
 * @property {number} feePerMessage - Fee per message in lamports
 * @property {number} escrowBalance - Total escrow balance in lamports
 * @property {number} createdAt - Creation timestamp
 * @property {boolean} isActive - Whether channel is active
 * @property {number} bump - PDA bump seed
 */

/**
 * Escrow account data structure
 * @typedef {Object} EscrowAccount
 * @property {Address} channel - Associated channel public key
 * @property {Address} depositor - Depositor's public key
 * @property {number} balance - Deposited amount in lamports
 * @property {number} amount - Deposited amount in lamports (alias)
 * @property {number} createdAt - Deposit timestamp
 * @property {number} lastUpdated - Last updated timestamp
 * @property {number} bump - PDA bump seed
 */

/**
 * Configuration options for creating an agent
 * @typedef {Object} CreateAgentOptions
 * @property {number} capabilities - Bitmask of agent capabilities
 * @property {string} metadataUri - URI to agent metadata
 */

/**
 * Configuration options for updating an agent
 * @typedef {Object} UpdateAgentOptions
 * @property {number} [capabilities] - New capabilities bitmask
 * @property {string} [metadataUri] - New metadata URI
 */

/**
 * Configuration options for sending a message
 * @typedef {Object} SendMessageOptions
 * @property {Address} recipient - Recipient's public key
 * @property {string} content - Message content
 * @property {MessageType} [messageType='text'] - Type of message
 * @property {number} [expirationDays=7] - Days until message expires
 */

/**
 * Configuration options for creating a channel
 * @typedef {Object} CreateChannelOptions
 * @property {string} name - Channel name
 * @property {string} [description=''] - Channel description
 * @property {ChannelVisibility} [visibility='public'] - Channel visibility
 * @property {number} [maxParticipants=100] - Maximum participants
 * @property {number} [feePerMessage=0] - Fee per message in lamports
 */

/**
 * Configuration options for depositing into escrow
 * @typedef {Object} DepositEscrowOptions
 * @property {Address} channel - Channel to deposit into
 * @property {number} amount - Amount in lamports
 */

/**
 * Configuration options for withdrawing from escrow
 * @typedef {Object} WithdrawEscrowOptions
 * @property {Address} channel - Channel to withdraw from
 * @property {number} amount - Amount in lamports
 */

/**
 * Main configuration for PoD Protocol SDK
 * @typedef {Object} PodComConfig
 * @property {string} [endpoint] - Solana cluster endpoint
 * @property {Address} [programId] - Program ID (defaults to devnet)
 * @property {string} [commitment] - Default commitment level
 * @property {Object} [ipfs] - IPFS configuration
 * @property {Object} [zkCompression] - ZK Compression configuration
 * @property {string} [jitoRpcUrl] - Jito RPC URL for bundle transactions
 * @property {Object} [sessionKeys] - Session keys configuration
 */
