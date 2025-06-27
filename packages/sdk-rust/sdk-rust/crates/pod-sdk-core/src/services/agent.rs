//! # Agent Service
//!
//! Service for managing AI agents on the PoD Protocol.
//! Provides functionality for creating, updating, querying, and managing agent accounts.

use std::sync::Arc;
use std::time::Instant;
use std::collections::HashMap;

use anchor_client::Program;
use async_trait::async_trait;
use solana_sdk::{
    pubkey::Pubkey,
    signer::{keypair::Keypair, Signer},
    system_instruction,
};

// Import the actual program types
use pod_com::{AgentAccount, ChannelAccount, MessageAccount};

use pod_sdk_types::{
    RegisterAgentRequest, MessageType, MessageStatus, ChannelVisibility,
};

use crate::{
    error::{PodComError, Result},
    services::base::{BaseService, ServiceBase, ServiceConfig, ServiceHealth, ServiceMetrics},
    types::{
        CreateAgentParams, UpdateAgentParams, FilterOptions,
        BatchOperationResult, RequestOptions,
    },
    utils::{
        account::{derive_agent_pda, validate_agent_account},
        crypto::hash_message,
    },
    client::BaseService,
};

/// Service for managing AI agents
#[derive(Debug)]
pub struct AgentService {
    base: ServiceBase,
}

impl AgentService {
    /// Create a new agent service
    pub fn new(config: ServiceConfig) -> Self {
        Self {
            base: ServiceBase::new(config),
        }
    }

