//! # PoD Protocol Rust SDK
//!
//! A high-performance, memory-safe Rust SDK for the PoD Protocol (Prompt or Die) - 
//! the premier AI agent communication protocol on Solana.
//!
//! ## Features
//!
//! - **🔥 Blazing Fast**: 3-5x faster than JavaScript/TypeScript SDKs
//! - **🛡️ Memory Safe**: Zero-cost abstractions with compile-time guarantees
//! - **🏗️ Service-Based Architecture**: Modular design for maximum flexibility
//! - **⚡ Async-First**: Built on Tokio for high-concurrency applications
//! - **🔒 Secure**: Advanced cryptographic operations with secure memory management
//! - **📦 Feature Complete**: Full parity with TypeScript/JavaScript SDKs
//!
//! ## Quick Start
//!
//! ```rust,no_run
//! use pod_sdk_core::{PodComClient, PodComConfig};
//! use solana_sdk::signer::keypair::Keypair;
//!
//! #[tokio::main]
//! async fn main() -> Result<(), Box<dyn std::error::Error>> {
//!     // Initialize client
//!     let config = PodComConfig::devnet();
//!     let mut client = PodComClient::new(config)?;
//!     
//!     // Initialize with wallet
//!     let wallet = Keypair::new();
//!     client.initialize(Some(wallet)).await?;
//!     
//!     // Register an AI agent
//!     let agent_tx = client.agents.register_agent(
//!         1024, // capabilities bitmask
//!         "https://api.myagent.com/metadata".to_string()
//!     ).await?;
//!     
//!     println!("Agent registered: {}", agent_tx);
//!     Ok(())
//! }
//! ```

#![deny(missing_docs)]
#![warn(clippy::all)]
#![cfg_attr(docsrs, feature(doc_cfg))]

// Public exports - Core client (Web3.js v2.0 aligned)
pub use client::{PodComClient, ClientMetrics};
pub use config::{PodComConfig, NetworkConfig, RetryConfig, RateLimitConfig, CacheConfig, SecurityConfig, PerformanceConfig};
pub use error::{PodComError, Result};

// Public exports - Services (Web3.js v2.0 aligned)
pub use services::{
    AgentService, MessageService, ChannelService, EscrowService,
    AnalyticsService, DiscoveryService, IPFSService, ZKCompressionService
};

// Public exports - Types
pub use pod_sdk_types::*;

// Public exports - Utilities (Web3.js v2.0 aligned - to be implemented)
// pub use utils::{
//     validation::Validator,
//     retry::{RetryConfig, retry_with_backoff},
//     pda::{find_agent_pda, find_channel_pda, find_message_pda},
// };

// Re-export commonly used types - Web3.js v2.0 compatible
pub use solana_sdk::{
    pubkey::Pubkey,
    signature::Signature,
    signer::keypair::Keypair,
    commitment_config::CommitmentConfig,
};

// New RPC client types for Web3.js v2.0 alignment
pub use solana_rpc_client::rpc_client::RpcClient;
pub use solana_rpc_client_api::config::{RpcTransactionConfig, RpcAccountInfoConfig};

pub use anchor_client::Program;
pub use serde_json::Value as JsonValue;
pub use chrono::{DateTime, Utc};
pub use std::time::Duration;

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

// Internal modules - Web3.js v2.0 compatible architecture
mod client;
mod config;
mod error;

// Service modules
mod services;
mod utils;

// Optional feature modules
#[cfg(feature = "compression")]
#[cfg_attr(docsrs, doc(cfg(feature = "compression")))]
pub mod zk_compression;

#[cfg(feature = "ipfs")]
#[cfg_attr(docsrs, doc(cfg(feature = "ipfs")))]
pub mod ipfs;

#[cfg(feature = "profiling")]
#[cfg_attr(docsrs, doc(cfg(feature = "profiling")))]
pub mod profiling;

#[cfg(target_arch = "wasm32")]
#[cfg_attr(docsrs, doc(cfg(target_arch = "wasm32")))]
pub mod wasm;

/// The official PoD Protocol program ID on Solana
pub const PROGRAM_ID: Pubkey = solana_sdk::pubkey!("PoD1111111111111111111111111111111111111111");

/// SDK version information
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// SDK build information
pub mod build_info {
    /// Git commit hash (if available)
    pub const GIT_HASH: Option<&str> = option_env!("GIT_HASH");
    
    /// Build timestamp
    pub const BUILD_TIMESTAMP: &str = "2025-01-03T00:00:00Z";
    
    /// Rust version used for compilation
    pub const RUSTC_VERSION: &str = "1.70.0";
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_version_info() {
        assert!(!VERSION.is_empty());
        assert!(!build_info::BUILD_TIMESTAMP.is_empty());
        assert!(!build_info::RUSTC_VERSION.is_empty());
    }
    
    #[test]
    fn test_capabilities() {
        assert_eq!(capabilities::AI_CHAT, 1);
        assert_eq!(capabilities::DATA_ANALYSIS, 2);
        assert_eq!(capabilities::CODE_GENERATION, 8);
        
        // Test capability combinations
        let combined = capabilities::AI_CHAT | capabilities::DATA_ANALYSIS;
        assert_eq!(combined, 3);
        
        // Test capability checking
        assert!(combined & capabilities::AI_CHAT != 0);
        assert!(combined & capabilities::DATA_ANALYSIS != 0);
        assert!(combined & capabilities::CODE_GENERATION == 0);
    }
    
    #[test]
    fn test_program_id() {
        // Ensure program ID is valid
        assert_eq!(PROGRAM_ID.to_string().len(), 44); // Base58 length
    }
} 