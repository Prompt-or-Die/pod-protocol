//! # Account Utilities
//!
//! Utilities for working with Solana accounts and PDAs.

use solana_sdk::pubkey::Pubkey;
use crate::error::Result;

/// Agent account data structure
#[derive(Debug, Clone)]
pub struct AgentAccount {
    pub name: String,
    pub owner: Pubkey,
    pub is_active: bool,
    pub reputation_score: u64,
    pub capabilities: Vec<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Message account data structure
#[derive(Debug, Clone)]
pub struct MessageAccount {
    pub id: String,
    pub channel: Pubkey,
    pub sender: Pubkey,
    pub content: Vec<u8>,
    pub content_type: String,
    pub created_at: i64,
    pub expires_at: Option<i64>,
}

/// Channel account data structure
#[derive(Debug, Clone)]
pub struct ChannelAccount {
    pub id: String,
    pub creator: Pubkey,
    pub participants: Vec<Pubkey>,
    pub is_active: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Escrow account data structure
#[derive(Debug, Clone)]
pub struct EscrowAccount {
    pub id: String,
    pub payer: Pubkey,
    pub beneficiary: Pubkey,
    pub amount: u64,
    pub status: crate::error::EscrowStatus,
    pub created_at: i64,
    pub expires_at: i64,
}

/// IPFS metadata account
#[derive(Debug, Clone)]
pub struct IPFSMetadataAccount {
    pub id: String,
    pub uploader: Pubkey,
    pub content_hash: String,
    pub size: u64,
    pub is_pinned: bool,
    pub created_at: i64,
}

/// ZK compression account
#[derive(Debug, Clone)]
pub struct ZKCompressionAccount {
    pub id: String,
    pub compressor: Pubkey,
    pub original_size: u64,
    pub compressed_size: u64,
    pub proof_hash: String,
    pub created_at: i64,
}

/// Derive agent PDA
pub fn derive_agent_pda(owner: &Pubkey, name: &str) -> Result<(Pubkey, u8)> {
    let seeds = &[b"agent", owner.as_ref(), name.as_bytes()];
    let (pda, bump) = Pubkey::find_program_address(seeds, &crate::PROGRAM_ID);
    Ok((pda, bump))
}

/// Derive channel PDA
pub fn derive_channel_pda(creator: &Pubkey, channel_id: &str) -> Result<(Pubkey, u8)> {
    let seeds = &[b"channel", creator.as_ref(), channel_id.as_bytes()];
    let (pda, bump) = Pubkey::find_program_address(seeds, &crate::PROGRAM_ID);
    Ok((pda, bump))
}

/// Derive message PDA
pub fn derive_message_pda(channel: &Pubkey, message_id: &str) -> Result<(Pubkey, u8)> {
    let seeds = &[b"message", channel.as_ref(), message_id.as_bytes()];
    let (pda, bump) = Pubkey::find_program_address(seeds, &crate::PROGRAM_ID);
    Ok((pda, bump))
}

/// Derive escrow PDA
pub fn derive_escrow_pda(payer: &Pubkey, escrow_id: &str) -> Result<(Pubkey, u8)> {
    let seeds = &[b"escrow", payer.as_ref(), escrow_id.as_bytes()];
    let (pda, bump) = Pubkey::find_program_address(seeds, &crate::PROGRAM_ID);
    Ok((pda, bump))
}

/// Derive IPFS metadata PDA
pub fn derive_ipfs_metadata_pda(uploader: &Pubkey, metadata_id: &str) -> Result<(Pubkey, u8)> {
    let seeds = &[b"ipfs_metadata", uploader.as_ref(), metadata_id.as_bytes()];
    let (pda, bump) = Pubkey::find_program_address(seeds, &crate::PROGRAM_ID);
    Ok((pda, bump))
}

/// Derive ZK compression PDA
pub fn derive_zk_compression_pda(compressor: &Pubkey, compression_id: &str) -> Result<(Pubkey, u8)> {
    let seeds = &[b"zk_compression", compressor.as_ref(), compression_id.as_bytes()];
    let (pda, bump) = Pubkey::find_program_address(seeds, &crate::PROGRAM_ID);
    Ok((pda, bump))
}

/// Validate agent account
pub fn validate_agent_account(account: &AgentAccount) -> Result<()> {
    // Validate agent name
    if account.name.is_empty() {
        return Err(crate::error::PodError::InvalidInput("Agent name cannot be empty".to_string()));
    }
    
    if account.name.len() > 64 {
        return Err(crate::error::PodError::InvalidInput("Agent name too long (max 64 characters)".to_string()));
    }
    
    // Validate name contains only allowed characters
    if !account.name.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-') {
        return Err(crate::error::PodError::InvalidInput("Agent name can only contain alphanumeric characters, underscore, and dash".to_string()));
    }
    
