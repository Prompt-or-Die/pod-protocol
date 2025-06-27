//! # PoD Protocol Types
//!
//! Shared type definitions for the PoD Protocol Rust SDK.
//! 
//! This crate contains all the core types that mirror the Solana program's
//! account structures and provide type-safe interactions with the protocol.

#![deny(missing_docs)]
#![warn(clippy::all)]

use borsh::{BorshDeserialize, BorshSerialize};
use serde::{Deserialize, Serialize};
use solana_sdk::pubkey::Pubkey;
use std::fmt;

// Re-export commonly used types
pub use chrono::{DateTime, Utc};
pub use solana_sdk::signature::Signature;

/// Maximum length for metadata URI
pub const MAX_METADATA_URI_LENGTH: usize = 200;

/// Maximum length for channel name
pub const MAX_CHANNEL_NAME_LENGTH: usize = 50;

/// Maximum length for channel description
pub const MAX_CHANNEL_DESCRIPTION_LENGTH: usize = 500;

/// Maximum length for message content
pub const MAX_MESSAGE_CONTENT_LENGTH: usize = 10000;

/// Agent account structure that mirrors the Solana program
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AgentAccount {
    /// The agent's public key (PDA)
    pub pubkey: Pubkey,
    /// Owner of the agent
    pub owner: Pubkey,
    /// Bitmask representing agent capabilities
    pub capabilities: u64,
    /// Agent's reputation score
    pub reputation: u64,
    /// Agent's reputation score (alias)
    pub reputation_score: u64,
    /// Last time the agent was updated (Unix timestamp)
    pub last_updated: i64,
    /// Last time the agent was updated (Unix timestamp)
    pub updated_at: i64,
    /// Agent creation timestamp (Unix timestamp)
    pub created_at: i64,
    /// URI pointing to agent metadata (IPFS, HTTPS, etc.)
    pub metadata_uri: String,
    /// Number of invites sent by this agent
    pub invites_sent: u16,
    /// Last time an invite was sent (Unix timestamp)
    pub last_invite_at: i64,
    /// PDA bump seed
    pub bump: u8,
}

/// Agent account structure for Borsh serialization (without DateTime fields)
#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, PartialEq, Eq)]
pub struct AgentAccountBorsh {
    /// The agent's public key (PDA)
    pub pubkey: Pubkey,
    /// Owner of the agent
    pub owner: Pubkey,
    /// Bitmask representing agent capabilities
    pub capabilities: u64,
    /// Agent's reputation score
    pub reputation: u64,
    /// Agent's reputation score (alias)
    pub reputation_score: u64,
    /// Last time the agent was updated (Unix timestamp)
    pub last_updated: i64,
    /// URI pointing to agent metadata (IPFS, HTTPS, etc.)
    pub metadata_uri: String,
    /// Number of invites sent by this agent
    pub invites_sent: u16,
    /// Last time an invite was sent (Unix timestamp)
    pub last_invite_at: i64,
    /// PDA bump seed
    pub bump: u8,
}

impl From<AgentAccount> for AgentAccountBorsh {
    fn from(account: AgentAccount) -> Self {
        Self {
            pubkey: account.pubkey,
            owner: account.owner,
            capabilities: account.capabilities,
            reputation: account.reputation,
            reputation_score: account.reputation_score,
            last_updated: account.last_updated,
            metadata_uri: account.metadata_uri,
            invites_sent: account.invites_sent,
            last_invite_at: account.last_invite_at,
            bump: account.bump,
        }
    }
}

impl From<AgentAccountBorsh> for AgentAccount {
    fn from(borsh: AgentAccountBorsh) -> Self {
        Self {
            pubkey: borsh.pubkey,
            owner: borsh.owner,
            capabilities: borsh.capabilities,
            reputation: borsh.reputation,
            reputation_score: borsh.reputation_score,
            last_updated: borsh.last_updated,
            updated_at: chrono::Utc::now().timestamp(),
            created_at: chrono::Utc::now().timestamp(),
            metadata_uri: borsh.metadata_uri,
            invites_sent: borsh.invites_sent,
            last_invite_at: borsh.last_invite_at,
            bump: borsh.bump,
        }
    }
}

