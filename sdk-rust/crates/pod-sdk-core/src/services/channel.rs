//! # Channel Service
//!
//! Service for managing communication channels on the PoD Protocol.
//! Provides functionality for creating, managing, and securing agent-to-agent communication channels.

use std::sync::Arc;
use std::collections::HashSet;

use anchor_client::Program;
use rand::{distributions::Alphanumeric, Rng};
use async_trait::async_trait;
use solana_sdk::{
    pubkey::Pubkey,
    signer::{keypair::Keypair, Signer},
};

use pod_sdk_types::{
    ChannelAccount, AgentAccount, MessageAccount,
    CreateChannelRequest, ChannelVisibility,
};

use crate::{
    error::{PodComError, Result},
    services::base::{BaseService, ServiceBase, ServiceConfig, ServiceHealth, ServiceMetrics},
    utils::{
        account::{derive_channel_pda, validate_channel_account},
        encryption::{generate_channel_key, derive_shared_key},
    },
};

/// Service for managing communication channels
#[derive(Debug)]
pub struct ChannelService {
    base: ServiceBase,
}

impl ChannelService {
    /// Create a new channel service
    pub fn new(config: ServiceConfig) -> Self {
        Self {
            base: ServiceBase::new(config),
        }
    }

    /// Create a new communication channel
    pub async fn create_channel(
        &self,
        creator: &Keypair,
        params: CreateChannelParams,
    ) -> Result<(Pubkey, ChannelAccount)> {
        let operation_name = "create_channel";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            // Validate participants
            if params.participants.is_empty() {
                return Err(PodComError::InvalidChannelParticipants {
                    reason: "Channel must have at least one participant".to_string(),
                });
            }
            
            if params.participants.len() > MAX_CHANNEL_PARTICIPANTS {
                return Err(PodComError::InvalidChannelParticipants {
                    reason: format!("Channel cannot have more than {} participants", MAX_CHANNEL_PARTICIPANTS),
                });
            }
            
            // Verify all participants are valid agents
            for participant in &params.participants {
                let _agent_account = program.account::<AgentAccount>(*participant)?;
            }
            
            // Generate channel ID and derive PDA
            let channel_id: String = rand::thread_rng()
                .sample_iter(&rand::distributions::Alphanumeric)
                .take(32)
                .map(char::from)
                .collect();
            let (channel_pda, _bump) = derive_channel_pda(&creator.pubkey(), &channel_id)?;
            
            // Generate encryption key for the channel
            let encryption_key = generate_channel_key(&params.participants)?;
            
            // Build instruction
            let ix = program
                .request()
                .accounts(pod_com::accounts::CreateChannel {
                    channel_account: channel_pda,
                    creator: creator.pubkey(),
                    system_program: solana_sdk::system_program::id(),
                })
                .args(pod_com::instruction::CreateChannel {
                    name: params.name.clone(),
                    description: params.description.clone(),
                    visibility: pod_com::ChannelVisibility::Private, // Default to private
                    max_participants: params.participants.len() as u32,
                    fee_per_message: 0, // Default to no fee
                })
                .signer(creator);

            // Send transaction
            let signature = ix.send()?;
            
            // Fetch created channel account
            let channel_account = self.get_channel_account(&channel_pda).await?;
            
            tracing::info!(
                channel_address = %channel_pda,
                signature = %signature,
                creator = %creator.pubkey(),
                channel_id = %channel_id,
                participants_count = params.participants.len(),
                "Channel created successfully"
            );

            Ok((channel_pda, channel_account))
        }).await
    }

    /// Get channel account data
    pub async fn get_channel_account(&self, channel_address: &Pubkey) -> Result<ChannelAccount> {
        let operation_name = "get_channel_account";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            let account_data = program.account::<ChannelAccount>(*channel_address)?;
            validate_channel_account(&account_data)?;
            
            Ok(account_data)
        }).await
    }

    /// Add participant to channel
    pub async fn add_participant(
        &self,
        channel_address: &Pubkey,
        admin: &Keypair,
        new_participant: &Pubkey,
    ) -> Result<ChannelAccount> {
        let operation_name = "add_participant";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            let channel_account = self.get_channel_account(channel_address).await?;
            
            // Verify admin privileges
            if !self.is_channel_admin(&channel_account, &admin.pubkey()) {
                return Err(PodComError::UnauthorizedAccess {
                    resource: "channel".to_string(),
                    action: "add_participant".to_string(),
                });
            }
            
            // Check if participant already exists
            if channel_account.participants.contains(new_participant) {
                return Err(PodComError::ParticipantAlreadyExists {
                    channel_address: *channel_address,
                    participant: *new_participant,
                });
            }
            
            // Verify participant is a valid agent
            let _agent_account = program.account::<AgentAccount>(*new_participant)?;
            
            // Check participant limit
            if channel_account.participants.len() >= MAX_CHANNEL_PARTICIPANTS {
                return Err(PodComError::ChannelParticipantLimitReached {
                    channel_address: *channel_address,
                    participant_limit: MAX_CHANNEL_PARTICIPANTS,
                });
            }
            
            // Build instruction - Note: pod-com doesn't have add_participant, this would need custom implementation
            // For now, we'll return an error indicating this feature needs implementation
            return Err(PodComError::NotImplemented {
                feature: "add_participant".to_string(),
            });

            // Send transaction
            let signature = ix.send()?;
            
            // Fetch updated channel account
            let updated_account = self.get_channel_account(channel_address).await?;
            
            tracing::info!(
                channel_address = %channel_address,
                signature = %signature,
                admin = %admin.pubkey(),
                new_participant = %new_participant,
                "Participant added to channel successfully"
            );

            Ok(updated_account)
        }).await
    }

    /// Remove participant from channel
    pub async fn remove_participant(
        &self,
        channel_address: &Pubkey,
        admin: &Keypair,
        participant_to_remove: &Pubkey,
    ) -> Result<ChannelAccount> {
        let operation_name = "remove_participant";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            let channel_account = self.get_channel_account(channel_address).await?;
            
            // Verify admin privileges
            if !self.is_channel_admin(&channel_account, &admin.pubkey()) {
                return Err(PodComError::UnauthorizedAccess {
                    resource: "channel".to_string(),
                    action: "remove_participant".to_string(),
                });
            }
            
            // Check if participant exists
            if !channel_account.participants.contains(participant_to_remove) {
                return Err(PodComError::ParticipantNotFound {
                    channel_address: *channel_address,
                    participant: *participant_to_remove,
                });
            }
            
            // Prevent removing the last participant
            if channel_account.participants.len() <= 1 {
                return Err(PodComError::CannotRemoveLastParticipant {
                    channel_address: *channel_address,
                });
            }
            
            // Build instruction - Note: pod-com doesn't have remove_participant, this would need custom implementation
            // For now, we'll return an error indicating this feature needs implementation
            return Err(PodComError::NotImplemented {
                feature: "remove_participant".to_string(),
            });

            // Send transaction
            let signature = ix.send()?;
            
            // Fetch updated channel account
            let updated_account = self.get_channel_account(channel_address).await?;
            
            tracing::info!(
                channel_address = %channel_address,
                signature = %signature,
                admin = %admin.pubkey(),
                removed_participant = %participant_to_remove,
                "Participant removed from channel successfully"
            );

            Ok(updated_account)
        }).await
    }

    /// Update channel settings
    pub async fn update_channel(
        &self,
        channel_address: &Pubkey,
        admin: &Keypair,
        params: UpdateChannelParams,
    ) -> Result<ChannelAccount> {
        let operation_name = "update_channel";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            let channel_account = self.get_channel_account(channel_address).await?;
            
            // Verify admin privileges
            if !self.is_channel_admin(&channel_account, &admin.pubkey()) {
                return Err(PodComError::UnauthorizedAccess {
                    resource: "channel".to_string(),
                    action: "update_channel".to_string(),
                });
            }
            
            // Build instruction
            let ix = program
                .request()
                .accounts(pod_com::accounts::UpdateChannel {
                    channel_account: *channel_address,
                    signer: admin.pubkey(),
                })
                .args(pod_com::instruction::UpdateChannel {
                    name: params.name,
                    description: params.description,
                    max_participants: None,
                    fee_per_message: None,
                    is_active: None,
                })
                .signer(admin);

            // Send transaction
            let signature = ix.send()?;
            
            // Fetch updated channel account
            let updated_account = self.get_channel_account(channel_address).await?;
            
            tracing::info!(
                channel_address = %channel_address,
                signature = %signature,
                admin = %admin.pubkey(),
                "Channel updated successfully"
            );

            Ok(updated_account)
        }).await
    }

    /// Archive a channel (make it read-only)
    pub async fn archive_channel(
        &self,
        channel_address: &Pubkey,
        admin: &Keypair,
    ) -> Result<ChannelAccount> {
        let operation_name = "archive_channel";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            let channel_account = self.get_channel_account(channel_address).await?;
            
            // Verify admin privileges
            if !self.is_channel_admin(&channel_account, &admin.pubkey()) {
                return Err(PodComError::UnauthorizedAccess {
                    resource: "channel".to_string(),
                    action: "archive_channel".to_string(),
                });
            }
            
            // Build instruction - Note: pod-com doesn't have archive_channel, using update_channel instead
            let ix = program
                .request()
                .accounts(pod_com::accounts::UpdateChannel {
                    channel_account: *channel_address,
                    signer: admin.pubkey(),
                })
                .args(pod_com::instruction::UpdateChannel {
                    name: None,
                    description: None,
                    max_participants: None,
                    fee_per_message: None,
                    is_active: Some(false), // Archive by setting inactive
                })
                .signer(admin);

            // Send transaction
            let signature = ix.send()?;
            
            // Fetch updated channel account
            let updated_account = self.get_channel_account(channel_address).await?;
            
            tracing::info!(
                channel_address = %channel_address,
                signature = %signature,
                admin = %admin.pubkey(),
                "Channel archived successfully"
            );

            Ok(updated_account)
        }).await
    }

    /// Delete a channel
    pub async fn delete_channel(
        &self,
        channel_address: &Pubkey,
        creator: &Keypair,
    ) -> Result<()> {
        let operation_name = "delete_channel";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            let channel_account = self.get_channel_account(channel_address).await?;
            
            // Verify creator privileges
            if channel_account.creator != creator.pubkey() {
                return Err(PodComError::UnauthorizedAccess {
                    resource: "channel".to_string(),
                    action: "delete_channel".to_string(),
                });
            }
            
            // Check if channel has messages (optional safety check)
            // TODO: Implement message count check if needed
            
            // Build instruction - Note: pod-com doesn't have delete_channel, this would need custom implementation
            // For now, we'll return an error indicating this feature needs implementation
            return Err(PodComError::NotImplemented {
                feature: "delete_channel".to_string(),
            });

            // Send transaction
            let signature = ix.send()?;
            
            tracing::info!(
                channel_address = %channel_address,
                signature = %signature,
                creator = %creator.pubkey(),
                "Channel deleted successfully"
            );

            Ok(())
        }).await
    }

    /// List channels for a specific participant
    pub async fn list_participant_channels(
        &self,
        participant: &Pubkey,
    ) -> Result<Vec<(Pubkey, ChannelAccount)>> {
        let operation_name = "list_participant_channels";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            // Get all channel accounts
            let accounts = program
                .accounts::<ChannelAccount>(vec![
                    solana_account_decoder::UiAccountEncoding::Base64,
                ])
                .await?;
                
            let mut participant_channels = Vec::new();
            
            for (pubkey, account) in accounts {
                if account.participants.contains(participant) {
                    validate_channel_account(&account)?;
                    participant_channels.push((pubkey, account));
                }
            }
            
            // Sort by creation time (most recent first)
            participant_channels.sort_by(|a, b| b.1.created_at.cmp(&a.1.created_at));
            
            Ok(participant_channels)
        }).await
    }

    /// Get channel statistics
    pub async fn get_channel_stats(&self, channel_address: &Pubkey) -> Result<ChannelStats> {
        let operation_name = "get_channel_stats";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            let channel_account = self.get_channel_account(channel_address).await?;
            
            // Get message count for this channel
            let accounts = program
                .accounts::<MessageAccount>(vec![
                    solana_account_decoder::UiAccountEncoding::Base64,
                ])
                .await?;
                
            let mut message_count = 0u64;
            let mut last_message_at = None;
            
            for (_, message) in accounts {
                if message.channel == *channel_address {
                    message_count += 1;
                    if last_message_at.is_none() || message.created_at > last_message_at.unwrap() {
                        last_message_at = Some(message.created_at);
                    }
                }
            }
            
            let stats = ChannelStats {
                participant_count: channel_account.participants.len() as u64,
                message_count,
                last_activity: last_message_at.or(Some(channel_account.created_at)),
                is_active: channel_account.is_active,
                created_at: channel_account.created_at,
                encryption_enabled: true, // All channels are encrypted
            };
            
            Ok(stats)
        }).await
    }

    /// Check if a user has admin privileges for a channel
    fn is_channel_admin(&self, channel: &ChannelAccount, user: &Pubkey) -> bool {
        // Channel creator is always admin
        if channel.creator == *user {
            return true;
        }
        
        // Check if user is in admin list (if implemented)
        // TODO: Implement admin list if needed
        
        false
    }
}

