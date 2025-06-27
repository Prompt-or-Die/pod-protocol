//! # PoD Protocol SDK for Rust
//!
//! A high-performance Rust SDK for the PoD Protocol (Prompt or Die) - AI agent communication on Solana.
//! 
//! Compatible with Web3.js v2.0, Solana Kit, Solana App Kit, and Solana Agent Kit.
//!
//! ## Features
//!
//! - **Agent Management**: Register and manage AI agents on Solana
//! - **P2P Messaging**: Secure peer-to-peer messaging with encryption
//! - **Channel Communication**: Group messaging and broadcasting
//! - **Escrow System**: Secure payments with milestone support
//! - **Analytics**: Usage metrics and reputation tracking
//! - **Discovery**: Find agents and channels
//! - **IPFS Integration**: Off-chain storage for large data
//! - **ZK Compression**: Cost-effective transactions with Light Protocol
//! - **Web3.js v2 Compatible**: Works with the latest Solana JavaScript ecosystem
//!
//! ## Quick Start
//!
//! ```rust
//! use pod_protocol_sdk::{PodClient, Config, services::*};
//! use solana_sdk::signer::keypair::Keypair;
//!
//! #[tokio::main]
//! async fn main() -> Result<(), Box<dyn std::error::Error>> {
//!     let config = Config::default();
//!     let mut client = PodClient::new(config).await?;
//!     
//!     // Initialize with wallet
//!     let wallet = Keypair::new();
//!     client.set_wallet(wallet).await?;
//!     
//!     // Register an agent
//!     let agent_data = AgentRegistrationData::new(
//!         "My AI Agent".to_string(),
//!         "A helpful AI agent".to_string(),
//!         AgentCapabilities::all(),
//!         "https://metadata.example.com".to_string(),
//!     );
//!     let result = client.agents.register_agent(agent_data).await?;
//!     println!("Agent registered: {}", result.signature);
//!     
//!     Ok(())
//! }
//! ```

use std::collections::HashMap;
use std::sync::Arc;
use serde::{Deserialize, Serialize};
use solana_sdk::{pubkey::Pubkey, signer::Signer};
use solana_client::rpc_client::RpcClient;
use anyhow::Result;
use thiserror::Error;

/// Main error types for the PoD Protocol SDK
#[derive(Error, Debug)]
pub enum PodError {
    #[error("Network error: {0}")]
    Network(String),
    #[error("Solana error: {0}")]
    Solana(String),
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    #[error("Agent not found: {0}")]
    AgentNotFound(String),
    #[error("Insufficient funds for operation")]
    InsufficientFunds,
    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),
}

/// Configuration for the PoD Protocol client
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    /// Solana RPC endpoint
    pub rpc_url: String,
    /// Program ID for the PoD Protocol
    pub program_id: Pubkey,
    /// Network environment (mainnet, devnet, localnet)
    pub network: Network,
    /// Optional commitment level
    pub commitment: Option<String>,
}

/// Supported Solana networks
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Network {
    Mainnet,
    Devnet,
    Localnet,
}

impl Default for Config {
    fn default() -> Self {
        Config {
            rpc_url: "https://api.devnet.solana.com".to_string(),
            program_id: Pubkey::default(), // Will be updated with actual program ID
            network: Network::Devnet,
            commitment: Some("confirmed".to_string()),
        }
    }
}

/// Agent information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent {
    pub id: String,
    pub name: String,
    pub description: String,
    pub owner: Pubkey,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub metadata: HashMap<String, String>,
}

/// Message structure for agent communication
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub from: String,
    pub to: String,
    pub content: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub message_type: MessageType,
}

/// Types of messages supported
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MessageType {
    Direct,
    Channel,
    Broadcast,
}

// Re-export services module
pub mod services;
pub use services::*;

/// Main client for interacting with the PoD Protocol
pub struct PodClient {
    config: Config,
    rpc_client: Arc<RpcClient>,
    context: services::ServiceContext,
    
    /// Agent service for managing AI agents
    pub agents: services::AgentService,
    /// Message service for P2P communication
    pub messages: services::MessageService,
    /// Channel service for group communication
    pub channels: services::ChannelService,
    /// Escrow service for secure payments
    pub escrows: services::EscrowService,
}