impl AgentAccount {
    /// Create a new agent account
    pub fn new(
        pubkey: Pubkey,
        owner: Pubkey,
        capabilities: u64,
        metadata_uri: String,
        bump: u8,
    ) -> Self {
        let now = chrono::Utc::now().timestamp();
        Self {
            pubkey,
            owner,
            capabilities,
            reputation: 0,
            reputation_score: 0,
            last_updated: now,
            updated_at: now,
            created_at: now,
            metadata_uri,
            invites_sent: 0,
            last_invite_at: 0,
            bump,
        }
    }

    /// Get DateTime<Utc> from timestamp
    pub fn get_updated_at(&self) -> DateTime<Utc> {
        DateTime::from_timestamp(self.updated_at, 0).unwrap_or_default()
    }

    /// Get DateTime<Utc> from timestamp
    pub fn get_created_at(&self) -> DateTime<Utc> {
        DateTime::from_timestamp(self.created_at, 0).unwrap_or_default()
    }

    /// Check if agent has specific capability
    pub fn has_capability(&self, capability: u64) -> bool {
        (self.capabilities & capability) != 0
    }

    /// Check if agent has all required capabilities
    pub fn has_all_capabilities(&self, required: u64) -> bool {
        (self.capabilities & required) == required
    }
}

/// Message account structure
#[derive(Debug, Clone, Serialize, Deserialize, BorshSerialize, BorshDeserialize, PartialEq, Eq)]
pub struct MessageAccount {
    /// Sender agent PDA
    pub sender: Pubkey,
    /// Recipient agent PDA
    pub recipient: Pubkey,
    /// Channel PDA (optional)
    pub channel: Option<Pubkey>,
    /// Hash of the message payload (Blake3)
    pub payload_hash: [u8; 32],
    /// Type of message
    pub message_type: MessageType,
    /// Message status
    pub status: MessageStatus,
    /// Message creation timestamp
    pub created_at: i64,
    /// Message expiry timestamp
    pub expires_at: i64,
    /// Reply to message PDA (if this is a reply)
    pub reply_to: Option<Pubkey>,
    /// PDA bump seed
    pub bump: u8,
}

/// Channel account structure
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ChannelAccount {
    /// Channel creator
    pub creator: Pubkey,
    /// Channel name
    pub name: String,
    /// Channel description
    pub description: String,
    /// Channel visibility setting
    pub visibility: ChannelVisibility,
    /// Maximum number of participants
    pub participant_limit: u32,
    /// Current number of participants
    pub participant_count: u32,
    /// List of participants
    pub participants: Vec<Pubkey>,
    /// Whether the channel is active
    pub is_active: bool,
    /// Fee per message in lamports
    pub fee_per_message: u64,
    /// Channel creation timestamp (Unix timestamp)
    pub created_at: i64,
    /// Channel creation timestamp (Unix timestamp)
    pub created_at_dt: i64,
    /// Last activity timestamp
    pub last_activity: i64,
    /// PDA bump seed
    pub bump: u8,
}

/// Channel account structure for Borsh serialization (without DateTime fields)
#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, PartialEq, Eq)]
pub struct ChannelAccountBorsh {
    /// Channel creator
    pub creator: Pubkey,
    /// Channel name
    pub name: String,
    /// Channel description
    pub description: String,
    /// Channel visibility setting
    pub visibility: ChannelVisibility,
    /// Maximum number of participants
    pub participant_limit: u32,
    /// Current number of participants
    pub participant_count: u32,
    /// List of participants
    pub participants: Vec<Pubkey>,
    /// Whether the channel is active
    pub is_active: bool,
    /// Fee per message in lamports
    pub fee_per_message: u64,
    /// Channel creation timestamp
    pub created_at: i64,
    /// Last activity timestamp
    pub last_activity: i64,
    /// PDA bump seed
    pub bump: u8,
}

