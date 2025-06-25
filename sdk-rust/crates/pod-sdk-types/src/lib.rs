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
#[derive(Debug, Clone, Serialize, Deserialize, BorshSerialize, BorshDeserialize, PartialEq, Eq)]
pub struct AgentAccount {
    /// The agent's public key (PDA)
    pub pubkey: Pubkey,
    /// Bitmask representing agent capabilities
    pub capabilities: u64,
    /// Agent's reputation score
    pub reputation: u64,
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

impl AgentAccount {
    /// Create a new agent account
    pub fn new(
        pubkey: Pubkey,
        capabilities: u64,
        metadata_uri: String,
        bump: u8,
    ) -> Self {
        let now = chrono::Utc::now().timestamp();
        Self {
            pubkey,
            capabilities,
            reputation: 0,
            last_updated: now,
            metadata_uri,
            invites_sent: 0,
            last_invite_at: 0,
            bump,
        }
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
#[derive(Debug, Clone, Serialize, Deserialize, BorshSerialize, BorshDeserialize, PartialEq, Eq)]
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
    /// Fee per message in lamports
    pub fee_per_message: u64,
    /// Channel creation timestamp
    pub created_at: i64,
    /// Last activity timestamp
    pub last_activity: i64,
    /// PDA bump seed
    pub bump: u8,
}

/// Escrow account structure for channel payments
#[derive(Debug, Clone, Serialize, Deserialize, BorshSerialize, BorshDeserialize, PartialEq, Eq)]
pub struct EscrowAccount {
    /// Channel this escrow belongs to
    pub channel: Pubkey,
    /// Depositor's wallet
    pub depositor: Pubkey,
    /// Amount deposited in lamports
    pub amount: u64,
    /// Timestamp when deposit was made
    pub deposited_at: i64,
    /// PDA bump seed
    pub bump: u8,
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