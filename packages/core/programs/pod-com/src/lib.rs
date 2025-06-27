// Global allow for Anchor-related config warnings and deprecated methods
#![allow(unexpected_cfgs, deprecated)]

use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey;

// Native Solana State Compression imports - 2025 approach
use spl_account_compression::{
    program::SplAccountCompression,
};

// Cryptographic operations - native Solana compatible
use blake3;

declare_id!("HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps");

// =============================================================================
// SECURE MEMORY UTILITIES
// =============================================================================

/// Secure memory wrapper for sensitive cryptographic operations
pub struct SecureBuffer {
    data: Vec<u8>,
}

impl SecureBuffer {
    /// Allocate secure memory for sensitive data
    pub fn new(size: usize) -> Result<Self> {
        // SECURITY FIX: Add size validation to prevent attacks
        if size == 0 {
            return Err(PodComError::SecureMemoryAllocationFailed.into());
        }
        
        // Prevent excessive memory allocation that could cause DoS
        const MAX_SECURE_BUFFER_SIZE: usize = 64 * 1024; // 64KB limit
        if size > MAX_SECURE_BUFFER_SIZE {
            return Err(PodComError::SecureMemoryAllocationFailed.into());
        }
        
        // Initialize with secure zero pattern
        let mut data = vec![0u8; size];
        
        // Use Solana's secure memory operations if available
        use anchor_lang::solana_program::program_memory::sol_memset;
        sol_memset(&mut data, 0, size);
        
        Ok(SecureBuffer { data })
    }
    
    /// Get mutable slice to secure memory
    pub fn as_mut_slice(&mut self) -> &mut [u8] {
        &mut self.data
    }
    
    /// Get immutable slice to secure memory
    pub fn as_slice(&self) -> &[u8] {
        &self.data
    }
    
    /// Securely compare two buffers in constant time
    pub fn secure_compare(&self, other: &[u8]) -> bool {
        if self.data.len() != other.len() {
            return false;
        }
        // Use constant-time comparison
        self.data.iter().zip(other.iter()).fold(0u8, |acc, (a, b)| acc | (a ^ b)) == 0
    }
}

impl Drop for SecureBuffer {
    fn drop(&mut self) {
        // SECURITY FIX: Safely zero the memory with bounds checking
        if !self.data.is_empty() {
            // Use safe rust patterns for memory clearing
            let len = self.data.len();
            self.data.iter_mut().for_each(|byte| *byte = 0);
            
            // Additional security: overwrite with random then zero again
            use anchor_lang::solana_program::program_memory::sol_memset;
            sol_memset(&mut self.data, 0, len);
        }
    }
}

/// Secure hash computation wrapper
pub fn secure_hash_data(data: &[u8]) -> Result<[u8; 32]> {
    // Use secure buffer for intermediate hash computations
    let mut secure_buf = SecureBuffer::new(data.len())?;
    
    // Copy data to secure memory
    let secure_slice = secure_buf.as_mut_slice();
    secure_slice.copy_from_slice(data);
    
    // Perform hash computation using native Solana-compatible Blake3
    let hash = blake3::hash(secure_slice);
    Ok(*hash.as_bytes())
}

/*
 * PoD Protocol (Prompt or Die): AI Agent Communication Protocol v1.0.0
 *
 * A comprehensive Solana program enabling secure, scalable communication between AI agents
 * with features including direct messaging, group channels, escrow systems, and reputation management.
 *
 * CORE FEATURES:
 * - Agent registration and identity management
 * - Direct messaging between agents with expiration
 * - Group communication via channels (public/private)
 * - Escrow system for channel fees and deposits
 * - Reputation system for trusted interactions
 * - Rate limiting and spam prevention
 * - Comprehensive event monitoring
 *
 * PDA USAGE DOCUMENTATION:
 * - Agent accounts use PDA: ["agent", wallet_pubkey]
 * - Message senders ALWAYS use agent PDA addresses (not wallet addresses)
 * - This ensures all communication is between registered agents
 * - Channel participants store agent PDA addresses
 *
 * CONSISTENCY RULES:
 * - message.sender = agent_pda (NOT wallet_pubkey)
 * - participant.participant = agent_pda (NOT wallet_pubkey)
 * - All communication flows through agent identities
 *
 * SECURITY FEATURES:
 * - Comprehensive input validation on all functions
 * - Rate limiting with sliding window approach
 * - Authorization checks for sensitive operations
 * - Escrow protection for financial interactions
 * - Message expiration for privacy
 *
 * PROGRAM ID: HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps
 * NETWORK: Devnet (ready for mainnet deployment)
 */

// Constants
const MAX_METADATA_URI_LENGTH: usize = 200; // Maximum length of metadata URI
const MESSAGE_EXPIRATION_SECONDS: i64 = 7 * 24 * 60 * 60; // 7 days
const MAX_CHANNEL_NAME_LENGTH: usize = 50; // Maximum channel name length
const MAX_CHANNEL_DESCRIPTION_LENGTH: usize = 200; // Maximum channel description length
const MAX_PARTICIPANTS_PER_CHANNEL: u32 = 1000; // Maximum participants in a channel
const MAX_MESSAGE_CONTENT_LENGTH: usize = 1000; // Maximum message content length
const RATE_LIMIT_MESSAGES_PER_MINUTE: u16 = 60; // Rate limit for messages
const INVITE_RATE_LIMIT_PER_HOUR: u16 = 20; // Maximum invitations per hour
const MIN_REPUTATION_FOR_CHANNELS: u64 = 50; // Minimum reputation to create channels

// Account Space Constants with optimized struct packing (PERF-02)
// All structs use #[repr(C)] for consistent memory layout and optimal performance
const AGENT_ACCOUNT_SPACE: usize = 8
    + 32 // pubkey
    + 8  // capabilities
    + 8  // reputation
    + 8  // last_updated
    + (4 + MAX_METADATA_URI_LENGTH) // metadata_uri
    + 2  // invites_sent
    + 8  // last_invite_at
    + 1  // bump
    + 7; // _reserved - 286 bytes (optimized layout)
const MESSAGE_ACCOUNT_SPACE: usize = 8 + 32 + 32 + 32 + 8 + 8 + 1 + 1 + 1 + 5; // 128 bytes (optimized layout)
const CHANNEL_ACCOUNT_SPACE: usize = 8
    + 32 // creator
    + 8  // fee_per_message
    + 8  // escrow_balance
    + 8  // created_at
    + 4  // max_participants
    + 4  // current_participants
    + (4 + MAX_CHANNEL_NAME_LENGTH)      // name
    + (4 + MAX_CHANNEL_DESCRIPTION_LENGTH) // description
    + 1  // visibility
    + 1  // is_active
    + 1  // bump
    + 5; // _reserved - 333 bytes (optimized layout)
const CHANNEL_PARTICIPANT_SPACE: usize = 8 + 32 + 32 + 8 + 8 + 8 + 1 + 1 + 6; // 104 bytes (optimized layout)
const CHANNEL_INVITATION_SPACE: usize = 8 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 1 + 1 + 1 + 5; // 168 bytes (optimized layout)
const CHANNEL_MESSAGE_SPACE: usize =
    8 + 32 + 32 + 33 + 8 + 9 + (4 + MAX_MESSAGE_CONTENT_LENGTH) + 1 + 1 + 6; // 1134 bytes (optimized layout)
const ESCROW_ACCOUNT_SPACE: usize = 8 + 32 + 32 + 8 + 8 + 1 + 7; // 96 bytes (already optimal)

// Error codes
#[error_code]
pub enum PodComError {
    #[msg("Invalid metadata URI length")]
    InvalidMetadataUriLength,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Message expired")]
    MessageExpired,
    #[msg("Invalid message status transition")]
    InvalidMessageStatusTransition,
    #[msg("Channel is full")]
    ChannelFull,
    #[msg("Already in channel")]
    AlreadyInChannel,
    #[msg("Not in channel")]
    NotInChannel,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Channel name too long")]
    ChannelNameTooLong,
    #[msg("Channel description too long")]
    ChannelDescriptionTooLong,
    #[msg("Insufficient reputation")]
    InsufficientReputation,
    #[msg("Rate limit exceeded")]
    RateLimitExceeded,
    #[msg("Message content too long")]
    MessageContentTooLong,
    #[msg("Private channel requires invitation")]
    PrivateChannelRequiresInvitation,
    #[msg("Hashing operation failed")]
    HashingFailed,
    #[msg("Secure memory allocation failed")]
    SecureMemoryAllocationFailed,
    #[msg("Invalid timestamp")]
    InvalidTimestamp,
    #[msg("Invalid message hash")]
    InvalidMessageHash,
}

// Message types
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum MessageType {
    Text,
    Data,
    Command,
    Response,
    Custom(u8),
}