impl From<ChannelAccount> for ChannelAccountBorsh {
    fn from(account: ChannelAccount) -> Self {
        Self {
            creator: account.creator,
            name: account.name,
            description: account.description,
            visibility: account.visibility,
            participant_limit: account.participant_limit,
            participant_count: account.participant_count,
            participants: account.participants,
            is_active: account.is_active,
            fee_per_message: account.fee_per_message,
            created_at: account.created_at,
            last_activity: account.last_activity,
            bump: account.bump,
        }
    }
}

impl From<ChannelAccountBorsh> for ChannelAccount {
    fn from(borsh: ChannelAccountBorsh) -> Self {
        Self {
            creator: borsh.creator,
            name: borsh.name,
            description: borsh.description,
            visibility: borsh.visibility,
            participant_limit: borsh.participant_limit,
            participant_count: borsh.participant_count,
            participants: borsh.participants,
            is_active: borsh.is_active,
            fee_per_message: borsh.fee_per_message,
            created_at: borsh.created_at,
            created_at_dt: chrono::Utc::now().timestamp(),
            last_activity: borsh.last_activity,
            bump: borsh.bump,
        }
    }
}

impl ChannelAccount {
    /// Get DateTime<Utc> from timestamp
    pub fn get_created_at(&self) -> DateTime<Utc> {
        DateTime::from_timestamp(self.created_at, 0).unwrap_or_default()
    }

    /// Get DateTime<Utc> from timestamp  
    pub fn get_created_at_dt(&self) -> DateTime<Utc> {
        DateTime::from_timestamp(self.created_at_dt, 0).unwrap_or_default()
    }
}

/// Escrow status enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
pub enum EscrowStatus {
    /// Escrow is active and funds are locked
    Active,
    /// Escrow has been released to beneficiary
    Released,
    /// Escrow has been refunded to payer
    Refunded,
    /// Escrow is in dispute
    Disputed,
}

impl fmt::Display for EscrowStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            EscrowStatus::Active => write!(f, "active"),
            EscrowStatus::Released => write!(f, "released"),
            EscrowStatus::Refunded => write!(f, "refunded"),
            EscrowStatus::Disputed => write!(f, "disputed"),
        }
    }
}

/// Escrow account structure for channel payments
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct EscrowAccount {
    /// Channel this escrow belongs to
    pub channel: Pubkey,
    /// Depositor's wallet
    pub depositor: Pubkey,
    /// Payer of the escrow
    pub payer: Pubkey,
    /// Beneficiary of the escrow
    pub beneficiary: Pubkey,
    /// Amount deposited in lamports
    pub amount: u64,
    /// Escrow status
    pub status: EscrowStatus,
    /// Timestamp when deposit was made
    pub deposited_at: i64,
    /// Timestamp when deposit was made (Unix timestamp)
    pub created_at: i64,
    /// Timeout timestamp (Unix timestamp, optional)
    pub timeout_at: Option<i64>,
    /// Disputed timestamp (Unix timestamp, optional)
    pub disputed_at: Option<i64>,
    /// Release conditions
    pub conditions: Vec<EscrowCondition>,
    /// Optional arbitrators list
    pub arbitrators: Option<Vec<Pubkey>>,
    /// PDA bump seed
    pub bump: u8,
}

/// Escrow account structure for Borsh serialization (without DateTime fields)
#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, PartialEq, Eq)]
pub struct EscrowAccountBorsh {
    /// Channel this escrow belongs to
    pub channel: Pubkey,
    /// Depositor's wallet
    pub depositor: Pubkey,
    /// Payer of the escrow
    pub payer: Pubkey,
    /// Beneficiary of the escrow
    pub beneficiary: Pubkey,
    /// Amount deposited in lamports
    pub amount: u64,
    /// Escrow status
    pub status: EscrowStatus,
    /// Timestamp when deposit was made
    pub deposited_at: i64,
    /// Release conditions
    pub conditions: Vec<EscrowCondition>,
    /// Optional arbitrators list
    pub arbitrators: Option<Vec<Pubkey>>,
    /// PDA bump seed
    pub bump: u8,
}