    // Validate owner is not default pubkey
    if account.owner == Pubkey::default() {
        return Err(crate::error::PodError::InvalidInput("Agent owner cannot be default pubkey".to_string()));
    }
    
    // Validate reputation score bounds
    if account.reputation_score > 10000 {
        return Err(crate::error::PodError::InvalidInput("Agent reputation score cannot exceed 10000".to_string()));
    }
    
    // Validate capabilities
    if account.capabilities.len() > 50 {
        return Err(crate::error::PodError::InvalidInput("Agent cannot have more than 50 capabilities".to_string()));
    }
    
    for capability in &account.capabilities {
        if capability.is_empty() || capability.len() > 32 {
            return Err(crate::error::PodError::InvalidInput("Capability name must be 1-32 characters".to_string()));
        }
    }
    
    // Validate timestamps
    if account.created_at <= 0 {
        return Err(crate::error::PodError::InvalidInput("Agent created_at must be positive".to_string()));
    }
    
    if account.updated_at < account.created_at {
        return Err(crate::error::PodError::InvalidInput("Agent updated_at cannot be before created_at".to_string()));
    }
    
    Ok(())
}

/// Validate message account
pub fn validate_message_account(account: &MessageAccount) -> Result<()> {
    // Validate message ID
    if account.id.is_empty() {
        return Err(crate::error::PodError::InvalidInput("Message ID cannot be empty".to_string()));
    }
    
    if account.id.len() > 64 {
        return Err(crate::error::PodError::InvalidInput("Message ID too long (max 64 characters)".to_string()));
    }
    
    // Validate channel is not default
    if account.channel == Pubkey::default() {
        return Err(crate::error::PodError::InvalidInput("Message channel cannot be default pubkey".to_string()));
    }
    
    // Validate sender is not default
    if account.sender == Pubkey::default() {
        return Err(crate::error::PodError::InvalidInput("Message sender cannot be default pubkey".to_string()));
    }
    
    // Validate content
    if account.content.is_empty() {
        return Err(crate::error::PodError::InvalidInput("Message content cannot be empty".to_string()));
    }
    
    if account.content.len() > 1024 * 1024 {  // 1MB limit
        return Err(crate::error::PodError::InvalidInput("Message content too large (max 1MB)".to_string()));
    }
    
    // Validate content type
    if account.content_type.is_empty() {
        return Err(crate::error::PodError::InvalidInput("Message content type cannot be empty".to_string()));
    }
    
    if account.content_type.len() > 64 {
        return Err(crate::error::PodError::InvalidInput("Message content type too long (max 64 characters)".to_string()));
    }
    
    // Validate supported content types
    let valid_content_types = [
        "text/plain", "text/markdown", "application/json", 
        "application/octet-stream", "image/png", "image/jpeg",
        "audio/mpeg", "video/mp4", "application/pdf"
    ];
    
    if !valid_content_types.contains(&account.content_type.as_str()) {
        return Err(crate::error::PodError::InvalidInput(
            format!("Unsupported content type: {}", account.content_type)
        ));
    }
    
    // Validate timestamps
    if account.created_at <= 0 {
        return Err(crate::error::PodError::InvalidInput("Message created_at must be positive".to_string()));
    }
    
    // Validate expiration if set
    if let Some(expires_at) = account.expires_at {
        if expires_at <= account.created_at {
            return Err(crate::error::PodError::InvalidInput("Message expires_at must be after created_at".to_string()));
        }
        
        // Check if message hasn't already expired
        let current_time = chrono::Utc::now().timestamp();
        if expires_at < current_time {
            return Err(crate::error::PodError::InvalidInput("Message has already expired".to_string()));
        }
    }
    
    Ok(())
}

/// Validate channel account
pub fn validate_channel_account(account: &ChannelAccount) -> Result<()> {
    // Validate channel ID
    if account.id.is_empty() {
        return Err(crate::error::PodError::InvalidInput("Channel ID cannot be empty".to_string()));
    }
    
    if account.id.len() > 64 {
        return Err(crate::error::PodError::InvalidInput("Channel ID too long (max 64 characters)".to_string()));
    }
    
    // Validate ID format (alphanumeric + underscore + dash)
    if !account.id.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-') {
        return Err(crate::error::PodError::InvalidInput("Channel ID can only contain alphanumeric characters, underscore, and dash".to_string()));
    }
    