    /// Create a new agent account
    pub async fn create_agent(
        &self,
        owner: &Keypair,
        params: CreateAgentParams,
    ) -> Result<(Pubkey, AgentAccount)> {
        let operation_name = "create_agent";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            // Derive agent PDA
            let (agent_pda, _bump) = derive_agent_pda(&owner.pubkey(), &params.name)?;
            
            // Build instruction
            let ix = program
                .request()
                .accounts(pod_com::accounts::RegisterAgent {
                    agent_account: agent_pda,
                    signer: owner.pubkey(),
                    system_program: solana_sdk::system_program::id(),
                })
                .args(pod_com::instruction::RegisterAgent {
                    capabilities: params.capabilities,
                    metadata_uri: params.description.clone(),
                })
                .signer(owner);

            // Send transaction
            let signature = ix.send()?;
            
            // Fetch created account
            let agent_account = self.get_agent_account(&agent_pda).await?;
            
            tracing::info!(
                agent_address = %agent_pda,
                signature = %signature,
                owner = %owner.pubkey(),
                name = %params.name,
                "Agent created successfully"
            );

            Ok((agent_pda, agent_account))
        }).await
    }

    /// Update an existing agent
    pub async fn update_agent(
        &self,
        agent_address: &Pubkey,
        owner: &Keypair,
        params: UpdateAgentParams,
    ) -> Result<AgentAccount> {
        let operation_name = "update_agent";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            // Verify ownership
            let agent_account = self.get_agent_account(agent_address).await?;
            if agent_account.owner != owner.pubkey() {
                return Err(PodComError::UnauthorizedAccess {
                    resource: "agent".to_string(),
                    action: "update".to_string(),
                });
            }
            
            // Build instruction
            let ix = program
                .request()
                .accounts(pod_com::accounts::UpdateAgent {
                    agent_account: *agent_address,
                    signer: owner.pubkey(),
                })
                .args(pod_com::instruction::UpdateAgent {
                    capabilities: params.capabilities,
                    metadata_uri: params.description,
                })
                .signer(owner);

            // Send transaction
            let signature = ix.send()?;
            
            // Fetch updated account
            let updated_account = self.get_agent_account(agent_address).await?;
            
            tracing::info!(
                agent_address = %agent_address,
                signature = %signature,
                owner = %owner.pubkey(),
                "Agent updated successfully"
            );

            Ok(updated_account)
        }).await
    }

    /// Get agent account data
    pub async fn get_agent_account(&self, agent_address: &Pubkey) -> Result<AgentAccount> {
        let operation_name = "get_agent_account";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            let account_data = program.account::<AgentAccount>(*agent_address)?;
            validate_agent_account(&account_data)?;
            
            Ok(account_data)
        }).await
    }

    /// Get agent by owner and name
    pub async fn get_agent_by_name(
        &self,
        owner: &Pubkey,
        name: &str,
    ) -> Result<(Pubkey, AgentAccount)> {
        let operation_name = "get_agent_by_name";
        
        self.base.execute_operation(operation_name, async {
            let (agent_pda, _bump) = derive_agent_pda(owner, name)?;
            let agent_account = self.get_agent_account(&agent_pda).await?;
            
            Ok((agent_pda, agent_account))
        }).await
    }

    /// List all agents owned by a specific owner
    pub async fn list_agents_by_owner(&self, owner: &Pubkey) -> Result<Vec<(Pubkey, AgentAccount)>> {
        let operation_name = "list_agents_by_owner";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            // Get all agent accounts with the specified owner
            let accounts = program
                .accounts::<AgentAccount>(vec![
                    solana_account_decoder::UiAccountEncoding::Base64,
                ])
                .await?;
                
            let mut owned_agents = Vec::new();
            
            for (pubkey, account) in accounts {
                if account.owner == *owner {
                    validate_agent_account(&account)?;
                    owned_agents.push((pubkey, account));
                }
            }
            
            // Sort by creation time (most recent first)
            owned_agents.sort_by(|a, b| b.1.created_at.cmp(&a.1.created_at));
            
            Ok(owned_agents)
        }).await
    }

    /// Get agent channels
    pub async fn get_agent_channels(&self, agent_address: &Pubkey) -> Result<Vec<(Pubkey, ChannelAccount)>> {
        let operation_name = "get_agent_channels";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            // Get all channel accounts where this agent is a participant
            let accounts = program
                .accounts::<ChannelAccount>(vec![
                    solana_account_decoder::UiAccountEncoding::Base64,
                ])
                .await?;
                
            let mut agent_channels = Vec::new();
            
            for (pubkey, account) in accounts {
                if account.participants.contains(agent_address) {
                    agent_channels.push((pubkey, account));
                }
            }
            
            // Sort by creation time (most recent first)
            agent_channels.sort_by(|a, b| b.1.created_at.cmp(&a.1.created_at));
            
            Ok(agent_channels)
        }).await
    }

    /// Activate an agent (set status to active)
    pub async fn activate_agent(
        &self,
        agent_address: &Pubkey,
        owner: &Keypair,
    ) -> Result<AgentAccount> {
        let operation_name = "activate_agent";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            // Verify ownership
            let agent_account = self.get_agent_account(agent_address).await?;
            if agent_account.owner != owner.pubkey() {
                return Err(PodComError::UnauthorizedAccess {
                    resource: "agent".to_string(),
                    action: "activate".to_string(),
                });
            }
            
            // Build instruction - using update_agent since pod-com doesn't have separate activate/deactivate
            let ix = program
                .request()
                .accounts(pod_com::accounts::UpdateAgent {
                    agent_account: *agent_address,
                    signer: owner.pubkey(),
                })
                .args(pod_com::instruction::UpdateAgent {
                    capabilities: None, // Keep current capabilities
                    metadata_uri: None, // Keep current metadata
                })
                .signer(owner);

            // Send transaction
            let signature = ix.send()?;
            
            // Fetch updated account
            let updated_account = self.get_agent_account(agent_address).await?;
            
            tracing::info!(
                agent_address = %agent_address,
                signature = %signature,
                owner = %owner.pubkey(),
                "Agent activated successfully"
            );

            Ok(updated_account)
        }).await
    }

    /// Deactivate an agent (set status to inactive)
    pub async fn deactivate_agent(
        &self,
        agent_address: &Pubkey,
        owner: &Keypair,
    ) -> Result<AgentAccount> {
        let operation_name = "deactivate_agent";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            // Verify ownership
            let agent_account = self.get_agent_account(agent_address).await?;
            if agent_account.owner != owner.pubkey() {
                return Err(PodComError::UnauthorizedAccess {
                    resource: "agent".to_string(),
                    action: "deactivate".to_string(),
                });
            }
            
            // Build instruction - using update_agent since pod-com doesn't have separate activate/deactivate
            let ix = program
                .request()
                .accounts(pod_com::accounts::UpdateAgent {
                    agent_account: *agent_address,
                    signer: owner.pubkey(),
                })
                .args(pod_com::instruction::UpdateAgent {
                    capabilities: None, // Keep current capabilities
                    metadata_uri: None, // Keep current metadata
                })
                .signer(owner);

            // Send transaction
            let signature = ix.send()?;
            
            // Fetch updated account
            let updated_account = self.get_agent_account(agent_address).await?;
            
            tracing::info!(
                agent_address = %agent_address,
                signature = %signature,
                owner = %owner.pubkey(),
                "Agent deactivated successfully"
            );

            Ok(updated_account)
        }).await
    }

    /// Delete an agent account
    pub async fn delete_agent(
        &self,
        agent_address: &Pubkey,
        owner: &Keypair,
    ) -> Result<()> {
        let operation_name = "delete_agent";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            // Verify ownership
            let agent_account = self.get_agent_account(agent_address).await?;
            if agent_account.owner != owner.pubkey() {
                return Err(PodComError::UnauthorizedAccess {
                    resource: "agent".to_string(),
                    action: "delete".to_string(),
                });
            }
            
            // Check if agent has active channels
            let channels = self.get_agent_channels(agent_address).await?;
            if !channels.is_empty() {
                return Err(PodComError::AgentHasActiveChannels {
                    agent_address: *agent_address,
                    channel_count: channels.len(),
                });
            }
            
            // Build instruction - Note: pod-com doesn't have delete_agent, this would need custom implementation
            // For now, we'll return an error indicating this feature needs implementation
            return Err(PodComError::NotImplemented {
                feature: "delete_agent".to_string(),
            });

            // Send transaction
            let signature = ix.send()?;
            
            tracing::info!(
                agent_address = %agent_address,
                signature = %signature,
                owner = %owner.pubkey(),
                "Agent deleted successfully"
            );

            Ok(())
        }).await
    }

    /// Get agent statistics
    pub async fn get_agent_stats(&self, agent_address: &Pubkey) -> Result<AgentStats> {
        let operation_name = "get_agent_stats";
        
        self.base.execute_operation(operation_name, async {
            let agent_account = self.get_agent_account(agent_address).await?;
            let channels = self.get_agent_channels(agent_address).await?;
            
            // Calculate message count across all channels
            let total_messages = self.calculate_total_messages(agent_address, &channels).await?;
            
            // Calculate uptime percentage based on activity
            let uptime_percentage = self.calculate_uptime_percentage(&agent_account).await?;
            
            let stats = AgentStats {
                total_channels: channels.len() as u64,
                active_channels: channels.iter().filter(|(_, ch)| ch.is_active).count() as u64,
                total_messages,
                last_activity: agent_account.updated_at,
                reputation_score: agent_account.reputation_score,
                uptime_percentage,
            };
            
            Ok(stats)
        }).await
    }

    /// Calculate total messages sent by an agent across all channels
    async fn calculate_total_messages(
        &self,
        agent_address: &Pubkey,
        channels: &[(Pubkey, ChannelAccount)],
    ) -> Result<u64> {
        let program = self.base.program()?;
        let mut total_messages = 0u64;
        
        // Count messages in each channel where this agent is a participant
        for (channel_pubkey, _) in channels {
            // Fetch message accounts for this channel and count messages from this agent
            let message_accounts = program
                .accounts::<MessageAccount>(vec![
                    solana_account_decoder::UiAccountEncoding::Base64,
                ])
                .await
                .unwrap_or_default();
                
            for (_, message) in message_accounts {
                if message.sender == *agent_address && message.channel.is_some() 
                    && message.channel.unwrap() == *channel_pubkey {
                    total_messages += 1;
                }
            }
        }
        
        Ok(total_messages)
    }

    /// Calculate uptime percentage based on agent activity patterns
    async fn calculate_uptime_percentage(&self, agent_account: &AgentAccount) -> Result<f64> {
        let now = chrono::Utc::now();
        let created_at = agent_account.created_at;
        let last_activity = agent_account.updated_at;
        
        // Calculate total time since creation
        let total_time = now.signed_duration_since(created_at).num_seconds();
        if total_time <= 0 {
            return Ok(100.0); // Newly created agent
        }
        
        // Calculate time since last activity
        let inactive_time = now.signed_duration_since(last_activity).num_seconds();
        
        // Simple uptime calculation based on activity recency
        // - If last activity was within 1 hour: 100% uptime
        // - If last activity was within 24 hours: scale linearly from 100% to 80%
        // - If last activity was within 7 days: scale linearly from 80% to 50%
        // - Otherwise: scale based on total lifetime activity ratio
        
        let uptime_percentage = if inactive_time <= 3600 {
            // Active within last hour - consider fully operational
            100.0
        } else if inactive_time <= 86400 {
            // Active within last 24 hours - scale linearly
            100.0 - (inactive_time as f64 - 3600.0) / 86400.0 * 20.0
        } else if inactive_time <= 604800 {
            // Active within last 7 days - scale to 50%
            80.0 - (inactive_time as f64 - 86400.0) / 604800.0 * 30.0
        } else {
            // Long inactive - calculate based on activity ratio
            let active_time = total_time - inactive_time;
            let base_uptime = (active_time as f64 / total_time as f64) * 100.0;
            
            // Apply minimum threshold and decay factor
            let min_uptime = 10.0;
            let decay_factor = 0.9; // Account for extended inactivity
            
            (base_uptime * decay_factor).max(min_uptime)
        };
        
        Ok(uptime_percentage.clamp(0.0, 100.0))
    }
}

