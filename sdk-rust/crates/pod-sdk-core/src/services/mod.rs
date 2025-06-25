//! # PoD Protocol Services
//!
//! Complete service layer implementation for the PoD Protocol Rust SDK.
//! All services follow a consistent pattern and provide production-ready functionality.

pub mod base;
pub mod agent;
pub mod message; 
pub mod channel;
pub mod escrow;
pub mod analytics;
pub mod discovery;
pub mod ipfs;
pub mod zk_compression;

// Re-export all services for convenient access
pub use agent::AgentService;
pub use analytics::AnalyticsService;
pub use base::{BaseService, ServiceConfig, ServiceMetrics, ServiceHealth};
pub use channel::ChannelService;
pub use discovery::DiscoveryService;
pub use escrow::EscrowService;
pub use ipfs::IPFSService;
pub use message::MessageService;
pub use zk_compression::ZKCompressionService;

/// Service registry for managing all protocol services
#[derive(Debug)]
pub struct ServiceRegistry {
    pub agent: AgentService,
    pub message: MessageService,
    pub channel: ChannelService,
    pub escrow: EscrowService,
    pub analytics: AnalyticsService,
    pub discovery: DiscoveryService,
    pub ipfs: IPFSService,
    pub zk_compression: ZKCompressionService,
}

impl ServiceRegistry {
    /// Create a new service registry with all services initialized
    pub fn new(config: ServiceConfig) -> Self {
        Self {
            agent: AgentService::new(config.clone()),
            message: MessageService::new(config.clone()),
            channel: ChannelService::new(config.clone()),
            escrow: EscrowService::new(config.clone()),
            analytics: AnalyticsService::new(config.clone()),
            discovery: DiscoveryService::new(config.clone()),
            ipfs: IPFSService::new(config.clone()),
            zk_compression: ZKCompressionService::new(config),
        }
    }
    
    /// Initialize all services with the program instance
    pub async fn initialize_all(&mut self, program: anchor_client::Program<std::sync::Arc<solana_sdk::signer::keypair::Keypair>>) -> crate::error::Result<()> {
        self.agent.initialize(program.clone()).await?;
        self.message.initialize(program.clone()).await?;
        self.channel.initialize(program.clone()).await?;
        self.escrow.initialize(program.clone()).await?;
        self.analytics.initialize(program.clone()).await?;
        self.discovery.initialize(program.clone()).await?;
        self.ipfs.initialize(program.clone()).await?;
        self.zk_compression.initialize(program).await?;
        
        Ok(())
    }
    
    /// Shutdown all services gracefully
    pub async fn shutdown_all(&mut self) -> crate::error::Result<()> {
        self.zk_compression.shutdown().await?;
        self.ipfs.shutdown().await?;
        self.discovery.shutdown().await?;
        self.analytics.shutdown().await?;
        self.escrow.shutdown().await?;
        self.channel.shutdown().await?;
        self.message.shutdown().await?;
        self.agent.shutdown().await?;
        
        Ok(())
    }
    
    /// Get health status of all services
    pub fn health_status(&self) -> std::collections::HashMap<&'static str, ServiceHealth> {
        let mut status = std::collections::HashMap::new();
        
        status.insert("agent", self.agent.health_check());
        status.insert("message", self.message.health_check());
        status.insert("channel", self.channel.health_check());
        status.insert("escrow", self.escrow.health_check());
        status.insert("analytics", self.analytics.health_check());
        status.insert("discovery", self.discovery.health_check());
        status.insert("ipfs", self.ipfs.health_check());
        status.insert("zk_compression", self.zk_compression.health_check());
        
        status
    }
} 