    // Validate creator is not default
    if account.creator == Pubkey::default() {
        return Err(crate::error::PodError::InvalidInput("Channel creator cannot be default pubkey".to_string()));
    }
    
    // Validate participants
    if account.participants.is_empty() {
        return Err(crate::error::PodError::InvalidInput("Channel must have at least one participant".to_string()));
    }
    
    if account.participants.len() > 1000 {
        return Err(crate::error::PodError::InvalidInput("Channel cannot have more than 1000 participants".to_string()));
    }
    
    // Check for duplicate participants
    let mut unique_participants = std::collections::HashSet::new();
    for participant in &account.participants {
        if *participant == Pubkey::default() {
            return Err(crate::error::PodError::InvalidInput("Channel participant cannot be default pubkey".to_string()));
        }
        
        if !unique_participants.insert(*participant) {
            return Err(crate::error::PodError::InvalidInput("Channel has duplicate participants".to_string()));
        }
    }
    
    // Verify creator is in participants list
    if !account.participants.contains(&account.creator) {
        return Err(crate::error::PodError::InvalidInput("Channel creator must be in participants list".to_string()));
    }
    
    // Validate timestamps
    if account.created_at <= 0 {
        return Err(crate::error::PodError::InvalidInput("Channel created_at must be positive".to_string()));
    }
    
    if account.updated_at < account.created_at {
        return Err(crate::error::PodError::InvalidInput("Channel updated_at cannot be before created_at".to_string()));
    }
    
    Ok(())
}

