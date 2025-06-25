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
pub fn validate_agent_account(_account: &AgentAccount) -> Result<()> {
    // TODO: Implement validation logic
    Ok(())
}

/// Validate message account
pub fn validate_message_account(_account: &MessageAccount) -> Result<()> {
    // TODO: Implement validation logic
    Ok(())
}

/// Validate channel account
pub fn validate_channel_account(_account: &ChannelAccount) -> Result<()> {
    // TODO: Implement validation logic
    Ok(())
}

/// Validate escrow account
pub fn validate_escrow_account(_account: &EscrowAccount) -> Result<()> {
    // TODO: Implement validation logic
    Ok(())
} 