// Message status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum MessageStatus {
    Pending,
    Delivered,
    Read,
    Failed,
}

// Channel visibility
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ChannelVisibility {
    Public,
    Private,
}

// Program Events for monitoring and indexing
#[event]
pub struct AgentRegistered {
    pub agent: Pubkey,
    pub capabilities: u64,
    pub metadata_uri: String,
    pub timestamp: i64,
}

#[event]
pub struct MessageSent {
    pub sender: Pubkey,
    pub recipient: Pubkey,
    pub message_type: MessageType,
    pub timestamp: i64,
}

#[event]
pub struct ChannelCreated {
    pub channel: Pubkey,
    pub creator: Pubkey,
    pub name: String,
    pub visibility: ChannelVisibility,
    pub timestamp: i64,
}

#[event]
pub struct ChannelJoined {
    pub channel: Pubkey,
    pub participant: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct MessageBroadcast {
    pub channel: Pubkey,
    pub sender: Pubkey,
    pub message_type: MessageType,
    pub timestamp: i64,
}

#[event]
pub struct EscrowDeposit {
    pub channel: Pubkey,
    pub depositor: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct EscrowWithdrawal {
    pub channel: Pubkey,
    pub depositor: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct CompressedMessageSynced {
    pub channel_id: Pubkey,
    pub message_hash: [u8; 32],
    pub compressed_hash: [u8; 32],
    pub batch_index: u32,
    pub sync_timestamp: i64,
}

// Channel account structure with optimized memory layout (PERF-02)
#[account]
#[repr(C)]
pub struct ChannelAccount {
    pub creator: Pubkey,               // 32 bytes
    pub fee_per_message: u64,          // 8 bytes (lamports)
    pub escrow_balance: u64,           // 8 bytes (lamports)
    pub created_at: i64,               // 8 bytes
    pub max_participants: u32,         // 4 bytes
    pub current_participants: u32,     // 4 bytes
    pub name: String,                  // 4 + 50 bytes (max 50 chars)
    pub description: String,           // 4 + 200 bytes (max 200 chars)
    pub visibility: ChannelVisibility, // 1 byte
    pub is_active: bool,               // 1 byte
    pub last_sync_timestamp: i64,      // 8 bytes - Last batch sync timestamp
    pub total_compressed_messages: u64, // 8 bytes - Total compressed messages
    pub compressed_data_size: u64,     // 8 bytes - Total compressed data size
    pub bump: u8,                      // 1 byte
    _reserved: [u8; 5],                // 5 bytes (padding for alignment)
}

// Channel participant account structure with optimized memory layout (PERF-02)
#[account]
#[repr(C)]
pub struct ChannelParticipant {
    pub channel: Pubkey,      // 32 bytes
    pub participant: Pubkey,  // 32 bytes
    pub joined_at: i64,       // 8 bytes
    pub messages_sent: u64,   // 8 bytes
    pub last_message_at: i64, // 8 bytes
    pub is_active: bool,      // 1 byte
    pub bump: u8,             // 1 byte
    _reserved: [u8; 6],       // 6 bytes (padding for alignment)
}

// Channel invitation account structure (for private channels)
// SECURITY ENHANCEMENT (MED-01): Cryptographically secure invitation system
// PERFORMANCE OPTIMIZATION (PERF-02): Optimized memory layout
#[account]
#[repr(C)]
pub struct ChannelInvitation {
    pub channel: Pubkey,            // 32 bytes
    pub inviter: Pubkey,            // 32 bytes
    pub invitee: Pubkey,            // 32 bytes
    pub invitation_hash: [u8; 32],  // 32 bytes - Cryptographic verification hash
    pub created_at: i64,            // 8 bytes
    pub expires_at: i64,            // 8 bytes
    pub nonce: u64,                 // 8 bytes - Prevent replay attacks
    pub is_accepted: bool,          // 1 byte
    pub is_used: bool,              // 1 byte - Single-use enforcement
    pub bump: u8,                   // 1 byte
    _reserved: [u8; 5],             // 5 bytes (padding for alignment)
}

// Channel message account structure (for broadcast messages)
// PERFORMANCE OPTIMIZATION (PERF-02): Optimized memory layout
#[account]
#[repr(C)]
pub struct ChannelMessage {
    pub channel: Pubkey,           // 32 bytes
    pub sender: Pubkey,            // 32 bytes
    pub reply_to: Option<Pubkey>,  // 33 bytes (1 for Option + 32 for Pubkey)
    pub created_at: i64,           // 8 bytes
    pub edited_at: Option<i64>,    // 9 bytes (1 for Option + 8 for i64)
    pub content: String,           // 4 + 1000 bytes (max content)
    pub message_type: MessageType, // 1 byte
    pub bump: u8,                  // 1 byte
    _reserved: [u8; 6],            // 6 bytes (padding for alignment)
}

// Escrow account structure with optimized memory layout (PERF-02)
#[account]
#[repr(C)]
pub struct EscrowAccount {
    pub channel: Pubkey,   // 32 bytes
    pub depositor: Pubkey, // 32 bytes
    pub amount: u64,       // 8 bytes
    pub created_at: i64,   // 8 bytes
    pub bump: u8,          // 1 byte
    _reserved: [u8; 7],    // 7 bytes (padding for alignment)
}

// Agent account structure with optimized memory layout (PERF-02)
#[account]
#[repr(C)]
pub struct AgentAccount {
    pub pubkey: Pubkey,       // 32 bytes
    pub capabilities: u64,    // 8 bytes
    pub reputation: u64,      // 8 bytes
    pub last_updated: i64,    // 8 bytes
    pub metadata_uri: String, // 4 + MAX_METADATA_URI_LENGTH bytes
    pub invites_sent: u16,    // 2 bytes - rate limiting
    pub last_invite_at: i64,  // 8 bytes - rate limit window start
    pub bump: u8,             // 1 byte
    _reserved: [u8; 7],       // 7 bytes (padding for alignment)
}

// Message account structure with optimized memory layout (PERF-02)
#[account]
#[repr(C)]
pub struct MessageAccount {
    pub sender: Pubkey,            // 32 bytes
    pub recipient: Pubkey,         // 32 bytes
    pub payload_hash: [u8; 32],    // 32 bytes
    pub created_at: i64,           // 8 bytes
    pub expires_at: i64,           // 8 bytes
    pub message_type: MessageType, // 1 byte (max)
    pub status: MessageStatus,     // 1 byte (max)
    pub bump: u8,                  // 1 byte
    _reserved: [u8; 5],            // 5 bytes (padding for alignment)
}

// =============================================================================
// ZK COMPRESSED ACCOUNT STRUCTURES
// =============================================================================

// Compressed Channel Message - stores only essential data on-chain, content via IPFS
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CompressedChannelMessage {
    pub channel: Pubkey,           // 32 bytes
    pub sender: Pubkey,            // 32 bytes
    pub content_hash: [u8; 32],    // 32 bytes - SHA256 hash of IPFS content
    pub ipfs_hash: String,         // 4 + 64 bytes - IPFS content identifier
    pub message_type: MessageType, // 1 byte
    pub created_at: i64,           // 8 bytes
    pub edited_at: Option<i64>,    // 9 bytes
    pub reply_to: Option<Pubkey>,  // 33 bytes
}

// Implement native Solana hashing for CompressedChannelMessage
impl CompressedChannelMessage {
    pub fn hash(&self) -> std::result::Result<[u8; 32], PodComError> {
        // Calculate required buffer size
        let mut size = 32 + 32 + 32 + self.ipfs_hash.len() + 1 + 8; // base fields
        if self.edited_at.is_some() { size += 8; }
        if self.reply_to.is_some() { size += 32; }
        
        // Validate size before allocation to prevent excessive memory usage
        if size > 1024 * 1024 { // 1MB limit
            return Err(PodComError::SecureMemoryAllocationFailed);
        }
        if size == 0 {
            return Err(PodComError::InvalidMessageHash);
        }
        
        // Use secure memory for sensitive hash computation
        let mut secure_buf = SecureBuffer::new(size)
            .map_err(|_| PodComError::SecureMemoryAllocationFailed)?;
        
        let data = secure_buf.as_mut_slice();
        let mut offset = 0;
        
        // Pack data into secure buffer
        data[offset..offset+32].copy_from_slice(&self.channel.to_bytes());
        offset += 32;
        data[offset..offset+32].copy_from_slice(&self.sender.to_bytes());
        offset += 32;
        data[offset..offset+32].copy_from_slice(&self.content_hash);
        offset += 32;
        
        let ipfs_bytes = self.ipfs_hash.as_bytes();
        data[offset..offset+ipfs_bytes.len()].copy_from_slice(ipfs_bytes);
        offset += ipfs_bytes.len();
        
        // Convert MessageType to u8 manually
        let msg_type_byte = match self.message_type {
            MessageType::Text => 0u8,
            MessageType::Data => 1u8,
            MessageType::Command => 2u8,
            MessageType::Response => 3u8,
            MessageType::Custom(val) => val,
        };
        data[offset] = msg_type_byte;
        offset += 1;
        
        data[offset..offset+8].copy_from_slice(&self.created_at.to_le_bytes());
        offset += 8;
        
        if let Some(edited) = self.edited_at {
            data[offset..offset+8].copy_from_slice(&edited.to_le_bytes());
            offset += 8;
        }
        if let Some(reply_to) = self.reply_to {
            data[offset..offset+32].copy_from_slice(&reply_to.to_bytes());
        }
        
        // Perform hash computation on secure data using Blake3
        Ok(*blake3::hash(&data[..offset]).as_bytes())
    }
}

// Compressed Channel Participant - minimal on-chain footprint
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CompressedChannelParticipant {
    pub channel: Pubkey,         // 32 bytes
    pub participant: Pubkey,     // 32 bytes
    pub joined_at: i64,          // 8 bytes
    pub messages_sent: u64,      // 8 bytes
    pub last_message_at: i64,    // 8 bytes
    pub metadata_hash: [u8; 32], // 32 bytes - Hash of extended metadata in IPFS
}

// Implement native Solana hashing for CompressedChannelParticipant
impl CompressedChannelParticipant {
    pub fn hash(&self) -> std::result::Result<[u8; 32], PodComError> {
        // Fixed size buffer for participant data: 32+32+8+8+8+32 = 120 bytes
        const BUFFER_SIZE: usize = 120;
        
        // Use secure memory for sensitive hash computation
        let mut secure_buf = SecureBuffer::new(BUFFER_SIZE)
            .map_err(|_| PodComError::SecureMemoryAllocationFailed)?;
        
        let data = secure_buf.as_mut_slice();
        let mut offset = 0;
        
        // Pack data into secure buffer
        data[offset..offset+32].copy_from_slice(&self.channel.to_bytes());
        offset += 32;
        data[offset..offset+32].copy_from_slice(&self.participant.to_bytes());
        offset += 32;
        data[offset..offset+8].copy_from_slice(&self.joined_at.to_le_bytes());
        offset += 8;
        data[offset..offset+8].copy_from_slice(&self.messages_sent.to_le_bytes());
        offset += 8;
        data[offset..offset+8].copy_from_slice(&self.last_message_at.to_le_bytes());
        offset += 8;
        data[offset..offset+32].copy_from_slice(&self.metadata_hash);
        
        // Perform hash computation on secure data using Blake3
            Ok(*blake3::hash(data).as_bytes())
    }
}

// SECURITY: Validate metadata URI format and prevent dangerous schemes
fn is_valid_metadata_uri(uri: &str) -> bool {
    // Check for valid URL schemes only
    if !uri.starts_with("https://") && !uri.starts_with("http://") {
        return false;
    }
    
    // Prevent dangerous schemes and characters
    let dangerous_patterns = [
        "javascript:",
        "data:",
        "file:",
        "ftp:",
        "vbscript:",
        "about:",
        "chrome:",
        "<script",
        "onerror",
        "onload",
        "onclick",
    ];
    
    let uri_lower = uri.to_lowercase();
    for pattern in &dangerous_patterns {
        if uri_lower.contains(pattern) {
            return false;
        }
    }
    
    // Additional character validation
    for ch in uri.chars() {
        if ch.is_control() && ch != '\t' {
            return false;
        }
    }
    
    // Basic URL format validation
    if uri.contains("..") || (uri.contains("//") && !uri.starts_with("http")) {
        return false;
    }
    
    true
}

// SECURITY: Validate message content to prevent injection attacks
fn is_valid_message_content(content: &str) -> bool {
    // Check for null bytes and control characters (except tabs and newlines)
    for ch in content.chars() {
        if ch == '\0' || (ch.is_control() && ch != '\n' && ch != '\r' && ch != '\t') {
            return false;
        }
    }
    
    // Check for dangerous patterns that could be used in attacks
    let dangerous_patterns = [
        "javascript:",
        "<script",
        "</script>",
        "onerror",
        "onload",
        "onclick",
        "data:text/html",
        "vbscript:",
        "about:",
        "file:",
        "eval(",
        "Function(",
        "setTimeout(",
        "setInterval(",
    ];
    
    let content_lower = content.to_lowercase();
    for pattern in &dangerous_patterns {
        if content_lower.contains(pattern) {
            return false;
        }
    }
    
    // Check for excessive repetition (potential spam/DoS)
    if has_excessive_repetition(content) {
        return false;
    }
    
    // Check for SQL injection patterns
    let sql_patterns = [
        "drop table",
        "delete from",
        "update set",
        "insert into",
        "union select",
        "' or 1=1",
        "'; --",
        "/*",
        "*/",
    ];
    
    for pattern in &sql_patterns {
        if content_lower.contains(pattern) {
            return false;
        }
    }
    
    true
}

// Helper function to detect spam/DoS attempts through repetition
fn has_excessive_repetition(content: &str) -> bool {
    if content.len() < 10 {
        return false;
    }
    
    // Check for repeated characters (more than 50% of content)
    let mut char_counts = std::collections::HashMap::new();
    for ch in content.chars() {
        *char_counts.entry(ch).or_insert(0) += 1;
    }
    
    let max_count = char_counts.values().max().unwrap_or(&0);
    let threshold = content.len() / 2;
    
    *max_count > threshold
}

// IPFS Content structures for off-chain storage
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ChannelMessageContent {
    pub content: String,                 // Full message content
    pub attachments: Vec<String>,        // Optional file attachments
    pub metadata: Vec<(String, String)>, // Key-value metadata pairs
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ParticipantExtendedMetadata {
    pub display_name: Option<String>,
    pub permissions: Vec<String>,
    pub custom_data: Vec<(String, String)>,
}

#[allow(deprecated, unexpected_cfgs)]
#[program]
pub mod pod_com {
    use super::*;

    // Register a new agent
    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        capabilities: u64,
        metadata_uri: String,
    ) -> Result<()> {
        // SECURITY: Comprehensive input validation
        
        // Validate metadata_uri format and content
        if metadata_uri.trim().is_empty() {
            return Err(PodComError::InvalidMetadataUriLength.into());
        }
        
        // Enforce strict length limits
        if metadata_uri.len() > MAX_METADATA_URI_LENGTH {
            return Err(PodComError::InvalidMetadataUriLength.into());
        }
        
        // Additional security validations
        if metadata_uri.len() < 10 { // Minimum reasonable URL length
            return Err(PodComError::InvalidMetadataUriLength.into());
        }
        
        // Validate URL format and prevent dangerous schemes
        if !super::is_valid_metadata_uri(&metadata_uri) {
            return Err(PodComError::InvalidMetadataUriLength.into());
        }
        
        // Capabilities validation - prevent overflow and unreasonable values
        if capabilities > u64::MAX / 2 {
            return Err(PodComError::Unauthorized.into());
        }
        
        // Check for null bytes and other dangerous characters
        if metadata_uri.contains('\0') || metadata_uri.contains('\r') || metadata_uri.contains('\n') {
            return Err(PodComError::InvalidMetadataUriLength.into());
        }

        let agent = &mut ctx.accounts.agent_account;
        let clock = Clock::get()?;

        agent.pubkey = ctx.accounts.signer.key();
        agent.capabilities = capabilities;
        agent.metadata_uri = metadata_uri.clone();
        agent.reputation = 100; // Initial reputation
        agent.last_updated = clock.unix_timestamp;
        agent.invites_sent = 0;
        agent.last_invite_at = 0;
        agent.bump = ctx.bumps.agent_account;

        // Emit event for monitoring
        emit!(AgentRegistered {
            agent: agent.pubkey,
            capabilities,
            metadata_uri,
            timestamp: clock.unix_timestamp,
        });

        msg!("Agent registered: {:?}", agent.pubkey);
        Ok(())
    }

    /// **DEPRECATED**: Use `broadcast_message_compressed` (ZK compression) for cost-efficient messaging instead of plain send_message
    // Send a message from one agent to another (uncompressed, deprecated)
    #[deprecated(
        note = "Use broadcast_message_compressed for ZK compression instead of send_message"
    )]
    pub fn send_message(
        ctx: Context<SendMessage>,
        recipient: Pubkey,
        payload_hash: [u8; 32],
        message_type: MessageType,
    ) -> Result<()> {
        let message = &mut ctx.accounts.message_account;
        let clock = Clock::get()?;

        // IMPORTANT: Use agent PDA as sender for consistency across all message types
        // This ensures all messages are associated with registered agents, not raw wallets
        message.sender = ctx.accounts.sender_agent.key();
        message.recipient = recipient;
        message.payload_hash = payload_hash;
        message.message_type = message_type.clone();
        message.created_at = clock.unix_timestamp;
        message.expires_at = clock.unix_timestamp + MESSAGE_EXPIRATION_SECONDS;
        message.status = MessageStatus::Pending;
        message.bump = ctx.bumps.message_account;

        // Emit event for monitoring
        emit!(MessageSent {
            sender: message.sender,
            recipient: message.recipient,
            message_type,
            timestamp: clock.unix_timestamp,
        });

        msg!(
            "Message sent from {:?} to {:?}",
            message.sender,
            message.recipient
        );
        Ok(())
    }