/// Validate escrow account
pub fn validate_escrow_account(account: &EscrowAccount) -> Result<()> {
    // Validate escrow ID
    if account.id.is_empty() {
        return Err(crate::error::PodError::InvalidInput("Escrow ID cannot be empty".to_string()));
    }
    
    if account.id.len() > 64 {
        return Err(crate::error::PodError::InvalidInput("Escrow ID too long (max 64 characters)".to_string()));
    }
    
    // Validate payer is not default
    if account.payer == Pubkey::default() {
        return Err(crate::error::PodError::InvalidInput("Escrow payer cannot be default pubkey".to_string()));
    }
    
    // Validate beneficiary is not default
    if account.beneficiary == Pubkey::default() {
        return Err(crate::error::PodError::InvalidInput("Escrow beneficiary cannot be default pubkey".to_string()));
    }
    
    // Validate payer and beneficiary are different
    if account.payer == account.beneficiary {
        return Err(crate::error::PodError::InvalidInput("Escrow payer and beneficiary must be different".to_string()));
    }
    
    // Validate amount
    if account.amount == 0 {
        return Err(crate::error::PodError::InvalidInput("Escrow amount must be greater than zero".to_string()));
    }
    
    if account.amount > 1_000_000 * 1_000_000_000 {  // 1M SOL in lamports
        return Err(crate::error::PodError::InvalidInput("Escrow amount too large (max 1M SOL)".to_string()));
    }
    
    // Validate status transitions
    match account.status {
        crate::error::EscrowStatus::Pending => {
            // Pending is always valid for new escrows
        },
        crate::error::EscrowStatus::Active => {
            // Active requires positive amount and valid parties
            if account.amount == 0 {
                return Err(crate::error::PodError::InvalidInput("Active escrow must have positive amount".to_string()));
            }
        },
        crate::error::EscrowStatus::Released => {
            // Released state is terminal
        },
        crate::error::EscrowStatus::Refunded => {
            // Refunded state is terminal
        },
        crate::error::EscrowStatus::Disputed => {
            // Disputed state requires manual intervention
        },
    }
    
    // Validate timestamps
    if account.created_at <= 0 {
        return Err(crate::error::PodError::InvalidInput("Escrow created_at must be positive".to_string()));
    }
    
    if account.expires_at <= account.created_at {
        return Err(crate::error::PodError::InvalidInput("Escrow expires_at must be after created_at".to_string()));
    }
    
    // Validate expiration is reasonable (not too far in future)
    let max_duration = 365 * 24 * 60 * 60; // 1 year in seconds
    if account.expires_at - account.created_at > max_duration {
        return Err(crate::error::PodError::InvalidInput("Escrow duration cannot exceed 1 year".to_string()));
    }
    
    // Check if escrow hasn't already expired for active escrows
    if matches!(account.status, crate::error::EscrowStatus::Active | crate::error::EscrowStatus::Pending) {
        let current_time = chrono::Utc::now().timestamp();
        if account.expires_at < current_time {
            return Err(crate::error::PodError::InvalidInput("Active/Pending escrow has already expired".to_string()));
        }
    }
    
    Ok(())
}

/// Validate IPFS metadata account
pub fn validate_ipfs_metadata_account(account: &IPFSMetadataAccount) -> Result<()> {
    // Validate metadata ID
    if account.id.is_empty() {
        return Err(crate::error::PodError::InvalidInput("IPFS metadata ID cannot be empty".to_string()));
    }
    
    if account.id.len() > 64 {
        return Err(crate::error::PodError::InvalidInput("IPFS metadata ID too long (max 64 characters)".to_string()));
    }
    
    // Validate uploader
    if account.uploader == Pubkey::default() {
        return Err(crate::error::PodError::InvalidInput("IPFS uploader cannot be default pubkey".to_string()));
    }
    
    // Validate content hash format (IPFS CID)
    if account.content_hash.is_empty() {
        return Err(crate::error::PodError::InvalidInput("IPFS content hash cannot be empty".to_string()));
    }
    
    if account.content_hash.len() < 46 || account.content_hash.len() > 59 {
        return Err(crate::error::PodError::InvalidInput("Invalid IPFS content hash length".to_string()));
    }
    
    // Check if hash starts with valid IPFS CID prefixes
    if !account.content_hash.starts_with("Qm") && !account.content_hash.starts_with("bafy") && !account.content_hash.starts_with("bafk") {
        return Err(crate::error::PodError::InvalidInput("Invalid IPFS content hash format".to_string()));
    }
    
    // Validate size
    if account.size == 0 {
        return Err(crate::error::PodError::InvalidInput("IPFS content size must be greater than zero".to_string()));
    }
    
    if account.size > 100 * 1024 * 1024 * 1024 {  // 100GB limit
        return Err(crate::error::PodError::InvalidInput("IPFS content size too large (max 100GB)".to_string()));
    }
    
    // Validate timestamp
    if account.created_at <= 0 {
        return Err(crate::error::PodError::InvalidInput("IPFS metadata created_at must be positive".to_string()));
    }
    
    Ok(())
}