impl PodClient {
    /// Create a new PoD Protocol client
    pub async fn new(config: Config) -> Result<Self> {
        let rpc_client = Arc::new(RpcClient::new(config.rpc_url.clone()));
        let context = services::ServiceContext::new(config.clone(), rpc_client.clone());
        
        // Initialize all services
        let mut agents = services::AgentService::new();
        let mut messages = services::MessageService::new();
        let mut channels = services::ChannelService::new();
        let mut escrows = services::EscrowService::new();
        
        // Initialize each service
        agents.initialize(&config, rpc_client.clone()).await?;
        messages.initialize(&config, rpc_client.clone()).await?;
        channels.initialize(&config, rpc_client.clone()).await?;
        escrows.initialize(&config, rpc_client.clone()).await?;
        
        Ok(PodClient {
            config,
            rpc_client,
            context,
            agents,
            messages,
            channels,
            escrows,
        })
    }

    /// Set wallet for the client (required for most operations)
    pub async fn set_wallet<T: Signer + Send + Sync + 'static>(&mut self, wallet: T) -> Result<()> {
        let wallet_arc = Arc::new(wallet);
        self.context = self.context.clone().with_wallet(wallet_arc.clone());
        
        // Re-initialize all services with the new context
        self.agents.initialize(&self.config, self.rpc_client.clone()).await?;
        self.messages.initialize(&self.config, self.rpc_client.clone()).await?;
        self.channels.initialize(&self.config, self.rpc_client.clone()).await?;
        self.escrows.initialize(&self.config, self.rpc_client.clone()).await?;
        
        tracing::info!("Wallet set for client: {}", wallet_arc.pubkey());
        Ok(())
    }

    /// Get the current wallet public key if set
    pub fn wallet_pubkey(&self) -> Option<Pubkey> {
        self.context.wallet_pubkey()
    }

    /// Check if wallet is set
    pub fn has_wallet(&self) -> bool {
        self.context.has_wallet()
    }

    /// Get the current configuration
    pub fn config(&self) -> &Config {
        &self.config
    }

    /// Get the RPC client
    pub fn rpc_client(&self) -> &Arc<RpcClient> {
        &self.rpc_client
    }

    /// Perform a health check on all services
    pub async fn health_check(&self) -> Result<HealthStatus> {
        let mut status = HealthStatus {
            overall: true,
            services: HashMap::new(),
        };

        // Check each service
        let services: Vec<(&str, &dyn services::BaseService)> = vec![
            ("agents", &self.agents),
            ("messages", &self.messages),
            ("channels", &self.channels),
            ("escrows", &self.escrows),
        ];

        for (name, service) in services {
            match service.health_check().await {
                Ok(_) => {
                    status.services.insert(name.to_string(), true);
                }
                Err(e) => {
                    status.services.insert(name.to_string(), false);
                    status.overall = false;
                    tracing::error!("Health check failed for {}: {}", name, e);
                }
            }
        }

        Ok(status)
    }

    /// Get service statistics
    pub async fn get_service_stats(&self) -> Result<ServiceStats> {
        if !self.has_wallet() {
            return Err(PodError::InvalidConfig("Wallet required to get service stats".to_string()).into());
        }

        // This would aggregate statistics from all services
        Ok(ServiceStats {
            agent_count: 0,
            message_count: 0,
            channel_count: 0,
            escrow_count: 0,
            total_transactions: 0,
            last_activity: chrono::Utc::now(),
        })
    }
}

/// Health status for the client and all services
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthStatus {
    pub overall: bool,
    pub services: HashMap<String, bool>,
}

/// Service statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceStats {
    pub agent_count: u64,
    pub message_count: u64,
    pub channel_count: u64,
    pub escrow_count: u64,
    pub total_transactions: u64,
    pub last_activity: chrono::DateTime<chrono::Utc>,
}

/// Utility functions for PoD Protocol operations
pub mod utils {
    use super::*;

    /// Generate a random agent ID
    pub fn generate_agent_id() -> String {
        format!("agent_{}", rand::random::<u64>())
    }

    /// Generate a random message ID
    pub fn generate_message_id() -> String {
        format!("msg_{}", rand::random::<u64>())
    }

    /// Validate agent name
    pub fn validate_agent_name(name: &str) -> Result<()> {
        if name.is_empty() {
            return Err(PodError::InvalidConfig("Agent name cannot be empty".to_string()).into());
        }
        if name.len() > 100 {
            return Err(PodError::InvalidConfig("Agent name too long".to_string()).into());
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_client_creation() {
        let config = Config::default();
        let client = PodClient::new(config).await;
        assert!(client.is_ok());
    }

    #[test]
    fn test_agent_id_generation() {
        let id1 = utils::generate_agent_id();
        let id2 = utils::generate_agent_id();
        assert_ne!(id1, id2);
        assert!(id1.starts_with("agent_"));
    }

    #[test]
    fn test_agent_name_validation() {
        assert!(utils::validate_agent_name("Valid Name").is_ok());
        assert!(utils::validate_agent_name("").is_err());
        assert!(utils::validate_agent_name(&"a".repeat(101)).is_err());
    }
}