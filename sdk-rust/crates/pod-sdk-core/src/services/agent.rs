//! # Agent Service
//!
//! Service for managing AI agents on the PoD Protocol.
//! Provides functionality for creating, updating, querying, and managing agent accounts.

use std::sync::Arc;
use std::time::Instant;

use anchor_client::Program;
use async_trait::async_trait;
use solana_sdk::{
    pubkey::Pubkey,
    signer::{keypair::Keypair, Signer},
    system_instruction,
};

use pod_sdk_types::{
    accounts::{AgentAccount, ChannelAccount},
    instructions::{CreateAgentParams, UpdateAgentParams},
    constants::*,
    events::AgentEvent,
};

use crate::{
    error::{PodComError, Result},
    services::base::{BaseService, ServiceBase, ServiceConfig, ServiceHealth, ServiceMetrics},
    utils::account::{derive_agent_pda, validate_agent_account},
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
                .accounts(pod_protocol::accounts::CreateAgent {
                    agent: agent_pda,
                    owner: owner.pubkey(),
                    system_program: solana_sdk::system_program::id(),
                    rent: solana_sdk::sysvar::rent::id(),
                })
                .args(pod_protocol::instruction::CreateAgent {
                    name: params.name.clone(),
                    description: params.description.clone(),
                    capabilities: params.capabilities.clone(),
                    model_config: params.model_config.clone(),
                    access_level: params.access_level,
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
                .accounts(pod_protocol::accounts::UpdateAgent {
                    agent: *agent_address,
                    owner: owner.pubkey(),
                })
                .args(pod_protocol::instruction::UpdateAgent {
                    description: params.description,
                    capabilities: params.capabilities,
                    model_config: params.model_config,
                    access_level: params.access_level,
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
            
            // Build instruction
            let ix = program
                .request()
                .accounts(pod_protocol::accounts::ActivateAgent {
                    agent: *agent_address,
                    owner: owner.pubkey(),
                })
                .args(pod_protocol::instruction::ActivateAgent {})
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
            
            // Build instruction
            let ix = program
                .request()
                .accounts(pod_protocol::accounts::DeactivateAgent {
                    agent: *agent_address,
                    owner: owner.pubkey(),
                })
                .args(pod_protocol::instruction::DeactivateAgent {})
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
            
            // Build instruction
            let ix = program
                .request()
                .accounts(pod_protocol::accounts::DeleteAgent {
                    agent: *agent_address,
                    owner: owner.pubkey(),
                })
                .args(pod_protocol::instruction::DeleteAgent {})
                .signer(owner);

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
            
            // TODO: Implement message counting and other statistics
            let stats = AgentStats {
                total_channels: channels.len() as u64,
                active_channels: channels.iter().filter(|(_, ch)| ch.is_active).count() as u64,
                total_messages: 0, // TODO: Implement
                last_activity: agent_account.updated_at,
                reputation_score: agent_account.reputation_score,
                uptime_percentage: 100.0, // TODO: Calculate based on activity
            };
            
            Ok(stats)
        }).await
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
        // TODO: Add specific validations if needed
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