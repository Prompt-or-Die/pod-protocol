//! # PoD Protocol Client
//!
//! High-level client for interacting with the PoD Protocol on Solana.
//! Follows Web3.js v2.0 patterns with modern RPC client architecture.

use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;

use anchor_client::{Client, Cluster, Program};
use solana_sdk::{
    commitment_config::CommitmentConfig,
    pubkey::Pubkey,
    signature::Signature,
    signer::{keypair::Keypair, Signer},
};
use solana_rpc_client::rpc_client::RpcClient;
use solana_rpc_client_api::config::{RpcAccountInfoConfig, RpcTransactionConfig};

use crate::{
    config::PodComConfig,
    error::{PodComError, Result},
    services::{
        AgentService, MessageService, ChannelService, EscrowService,
        AnalyticsService, DiscoveryService, IPFSService, ZKCompressionService,
        base::{ServiceConfig, ServiceHealth, ServiceMetrics},
    },
};

/// Main client for interacting with the PoD Protocol
/// 
/// This client provides a high-level interface to all PoD Protocol services
/// and follows Web3.js v2.0 patterns with functional RPC creation.
pub struct PodComClient {
    /// Configuration
    config: PodComConfig,
    
    /// Modern RPC client following Web3.js v2.0 patterns
    rpc_client: Arc<RpcClient>,
    
    /// Anchor program instance
    program: Option<Program<Arc<Keypair>>>,
    
    /// Wallet keypair
    wallet: Option<Arc<Keypair>>,
    
    /// Core services - Web3.js v2.0 aligned architecture
    pub agents: AgentService,
    pub messages: MessageService,
    pub channels: ChannelService,
    pub escrow: EscrowService,
    pub analytics: AnalyticsService,
    pub discovery: DiscoveryService,
    pub ipfs: IPFSService,
    pub zk_compression: ZKCompressionService,
    
    /// Client metrics
    metrics: Arc<RwLock<ClientMetrics>>,
}

impl std::fmt::Debug for PodComClient {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("PodComClient")
            .field("config", &"<PodComConfig>")
            .field("rpc_client", &"<RpcClient>")
            .field("program", &self.program.is_some())
            .field("wallet", &self.wallet.is_some())
            .field("metrics", &"<ClientMetrics>")
            .finish()
    }
}

impl PodComClient {
    /// Create a new PoD Protocol client
    /// 
    /// Uses functional RPC creation pattern aligned with Web3.js v2.0
    pub fn new(config: PodComConfig) -> Result<Self> {
        // Validate configuration first
        config.validate()?;
        
        // Create RPC client using modern patterns (equivalent to createSolanaRpc)
        let rpc_client = Arc::new(Self::create_rpc_client(&config)?);
        
        // Create service configuration
        let service_config = ServiceConfig {
            rpc_client: rpc_client.clone(),
            program_id: config.program_id,
            commitment: config.commitment,
            retry_config: config.retry_config.clone(),
            timeout: config.network.timeout,
            rate_limit_config: config.rate_limit_config.clone(),
            cache_config: config.cache_config.clone(),
            cluster: config.rpc_url.clone(),
            rpc_timeout_secs: config.network.timeout.as_secs(),
            message_config: None,
            channel_config: None,
            escrow_config: None,
            analytics_config: None,
            discovery_config: None,
            compression_config: None,
            ipfs_endpoint: Some(config.ipfs_config.ipfs_endpoint.clone()),
            zk_compression_config: Some(config.zk_compression_config.clone()),
        };
        
        Ok(Self {
            config,
            rpc_client,
            program: None,
            wallet: None,
            
            // Initialize all services
            agents: AgentService::new(service_config.clone()),
            messages: MessageService::new(service_config.clone()),
            channels: ChannelService::new(service_config.clone()),
            escrow: EscrowService::new(service_config.clone()),
            analytics: AnalyticsService::new(service_config.clone()),
            discovery: DiscoveryService::new(service_config.clone()),
            ipfs: IPFSService::new(service_config.clone()),
            zk_compression: ZKCompressionService::new(service_config),
            
            metrics: Arc::new(RwLock::new(ClientMetrics::default())),
        })
    }
    
