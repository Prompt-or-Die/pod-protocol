/**
 * Account size constants for PoD Protocol program accounts
 * Used for efficient filtering in getProgramAccounts calls
 */

/**
 * Standard Solana account overhead
 */
export const ACCOUNT_OVERHEAD = 8; // 8-byte discriminator

/**
 * Standard field sizes in bytes
 */
export const FIELD_SIZES = {
  PUBKEY: 32,
  U64: 8,
  U32: 4,
  U16: 2,
  U8: 1,
  BOOL: 1,
  BUMP: 1,
  STRING_PREFIX: 4, // String length prefix
  VEC_PREFIX: 4,    // Vector length prefix
  OPTION: 1,        // Option discriminator
} as const;

/**
 * Variable field size limits (for capacity planning)
 */
export const VARIABLE_LIMITS = {
  AGENT_METADATA_URI: 200,
  AGENT_NAME: 64,
  CHANNEL_NAME: 64,
  CHANNEL_DESCRIPTION: 256,
  MESSAGE_PAYLOAD: 1024,
  MESSAGE_PAYLOAD_HASH: 32,
  INVITE_MESSAGE: 256,
} as const;

/**
 * Calculate agent account size
 * Fields: capabilities (u64), metadata_uri (String), reputation (u64), 
 * last_updated (u64), invites_sent (u64), last_invite_at (u64), bump (u8)
 */
export const AGENT_ACCOUNT_SIZE = 
  ACCOUNT_OVERHEAD +
  FIELD_SIZES.U64 + // capabilities
  FIELD_SIZES.STRING_PREFIX + VARIABLE_LIMITS.AGENT_METADATA_URI + // metadata_uri
  FIELD_SIZES.U64 + // reputation
  FIELD_SIZES.U64 + // last_updated
  FIELD_SIZES.U64 + // invites_sent
  FIELD_SIZES.U64 + // last_invite_at
  FIELD_SIZES.BUMP; // bump

/**
 * Calculate message account size
 * Fields: sender (Pubkey), recipient (Pubkey), payload (String), payload_hash (bytes),
 * message_type (enum), status (enum), timestamp (u64), created_at (u64), expires_at (u64), bump (u8)
 */
export const MESSAGE_ACCOUNT_SIZE = 
  ACCOUNT_OVERHEAD +
  FIELD_SIZES.PUBKEY + // sender
  FIELD_SIZES.PUBKEY + // recipient
  FIELD_SIZES.STRING_PREFIX + VARIABLE_LIMITS.MESSAGE_PAYLOAD + // payload
  VARIABLE_LIMITS.MESSAGE_PAYLOAD_HASH + // payload_hash
  FIELD_SIZES.U8 + // message_type enum
  FIELD_SIZES.U8 + // status enum
  FIELD_SIZES.U64 + // timestamp
  FIELD_SIZES.U64 + // created_at
  FIELD_SIZES.U64 + // expires_at
  FIELD_SIZES.BUMP; // bump

/**
 * Calculate channel account size
 * Fields: creator (Pubkey), name (String), description (String), visibility (enum),
 * current_participants (u32), max_participants (u32), fee_per_message (u64),
 * escrow_balance (u64), created_at (u64), last_updated (u64), bump (u8)
 */
export const CHANNEL_ACCOUNT_SIZE = 
  ACCOUNT_OVERHEAD +
  FIELD_SIZES.PUBKEY + // creator
  FIELD_SIZES.STRING_PREFIX + VARIABLE_LIMITS.CHANNEL_NAME + // name
  FIELD_SIZES.STRING_PREFIX + VARIABLE_LIMITS.CHANNEL_DESCRIPTION + // description
  FIELD_SIZES.U8 + // visibility enum
  FIELD_SIZES.U32 + // current_participants
  FIELD_SIZES.U32 + // max_participants
  FIELD_SIZES.U64 + // fee_per_message
  FIELD_SIZES.U64 + // escrow_balance
  FIELD_SIZES.U64 + // created_at
  FIELD_SIZES.U64 + // last_updated
  FIELD_SIZES.BUMP; // bump

/**
 * Calculate participant account size
 * Fields: channel (Pubkey), agent (Pubkey), role (enum), joined_at (u64), 
 * permissions (u64), bump (u8)
 */