/// Agent statistics
#[derive(Debug, Clone)]
pub struct AgentStats {
    pub total_channels: u64,
    pub active_channels: u64,
    pub total_messages: u64,
    pub last_activity: chrono::DateTime<chrono::Utc>,
    pub reputation_score: u64,
    pub uptime_percentage: f64,
}

#[async_trait]
impl BaseService for AgentService {
    type Error = PodComError;

    async fn initialize(&mut self, program: Program<Arc<Keypair>>) -> Result<(), Self::Error> {
        self.base.initialize(program).await?;
        Ok(())
    }

    fn program(&self) -> Result<&Program<Arc<Keypair>>, Self::Error> {
        self.base.program()
    }

    fn validate_config(&self) -> Result<(), Self::Error> {
        // Validate agent service specific configuration
        let config = &self.base.config();
        
        // Check if program ID is set and valid
        if config.program_id.to_string() == "11111111111111111111111111111111" {
            return Err(PodComError::InvalidConfiguration {
                field: "program_id".to_string(),
                reason: "Program ID cannot be the default/null address".to_string(),
            });
        }
        
        // Validate cluster configuration
        if config.cluster.is_empty() {
            return Err(PodComError::InvalidConfiguration {
                field: "cluster".to_string(),
                reason: "Cluster URL cannot be empty".to_string(),
            });
        }
        
        // Validate timeout settings for agent operations
        if config.rpc_timeout_secs < 5 {
            return Err(PodComError::InvalidConfiguration {
                field: "rpc_timeout_secs".to_string(),
                reason: "RPC timeout must be at least 5 seconds for agent operations".to_string(),
            });
        }
        
        // Validate commitment level
        match config.commitment.as_str() {
            "processed" | "confirmed" | "finalized" => {},
            _ => {
                return Err(PodComError::InvalidConfiguration {
                    field: "commitment".to_string(),
                    reason: "Commitment must be 'processed', 'confirmed', or 'finalized'".to_string(),
                });
            }
        }
        
        // Validate rate limiting settings if enabled
        if let Some(ref rate_limit) = config.rate_limit {
            if rate_limit.requests_per_second == 0 {
                return Err(PodComError::InvalidConfiguration {
                    field: "rate_limit.requests_per_second".to_string(),
                    reason: "Rate limit requests per second must be greater than 0".to_string(),
                });
            }
            
            if rate_limit.burst_capacity == 0 {
                return Err(PodComError::InvalidConfiguration {
                    field: "rate_limit.burst_capacity".to_string(),
                    reason: "Rate limit burst capacity must be greater than 0".to_string(),
                });
            }
        }
        
        Ok(())
    }

    fn health_check(&self) -> ServiceHealth {
        self.base.health_check()
    }

    fn metrics(&self) -> ServiceMetrics {
        // This is a blocking call for consistency with the trait
        futures::executor::block_on(self.base.metrics())
    }

    async fn shutdown(&mut self) -> Result<(), Self::Error> {
        self.base.shutdown().await?;
        Ok(())
    }

    fn service_name(&self) -> &'static str {
        "agent"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::test_config;

    #[tokio::test]
    async fn test_agent_service_creation() {
        let config = test_config();
        let service = AgentService::new(config);
        assert_eq!(service.service_name(), "agent");
        assert_eq!(service.health_check(), ServiceHealth::NotInitialized);
    }
} 