impl From<EscrowAccount> for EscrowAccountBorsh {
    fn from(account: EscrowAccount) -> Self {
        Self {
            channel: account.channel,
            depositor: account.depositor,
            payer: account.payer,
            beneficiary: account.beneficiary,
            amount: account.amount,
            status: account.status,
            deposited_at: account.deposited_at,
            conditions: account.conditions,
            arbitrators: account.arbitrators,
            bump: account.bump,
        }
    }
}

impl From<EscrowAccountBorsh> for EscrowAccount {
    fn from(borsh: EscrowAccountBorsh) -> Self {
        Self {
            channel: borsh.channel,
            depositor: borsh.depositor,
            payer: borsh.payer,
            beneficiary: borsh.beneficiary,
            amount: borsh.amount,
            status: borsh.status,
            deposited_at: borsh.deposited_at,
            created_at: chrono::Utc::now().timestamp(),
            timeout_at: None,
            disputed_at: None,
            conditions: borsh.conditions,
            arbitrators: borsh.arbitrators,
            bump: borsh.bump,
        }
    }
}

impl EscrowAccount {
    /// Get DateTime<Utc> from timestamp
    pub fn get_created_at(&self) -> DateTime<Utc> {
        DateTime::from_timestamp(self.created_at, 0).unwrap_or_default()
    }

    /// Get DateTime<Utc> from timeout timestamp
    pub fn get_timeout_at(&self) -> Option<DateTime<Utc>> {
        self.timeout_at.map(|ts| DateTime::from_timestamp(ts, 0).unwrap_or_default())
    }

    /// Get DateTime<Utc> from disputed timestamp
    pub fn get_disputed_at(&self) -> Option<DateTime<Utc>> {
        self.disputed_at.map(|ts| DateTime::from_timestamp(ts, 0).unwrap_or_default())
    }
}

/// Escrow condition structure
#[derive(Debug, Clone, Serialize, Deserialize, BorshSerialize, BorshDeserialize, PartialEq, Eq)]
pub struct EscrowCondition {
    /// Type of condition (e.g., "time_elapsed", "service_completion", etc.)
    pub condition_type: String,
    /// Condition parameters
    pub parameters: std::collections::HashMap<String, String>,
    /// Whether this condition has been fulfilled
    pub fulfilled: bool,
}

/// Analytics account structure
#[derive(Debug, Clone, Serialize, Deserialize, BorshSerialize, BorshDeserialize, PartialEq, Eq)]
pub struct AnalyticsAccount {
    /// Agent this analytics belongs to
    pub agent: Pubkey,
    /// Total messages sent
    pub messages_sent: u64,
    /// Total messages received
    pub messages_received: u64,
    /// Number of channels joined
    pub channels_joined: u32,
    /// Number of channels created
    pub channels_created: u32,
    /// Reputation gained this period
    pub reputation_gained: u64,
    /// Reputation lost this period
    pub reputation_lost: u64,
    /// Analytics period start
    pub period_start: i64,
    /// Analytics period end
    pub period_end: i64,
    /// PDA bump seed
    pub bump: u8,
}

/// Message types supported by the protocol
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
pub enum MessageType {
    /// Plain text message
    Text,
    /// Binary data
    Data,
    /// Command or instruction
    Command,
    /// Response to a previous message
    Response,
    /// Custom message type (0-255)
    Custom(u8),
}

impl fmt::Display for MessageType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            MessageType::Text => write!(f, "text"),
            MessageType::Data => write!(f, "data"),
            MessageType::Command => write!(f, "command"),
            MessageType::Response => write!(f, "response"),
            MessageType::Custom(id) => write!(f, "custom({})", id),
        }
    }
}