    /// Create RPC client using Web3.js v2.0 aligned patterns
    /// 
    /// This is the Rust equivalent of `createSolanaRpc()` from Web3.js v2.0
    fn create_rpc_client(config: &PodComConfig) -> Result<RpcClient> {
        let client = RpcClient::new_with_commitment(
            config.rpc_url.clone(),
            config.commitment,
        );
        
        Ok(client)
    }
    
    /// Initialize the client with a wallet (equivalent to Web3.js v2.0 connection patterns)
    /// 
    /// This method sets up the connection similar to how Web3.js v2.0 handles
    /// wallet connections and program initialization.
    pub async fn initialize(&mut self, wallet: Option<Keypair>) -> Result<()> {
        if let Some(wallet) = wallet {
            let wallet = Arc::new(wallet);
            
            // Create Anchor client using modern patterns
            let cluster = self.determine_cluster()?;
            let client = Client::new_with_options(
                cluster,
                wallet.clone(),
                CommitmentConfig::confirmed(),
            );
            
            // Create program instance
            let program = client.program(self.config.program_id)?;
            
            // Store the main program instance first
            self.program = Some(program);
            self.wallet = Some(wallet);
            
            // Initialize all services with individual program instances since Program doesn't implement Clone
            let agents_program = client.program(self.config.program_id)?;
            self.agents.initialize(agents_program).await?;
            
            let messages_program = client.program(self.config.program_id)?;
            self.messages.initialize(messages_program).await?;
            
            let channels_program = client.program(self.config.program_id)?;
            self.channels.initialize(channels_program).await?;
            
            let escrow_program = client.program(self.config.program_id)?;
            self.escrow.initialize(escrow_program).await?;
            
            let analytics_program = client.program(self.config.program_id)?;
            self.analytics.initialize(analytics_program).await?;
            
            let discovery_program = client.program(self.config.program_id)?;
            self.discovery.initialize(discovery_program).await?;
            
            let ipfs_program = client.program(self.config.program_id)?;
            self.ipfs.initialize(ipfs_program).await?;
            
            let zk_compression_program = client.program(self.config.program_id)?;
            self.zk_compression.initialize(zk_compression_program).await?;
        }
        
        Ok(())
    }
    
    /// Get the wallet public key
    pub fn wallet_pubkey(&self) -> Result<Pubkey> {
        self.wallet
            .as_ref()
            .map(|w| w.pubkey())
            .ok_or(PodComError::WalletNotInitialized)
    }
    
    /// Get the RPC client (Web3.js v2.0 style access)
    pub fn rpc(&self) -> &RpcClient {
        &self.rpc_client
    }
    
    /// Get the program instance
    pub fn program(&self) -> Result<&Program<Arc<Keypair>>> {
        self.program.as_ref().ok_or(PodComError::NotInitialized)
    }
    
    /// Check if client is initialized
    pub fn is_initialized(&self) -> bool {
        self.program.is_some()
    }
    
    /// Determine cluster from RPC URL
    fn determine_cluster(&self) -> Result<Cluster> {
        let url = &self.config.rpc_url;
        
        if url.contains("devnet") {
            Ok(Cluster::Devnet)
        } else if url.contains("testnet") {
            Ok(Cluster::Testnet)
        } else if url.contains("mainnet") {
            Ok(Cluster::Mainnet)
        } else if url.contains("127.0.0.1") || url.contains("localhost") {
            Ok(Cluster::Localnet)
        } else {
            Ok(Cluster::Custom(url.clone(), url.clone()))
        }
    }
    
    /// Get client metrics
    pub async fn metrics(&self) -> ClientMetrics {
        self.metrics.read().await.clone()
    }
    
    /// Update client metrics
    async fn update_metrics<F>(&self, updater: F)
    where
        F: FnOnce(&mut ClientMetrics),
    {
        let mut metrics = self.metrics.write().await;
        updater(&mut metrics);
    }
    