/// Validate ZK compression account
pub fn validate_zk_compression_account(account: &ZKCompressionAccount) -> Result<()> {
    // Validate compression ID
    if account.id.is_empty() {
        return Err(crate::error::PodError::InvalidInput("ZK compression ID cannot be empty".to_string()));
    }
    
    if account.id.len() > 64 {
        return Err(crate::error::PodError::InvalidInput("ZK compression ID too long (max 64 characters)".to_string()));
    }
    
    // Validate compressor
    if account.compressor == Pubkey::default() {
        return Err(crate::error::PodError::InvalidInput("ZK compressor cannot be default pubkey".to_string()));
    }
    
    // Validate sizes
    if account.original_size == 0 {
        return Err(crate::error::PodError::InvalidInput("Original size must be greater than zero".to_string()));
    }
    
    if account.compressed_size == 0 {
        return Err(crate::error::PodError::InvalidInput("Compressed size must be greater than zero".to_string()));
    }
    
    if account.compressed_size > account.original_size {
        return Err(crate::error::PodError::InvalidInput("Compressed size cannot be larger than original size".to_string()));
    }
    
    // Validate compression ratio is reasonable
    let compression_ratio = account.compressed_size as f64 / account.original_size as f64;
    if compression_ratio < 0.01 {  // Less than 1% of original size seems unrealistic
        return Err(crate::error::PodError::InvalidInput("Compression ratio too aggressive (less than 1%)".to_string()));
    }
    
    // Validate proof hash
    if account.proof_hash.is_empty() {
        return Err(crate::error::PodError::InvalidInput("ZK proof hash cannot be empty".to_string()));
    }
    
    if account.proof_hash.len() != 64 {  // Assuming SHA-256 hex representation
        return Err(crate::error::PodError::InvalidInput("ZK proof hash must be 64 characters (SHA-256 hex)".to_string()));
    }
    
    // Validate proof hash is valid hex
    if !account.proof_hash.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(crate::error::PodError::InvalidInput("ZK proof hash must be valid hexadecimal".to_string()));
    }
    
    // Validate timestamp
    if account.created_at <= 0 {
        return Err(crate::error::PodError::InvalidInput("ZK compression created_at must be positive".to_string()));
    }
    
    Ok(())
}

/// Validate account data size for on-chain storage
pub fn validate_account_size<T>(data: &T, max_size: usize) -> Result<()> 
where 
    T: std::fmt::Debug,
{
    let serialized_size = std::mem::size_of_val(data);
    
    if serialized_size > max_size {
        return Err(crate::error::PodError::InvalidInput(
            format!("Account data too large: {} bytes (max {} bytes)", serialized_size, max_size)
        ));
    }
    
    Ok(())
}