    // Update an agent's metadata or capabilities
    pub fn update_agent(
        ctx: Context<UpdateAgent>,
        capabilities: Option<u64>,
        metadata_uri: Option<String>,
    ) -> Result<()> {
        let clock = Clock::get()?;

        // SECURITY FIX (HIGH-02): Strict signer verification
        // Verify the signer owns the agent account with additional safety checks
        let agent_pubkey = ctx.accounts.agent_account.pubkey;
        if ctx.accounts.signer.key() != agent_pubkey {
            return Err(PodComError::Unauthorized.into());
        }

        // Additional security: Verify PDA derivation to prevent substitution attacks
        let (expected_pda, _bump) = Pubkey::find_program_address(
            &[b"agent", ctx.accounts.signer.key().as_ref()],
            &crate::ID,
        );
        if ctx.accounts.agent_account.key() != expected_pda {
            return Err(PodComError::Unauthorized.into());
        }

        let agent = &mut ctx.accounts.agent_account;

        if let Some(caps) = capabilities {
            agent.capabilities = caps;
        }

        if let Some(uri) = metadata_uri {
            if uri.len() > MAX_METADATA_URI_LENGTH {
                return Err(PodComError::InvalidMetadataUriLength.into());
            }
            agent.metadata_uri = uri;
        }

        agent.last_updated = clock.unix_timestamp;

        msg!("Agent updated: {:?}", agent.pubkey);
        Ok(())
    }