/// Message status enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
pub enum MessageStatus {
    /// Message sent but not yet delivered
    Pending,
    /// Message delivered to recipient
    Delivered,
    /// Message read by recipient
    Read,
    /// Message failed to deliver
    Failed,
    /// Message expired
    Expired,
}

impl fmt::Display for MessageStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            MessageStatus::Pending => write!(f, "pending"),
            MessageStatus::Delivered => write!(f, "delivered"),
            MessageStatus::Read => write!(f, "read"),
            MessageStatus::Failed => write!(f, "failed"),
            MessageStatus::Expired => write!(f, "expired"),
        }
    }
}

/// Channel visibility settings
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
pub enum ChannelVisibility {
    /// Anyone can discover and join
    Public,
    /// Requires invitation to join
    Private,
}

impl fmt::Display for ChannelVisibility {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ChannelVisibility::Public => write!(f, "public"),
            ChannelVisibility::Private => write!(f, "private"),
        }
    }
}

/// Request structure for registering an agent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisterAgentRequest {
    /// Agent capabilities bitmask
    pub capabilities: u64,
    /// Metadata URI
    pub metadata_uri: String,
}

/// Request structure for sending a message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendMessageRequest {
    /// Recipient agent PDA
    pub recipient: Pubkey,
    /// Message payload
    pub payload: Vec<u8>,
    /// Message type
    pub message_type: MessageType,
    /// Optional expiry duration
    pub expiry: Option<std::time::Duration>,
    /// Optional reply-to message
    pub reply_to: Option<Pubkey>,
}

/// Request structure for creating a channel
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateChannelRequest {
    /// Channel name
    pub name: String,
    /// Channel description
    pub description: String,
    /// Visibility setting
    pub visibility: ChannelVisibility,
    /// Maximum participants
    pub participant_limit: u32,
    /// Fee per message in lamports
    pub fee_per_message: u64,
}

/// Builder for creating channel requests
#[derive(Debug, Default)]
pub struct CreateChannelBuilder {
    name: Option<String>,
    description: Option<String>,
    visibility: Option<ChannelVisibility>,
    participant_limit: Option<u32>,
    fee_per_message: Option<u64>,
}

impl CreateChannelBuilder {
    /// Create a new builder
    pub fn new() -> Self {
        Self::default()
    }

    /// Set channel name
    pub fn name<S: Into<String>>(mut self, name: S) -> Self {
        self.name = Some(name.into());
        self
    }

    /// Set channel description
    pub fn description<S: Into<String>>(mut self, description: S) -> Self {
        self.description = Some(description.into());
        self
    }

    /// Set channel visibility
    pub fn visibility(mut self, visibility: ChannelVisibility) -> Self {
        self.visibility = Some(visibility);
        self
    }

    /// Set maximum participants
    pub fn participant_limit(mut self, max: u32) -> Self {
        self.participant_limit = Some(max);
        self
    }

    /// Set fee per message
    pub fn fee_per_message(mut self, fee: u64) -> Self {
        self.fee_per_message = Some(fee);
        self
    }

    /// Build the request
    pub fn build(self) -> Result<CreateChannelRequest, &'static str> {
        let name = self.name.ok_or("Channel name is required")?;
        
        if name.len() > MAX_CHANNEL_NAME_LENGTH {
            return Err("Channel name too long");
        }

        let description = self.description.unwrap_or_default();
        if description.len() > MAX_CHANNEL_DESCRIPTION_LENGTH {
            return Err("Channel description too long");
        }

        Ok(CreateChannelRequest {
            name,
            description,
            visibility: self.visibility.unwrap_or(ChannelVisibility::Public),
            participant_limit: self.participant_limit.unwrap_or(1000),
            fee_per_message: self.fee_per_message.unwrap_or(0),
        })
    }
}

/// Analytics time periods
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AnalyticsPeriod {
    /// Last 24 hours
    Last24Hours,
    /// Last 7 days
    Last7Days,
    /// Last 30 days
    Last30Days,
    /// Last 90 days
    Last90Days,
    /// All time
    AllTime,
}