/// Check if account is rent-exempt
pub fn check_rent_exemption(account_size: usize, lamports: u64) -> Result<bool> {
    // Approximate rent exemption calculation
    // Real implementation would use RentCalculator from Solana
    let rent_per_byte_year = 3_480; // Approximate lamports per byte per year
    let years_to_exempt = 2; // Standard exemption period
    
    let required_lamports = (account_size * rent_per_byte_year * years_to_exempt) as u64;
    
    Ok(lamports >= required_lamports)
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[test]
    fn test_agent_account_validation() {
        // Valid agent account
        let valid_agent = AgentAccount {
            name: "test_agent".to_string(),
            owner: Pubkey::new_unique(),
            is_active: true,
            reputation_score: 100,
            capabilities: vec!["chat".to_string(), "analysis".to_string()],
            created_at: Utc::now().timestamp(),
            updated_at: Utc::now().timestamp(),
        };
        assert!(validate_agent_account(&valid_agent).is_ok());

        // Invalid agent - empty name
        let invalid_name = AgentAccount {
            name: "".to_string(),
            ..valid_agent.clone()
        };
        assert!(validate_agent_account(&invalid_name).is_err());

        // Invalid agent - name too long
        let long_name = AgentAccount {
            name: "a".repeat(65),
            ..valid_agent.clone()
        };
        assert!(validate_agent_account(&long_name).is_err());

        // Invalid agent - invalid characters in name
        let invalid_chars = AgentAccount {
            name: "test@agent".to_string(),
            ..valid_agent.clone()
        };
        assert!(validate_agent_account(&invalid_chars).is_err());

        // Invalid agent - default owner
        let default_owner = AgentAccount {
            owner: Pubkey::default(),
            ..valid_agent.clone()
        };
        assert!(validate_agent_account(&default_owner).is_err());

        // Invalid agent - reputation too high
        let high_reputation = AgentAccount {
            reputation_score: 10001,
            ..valid_agent.clone()
        };
        assert!(validate_agent_account(&high_reputation).is_err());
    }

    #[test]
    fn test_message_account_validation() {
        let valid_message = MessageAccount {
            id: "msg_123".to_string(),
            channel: Pubkey::new_unique(),
            sender: Pubkey::new_unique(),
            content: b"Hello, World!".to_vec(),
            content_type: "text/plain".to_string(),
            created_at: Utc::now().timestamp(),
            expires_at: Some(Utc::now().timestamp() + 3600), // 1 hour from now
        };
        assert!(validate_message_account(&valid_message).is_ok());

        // Invalid - empty content
        let empty_content = MessageAccount {
            content: vec![],
            ..valid_message.clone()
        };
        assert!(validate_message_account(&empty_content).is_err());

        // Invalid - unsupported content type
        let invalid_type = MessageAccount {
            content_type: "application/x-custom".to_string(),
            ..valid_message.clone()
        };
        assert!(validate_message_account(&invalid_type).is_err());

        // Invalid - expired message
        let expired_message = MessageAccount {
            expires_at: Some(Utc::now().timestamp() - 3600), // 1 hour ago
            ..valid_message.clone()
        };
        assert!(validate_message_account(&expired_message).is_err());
    }

    #[test]
    fn test_channel_account_validation() {
        let creator = Pubkey::new_unique();
        let participant1 = Pubkey::new_unique();
        let participant2 = Pubkey::new_unique();

        let valid_channel = ChannelAccount {
            id: "channel_123".to_string(),
            creator,
            participants: vec![creator, participant1, participant2],
            is_active: true,
            created_at: Utc::now().timestamp(),
            updated_at: Utc::now().timestamp(),
        };
        assert!(validate_channel_account(&valid_channel).is_ok());

        // Invalid - empty participants
        let empty_participants = ChannelAccount {
            participants: vec![],
            ..valid_channel.clone()
        };
        assert!(validate_channel_account(&empty_participants).is_err());

        // Invalid - creator not in participants
        let creator_not_participant = ChannelAccount {
            participants: vec![participant1, participant2],
            ..valid_channel.clone()
        };
        assert!(validate_channel_account(&creator_not_participant).is_err());

        // Invalid - duplicate participants
        let duplicate_participants = ChannelAccount {
            participants: vec![creator, participant1, participant1],
            ..valid_channel.clone()
        };
        assert!(validate_channel_account(&duplicate_participants).is_err());
    }

    #[test]
    fn test_escrow_account_validation() {
        let valid_escrow = EscrowAccount {
            id: "escrow_123".to_string(),
            payer: Pubkey::new_unique(),
            beneficiary: Pubkey::new_unique(),
            amount: 1_000_000_000, // 1 SOL
            status: crate::error::EscrowStatus::Active,
            created_at: Utc::now().timestamp(),
            expires_at: Utc::now().timestamp() + 24 * 60 * 60, // 1 day from now
        };
        assert!(validate_escrow_account(&valid_escrow).is_ok());

        // Invalid - zero amount
        let zero_amount = EscrowAccount {
            amount: 0,
            ..valid_escrow.clone()
        };
        assert!(validate_escrow_account(&zero_amount).is_err());

        // Invalid - same payer and beneficiary
        let same_parties = EscrowAccount {
            beneficiary: valid_escrow.payer,
            ..valid_escrow.clone()
        };
        assert!(validate_escrow_account(&same_parties).is_err());

        // Invalid - duration too long
        let long_duration = EscrowAccount {
            expires_at: Utc::now().timestamp() + 366 * 24 * 60 * 60, // Over 1 year
            ..valid_escrow.clone()
        };
        assert!(validate_escrow_account(&long_duration).is_err());
    }

    #[test]
    fn test_ipfs_metadata_validation() {
        let valid_ipfs = IPFSMetadataAccount {
            id: "ipfs_123".to_string(),
            uploader: Pubkey::new_unique(),
            content_hash: "QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o".to_string(),
            size: 1024,
            is_pinned: true,
            created_at: Utc::now().timestamp(),
        };
        assert!(validate_ipfs_metadata_account(&valid_ipfs).is_ok());

        // Invalid - empty content hash
        let empty_hash = IPFSMetadataAccount {
            content_hash: "".to_string(),
            ..valid_ipfs.clone()
        };
        assert!(validate_ipfs_metadata_account(&empty_hash).is_err());

        // Invalid - wrong content hash format
        let invalid_hash = IPFSMetadataAccount {
            content_hash: "invalid_hash".to_string(),
            ..valid_ipfs.clone()
        };
        assert!(validate_ipfs_metadata_account(&invalid_hash).is_err());

        // Invalid - zero size
        let zero_size = IPFSMetadataAccount {
            size: 0,
            ..valid_ipfs.clone()
        };
        assert!(validate_ipfs_metadata_account(&zero_size).is_err());
    }

    #[test]
    fn test_zk_compression_validation() {
        let valid_zk = ZKCompressionAccount {
            id: "zk_123".to_string(),
            compressor: Pubkey::new_unique(),
            original_size: 1000,
            compressed_size: 500,
            proof_hash: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890".to_string(),
            created_at: Utc::now().timestamp(),
        };
        assert!(validate_zk_compression_account(&valid_zk).is_ok());

        // Invalid - compressed larger than original
        let larger_compressed = ZKCompressionAccount {
            compressed_size: 1500,
            ..valid_zk.clone()
        };
        assert!(validate_zk_compression_account(&larger_compressed).is_err());

        // Invalid - compression ratio too aggressive
        let too_aggressive = ZKCompressionAccount {
            compressed_size: 1, // 0.1% compression ratio
            ..valid_zk.clone()
        };
        assert!(validate_zk_compression_account(&too_aggressive).is_err());

        // Invalid - wrong proof hash length
        let wrong_hash_length = ZKCompressionAccount {
            proof_hash: "short_hash".to_string(),
            ..valid_zk.clone()
        };
        assert!(validate_zk_compression_account(&wrong_hash_length).is_err());

        // Invalid - non-hex proof hash
        let non_hex_hash = ZKCompressionAccount {
            proof_hash: "ghijklmnopqrstuvghijklmnopqrstuvghijklmnopqrstuvghijklmnopqrstuv".to_string(),
            ..valid_zk.clone()
        };
        assert!(validate_zk_compression_account(&non_hex_hash).is_err());
    }

    #[test]
    fn test_pda_derivation() {
        let owner = Pubkey::new_unique();
        let name = "test_agent";
        
        let (pda1, bump1) = derive_agent_pda(&owner, name).unwrap();
        let (pda2, bump2) = derive_agent_pda(&owner, name).unwrap();
        
        // Same inputs should produce same PDA
        assert_eq!(pda1, pda2);
        assert_eq!(bump1, bump2);
        
        // Different name should produce different PDA
        let (pda3, _) = derive_agent_pda(&owner, "different_name").unwrap();
        assert_ne!(pda1, pda3);
    }

    #[test]
    fn test_account_size_validation() {
        let test_data = [0u8; 100];
        
        // Valid size
        assert!(validate_account_size(&test_data, 200).is_ok());
        
        // Invalid size
        assert!(validate_account_size(&test_data, 50).is_err());
    }

    #[test]
    fn test_rent_exemption() {
        let account_size = 1000; // bytes
        
        // Sufficient lamports for rent exemption
        let sufficient_lamports = 10_000_000; // High amount
        assert!(check_rent_exemption(account_size, sufficient_lamports).unwrap());
        
        // Insufficient lamports
        let insufficient_lamports = 1000;
        assert!(!check_rent_exemption(account_size, insufficient_lamports).unwrap());
    }
} 