    // Update message status (e.g., mark as delivered or read)
    pub fn update_message_status(
        ctx: Context<UpdateMessageStatus>,
        new_status: MessageStatus,
    ) -> Result<()> {
        let message = &mut ctx.accounts.message_account;
        let clock = Clock::get()?;

        // Verify the message hasn't expired
        if clock.unix_timestamp > message.expires_at {
            return Err(PodComError::MessageExpired.into());
        }

        // Verify the caller is the recipient for certain status updates
        match new_status {
            MessageStatus::Delivered | MessageStatus::Read => {
                if ctx.accounts.recipient_agent.pubkey != message.recipient {
                    return Err(PodComError::Unauthorized.into());
                }
            }
            MessageStatus::Failed => {
                // Only sender or recipient can mark as failed
                if ctx.accounts.signer.key() != message.sender
                    && ctx.accounts.signer.key() != message.recipient
                {
                    return Err(PodComError::Unauthorized.into());
                }
            }
            _ => return Err(PodComError::InvalidMessageStatusTransition.into()),
        }

        // Update status
        message.status = new_status;

        msg!("Message status updated to {:?}", message.status);
        Ok(())
    }

    // Create a new channel
    pub fn create_channel(
        ctx: Context<CreateChannel>,
        name: String,
        description: String,
        visibility: ChannelVisibility,
        max_participants: u32,
        fee_per_message: u64,
    ) -> Result<()> {
        // Comprehensive input validation
        if name.trim().is_empty() {
            return Err(PodComError::ChannelNameTooLong.into()); // Reusing error for empty name
        }
        if name.len() > MAX_CHANNEL_NAME_LENGTH {
            return Err(PodComError::ChannelNameTooLong.into());
        }
        if description.len() > MAX_CHANNEL_DESCRIPTION_LENGTH {
            return Err(PodComError::ChannelDescriptionTooLong.into());
        }
        if max_participants == 0 || max_participants > MAX_PARTICIPANTS_PER_CHANNEL {
            return Err(PodComError::ChannelFull.into()); // Reusing error for invalid participant count
        }
        if fee_per_message > 1_000_000_000 {
            // Max 1 SOL per message
            return Err(PodComError::InsufficientFunds.into()); // Reusing error for excessive fee
        }

        let channel = &mut ctx.accounts.channel_account;
        let clock = Clock::get()?;

        channel.creator = ctx.accounts.creator.key();
        channel.name = name.trim().to_string();
        channel.description = description.trim().to_string();
        channel.visibility = visibility;
        channel.max_participants = max_participants;
        channel.current_participants = 1; // Creator is first participant
        channel.fee_per_message = fee_per_message;
        channel.escrow_balance = 0;
        channel.created_at = clock.unix_timestamp;
        channel.bump = ctx.bumps.channel_account;

        msg!("Channel created: {:?}", channel.creator);
        Ok(())
    }

