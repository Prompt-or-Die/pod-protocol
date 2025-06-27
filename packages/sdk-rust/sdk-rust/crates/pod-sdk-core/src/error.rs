//! # Error Handling Framework
//!
//! Comprehensive error handling for the PoD Protocol Rust SDK with
//! hierarchical error types, context, and recovery information.

use thiserror::Error;
use solana_sdk::pubkey::Pubkey;
use std::time::Duration;

// Import EscrowStatus from pod_sdk_types to avoid duplication
pub use pod_sdk_types::EscrowStatus;

/// Main result type for the SDK
pub type Result<T> = std::result::Result<T, PodComError>;

/// Root error type for the PoD Protocol SDK
#[derive(Debug, Error)]
pub enum PodComError {
    /// Agent-related errors
    #[error("Agent error: {0}")]
    Agent(#[from] AgentError),
    
    /// Message-related errors
    #[error("Message error: {0}")]
    Message(#[from] MessageError),
    
    /// Channel-related errors
    #[error("Channel error: {0}")]
    Channel(#[from] ChannelError),
    
    /// Escrow-related errors
    #[error("Escrow error: {0}")]
    Escrow(#[from] EscrowError),
    
    /// Analytics-related errors
    #[error("Analytics error: {0}")]
    Analytics(#[from] AnalyticsError),
    
    /// Discovery-related errors
    #[error("Discovery error: {0}")]
    Discovery(#[from] DiscoveryError),
    
    /// IPFS-related errors
    #[error("IPFS error: {0}")]
    Ipfs(#[from] IpfsError),
    
    /// ZK Compression errors
    #[error("ZK Compression error: {0}")]
    ZkCompression(#[from] ZkCompressionError),
    
    /// Network errors
    #[error("Network error: {0}")]
    Network(#[from] NetworkError),
    
    /// Configuration errors
    #[error("Configuration error: {0}")]
    Config(#[from] ConfigError),
    
    /// Validation errors
    #[error("Validation error: {0}")]
    Validation(#[from] ValidationError),
    
    /// Security errors
    #[error("Security error: {0}")]
    Security(#[from] SecurityError),
    
    /// Cryptographic errors
    #[error("Cryptographic error: {0}")]
    Crypto(#[from] pod_sdk_crypto::CryptoError),
    
    /// Anchor client errors
    #[error("Anchor client error: {0}")]
    AnchorClient(#[from] anchor_client::ClientError),
    
    /// Client not initialized
    #[error("Client not initialized - call initialize() first")]
    NotInitialized,
    
    /// Wallet not initialized
    #[error("Wallet not initialized")]
    WalletNotInitialized,
    
    /// Service not available
    #[error("Service not available: {service}")]
    ServiceUnavailable { service: String },
    
    /// Generic internal error
    #[error("Internal error: {message}")]
    Internal { message: String },
    
    /// Feature not implemented
    #[error("Feature not implemented: {feature}")]
    NotImplemented { feature: String },
    
    /// Unauthorized access
    #[error("Unauthorized access to {resource} for action {action}")]
    UnauthorizedAccess { resource: String, action: String },
    
    /// Invalid content hash
    #[error("Invalid content hash: {hash}")]
    InvalidContentHash { hash: String },
    
    /// Invalid content size
    #[error("Invalid content size: {size}")]
    InvalidContentSize { size: u64 },
    
    /// Missing configuration field
    #[error("Missing configuration field: {field}")]
    MissingConfiguration { field: String },
    
    /// Invalid configuration
    #[error("Invalid configuration: {message}")]
    InvalidConfiguration { message: String },
    
    /// Invalid compression size
    #[error("Invalid compression size for {field}: {value}")]
    InvalidCompressionSize { field: String, value: u64 },
    
    /// Invalid compression ratio
    #[error("Invalid compression ratio: {ratio}")]
    InvalidCompressionRatio { ratio: f64 },
    
    /// Missing proof hash
    #[error("Missing proof hash")]
    MissingProofHash,
    
    /// Content too large
    #[error("Content too large: {size} bytes (max: {max_size})")]
    ContentTooLarge { size: usize, max_size: usize },
    
    /// Missing encryption key
    #[error("Missing encryption key")]
    MissingEncryptionKey,
    
    /// Message expired
    #[error("Message expired: {message_address} at {expired_at}")]
    MessageExpired { message_address: Pubkey, expired_at: u64 },
    
    /// Rate limited
    #[error("Rate limited for operation {operation}, retry after {retry_after:?}")]
    RateLimited { operation: String, retry_after: Option<Duration> },
    
    /// Agent has active channels
    #[error("Agent {agent_address} has {channel_count} active channels")]
    AgentHasActiveChannels { agent_address: Pubkey, channel_count: usize },
    
    /// Invalid channel participants
    #[error("Invalid channel participants: {reason}")]
    InvalidChannelParticipants { reason: String },
    
    /// Channel participant limit reached
    #[error("Channel {channel_address} participant limit reached (max: {participant_limit})")]
    ChannelParticipantLimitReached { channel_address: Pubkey, participant_limit: usize },
    
    /// Participant already exists
    #[error("Participant {participant} already exists in channel {channel_address}")]
    ParticipantAlreadyExists { channel_address: Pubkey, participant: Pubkey },
    
    /// Participant not found
    #[error("Participant {participant} not found in channel {channel_address}")]
    ParticipantNotFound { channel_address: Pubkey, participant: Pubkey },
    
    /// Cannot remove last participant
    #[error("Cannot remove last participant from channel {channel_address}")]
    CannotRemoveLastParticipant { channel_address: Pubkey },
    
    /// Invalid escrow amount
    #[error("Invalid escrow amount: {amount}")]
    InvalidEscrowAmount { amount: u64 },
    
    /// Invalid escrow state
    #[error("Invalid escrow state for {escrow_address}: expected {expected_state:?}, found {current_state:?}")]
    InvalidEscrowState { 
        escrow_address: Pubkey, 
        current_state: EscrowStatus, 
        expected_state: EscrowStatus 
    },
    
    /// Empty compression input
    #[error("Empty compression input")]
    EmptyCompressionInput,
    
    /// Compression input too large
    #[error("Compression input too large: {size} bytes (max: {max_size})")]
    CompressionInputTooLarge { size: usize, max_size: usize },
    
    /// Invalid compression proof
    #[error("Invalid compression proof: {proof_hash}")]
    InvalidCompressionProof { proof_hash: String },
    
    /// Compression data integrity failed
    #[error("Compression data integrity failed: expected {expected_commitment:?}, computed {computed_commitment:?}")]
    CompressionDataIntegrityFailed { 
        expected_commitment: Vec<u8>, 
        computed_commitment: Vec<u8> 
    },
    
    /// Empty batch compression input
    #[error("Empty batch compression input")]
    EmptyBatchCompressionInput,
    
    /// Batch compression too large
    #[error("Batch compression too large: {size} items (max: {max_size})")]
    BatchCompressionTooLarge { size: usize, max_size: usize },
}

/// Agent service specific errors
#[derive(Debug, Error)]
pub enum AgentError {
    /// Agent not found
    #[error("Agent not found: {pubkey}")]
    NotFound { pubkey: Pubkey },
    
    /// Agent already exists
    #[error("Agent already exists: {pubkey}")]
    AlreadyExists { pubkey: Pubkey },
    
    /// Invalid metadata URI
    #[error("Invalid metadata URI: {uri} - {reason}")]
    InvalidMetadataUri { uri: String, reason: String },
    
    /// Insufficient reputation
    #[error("Insufficient reputation: required {required}, actual {actual}")]
    InsufficientReputation { required: u64, actual: u64 },
    
    /// Invalid capabilities
    #[error("Invalid capabilities: {capabilities}")]
    InvalidCapabilities { capabilities: u64 },
    
    /// Rate limit exceeded
    #[error("Agent rate limit exceeded: {operations} operations in {window:?}")]
    RateLimitExceeded { operations: u32, window: Duration },
    
    /// Agent is banned
    #[error("Agent is banned: {pubkey}")]
    Banned { pubkey: Pubkey },
    
    /// Unauthorized operation
    #[error("Unauthorized operation for agent: {pubkey}")]
    Unauthorized { pubkey: Pubkey },
}

/// Message service specific errors
#[derive(Debug, Error)]
pub enum MessageError {
    /// Recipient not found
    #[error("Recipient not found: {recipient}")]
    RecipientNotFound { recipient: Pubkey },
    
    /// Message not found
    #[error("Message not found: {message_id}")]
    NotFound { message_id: Pubkey },
    
    /// Message expired
    #[error("Message expired: {message_id}")]
    Expired { message_id: Pubkey },
    
    /// Invalid message content
    #[error("Invalid message content: {reason}")]
    InvalidContent { reason: String },
    
    /// Message too large
    #[error("Message too large: {size} bytes (max: {max_size})")]
    TooLarge { size: usize, max_size: usize },
    
    /// Encryption failed
    #[error("Message encryption failed: {reason}")]
    EncryptionFailed { reason: String },
    
    /// Decryption failed
    #[error("Message decryption failed: {reason}")]
    DecryptionFailed { reason: String },
    
    /// Rate limit exceeded
    #[error("Message rate limit exceeded: {count} messages in {window:?}")]
    RateLimit { count: u32, window: Duration },
    
    /// Insufficient funds for fees
    #[error("Insufficient funds: required {required}, available {available}")]
    InsufficientFunds { required: u64, available: u64 },
}

/// Channel service specific errors
#[derive(Debug, Error)]
pub enum ChannelError {
    /// Channel not found
    #[error("Channel not found: {channel}")]
    NotFound { channel: Pubkey },
    
    /// Channel is full
    #[error("Channel is full: {channel} (max participants: {participant_limit})")]
    Full { channel: Pubkey, participant_limit: u32 },
    
    /// Access denied
    #[error("Access denied to channel: {channel}")]
    AccessDenied { channel: Pubkey },
    
    /// Already a member
    #[error("Already a member of channel: {channel}")]
    AlreadyMember { channel: Pubkey },
    
    /// Not a member
    #[error("Not a member of channel: {channel}")]
    NotMember { channel: Pubkey },
    
    /// Invalid channel name
    #[error("Invalid channel name: {name} - {reason}")]
    InvalidName { name: String, reason: String },
    
    /// Invalid invitation
    #[error("Invalid invitation: {invitation}")]
    InvalidInvitation { invitation: Pubkey },
    
    /// Invitation expired
    #[error("Invitation expired: {invitation}")]
    InvitationExpired { invitation: Pubkey },
    
    /// Insufficient permissions
    #[error("Insufficient permissions for channel: {channel}")]
    InsufficientPermissions { channel: Pubkey },
}

/// Escrow service specific errors
#[derive(Debug, Error)]
pub enum EscrowError {
    /// Escrow account not found
    #[error("Escrow account not found: channel {channel}, depositor {depositor}")]
    NotFound { channel: Pubkey, depositor: Pubkey },
    
    /// Insufficient escrow balance
    #[error("Insufficient escrow balance: required {required}, available {available}")]
    InsufficientBalance { required: u64, available: u64 },
    
    /// Escrow already exists
    #[error("Escrow already exists: channel {channel}, depositor {depositor}")]
    AlreadyExists { channel: Pubkey, depositor: Pubkey },
    
    /// Invalid deposit amount
    #[error("Invalid deposit amount: {amount}")]
    InvalidAmount { amount: u64 },
    
    /// Withdrawal not allowed
    #[error("Withdrawal not allowed: {reason}")]
    WithdrawalNotAllowed { reason: String },
}

/// Analytics service specific errors
#[derive(Debug, Error)]
pub enum AnalyticsError {
    /// Data not available
    #[error("Analytics data not available for: {entity}")]
    DataNotAvailable { entity: String },
    
    /// Invalid time period
    #[error("Invalid analytics period: {period}")]
    InvalidPeriod { period: String },
    
    /// Calculation failed
    #[error("Analytics calculation failed: {reason}")]
    CalculationFailed { reason: String },
    
    /// Unauthorized access
    #[error("Unauthorized access to analytics for: {entity}")]
    Unauthorized { entity: String },
}

/// Discovery service specific errors
#[derive(Debug, Error)]
pub enum DiscoveryError {
    /// No results found
    #[error("No results found for query: {query}")]
    NoResults { query: String },
    
    /// Invalid search criteria
    #[error("Invalid search criteria: {reason}")]
    InvalidCriteria { reason: String },
    
    /// Search timeout
    #[error("Search timed out after {timeout:?}")]
    Timeout { timeout: Duration },
    
    /// Too many results
    #[error("Too many results: {count} (max: {max})")]
    TooManyResults { count: usize, max: usize },
}

/// IPFS service specific errors
#[derive(Debug, Error)]
pub enum IpfsError {
    /// IPFS node unavailable
    #[error("IPFS node unavailable: {endpoint}")]
    NodeUnavailable { endpoint: String },
    
    /// Content not found
    #[error("Content not found: {hash}")]
    ContentNotFound { hash: String },
    
    /// Upload failed
    #[error("Upload failed: {reason}")]
    UploadFailed { reason: String },
    
    /// Download failed
    #[error("Download failed: {reason}")]
    DownloadFailed { reason: String },
    
    /// Invalid hash
    #[error("Invalid IPFS hash: {hash}")]
    InvalidHash { hash: String },
    
    /// Pin failed
    #[error("Pin operation failed: {hash}")]
    PinFailed { hash: String },
}

/// ZK Compression service specific errors
#[derive(Debug, Error)]
pub enum ZkCompressionError {
    /// Compression failed
    #[error("Compression failed: {reason}")]
    CompressionFailed { reason: String },
    
    /// Decompression failed
    #[error("Decompression failed: {reason}")]
    DecompressionFailed { reason: String },
    
    /// Proof generation failed
    #[error("Proof generation failed: {reason}")]
    ProofGenerationFailed { reason: String },
    
    /// Proof verification failed
    #[error("Proof verification failed: {reason}")]
    ProofVerificationFailed { reason: String },
    
    /// Invalid compression level
    #[error("Invalid compression level: {level}")]
    InvalidCompressionLevel { level: u8 },
    
    /// Unsupported data type
    #[error("Unsupported data type for compression: {data_type}")]
    UnsupportedDataType { data_type: String },
}

/// Network and RPC errors
#[derive(Debug, Error)]
pub enum NetworkError {
    /// Connection timeout
    #[error("Connection timeout after {timeout:?}")]
    Timeout { timeout: Duration },
    
    /// Connection failed
    #[error("Connection failed: {endpoint} - {reason}")]
    ConnectionFailed { endpoint: String, reason: String },
    
    /// RPC call failed
    #[error("RPC call failed: {method} - {reason}")]
    RpcFailed { method: String, reason: String },
    
    /// Invalid response
    #[error("Invalid response: {reason}")]
    InvalidResponse { reason: String },
    
    /// Rate limited by RPC
    #[error("Rate limited by RPC: retry after {retry_after:?}")]
    RateLimited { retry_after: Duration },
    
    /// Network unreachable
    #[error("Network unreachable: {endpoint}")]
    Unreachable { endpoint: String },
    
    /// TLS error
    #[error("TLS error: {reason}")]
    TlsError { reason: String },
}

/// Configuration errors
#[derive(Debug, Error)]
pub enum ConfigError {
    /// Missing configuration
    #[error("Missing configuration: {field}")]
    Missing { field: String },
    
    /// Invalid configuration value
    #[error("Invalid configuration value for {field}: {value} - {reason}")]
    Invalid { field: String, value: String, reason: String },
    
    /// Configuration file not found
    #[error("Configuration file not found: {path}")]
    FileNotFound { path: String },
    
    /// Failed to parse configuration
    #[error("Failed to parse configuration: {reason}")]
    ParseError { reason: String },
    
    /// Environment variable error
    #[error("Environment variable error: {var} - {reason}")]
    EnvError { var: String, reason: String },
}

/// Input validation errors
#[derive(Debug, Error)]
pub enum ValidationError {
    /// Empty field
    #[error("Field '{field}' cannot be empty")]
    EmptyField { field: String },
    
    /// Field too long
    #[error("Field '{field}' too long: {actual} chars (max: {max})")]
    TooLong { field: String, actual: usize, max: usize },
    
    /// Invalid format
    #[error("Invalid format for '{field}': {reason}")]
    InvalidFormat { field: String, reason: String },
    
    /// Invalid range
    #[error("Value for '{field}' out of range: {value} (min: {min}, max: {max})")]
    OutOfRange { field: String, value: String, min: String, max: String },
    
    /// Invalid enum value
    #[error("Invalid value for '{field}': {value} (allowed: {allowed:?})")]
    InvalidEnum { field: String, value: String, allowed: Vec<String> },
    
    /// Required field missing
    #[error("Required field missing: {field}")]
    Required { field: String },
    
    /// Invalid combination
    #[error("Invalid combination: {reason}")]
    InvalidCombination { reason: String },
    
    /// Custom validation error
    #[error("Validation failed: {message}")]
    Custom { message: String },
}

/// Security-related errors
#[derive(Debug, Error)]
pub enum SecurityError {
    /// Authentication failed
    #[error("Authentication failed: {reason}")]
    AuthenticationFailed { reason: String },
    
    /// Authorization failed
    #[error("Authorization failed: {reason}")]
    AuthorizationFailed { reason: String },
    
    /// Suspicious activity detected
    #[error("Suspicious activity detected: {reason}")]
    SuspiciousActivity { reason: String },
    
    /// Rate limit exceeded
    #[error("Security rate limit exceeded: {reason}")]
    RateLimitExceeded { reason: String },
    
    /// Invalid signature
    #[error("Invalid signature")]
    InvalidSignature,
    
    /// Replay attack detected
    #[error("Replay attack detected")]
    ReplayAttack,
    
    /// Malicious content detected
    #[error("Malicious content detected: {reason}")]
    MaliciousContent { reason: String },
    
    /// Insufficient security level
    #[error("Insufficient security level: required {required}, actual {actual}")]
    InsufficientSecurityLevel { required: String, actual: String },
}

/// Error recovery information
#[derive(Debug, Clone)]
pub struct ErrorRecovery {
    /// Whether the error is retryable
    pub retryable: bool,
    /// Suggested retry delay
    pub retry_after: Option<Duration>,
    /// Recovery suggestions
    pub suggestions: Vec<String>,
    /// Error severity
    pub severity: ErrorSeverity,
}

/// Error severity levels
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ErrorSeverity {
    /// Low severity - informational
    Low,
    /// Medium severity - warning
    Medium,
    /// High severity - error
    High,
    /// Critical severity - system failure
    Critical,
}

/// Trait for errors that can be retried
pub trait RetryableError {
    /// Check if this error can be retried
    fn is_retryable(&self) -> bool;
    
    /// Get suggested retry delay
    fn retry_after(&self) -> Option<Duration>;
    
    /// Get error recovery information
    fn recovery_info(&self) -> ErrorRecovery;
}

impl RetryableError for PodComError {
    fn is_retryable(&self) -> bool {
        match self {
            PodComError::Network(err) => err.is_retryable(),
            PodComError::Agent(AgentError::RateLimitExceeded { .. }) => true,
            PodComError::Message(MessageError::RateLimit { .. }) => true,
            PodComError::Security(SecurityError::RateLimitExceeded { .. }) => true,
            _ => false,
        }
    }
    
    fn retry_after(&self) -> Option<Duration> {
        match self {
            PodComError::Network(err) => err.retry_after(),
            PodComError::Agent(AgentError::RateLimitExceeded { window, .. }) => Some(*window),
            PodComError::Message(MessageError::RateLimit { window, .. }) => Some(*window),
            _ => None,
        }
    }
    
    fn recovery_info(&self) -> ErrorRecovery {
        match self {
            PodComError::Network(err) => err.recovery_info(),
            PodComError::NotInitialized => ErrorRecovery {
                retryable: false,
                retry_after: None,
                suggestions: vec!["Call client.initialize() first".to_string()],
                severity: ErrorSeverity::High,
            },
            PodComError::WalletNotInitialized => ErrorRecovery {
                retryable: false,
                retry_after: None,
                suggestions: vec!["Provide a wallet when calling initialize()".to_string()],
                severity: ErrorSeverity::High,
            },
            _ => ErrorRecovery {
                retryable: self.is_retryable(),
                retry_after: self.retry_after(),
                suggestions: vec![],
                severity: ErrorSeverity::Medium,
            },
        }
    }
}

impl RetryableError for NetworkError {
    fn is_retryable(&self) -> bool {
        match self {
            NetworkError::Timeout { .. } => true,
            NetworkError::ConnectionFailed { .. } => true,
            NetworkError::RpcFailed { .. } => true,
            NetworkError::RateLimited { .. } => true,
            NetworkError::Unreachable { .. } => true,
            _ => false,
        }
    }
    
    fn retry_after(&self) -> Option<Duration> {
        match self {
            NetworkError::RateLimited { retry_after } => Some(*retry_after),
            NetworkError::Timeout { timeout } => Some(*timeout / 2),
            _ => Some(Duration::from_secs(1)),
        }
    }
    
    fn recovery_info(&self) -> ErrorRecovery {
        ErrorRecovery {
            retryable: self.is_retryable(),
            retry_after: self.retry_after(),
            suggestions: match self {
                NetworkError::Timeout { .. } => vec![
                    "Increase timeout duration".to_string(),
                    "Check network connectivity".to_string(),
                ],
                NetworkError::ConnectionFailed { .. } => vec![
                    "Check network connectivity".to_string(),
                    "Verify RPC endpoint".to_string(),
                ],
                NetworkError::RateLimited { .. } => vec![
                    "Reduce request frequency".to_string(),
                    "Use batch operations".to_string(),
                ],
                _ => vec![],
            },
            severity: ErrorSeverity::Medium,
        }
    }
}

/// Helper macro for creating validation errors
#[macro_export]
macro_rules! validation_error {
    ($field:expr, $reason:expr) => {
        ValidationError::InvalidFormat {
            field: $field.to_string(),
            reason: $reason.to_string(),
        }
    };
}

/// Helper macro for creating internal errors
#[macro_export]
macro_rules! internal_error {
    ($msg:expr) => {
        PodComError::Internal {
            message: $msg.to_string(),
        }
    };
}

impl From<anchor_client::ClientError> for PodComError {
    fn from(error: anchor_client::ClientError) -> Self {
        PodComError::Network(NetworkError::RpcFailed {
            method: "anchor_client".to_string(),
            reason: error.to_string(),
        })
    }
}

impl From<reqwest::Error> for PodComError {
    fn from(error: reqwest::Error) -> Self {
        PodComError::Network(NetworkError::ConnectionFailed {
            endpoint: error.url().map(|u| u.to_string()).unwrap_or_default(),
            reason: error.to_string(),
        })
    }
}

impl From<serde_json::Error> for PodComError {
    fn from(error: serde_json::Error) -> Self {
        PodComError::Config(ConfigError::ParseError {
            reason: error.to_string(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let error = AgentError::NotFound {
            pubkey: Pubkey::new_unique(),
        };
        assert!(error.to_string().contains("Agent not found"));
    }

    #[test]
    fn test_retryable_error() {
        let error = PodComError::Network(NetworkError::Timeout {
            timeout: Duration::from_secs(30),
        });
        
        assert!(error.is_retryable());
        assert_eq!(error.retry_after(), Some(Duration::from_secs(15)));
    }

    #[test]
    fn test_error_recovery_info() {
        let error = PodComError::NotInitialized;
        let recovery = error.recovery_info();
        
        assert!(!recovery.retryable);
        assert_eq!(recovery.severity, ErrorSeverity::High);
        assert!(!recovery.suggestions.is_empty());
    }

    #[test]
    fn test_validation_error_macro() {
        let error = validation_error!("test_field", "invalid format");
        assert!(matches!(error, ValidationError::InvalidFormat { .. }));
    }
} 