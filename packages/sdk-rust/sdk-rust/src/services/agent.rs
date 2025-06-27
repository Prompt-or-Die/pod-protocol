use std::collections::HashMap;
use std::sync::Arc;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use solana_sdk::{
    instruction::Instruction,
    pubkey::Pubkey,
    signature::Signature,
    transaction::Transaction,
    system_instruction,
    signer::Signer,
};
use solana_client::rpc_client::RpcClient;
use chrono::{DateTime, Utc};

use crate::{Config, PodError, Agent};
use super::{BaseService, ServiceContext, TransactionResult, account_utils};

/// Agent capabilities represented as a bitmask
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AgentCapabilities(pub u64);

impl AgentCapabilities {
    pub const MESSAGING: Self = Self(1 << 0);
    pub const CHANNEL_PARTICIPATION: Self = Self(1 << 1);
    pub const ESCROW_MANAGEMENT: Self = Self(1 << 2);
    pub const ANALYTICS_TRACKING: Self = Self(1 << 3);
    pub const ZK_COMPRESSION: Self = Self(1 << 4);
    pub const IPFS_STORAGE: Self = Self(1 << 5);
    
    /// Create capabilities with all features enabled
    pub const fn all() -> Self {
        Self(0xFFFFFFFFFFFFFFFF)
    }
    
    /// Create capabilities with only basic features
    pub const fn basic() -> Self {
        Self(Self::MESSAGING.0 | Self::CHANNEL_PARTICIPATION.0)
    }
    
    /// Check if capability is enabled
    pub fn has(&self, capability: AgentCapabilities) -> bool {
        (self.0 & capability.0) != 0
    }
    
    /// Add a capability
    pub fn add(&mut self, capability: AgentCapabilities) {
        self.0 |= capability.0;
    }
    
    /// Remove a capability
    pub fn remove(&mut self, capability: AgentCapabilities) {
        self.0 &= !capability.0;
    }
}

/// Agent registration data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentRegistrationData {
    pub name: String,
    pub description: String,
    pub capabilities: u64,
    pub metadata_uri: String,
    pub contact_info: Option<String>,
    pub version: String,
}

impl AgentRegistrationData {
    pub fn new(
        name: String,
        description: String,
        capabilities: AgentCapabilities,
        metadata_uri: String,
    ) -> Self {
        Self {
            name,
            description,
            capabilities: capabilities.0,
            metadata_uri,
            contact_info: None,
            version: "1.0.0".to_string(),
        }
    }

    pub fn with_contact_info(mut self, contact: String) -> Self {
        self.contact_info = Some(contact);
        self
    }

    pub fn with_version(mut self, version: String) -> Self {
        self.version = version;
        self
    }
}

/// Agent status on the network
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AgentStatus {
    Active,
    Inactive,
    Suspended,
    Deregistered,
}

/// Extended agent information including on-chain state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentInfo {
    pub agent: Agent,
    pub pda: Pubkey,
    pub status: AgentStatus,
    pub capabilities: AgentCapabilities,
    pub reputation_score: u32,
    pub total_messages: u64,
    pub total_escrows: u64,
    pub last_activity: DateTime<Utc>,
    pub registration_slot: u64,
}

/// Agent service for managing AI agents on the PoD Protocol
pub struct AgentService {
    context: Option<ServiceContext>,
}

impl AgentService {
    pub fn new() -> Self {
        Self { context: None }
    }

    /// Register a new agent on the PoD Protocol
    pub async fn register_agent(
        &self,
        registration_data: AgentRegistrationData,
    ) -> Result<TransactionResult, PodError> {
        let context = self.get_context()?;
        
        if !context.has_wallet() {
            return Err(PodError::InvalidConfig("Wallet required for agent registration".to_string()));
        }

        let wallet_pubkey = context.wallet_pubkey().unwrap();
        
        // Derive agent PDA
        let (agent_pda, bump) = account_utils::derive_agent_pda(
            &context.config.program_id,
            &wallet_pubkey,
        )?;

        // Create registration instruction
        let instruction = self.create_register_instruction(
            &wallet_pubkey,
            &agent_pda,
            bump,
            &registration_data,
        )?;

        // Send transaction
        self.send_transaction(&context, vec![instruction]).await
    }