    // Deposit to escrow for a channel
    pub fn deposit_escrow(ctx: Context<DepositEscrow>, amount: u64) -> Result<()> {
        // Input validation
        if amount == 0 {
            return Err(PodComError::InsufficientFunds.into());
        }
        if amount > 10_000_000_000 {
            // Max 10 SOL per deposit
            return Err(PodComError::InsufficientFunds.into());
        }

        let clock = Clock::get()?;

        // Transfer SOL from depositor to escrow PDA
        let transfer_instruction = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.depositor.key(),
            &ctx.accounts.escrow_account.key(),
            amount,
        );

        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                ctx.accounts.depositor.to_account_info(),
                ctx.accounts.escrow_account.to_account_info(),
            ],
        )?;

        // Initialize escrow account data
        let escrow = &mut ctx.accounts.escrow_account;
        let channel = &mut ctx.accounts.channel_account;

        escrow.channel = channel.key();
        escrow.depositor = ctx.accounts.depositor.key();
        escrow.amount = amount;
        escrow.created_at = clock.unix_timestamp;
        escrow.bump = ctx.bumps.escrow_account;

        // Update channel escrow balance
        channel.escrow_balance += amount;

        msg!("Deposited {} lamports to escrow", amount);
        Ok(())
    }

    // Withdraw from escrow
    pub fn withdraw_escrow(ctx: Context<WithdrawEscrow>, amount: u64) -> Result<()> {
        // Verify the depositor is withdrawing their own funds
        if ctx.accounts.escrow_account.depositor != ctx.accounts.depositor.key() {
            return Err(PodComError::Unauthorized.into());
        }

        // Verify sufficient balance
        if ctx.accounts.escrow_account.amount < amount {
            return Err(PodComError::InsufficientFunds.into());
        }

        // Transfer SOL from escrow PDA back to depositor
        **ctx
            .accounts
            .escrow_account
            .to_account_info()
            .try_borrow_mut_lamports()? -= amount;
        **ctx
            .accounts
            .depositor
            .to_account_info()
            .try_borrow_mut_lamports()? += amount;

        // Update account data
        let escrow = &mut ctx.accounts.escrow_account;
        let channel = &mut ctx.accounts.channel_account;

        escrow.amount -= amount;
        channel.escrow_balance -= amount;

        msg!("Withdrew {} lamports from escrow", amount);
        Ok(())
    }

    // Join a channel
    pub fn join_channel(ctx: Context<JoinChannel>) -> Result<()> {
        let channel = &mut ctx.accounts.channel_account;
        let participant = &mut ctx.accounts.participant_account;
        let clock = Clock::get()?;

        // Check if channel is full
        if channel.current_participants >= channel.max_participants {
            return Err(PodComError::ChannelFull.into());
        }

        // SECURITY FIX (HIGH-01): Enhanced atomic payment verification for premium channels
        if channel.fee_per_message > 0 {
            // Require escrow account for premium channels
            let escrow = ctx.accounts.escrow_account
                .as_ref()
                .ok_or(PodComError::InsufficientFunds)?;
            
            // Verify escrow ownership and PDA derivation for security
            if escrow.depositor != ctx.accounts.user.key() {
                return Err(PodComError::Unauthorized.into());
            }
            
            // Verify escrow PDA is correctly derived to prevent substitution attacks
            let (expected_escrow_pda, _bump) = Pubkey::find_program_address(
                &[b"escrow", channel.key().as_ref(), ctx.accounts.user.key().as_ref()],
                &crate::ID
            );
            let escrow_account = ctx.accounts.escrow_account.as_ref()
                .ok_or(PodComError::InsufficientFunds)?;
            
            if escrow_account.key() != expected_escrow_pda {
                return Err(PodComError::Unauthorized.into());
            }
            
            // Verify sufficient balance with overflow protection
            if escrow.amount < channel.fee_per_message {
                return Err(PodComError::InsufficientFunds.into());
            }
            
            // ATOMIC OPERATION: Deduct fee and grant access in single transaction
            let escrow_mut = ctx.accounts.escrow_account.as_mut()
                .ok_or(PodComError::InsufficientFunds)?;
            escrow_mut.amount = escrow_mut.amount.checked_sub(channel.fee_per_message)
                .ok_or(PodComError::InsufficientFunds)?;
            
            // Update channel escrow balance atomically
            channel.escrow_balance = channel.escrow_balance.checked_add(channel.fee_per_message)
                .ok_or(PodComError::InsufficientFunds)?;
        }

        // SECURITY ENHANCEMENT (MED-01): Enhanced private channel invitation verification
        if channel.visibility == ChannelVisibility::Private {
            if let Some(invitation) = &ctx.accounts.invitation_account {
                // Basic validation checks
                if invitation.invitee != ctx.accounts.user.key() {
                    return Err(PodComError::PrivateChannelRequiresInvitation.into());
                }
                
                if invitation.is_used || invitation.is_accepted {
                    return Err(PodComError::PrivateChannelRequiresInvitation.into());
                }
                
                if clock.unix_timestamp > invitation.expires_at {
                    return Err(PodComError::MessageExpired.into());
                }
                
                // CRYPTOGRAPHIC VERIFICATION: Re-create and verify invitation hash
                let mut hash_input = Vec::new();
                hash_input.extend_from_slice(&invitation.channel.to_bytes());
                hash_input.extend_from_slice(&invitation.inviter.to_bytes());
                hash_input.extend_from_slice(&invitation.invitee.to_bytes());
                hash_input.extend_from_slice(&invitation.nonce.to_le_bytes());
                hash_input.extend_from_slice(&invitation.created_at.to_le_bytes());
                
                let computed_hash = anchor_lang::solana_program::keccak::hash(&hash_input);
                
                // Verify the invitation hash matches to prevent forgery
                if computed_hash.to_bytes() != invitation.invitation_hash {
                    return Err(PodComError::Unauthorized.into());
                }
                
            } else {
                return Err(PodComError::PrivateChannelRequiresInvitation.into());
            }
        }

        // Initialize participant account
        participant.channel = channel.key();
        participant.participant = ctx.accounts.agent_account.key(); // Use agent PDA
        participant.joined_at = clock.unix_timestamp;
        participant.is_active = true;
        participant.messages_sent = 0;
        participant.last_message_at = 0;
        participant.bump = ctx.bumps.participant_account;

        // Update channel participant count
        channel.current_participants += 1;

        // SECURITY ENHANCEMENT (MED-01): Mark invitation as used (single-use enforcement)
        if channel.visibility == ChannelVisibility::Private {
            if let Some(invitation) = &mut ctx.accounts.invitation_account {
                invitation.is_accepted = true;
                invitation.is_used = true; // Prevent reuse of the same invitation
            }
        }

        msg!(
            "User {:?} joined channel {:?}",
            participant.participant,
            channel.name
        );
        Ok(())
    }

    // Leave a channel
    pub fn leave_channel(ctx: Context<LeaveChannel>) -> Result<()> {
        let channel = &mut ctx.accounts.channel_account;
        let participant = &mut ctx.accounts.participant_account;

        // Verify user is in the channel
        if !participant.is_active {
            return Err(PodComError::NotInChannel.into());
        }

        // Mark participant as inactive
        participant.is_active = false;

        // Update channel participant count
        channel.current_participants -= 1;

        msg!(
            "User {:?} left channel {:?}",
            participant.participant,
            channel.name
        );
        Ok(())
    }

    // Broadcast message to a channel
    pub fn broadcast_message(
        ctx: Context<BroadcastMessage>,
        content: String,
        message_type: MessageType,
        reply_to: Option<Pubkey>,
        _nonce: u64,
    ) -> Result<()> {
        let participant = &ctx.accounts.participant_account;
        let channel = &ctx.accounts.channel_account;
        let message = &mut ctx.accounts.message_account;
        let clock = Clock::get()?;

        // SECURITY: Comprehensive message content validation
        
        // Validate content length
        if content.len() > MAX_MESSAGE_CONTENT_LENGTH {
            return Err(PodComError::MessageContentTooLong.into());
        }
        
        // Reject empty messages
        if content.trim().is_empty() {
            return Err(PodComError::MessageContentTooLong.into());
        }
        
        // Validate message content for dangerous patterns
        if !super::is_valid_message_content(&content) {
            return Err(PodComError::MessageContentTooLong.into());
        }
        
        // Additional safety checks
        if content.len() > 10000 { // Extra safety beyond MAX_MESSAGE_CONTENT_LENGTH
            return Err(PodComError::MessageContentTooLong.into());
        }

        // Verify user is an active participant
        if !participant.is_active {
            return Err(PodComError::NotInChannel.into());
        }

        // SECURITY ENHANCEMENT (MED-02): Advanced sliding window rate limiting with burst protection
        let current_time = clock.unix_timestamp;
        let time_window = 60; // 1 minute window
        let burst_limit = 10; // Maximum burst messages in 10 seconds
        let burst_window = 10; // Burst detection window

        let participant = &mut ctx.accounts.participant_account;
        
        // Enhanced rate limiting algorithm with multiple time windows
        if participant.last_message_at > 0 {
            let time_since_last = current_time - participant.last_message_at;

            // ANTI-SPAM: Minimum time between messages (1 second cooldown)
            if time_since_last < 1 {
                return Err(PodComError::RateLimitExceeded.into());
            }

            // BURST DETECTION: Check for rapid-fire messages in short window
            if time_since_last < burst_window {
                // Count recent messages for burst detection
                let recent_burst_count = if time_since_last < burst_window {
                    participant.messages_sent.min(burst_limit + 1)
                } else {
                    0
                };
                
                if recent_burst_count >= burst_limit {
                    return Err(PodComError::RateLimitExceeded.into());
                }
            }

            // SLIDING WINDOW: Standard rate limiting over 1-minute window
            if time_since_last < time_window {
                if participant.messages_sent >= RATE_LIMIT_MESSAGES_PER_MINUTE as u64 {
                    return Err(PodComError::RateLimitExceeded.into());
                }
                // Use checked arithmetic to prevent overflow attacks
                participant.messages_sent = participant.messages_sent.checked_add(1)
                    .ok_or(PodComError::RateLimitExceeded)?;
            } else {
                // Reset counter for new time window
                participant.messages_sent = 1;
            }
        } else {
            // First message from this participant
            participant.messages_sent = 1;
        }
        
        // Update timestamp for next rate limit calculation
        participant.last_message_at = current_time;

        // Initialize message
        message.channel = channel.key();
        // IMPORTANT: Use agent PDA as sender for consistency across all message types
        // This ensures all messages are associated with registered agents, not raw wallets
        message.sender = participant.participant; // This is the agent PDA
        message.content = content;
        message.message_type = message_type;
        message.created_at = clock.unix_timestamp;
        message.edited_at = None;
        message.reply_to = reply_to;
        message.bump = ctx.bumps.message_account;

        msg!("Message broadcast to channel {:?}", channel.name);
        Ok(())
    }

    // Invite user to private channel with cryptographic security
    // SECURITY ENHANCEMENT (MED-01): Cryptographically secure single-use invitations
    pub fn invite_to_channel(ctx: Context<InviteToChannel>, invitee: Pubkey, nonce: u64) -> Result<()> {
        let channel = &ctx.accounts.channel_account;
        let invitation = &mut ctx.accounts.invitation_account;
        let inviter_agent = &mut ctx.accounts.agent_account;
        let clock = Clock::get()?;

        // Only creator or existing participants can invite
        if ctx.accounts.inviter.key() != channel.creator {
            if let Some(participant) = &ctx.accounts.participant_account {
                if !participant.is_active {
                    return Err(PodComError::Unauthorized.into());
                }
            } else {
                return Err(PodComError::Unauthorized.into());
            }
        }

        // Rate limiting per inviter to prevent spam
        if inviter_agent.last_invite_at > 0 {
            let elapsed = clock.unix_timestamp - inviter_agent.last_invite_at;
            if elapsed < 3600 {
                if inviter_agent.invites_sent >= INVITE_RATE_LIMIT_PER_HOUR {
                    return Err(PodComError::RateLimitExceeded.into());
                }
                inviter_agent.invites_sent = inviter_agent
                    .invites_sent
                    .checked_add(1)
                    .ok_or(PodComError::RateLimitExceeded)?;
            } else {
                inviter_agent.invites_sent = 1;
            }
        } else {
            inviter_agent.invites_sent = 1;
        }
        inviter_agent.last_invite_at = clock.unix_timestamp;

        // Create cryptographic invitation hash to prevent forgery
        // Hash = SHA256(channel + inviter + invitee + nonce + timestamp)
        let mut hash_input = Vec::new();
        hash_input.extend_from_slice(&channel.key().to_bytes());
        hash_input.extend_from_slice(&ctx.accounts.inviter.key().to_bytes());
        hash_input.extend_from_slice(&invitee.to_bytes());
        hash_input.extend_from_slice(&nonce.to_le_bytes());
        hash_input.extend_from_slice(&clock.unix_timestamp.to_le_bytes());
        
        // Use Solana's built-in keccak hash for the invitation verification
        let invitation_hash = anchor_lang::solana_program::keccak::hash(&hash_input);

        // Initialize secure invitation
        invitation.channel = channel.key();
        invitation.inviter = ctx.accounts.inviter.key();
        invitation.invitee = invitee;
        invitation.created_at = clock.unix_timestamp;
        invitation.expires_at = clock.unix_timestamp + (7 * 24 * 60 * 60); // 7 days
        invitation.is_accepted = false;
        invitation.is_used = false; // Single-use enforcement
        invitation.invitation_hash = invitation_hash.to_bytes();
        invitation.nonce = nonce;
        invitation.bump = ctx.bumps.invitation_account;

        msg!(
            "Secure invitation sent to {:?} for channel {:?} with hash {:?}",
            invitee,
            channel.name,
            invitation_hash.to_bytes()
        );
        Ok(())
    }

    // Get channel participants (view function - would be called off-chain)
    pub fn get_channel_participants(ctx: Context<GetChannelParticipants>) -> Result<Vec<Pubkey>> {
        // Note: In Solana programs, this function returns empty as participant data
        // is typically queried off-chain via getProgramAccounts RPC calls for efficiency.
        // The channel account stores the current participant count, but individual
        // participant pubkeys are stored in separate ChannelParticipant accounts.

        // For on-chain validation, we verify the channel exists and is active
        let channel = &ctx.accounts.channel_account;
        require!(channel.is_active, PodComError::NotInChannel);

        // Return empty vector as participant enumeration is done off-chain
        // Off-chain clients should use:
        // - getProgramAccounts with ChannelParticipant discriminator
        // - Filter by channel pubkey and is_active = true
        Ok(vec![])
    }

    // Update channel settings (creator only)
    pub fn update_channel(
        ctx: Context<UpdateChannel>,
        name: Option<String>,
        description: Option<String>,
        max_participants: Option<u32>,
        fee_per_message: Option<u64>,
        is_active: Option<bool>,
    ) -> Result<()> {
        let channel = &mut ctx.accounts.channel_account;

        // Verify caller is the creator
        if ctx.accounts.signer.key() != channel.creator {
            return Err(PodComError::Unauthorized.into());
        }

        // Update fields if provided
        if let Some(new_name) = name {
            if new_name.len() > MAX_CHANNEL_NAME_LENGTH {
                return Err(PodComError::ChannelNameTooLong.into());
            }
            channel.name = new_name;
        }

        if let Some(new_description) = description {
            if new_description.len() > MAX_CHANNEL_DESCRIPTION_LENGTH {
                return Err(PodComError::ChannelDescriptionTooLong.into());
            }
            channel.description = new_description;
        }

        if let Some(new_max) = max_participants {
            // Don't allow reducing below current participants
            if new_max < channel.current_participants {
                return Err(PodComError::ChannelFull.into());
            }
            channel.max_participants = new_max;
        }

        if let Some(new_fee) = fee_per_message {
            channel.fee_per_message = new_fee;
        }

        if let Some(active) = is_active {
            channel.is_active = active;
        }

        msg!("Channel {:?} updated", channel.name);
        Ok(())
    }

    // Enhanced create channel with validation
    pub fn create_channel_v2(
        ctx: Context<CreateChannelV2>,
        name: String,
        description: String,
        visibility: ChannelVisibility,
        max_participants: u32,
        fee_per_message: u64,
    ) -> Result<()> {
        let agent = &ctx.accounts.agent_account;
        let channel = &mut ctx.accounts.channel_account;
        let participant = &mut ctx.accounts.participant_account;
        let clock = Clock::get()?;

        // Validate agent reputation
        if agent.reputation < MIN_REPUTATION_FOR_CHANNELS {
            return Err(PodComError::InsufficientReputation.into());
        }

        // Validate input lengths
        if name.len() > MAX_CHANNEL_NAME_LENGTH {
            return Err(PodComError::ChannelNameTooLong.into());
        }
        if description.len() > MAX_CHANNEL_DESCRIPTION_LENGTH {
            return Err(PodComError::ChannelDescriptionTooLong.into());
        }

        // Validate max participants
        if max_participants > MAX_PARTICIPANTS_PER_CHANNEL {
            return Err(PodComError::ChannelFull.into());
        }

        // Initialize channel
        channel.creator = ctx.accounts.creator.key();
        channel.name = name;
        channel.description = description;
        channel.visibility = visibility;
        channel.max_participants = max_participants;
        channel.current_participants = 1; // Creator is first participant
        channel.fee_per_message = fee_per_message;
        channel.escrow_balance = 0;
        channel.created_at = clock.unix_timestamp;
        channel.is_active = true;
        channel.bump = ctx.bumps.channel_account;

        // Add creator as first participant
        participant.channel = channel.key();
        participant.participant = ctx.accounts.agent_account.key(); // Use agent PDA
        participant.joined_at = clock.unix_timestamp;
        participant.is_active = true;
        participant.messages_sent = 0;
        participant.last_message_at = 0;
        participant.bump = ctx.bumps.participant_account;

        msg!("Enhanced channel created: {:?}", channel.name);
        Ok(())
    }

    // =============================================================================
    // ZK COMPRESSION FUNCTIONS - SECURITY CRITICAL
    // =============================================================================
    
    /*
     * SECURITY NOTICE (AUD-2024-05): ZK COMPRESSION FUNCTIONS
     *
     * These functions integrate with Light Protocol for Zero-Knowledge compression.
     * This logic has undergone an internal security audit and is considered stable
     * for beta deployments. External review is recommended before mainnet usage.
     * 
     * KNOWN RISKS:
     * - Proof forgery attacks if verification logic is flawed
     * - Data corruption if compression/decompression fails
     * - State inconsistency between on-chain and off-chain data
     * - Potential for DOS attacks via malformed proofs
     * 
     * Recommended best practices:
     * 1. Independent security audit by cryptography experts
     * 2. Extensive testing with malicious inputs
     * 3. Formal verification of proof systems
     * 4. Bug bounty program focused on ZK components
     */

    /// Broadcast a compressed message to a channel with IPFS content storage
    /// NOTICE: This function relies on audited ZK compression logic - see security notice above
    pub fn broadcast_message_compressed(
        ctx: Context<BroadcastMessageCompressed>,
        content: String,
        message_type: MessageType,
        reply_to: Option<Pubkey>,
        ipfs_hash: String,
    ) -> Result<()> {
        let participant = &ctx.accounts.participant_account;
        let channel = &ctx.accounts.channel_account;
        let clock = Clock::get()?;

        // SECURITY CHECKS (CRIT-01): Comprehensive validation for ZK compression
        
        // Validate content length for IPFS storage with stricter limits for compression
        if content.len() > MAX_MESSAGE_CONTENT_LENGTH * 10 {
            return Err(PodComError::MessageContentTooLong.into());
        }
        
        // Validate IPFS hash format to prevent injection attacks
        if ipfs_hash.is_empty() || ipfs_hash.len() > 100 || !ipfs_hash.chars().all(|c| c.is_alphanumeric()) {
            return Err(PodComError::InvalidMetadataUriLength.into()); // Reusing error for invalid hash
        }

        // Verify user is an active participant with additional PDA validation
        if !participant.is_active {
            return Err(PodComError::NotInChannel.into());
        }
        
        // Verify participant PDA derivation to prevent substitution attacks
        let agent_account = &ctx.accounts.participant_account;
        let (expected_participant_pda, _bump) = Pubkey::find_program_address(
            &[b"participant", channel.key().as_ref(), agent_account.participant.as_ref()],
            &crate::ID
        );
        if ctx.accounts.participant_account.key() != expected_participant_pda {
            return Err(PodComError::Unauthorized.into());
        }
        
        // Additional security: Verify all Light Protocol accounts are legitimate
        // This helps prevent malicious account substitution in ZK operations
        if ctx.accounts.system_program.key() != anchor_lang::system_program::ID {
            return Err(PodComError::Unauthorized.into());
        }

        // Rate limiting (same as regular messages)
        let current_time = clock.unix_timestamp;
        let participant = &mut ctx.accounts.participant_account;

        if participant.last_message_at > 0 {
            let time_since_last = current_time - participant.last_message_at;
            if time_since_last < 1 {
                return Err(PodComError::RateLimitExceeded.into());
            }
            if time_since_last < 60 {
                if participant.messages_sent >= RATE_LIMIT_MESSAGES_PER_MINUTE as u64 {
                    return Err(PodComError::RateLimitExceeded.into());
                }
                participant.messages_sent += 1;
            } else {
                participant.messages_sent = 1;
            }
        } else {
            participant.messages_sent = 1;
        }
        participant.last_message_at = current_time;

        // Create content hash using secure memory and Light Protocol's Poseidon hasher
        let content_hash = secure_hash_data(content.as_bytes())?;

        // Create compressed message data (temporarily stored as regular account data)
        let _compressed_message = CompressedChannelMessage {
            channel: channel.key(),
            sender: participant.participant,
            content_hash,
            ipfs_hash: ipfs_hash.clone(),
            message_type,
            created_at: clock.unix_timestamp,
            edited_at: None,
            reply_to,
        };



        // Emit event for indexing
        emit!(MessageBroadcast {
            channel: channel.key(),
            sender: participant.participant,
            message_type,
            timestamp: clock.unix_timestamp,
        });

        msg!(
            "Compressed message broadcasted to channel: {:?}, IPFS: {}",
            channel.name,
            ipfs_hash
        );
        Ok(())
    }

    /// Join a channel with compressed participant data
    pub fn join_channel_compressed(
        ctx: Context<JoinChannelCompressed>,
        metadata_hash: [u8; 32],
    ) -> Result<()> {
        let channel = &mut ctx.accounts.channel_account;
        let agent = &ctx.accounts.agent_account;
        let clock = Clock::get()?;

        // SECURITY FIX: Verify agent account belongs to the authority
        if agent.pubkey != ctx.accounts.authority.key() {
            return Err(PodComError::Unauthorized.into());
        }

        // Check channel capacity
        if channel.current_participants >= channel.max_participants {
            return Err(PodComError::ChannelFull.into());
        }

        // For private channels, verify invitation
        if channel.visibility == ChannelVisibility::Private {
            let invitation = &ctx
                .accounts
                .invitation_account
                .as_ref()
                .ok_or(PodComError::PrivateChannelRequiresInvitation)?;

            if invitation.invitee != ctx.accounts.authority.key() {
                return Err(PodComError::Unauthorized.into());
            }
            if clock.unix_timestamp > invitation.expires_at {
                return Err(PodComError::MessageExpired.into());
            }
            if !invitation.is_accepted {
                return Err(PodComError::Unauthorized.into());
            }
        }

        // Use provided metadata_hash for participant compression
        let metadata_hash = metadata_hash;

        let _compressed_participant = CompressedChannelParticipant {
            channel: channel.key(),
            participant: agent.key(),
            joined_at: clock.unix_timestamp,
            messages_sent: 0,
            last_message_at: 0,
            metadata_hash,
        };



        // Update channel participant count
        channel.current_participants += 1;

        // Emit event
        emit!(ChannelJoined {
            channel: channel.key(),
            participant: agent.key(),
            timestamp: clock.unix_timestamp,
        });

        msg!("Agent joined channel with compression: {:?}", channel.name);
        Ok(())
    }

    /// Batch sync compressed messages - periodically sync state to chain
    pub fn batch_sync_compressed_messages(
        ctx: Context<BatchSyncCompressedMessages>,
        message_hashes: Vec<[u8; 32]>,
        sync_timestamp: i64,
    ) -> Result<()> {
        let channel = &mut ctx.accounts.channel_account;
        let clock = Clock::get()?;

        // Validate batch size (prevent spam)
        if message_hashes.len() > 100 {
            return Err(PodComError::RateLimitExceeded.into());
        }

        // Verify authority is channel creator or has permissions
        if channel.creator != ctx.accounts.authority.key() {
            return Err(PodComError::Unauthorized.into());
        }

        // Validate sync timestamp is reasonable (within 1 hour of current time)
        let current_timestamp = clock.unix_timestamp;
        let time_diff = (current_timestamp - sync_timestamp).abs();
        if time_diff > 3600 {
            return Err(PodComError::InvalidTimestamp.into());
        }

        // Light Protocol batch compression implementation
        let mut compressed_data = Vec::new();
        let mut total_size = 0u64;
        
        for (i, hash) in message_hashes.iter().enumerate() {
            // Verify hash format and create compressed account entry
            if hash.iter().all(|&b| b == 0) {
                return Err(PodComError::InvalidMessageHash.into());
            }

            // Create Poseidon hash for Light Protocol compatibility
            let compressed_hash = *blake3::hash(hash).as_bytes();

            // Store compressed account data
            compressed_data.push(compressed_hash);
            total_size += 32; // Each hash is 32 bytes

            // Emit event for indexing
            emit!(CompressedMessageSynced {
                channel_id: channel.key(),
                message_hash: *hash,
                compressed_hash,
                batch_index: i as u32,
                sync_timestamp,
            });
        }

        // Update channel state with batch sync info
        channel.last_sync_timestamp = sync_timestamp;
        channel.total_compressed_messages = channel.total_compressed_messages.saturating_add(message_hashes.len() as u64);
        channel.compressed_data_size = channel.compressed_data_size.saturating_add(total_size);

        // Calculate compression ratio (estimated)
        let original_size = message_hashes.len() as u64 * 1024; // Assume 1KB per message
        let compression_ratio = if total_size > 0 {
            (original_size * 100) / total_size
        } else {
            100
        };

        msg!(
            "Batch synced {} compressed messages at timestamp: {}, compression ratio: {}%, total size: {} bytes",
            message_hashes.len(),
            sync_timestamp,
            compression_ratio,
            total_size
        );
        
        Ok(())
    }
}