export const PARTICIPANT_ACCOUNT_SIZE = 
  ACCOUNT_OVERHEAD +
  FIELD_SIZES.PUBKEY + // channel
  FIELD_SIZES.PUBKEY + // agent
  FIELD_SIZES.U8 + // role enum
  FIELD_SIZES.U64 + // joined_at
  FIELD_SIZES.U64 + // permissions
  FIELD_SIZES.BUMP; // bump

/**
 * Calculate invitation account size
 * Fields: channel (Pubkey), inviter (Pubkey), invitee (Pubkey), 
 * message (String), created_at (u64), expires_at (u64), bump (u8)
 */
export const INVITATION_ACCOUNT_SIZE = 
  ACCOUNT_OVERHEAD +
  FIELD_SIZES.PUBKEY + // channel
  FIELD_SIZES.PUBKEY + // inviter
  FIELD_SIZES.PUBKEY + // invitee
  FIELD_SIZES.STRING_PREFIX + VARIABLE_LIMITS.INVITE_MESSAGE + // message
  FIELD_SIZES.U64 + // created_at
  FIELD_SIZES.U64 + // expires_at
  FIELD_SIZES.BUMP; // bump

/**
 * Calculate escrow account size
 * Fields: channel (Pubkey), creator (Pubkey), balance (u64), 
 * created_at (u64), bump (u8)
 */
export const ESCROW_ACCOUNT_SIZE = 
  ACCOUNT_OVERHEAD +
  FIELD_SIZES.PUBKEY + // channel
  FIELD_SIZES.PUBKEY + // creator
  FIELD_SIZES.U64 + // balance
  FIELD_SIZES.U64 + // created_at
  FIELD_SIZES.BUMP; // bump

/**
 * Channel message account size (messages within channels)
 * Fields: channel (Pubkey), sender (Pubkey), content (String), 
 * message_type (enum), timestamp (u64), nonce (u64), bump (u8)
 */
export const CHANNEL_MESSAGE_ACCOUNT_SIZE = 
  ACCOUNT_OVERHEAD +
  FIELD_SIZES.PUBKEY + // channel
  FIELD_SIZES.PUBKEY + // sender
  FIELD_SIZES.STRING_PREFIX + VARIABLE_LIMITS.MESSAGE_PAYLOAD + // content
  FIELD_SIZES.U8 + // message_type enum
  FIELD_SIZES.U64 + // timestamp
  FIELD_SIZES.U64 + // nonce
  FIELD_SIZES.BUMP; // bump

/**
 * Account size lookup table
 */
export const ACCOUNT_SIZES = {
  agentAccount: AGENT_ACCOUNT_SIZE,
  messageAccount: MESSAGE_ACCOUNT_SIZE,
  channelAccount: CHANNEL_ACCOUNT_SIZE,
  participantAccount: PARTICIPANT_ACCOUNT_SIZE,
  invitationAccount: INVITATION_ACCOUNT_SIZE,
  escrowAccount: ESCROW_ACCOUNT_SIZE,
  channelMessage: CHANNEL_MESSAGE_ACCOUNT_SIZE,
} as const;

/**
 * Account discriminators (8-byte prefixes for different account types)
 * These are calculated from the account type name using sha256
 */
export const ACCOUNT_DISCRIMINATORS = {
  // These would be calculated from the actual Anchor IDL
  // For now, using placeholder values that would be updated with real discriminators
  agentAccount: 'e7c48c7b8b8e7e7e', // First 8 bytes of sha256("account:AgentAccount")
  messageAccount: 'a1b2c3d4e5f6a7b8', // First 8 bytes of sha256("account:MessageAccount")
  channelAccount: 'c7d8e9f0a1b2c3d4', // First 8 bytes of sha256("account:ChannelAccount")
  participantAccount: 'f1e2d3c4b5a69788', // First 8 bytes of sha256("account:ParticipantAccount")
  invitationAccount: '9b8a7f6e5d4c3b2a', // First 8 bytes of sha256("account:InvitationAccount")
  escrowAccount: '5f4e3d2c1b0a9f8e', // First 8 bytes of sha256("account:EscrowAccount")
  channelMessage: '8e7d6c5b4a392817', // First 8 bytes of sha256("account:ChannelMessage")
} as const;

/**
 * Utility functions for account filtering
 */
export class AccountFilters {
  /**
   * Create dataSize filter for specific account type
   */
  static createDataSizeFilter(accountType: keyof typeof ACCOUNT_SIZES): { dataSize: number } {
    return { dataSize: ACCOUNT_SIZES[accountType] };
  }