    /// Update agent information
    pub async fn update_agent(
        &self,
        updates: HashMap<String, String>,
    ) -> Result<TransactionResult, PodError> {
        let context = self.get_context()?;
        
        if !context.has_wallet() {
            return Err(PodError::InvalidConfig("Wallet required for agent update".to_string()));
        }

        let wallet_pubkey = context.wallet_pubkey().unwrap();
        let (agent_pda, _) = account_utils::derive_agent_pda(
            &context.config.program_id,
            &wallet_pubkey,
        )?;

        // Create update instruction
        let instruction = self.create_update_instruction(&wallet_pubkey, &agent_pda, updates)?;

        // Send transaction
        self.send_transaction(&context, vec![instruction]).await
    }

    /// Deregister an agent
    pub async fn deregister_agent(&self) -> Result<TransactionResult, PodError> {
        let context = self.get_context()?;
        
        if !context.has_wallet() {
            return Err(PodError::InvalidConfig("Wallet required for agent deregistration".to_string()));
        }

        let wallet_pubkey = context.wallet_pubkey().unwrap();
        let (agent_pda, _) = account_utils::derive_agent_pda(
            &context.config.program_id,
            &wallet_pubkey,
        )?;

        // Create deregister instruction
        let instruction = self.create_deregister_instruction(&wallet_pubkey, &agent_pda)?;

        // Send transaction
        self.send_transaction(&context, vec![instruction]).await
    }

    /// Get agent information by public key
    pub async fn get_agent(&self, agent_pubkey: &Pubkey) -> Result<AgentInfo, PodError> {
        let context = self.get_context()?;
        
        // Fetch account data from Solana
        let account_data = context.rpc_client
            .get_account(agent_pubkey)
            .map_err(|e| PodError::Solana(format!("Failed to fetch agent account: {}", e)))?;

        // Deserialize agent data (this would be implemented based on the actual on-chain data format)
        self.deserialize_agent_data(&account_data.data, agent_pubkey)
    }

    /// Get agent by wallet public key
    pub async fn get_agent_by_wallet(&self, wallet_pubkey: &Pubkey) -> Result<AgentInfo, PodError> {
        let context = self.get_context()?;
        
        let (agent_pda, _) = account_utils::derive_agent_pda(
            &context.config.program_id,
            wallet_pubkey,
        )?;

        self.get_agent(&agent_pda).await
    }

    /// List all agents (with pagination)
    pub async fn list_agents(
        &self,
        limit: Option<usize>,
        offset: Option<usize>,
    ) -> Result<Vec<AgentInfo>, PodError> {
        let context = self.get_context()?;
        
        // This would use getProgramAccounts RPC call to fetch all agent accounts
        // For now, return empty list as placeholder
        tracing::info!("Listing agents with limit: {:?}, offset: {:?}", limit, offset);
        Ok(vec![])
    }

    /// Search agents by capabilities
    pub async fn search_by_capabilities(
        &self,
        capabilities: AgentCapabilities,
    ) -> Result<Vec<AgentInfo>, PodError> {
        let context = self.get_context()?;
        
        // This would filter agents based on their capability bitmask
        tracing::info!("Searching agents by capabilities: {:064b}", capabilities.0);
        Ok(vec![])
    }

    /// Get agent reputation score
    pub async fn get_reputation(&self, agent_pubkey: &Pubkey) -> Result<u32, PodError> {
        let agent_info = self.get_agent(agent_pubkey).await?;
        Ok(agent_info.reputation_score)
    }

    // Private helper methods

    fn get_context(&self) -> Result<&ServiceContext, PodError> {
        self.context.as_ref()
            .ok_or_else(|| PodError::InvalidConfig("Service not initialized".to_string()))
    }

    fn create_register_instruction(
        &self,
        wallet_pubkey: &Pubkey,
        agent_pda: &Pubkey,
        bump: u8,
        registration_data: &AgentRegistrationData,
    ) -> Result<Instruction, PodError> {
        // This would create the actual instruction for the PoD Protocol program
        // For now, return a placeholder system instruction
        Ok(system_instruction::create_account(
            wallet_pubkey,
            agent_pda,
            1000000, // Minimum rent-exempt amount
            256,     // Account data size
            &self.get_context()?.config.program_id,
        ))
    }