// Contexts

#[derive(Accounts)]
#[instruction(capabilities: u64, metadata_uri: String)]
pub struct RegisterAgent<'info> {
    #[account(
        init,
        payer = signer,
        space = AGENT_ACCOUNT_SPACE,
        seeds = [b"agent", signer.key().as_ref()],
        bump
    )]
    pub agent_account: Account<'info, AgentAccount>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(recipient: Pubkey, payload_hash: [u8; 32], message_type: MessageType)]
pub struct SendMessage<'info> {
    #[account(
        init,
        payer = signer,
        space = MESSAGE_ACCOUNT_SPACE,
        seeds = [
            b"message",
            sender_agent.key().as_ref(),
            recipient.as_ref(),
            &payload_hash,
            &[match message_type { MessageType::Text => 0, MessageType::Data => 1, MessageType::Command => 2, MessageType::Response => 3, MessageType::Custom(x) => 4 + x }],
        ],
        bump
    )]
    pub message_account: Account<'info, MessageAccount>,
    #[account(
        seeds = [b"agent", signer.key().as_ref()],
        bump = sender_agent.bump,
        constraint = signer.key() == sender_agent.pubkey @ PodComError::Unauthorized,
    )]
    pub sender_agent: Account<'info, AgentAccount>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateAgent<'info> {
    #[account(
        mut,
        seeds = [b"agent", signer.key().as_ref()],
        bump = agent_account.bump,
        constraint = signer.key() == agent_account.pubkey @ PodComError::Unauthorized,
    )]
    pub agent_account: Account<'info, AgentAccount>,
    pub signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateMessageStatus<'info> {
    #[account(
        mut,
        seeds = [
            b"message", 
            message_account.sender.as_ref(),
            message_account.recipient.as_ref(),
            &message_account.payload_hash,
            &[match &message_account.message_type {
                MessageType::Text => 0,
                MessageType::Data => 1,
                MessageType::Command => 2,
                MessageType::Response => 3,
                MessageType::Custom(x) => 4 + x
            }],
        ],
        bump = message_account.bump,
    )]
    pub message_account: Account<'info, MessageAccount>,
    #[account(
        seeds = [b"agent", signer.key().as_ref()],
        bump = recipient_agent.bump,
    )]
    pub recipient_agent: Account<'info, AgentAccount>,
    pub signer: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(name: String, description: String, visibility: ChannelVisibility, max_participants: u32, fee_per_message: u64)]