  /**
   * Create memcmp filter for account discriminator
   */
  static createDiscriminatorFilter(accountType: keyof typeof ACCOUNT_DISCRIMINATORS): {
    memcmp: { offset: number; bytes: string }
  } {
    return {
      memcmp: {
        offset: 0,
        bytes: ACCOUNT_DISCRIMINATORS[accountType]
      }
    };
  }

  /**
   * Create memcmp filter for pubkey field at specific offset
   */
  static createPubkeyFilter(offset: number, pubkey: string): {
    memcmp: { offset: number; bytes: string }
  } {
    return {
      memcmp: {
        offset,
        bytes: pubkey
      }
    };
  }

  /**
   * Create combined filters for efficient account fetching
   */
  static createAccountFilters(
    accountType: keyof typeof ACCOUNT_SIZES,
    additionalFilters: Array<{ memcmp: { offset: number; bytes: string } }> = []
  ): Array<{ dataSize?: number; memcmp?: { offset: number; bytes: string } }> {
    return [
      AccountFilters.createDataSizeFilter(accountType),
      AccountFilters.createDiscriminatorFilter(accountType as keyof typeof ACCOUNT_DISCRIMINATORS),
      ...additionalFilters
    ];
  }

  /**
   * Calculate maximum accounts that can be fetched in one call
   * Based on typical RPC response size limits (10MB)
   */
  static getMaxAccountsPerCall(accountType: keyof typeof ACCOUNT_SIZES): number {
    const accountSize = ACCOUNT_SIZES[accountType];
    const maxResponseSize = 10 * 1024 * 1024; // 10MB
    const accountOverhead = 100; // Additional overhead per account in response
    
    return Math.floor(maxResponseSize / (accountSize + accountOverhead));
  }

  /**
   * Get field offsets for common filtering patterns
   */
  static getFieldOffsets() {
    return {
      // Agent account field offsets
      agent: {
        capabilities: ACCOUNT_OVERHEAD,
        reputation: ACCOUNT_OVERHEAD + FIELD_SIZES.U64 + FIELD_SIZES.STRING_PREFIX + VARIABLE_LIMITS.AGENT_METADATA_URI,
      },
      
      // Message account field offsets  
      message: {
        sender: ACCOUNT_OVERHEAD,
        recipient: ACCOUNT_OVERHEAD + FIELD_SIZES.PUBKEY,
        messageType: ACCOUNT_OVERHEAD + FIELD_SIZES.PUBKEY + FIELD_SIZES.PUBKEY + FIELD_SIZES.STRING_PREFIX + VARIABLE_LIMITS.MESSAGE_PAYLOAD + VARIABLE_LIMITS.MESSAGE_PAYLOAD_HASH,
        status: ACCOUNT_OVERHEAD + FIELD_SIZES.PUBKEY + FIELD_SIZES.PUBKEY + FIELD_SIZES.STRING_PREFIX + VARIABLE_LIMITS.MESSAGE_PAYLOAD + VARIABLE_LIMITS.MESSAGE_PAYLOAD_HASH + FIELD_SIZES.U8,
      },
      
      // Channel account field offsets
      channel: {
        creator: ACCOUNT_OVERHEAD,
        visibility: ACCOUNT_OVERHEAD + FIELD_SIZES.PUBKEY + FIELD_SIZES.STRING_PREFIX + VARIABLE_LIMITS.CHANNEL_NAME + FIELD_SIZES.STRING_PREFIX + VARIABLE_LIMITS.CHANNEL_DESCRIPTION,
      },
      
      // Participant account field offsets
      participant: {
        channel: ACCOUNT_OVERHEAD,
        agent: ACCOUNT_OVERHEAD + FIELD_SIZES.PUBKEY,
      }
    };
  }
}

/**
 * Estimate total data transfer for account fetching operations
 */
export function estimateDataTransfer(
  accountType: keyof typeof ACCOUNT_SIZES,
  estimatedCount: number
): {
  accountSize: number;
  totalSize: number;
  recommendedBatchSize: number;
  estimatedCalls: number;
} {
  const accountSize = ACCOUNT_SIZES[accountType];
  const totalSize = accountSize * estimatedCount;
  const maxPerCall = AccountFilters.getMaxAccountsPerCall(accountType);
  const recommendedBatchSize = Math.min(maxPerCall, Math.max(10, Math.floor(maxPerCall * 0.8)));
  const estimatedCalls = Math.ceil(estimatedCount / recommendedBatchSize);

  return {
    accountSize,
    totalSize,
    recommendedBatchSize,
    estimatedCalls
  };
} 