    fn create_update_instruction(
        &self,
        wallet_pubkey: &Pubkey,
        agent_pda: &Pubkey,
        updates: HashMap<String, String>,
    ) -> Result<Instruction, PodError> {
        // Placeholder instruction for agent updates
        Ok(system_instruction::transfer(wallet_pubkey, agent_pda, 0))
    }

    fn create_deregister_instruction(
        &self,
        wallet_pubkey: &Pubkey,
        agent_pda: &Pubkey,
    ) -> Result<Instruction, PodError> {
        // Placeholder instruction for agent deregistration
        Ok(system_instruction::transfer(wallet_pubkey, agent_pda, 0))
    }

    async fn send_transaction(
        &self,
        context: &ServiceContext,
        instructions: Vec<Instruction>,
    ) -> Result<TransactionResult, PodError> {
        let wallet = context.wallet.as_ref()
            .ok_or_else(|| PodError::InvalidConfig("Wallet required".to_string()))?;

        // Get recent blockhash
        let recent_blockhash = context.rpc_client
            .get_latest_blockhash()
            .map_err(|e| PodError::Network(e.to_string()))?;

        // Create and sign transaction
        let signers: Vec<&dyn Signer> = vec![&**wallet];
        let transaction = Transaction::new_signed_with_payer(
            &instructions,
            Some(&wallet.pubkey()),
            &signers,
            recent_blockhash,
        );

        // Send transaction
        let signature = context.rpc_client
            .send_and_confirm_transaction(&transaction)
            .map_err(|e| PodError::Network(e.to_string()))?;

        Ok(TransactionResult::new(signature))
    }

    fn deserialize_agent_data(
        &self,
        data: &[u8],
        agent_pubkey: &Pubkey,
    ) -> Result<AgentInfo, PodError> {
        // This would deserialize the actual on-chain agent data
        // For now, return a placeholder
        Ok(AgentInfo {
            agent: Agent {
                id: agent_pubkey.to_string(),
                name: "Agent".to_string(),
                description: "AI Agent".to_string(),
                owner: *agent_pubkey,
                created_at: Utc::now(),
                metadata: HashMap::new(),
            },
            pda: *agent_pubkey,
            status: AgentStatus::Active,
            capabilities: AgentCapabilities::basic(),
            reputation_score: 100,
            total_messages: 0,
            total_escrows: 0,
            last_activity: Utc::now(),
            registration_slot: 0,
        })
    }
}

#[async_trait]
impl BaseService for AgentService {
    async fn initialize(&mut self, config: &Config, rpc_client: Arc<RpcClient>) -> Result<(), PodError> {
        self.context = Some(ServiceContext::new(config.clone(), rpc_client));
        tracing::info!("AgentService initialized");
        Ok(())
    }

    fn service_name(&self) -> &'static str {
        "AgentService"
    }

    async fn health_check(&self) -> Result<(), PodError> {
        let context = self.get_context()?;
        
        // Check RPC connection
        let _ = context.rpc_client
            .get_health()
            .map_err(|e| PodError::Network(e.to_string()))?;
        
        Ok(())
    }
}

impl Default for AgentService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_agent_capabilities() {
        let mut caps = AgentCapabilities::basic();
        assert!(caps.has(AgentCapabilities::MESSAGING));
        assert!(caps.has(AgentCapabilities::CHANNEL_PARTICIPATION));
        assert!(!caps.has(AgentCapabilities::ESCROW_MANAGEMENT));

        caps.add(AgentCapabilities::ESCROW_MANAGEMENT);
        assert!(caps.has(AgentCapabilities::ESCROW_MANAGEMENT));

        caps.remove(AgentCapabilities::MESSAGING);
        assert!(!caps.has(AgentCapabilities::MESSAGING));
    }

    #[test]
    fn test_agent_registration_data() {
        let data = AgentRegistrationData::new(
            "Test Agent".to_string(),
            "A test agent".to_string(),
            AgentCapabilities::all(),
            "https://metadata.example.com".to_string(),
        ).with_contact_info("test@example.com".to_string())
        .with_version("2.0.0".to_string());

        assert_eq!(data.name, "Test Agent");
        assert_eq!(data.contact_info, Some("test@example.com".to_string()));
        assert_eq!(data.version, "2.0.0");
    }

    #[tokio::test]
    async fn test_agent_service_creation() {
        let service = AgentService::new();
        assert_eq!(service.service_name(), "AgentService");
    }
}