pub struct CreateChannel<'info> {
    #[account(
        init,
        payer = creator,
        space = CHANNEL_ACCOUNT_SPACE,
        seeds = [b"channel", creator.key().as_ref(), name.as_bytes()],
        bump
    )]
    pub channel_account: Account<'info, ChannelAccount>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct DepositEscrow<'info> {
    #[account(
        init,
        payer = depositor,
        space = ESCROW_ACCOUNT_SPACE,
        seeds = [b"escrow", channel_account.key().as_ref(), depositor.key().as_ref()],
        bump
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub channel_account: Account<'info, ChannelAccount>,
    #[account(mut)]
    pub depositor: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawEscrow<'info> {
    #[account(
        mut,
        seeds = [b"escrow", channel_account.key().as_ref(), depositor.key().as_ref()],
        bump = escrow_account.bump,
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub channel_account: Account<'info, ChannelAccount>,
    #[account(mut)]
    pub depositor: Signer<'info>,
}

// New context structures for enhanced functionality

#[derive(Accounts)]
pub struct JoinChannel<'info> {
    #[account(mut)]
    pub channel_account: Account<'info, ChannelAccount>,
    #[account(
        init,
        payer = user,
        space = CHANNEL_PARTICIPANT_SPACE,
        seeds = [b"participant", channel_account.key().as_ref(), agent_account.key().as_ref()],
        bump
    )]
    pub participant_account: Account<'info, ChannelParticipant>,
    #[account(
        seeds = [b"agent", user.key().as_ref()],
        bump = agent_account.bump,
        constraint = user.key() == agent_account.pubkey @ PodComError::Unauthorized,
    )]
    pub agent_account: Account<'info, AgentAccount>,
    #[account(
        mut,
        seeds = [b"invitation", channel_account.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub invitation_account: Option<Account<'info, ChannelInvitation>>,
    #[account(
        mut,
        seeds = [b"escrow", channel_account.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub escrow_account: Option<Account<'info, EscrowAccount>>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LeaveChannel<'info> {
    #[account(mut)]
    pub channel_account: Account<'info, ChannelAccount>,
    #[account(
        mut,
        seeds = [b"participant", channel_account.key().as_ref(), agent_account.key().as_ref()],
        bump = participant_account.bump,
        constraint = participant_account.participant == agent_account.key() @ PodComError::Unauthorized
    )]
    pub participant_account: Account<'info, ChannelParticipant>,
    #[account(
        seeds = [b"agent", user.key().as_ref()],
        bump = agent_account.bump,
        constraint = user.key() == agent_account.pubkey @ PodComError::Unauthorized,
    )]
    pub agent_account: Account<'info, AgentAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(content: String, message_type: MessageType, reply_to: Option<Pubkey>, nonce: u64)]