impl AnalyticsPeriod {
    /// Get the duration for this period
    pub fn duration(&self) -> std::time::Duration {
        use std::time::Duration;
        match self {
            AnalyticsPeriod::Last24Hours => Duration::from_secs(24 * 60 * 60),
            AnalyticsPeriod::Last7Days => Duration::from_secs(7 * 24 * 60 * 60),
            AnalyticsPeriod::Last30Days => Duration::from_secs(30 * 24 * 60 * 60),
            AnalyticsPeriod::Last90Days => Duration::from_secs(90 * 24 * 60 * 60),
            AnalyticsPeriod::AllTime => Duration::from_secs(u64::MAX),
        }
    }
}

/// Predefined agent capability constants
pub mod capabilities {
    /// Basic AI chat functionality
    pub const AI_CHAT: u64 = 1 << 0;
    
    /// Data analysis and processing
    pub const DATA_ANALYSIS: u64 = 1 << 1;
    
    /// Task automation
    pub const TASK_AUTOMATION: u64 = 1 << 2;
    
    /// Code generation and review
    pub const CODE_GENERATION: u64 = 1 << 3;
    
    /// Image processing and generation
    pub const IMAGE_PROCESSING: u64 = 1 << 4;
    
    /// Audio processing and generation
    pub const AUDIO_PROCESSING: u64 = 1 << 5;
    
    /// Video processing and generation
    pub const VIDEO_PROCESSING: u64 = 1 << 6;
    
    /// Natural language understanding
    pub const NLU: u64 = 1 << 7;
    
    /// Machine learning model training
    pub const ML_TRAINING: u64 = 1 << 8;
    
    /// Blockchain operations
    pub const BLOCKCHAIN_OPS: u64 = 1 << 9;
    
    /// Custom capability base (use with custom bit positions)
    pub const CUSTOM_BASE: u64 = 1 << 32;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_agent_capabilities() {
        let agent = AgentAccount::new(
            Pubkey::new_unique(),
            Pubkey::new_unique(),
            capabilities::AI_CHAT | capabilities::DATA_ANALYSIS,
            "https://example.com/metadata.json".to_string(),
            255,
        );

        assert!(agent.has_capability(capabilities::AI_CHAT));
        assert!(agent.has_capability(capabilities::DATA_ANALYSIS));
        assert!(!agent.has_capability(capabilities::CODE_GENERATION));
        
        assert!(agent.has_all_capabilities(capabilities::AI_CHAT));
        assert!(agent.has_all_capabilities(capabilities::AI_CHAT | capabilities::DATA_ANALYSIS));
        assert!(!agent.has_all_capabilities(capabilities::AI_CHAT | capabilities::CODE_GENERATION));
    }

    #[test]
    fn test_channel_builder() {
        let request = CreateChannelBuilder::new()
            .name("Test Channel")
            .description("A test channel")
            .visibility(ChannelVisibility::Private)
            .participant_limit(50)
            .fee_per_message(1000)
            .build()
            .unwrap();

        assert_eq!(request.name, "Test Channel");
        assert_eq!(request.description, "A test channel");
        assert_eq!(request.visibility, ChannelVisibility::Private);
        assert_eq!(request.participant_limit, 50);
        assert_eq!(request.fee_per_message, 1000);
    }

    #[test]
    fn test_analytics_period_duration() {
        assert_eq!(
            AnalyticsPeriod::Last24Hours.duration(),
            std::time::Duration::from_secs(24 * 60 * 60)
        );
        assert_eq!(
            AnalyticsPeriod::Last7Days.duration(),
            std::time::Duration::from_secs(7 * 24 * 60 * 60)
        );
    }

    #[test]
    fn test_message_type_display() {
        assert_eq!(MessageType::Text.to_string(), "text");
        assert_eq!(MessageType::Custom(42).to_string(), "custom(42)");
    }
} 