    /// Graceful shutdown
    pub async fn shutdown(&mut self) -> Result<()> {
        // Shutdown all services in reverse order
        self.zk_compression.shutdown().await?;
        self.ipfs.shutdown().await?;
        self.discovery.shutdown().await?;
        self.analytics.shutdown().await?;
        self.escrow.shutdown().await?;
        self.channels.shutdown().await?;
        self.messages.shutdown().await?;
        self.agents.shutdown().await?;
        
        // Clear program and wallet
        self.program = None;
        self.wallet = None;
        
        Ok(())
    }
    
    /// Create a transaction config with Web3.js v2.0 patterns
    pub fn create_transaction_config(&self) -> RpcTransactionConfig {
        RpcTransactionConfig {
            encoding: Some(solana_rpc_client_api::config::UiTransactionEncoding::Base64),
            commitment: Some(self.config.commitment),
            max_supported_transaction_version: Some(0),
        }
    }
    
    /// Create an account info config
    pub fn create_account_config(&self) -> RpcAccountInfoConfig {
        RpcAccountInfoConfig {
            encoding: Some(solana_rpc_client_api::config::UiAccountEncoding::Base64),
            commitment: Some(self.config.commitment),
            data_slice: None,
            min_context_slot: None,
        }
    }
    
    /// Send and confirm transaction with modern patterns
    pub async fn send_and_confirm_transaction(
        &self,
        transaction: &solana_sdk::transaction::Transaction,
    ) -> Result<Signature> {
        let signature = self.rpc_client
            .send_and_confirm_transaction(transaction)
            .map_err(|e| PodComError::Network(crate::error::NetworkError::RpcFailed {
                method: "send_and_confirm_transaction".to_string(),
                reason: e.to_string(),
            }))?;
        
        // Update metrics
        self.update_metrics(|m| {
            m.transactions_sent += 1;
        }).await;
        
        Ok(signature)
    }
}

/// Client metrics for monitoring
#[derive(Debug, Clone, Default)]
pub struct ClientMetrics {
    /// Number of transactions sent
    pub transactions_sent: u64,
    /// Number of RPC calls made
    pub rpc_calls_made: u64,
    /// Total errors encountered
    pub total_errors: u64,
    /// Cache hits
    pub cache_hits: u64,
    /// Cache misses
    pub cache_misses: u64,
    /// Average response time (ms)
    pub avg_response_time_ms: f64,
}

impl ClientMetrics {
    /// Get cache hit rate
    pub fn cache_hit_rate(&self) -> f64 {
        let total = self.cache_hits + self.cache_misses;
        if total == 0 {
            0.0
        } else {
            self.cache_hits as f64 / total as f64
        }
    }
}

/// Base trait for all services following Web3.js v2.0 patterns
#[async_trait::async_trait]
pub trait BaseService: Send + Sync {
    type Error: std::error::Error + Send + Sync + 'static;
    
    /// Initialize the service with a program instance
    async fn initialize(&mut self, program: Program<Arc<Keypair>>) -> Result<(), Self::Error>;
    
    /// Get the current program instance
    fn program(&self) -> Result<&Program<Arc<Keypair>>, Self::Error>;
    
    /// Validate service configuration
    fn validate_config(&self) -> Result<(), Self::Error>;
    
    /// Get service health status
    fn health_check(&self) -> ServiceHealth;
    
    /// Get service metrics
    fn metrics(&self) -> ServiceMetrics;
    
    /// Graceful shutdown
    async fn shutdown(&mut self) -> Result<(), Self::Error>;
}



#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::PodComConfig;

    #[test]
    fn test_client_creation() {
        let config = PodComConfig::localnet();
        let client = PodComClient::new(config);
        assert!(client.is_ok());
    }

    #[test]
    fn test_client_not_initialized() {
        let config = PodComConfig::localnet();
        let client = PodComClient::new(config).unwrap();
        assert!(!client.is_initialized());
    }

    #[test]
    fn test_cluster_determination() {
        let config = PodComConfig::devnet();
        let client = PodComClient::new(config).unwrap();
        let cluster = client.determine_cluster().unwrap();
        assert!(matches!(cluster, Cluster::Devnet));
    }
} 