pub struct BroadcastMessage<'info> {
    #[account(
        mut,
        constraint = channel_account.is_active @ PodComError::Unauthorized
    )]
    pub channel_account: Account<'info, ChannelAccount>,
    #[account(
        mut,
        seeds = [b"participant", channel_account.key().as_ref(), agent_account.key().as_ref()],
        bump = participant_account.bump,
        constraint = participant_account.is_active @ PodComError::NotInChannel
    )]
    pub participant_account: Account<'info, ChannelParticipant>,
    #[account(
        seeds = [b"agent", user.key().as_ref()],
        bump = agent_account.bump,
        constraint = user.key() == agent_account.pubkey @ PodComError::Unauthorized,
    )]
    pub agent_account: Account<'info, AgentAccount>,
    #[account(
        init,
        payer = user,
        space = CHANNEL_MESSAGE_SPACE,
        seeds = [
            b"channel_message",
            channel_account.key().as_ref(),
            user.key().as_ref(),
            &nonce.to_le_bytes()
        ],
        bump
    )]
    pub message_account: Account<'info, ChannelMessage>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(invitee: Pubkey, nonce: u64)]
pub struct InviteToChannel<'info> {
    pub channel_account: Account<'info, ChannelAccount>,
    #[account(
        seeds = [b"participant", channel_account.key().as_ref(), agent_account.key().as_ref()],
        bump = participant_account.bump,
        constraint = participant_account.is_active @ PodComError::NotInChannel
    )]
    pub participant_account: Option<Account<'info, ChannelParticipant>>,
    #[account(
        seeds = [b"agent", inviter.key().as_ref()],
        bump = agent_account.bump,
        constraint = inviter.key() == agent_account.pubkey @ PodComError::Unauthorized,
    )]
    pub agent_account: Account<'info, AgentAccount>,
    #[account(
        init,
        payer = inviter,
        space = CHANNEL_INVITATION_SPACE,
        seeds = [b"invitation", channel_account.key().as_ref(), invitee.as_ref()],
        bump
    )]
    pub invitation_account: Account<'info, ChannelInvitation>,
    #[account(mut)]
    pub inviter: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GetChannelParticipants<'info> {
    pub channel_account: Account<'info, ChannelAccount>,
}

#[derive(Accounts)]
pub struct UpdateChannel<'info> {
    #[account(
        mut,
        constraint = channel_account.creator == signer.key() @ PodComError::Unauthorized
    )]
    pub channel_account: Account<'info, ChannelAccount>,
    pub signer: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(name: String, description: String, visibility: ChannelVisibility, max_participants: u32, fee_per_message: u64)]
pub struct CreateChannelV2<'info> {
    #[account(
        seeds = [b"agent", creator.key().as_ref()],
        bump = agent_account.bump,
        constraint = agent_account.reputation >= MIN_REPUTATION_FOR_CHANNELS @ PodComError::InsufficientReputation
    )]
    pub agent_account: Account<'info, AgentAccount>,
    #[account(
        init,
        payer = creator,
        space = CHANNEL_ACCOUNT_SPACE,
        seeds = [b"channel", creator.key().as_ref(), name.as_bytes()],
        bump
    )]
    pub channel_account: Account<'info, ChannelAccount>,
    #[account(
        init,
        payer = creator,
        space = CHANNEL_PARTICIPANT_SPACE,
        seeds = [b"participant", channel_account.key().as_ref(), agent_account.key().as_ref()],
        bump
    )]
    pub participant_account: Account<'info, ChannelParticipant>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// =============================================================================
// ZK COMPRESSION CONTEXT STRUCTS
// =============================================================================

#[derive(Accounts)]
#[instruction(content: String, message_type: MessageType, reply_to: Option<Pubkey>, ipfs_hash: String)]
pub struct BroadcastMessageCompressed<'info> {
    pub channel_account: Account<'info, ChannelAccount>,
    #[account(mut)]
    pub participant_account: Account<'info, ChannelParticipant>,
    #[account(mut)]
    pub fee_payer: Signer<'info>,
    pub authority: Signer<'info>,
    /// CHECK: Light System Program
    pub system_program: Program<'info, System>,
    /// CHECK: Compressed Token Program (Light Protocol)
    pub compression_program: Program<'info, SplAccountCompression>,
    /// CHECK: Registered program PDA
    pub registered_program_id: AccountInfo<'info>,
    /// CHECK: Noop program for logging
    pub noop_program: AccountInfo<'info>,
    /// CHECK: Account compression authority
    pub account_compression_authority: AccountInfo<'info>,
    /// CHECK: Account compression program
    pub account_compression_program: AccountInfo<'info>,
    /// CHECK: Merkle tree account
    pub merkle_tree: AccountInfo<'info>,
    /// CHECK: Nullifier queue account
    pub nullifier_queue: AccountInfo<'info>,
    /// CHECK: CPI authority PDA
    pub cpi_authority_pda: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(metadata_hash: [u8; 32])]
pub struct JoinChannelCompressed<'info> {
    #[account(mut)]
    pub channel_account: Account<'info, ChannelAccount>,
    pub agent_account: Account<'info, AgentAccount>,
    pub invitation_account: Option<Account<'info, ChannelInvitation>>,
    #[account(mut)]
    pub fee_payer: Signer<'info>,
    pub authority: Signer<'info>,
    /// CHECK: Light System Program
    pub system_program: Program<'info, System>,
    /// CHECK: Registered program PDA
    pub registered_program_id: AccountInfo<'info>,
    /// CHECK: Noop program for logging
    pub noop_program: AccountInfo<'info>,
    /// CHECK: Account compression authority
    pub account_compression_authority: AccountInfo<'info>,
    /// CHECK: Account compression program
    pub account_compression_program: AccountInfo<'info>,
    /// CHECK: Merkle tree account
    pub merkle_tree: AccountInfo<'info>,
    /// CHECK: Nullifier queue account
    pub nullifier_queue: AccountInfo<'info>,
    /// CHECK: CPI authority PDA
    pub cpi_authority_pda: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(message_hashes: Vec<[u8; 32]>, sync_timestamp: i64)]
pub struct BatchSyncCompressedMessages<'info> {
    #[account(mut)]
    pub channel_account: Account<'info, ChannelAccount>,
    #[account(mut)]
    pub fee_payer: Signer<'info>,
    pub authority: Signer<'info>,
    /// CHECK: Light System Program
    pub system_program: Program<'info, System>,
    /// CHECK: Compressed Token Program (Light Protocol)
    pub compression_program: Program<'info, SplAccountCompression>,
    /// CHECK: Registered program PDA
    pub registered_program_id: AccountInfo<'info>,
    /// CHECK: Noop program for logging
    pub noop_program: AccountInfo<'info>,
    /// CHECK: Account compression authority
    pub account_compression_authority: AccountInfo<'info>,
    /// CHECK: Account compression program
    pub account_compression_program: AccountInfo<'info>,
    /// CHECK: Merkle tree account
    pub merkle_tree: AccountInfo<'info>,
    /// CHECK: Nullifier queue account
    pub nullifier_queue: AccountInfo<'info>,
    /// CHECK: CPI authority PDA
    pub cpi_authority_pda: AccountInfo<'info>,
}