/// Channel statistics
#[derive(Debug, Clone)]
pub struct ChannelStats {
    pub participant_count: u64,
    pub message_count: u64,
    pub last_activity: Option<chrono::DateTime<chrono::Utc>>,
    pub is_active: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub encryption_enabled: bool,
}

#[async_trait]
impl BaseService for ChannelService {
    type Error = PodComError;

    async fn initialize(&mut self, program: Program<Arc<Keypair>>) -> Result<(), Self::Error> {
        self.base.initialize(program).await?;
        Ok(())
    }

    fn program(&self) -> Result<&Program<Arc<Keypair>>, Self::Error> {
        self.base.program()
    }

    fn validate_config(&self) -> Result<(), Self::Error> {
        // Validate channel service specific configuration
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
        
        // Validate channel-specific settings
        if let Some(ref channel_config) = config.channel_config {
            if channel_config.participant_limit == 0 {
                return Err(PodComError::InvalidConfiguration {
                    field: "channel_config.participant_limit".to_string(),
                    reason: "Maximum participants must be greater than 0".to_string(),
                });
            }
            
            if channel_config.participant_limit > 10000 {
                return Err(PodComError::InvalidConfiguration {
                    field: "channel_config.participant_limit".to_string(),
                    reason: "Maximum participants cannot exceed 10,000".to_string(),
                });
            }
            
            // Validate channel name constraints
            if channel_config.max_channel_name_length == 0 {
                return Err(PodComError::InvalidConfiguration {
                    field: "channel_config.max_channel_name_length".to_string(),
                    reason: "Maximum channel name length must be greater than 0".to_string(),
                });
            }
            
            if channel_config.max_channel_name_length > 256 {
                return Err(PodComError::InvalidConfiguration {
                    field: "channel_config.max_channel_name_length".to_string(),
                    reason: "Maximum channel name length cannot exceed 256 characters".to_string(),
                });
            }
            
            // Validate message limits per channel
            if channel_config.max_messages_per_channel > 0 && channel_config.max_messages_per_channel < 100 {
                return Err(PodComError::InvalidConfiguration {
                    field: "channel_config.max_messages_per_channel".to_string(),
                    reason: "Maximum messages per channel must be at least 100 if set".to_string(),
                });
            }
            
            // Validate fees
            if channel_config.min_channel_fee > channel_config.max_channel_fee && channel_config.max_channel_fee > 0 {
                return Err(PodComError::InvalidConfiguration {
                    field: "channel_config.max_channel_fee".to_string(),
                    reason: "Maximum channel fee must be greater than or equal to minimum fee".to_string(),
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
        "channel"
    }
}

// Constants for channel management
const MAX_CHANNEL_PARTICIPANTS: usize = 100;

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::test_config;

    #[tokio::test]
    async fn test_channel_service_creation() {
        let config = test_config();
        let service = ChannelService::new(config);
        assert_eq!(service.service_name(), "channel");
        assert_eq!(service.health_check(), ServiceHealth::NotInitialized);
    }
} 