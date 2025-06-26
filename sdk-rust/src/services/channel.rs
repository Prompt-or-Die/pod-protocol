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

use crate::{Config, PodError, MessageType};
use super::{BaseService, ServiceContext, TransactionResult, account_utils};

/// Channel types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ChannelType {
    Public,
    Private,
    Moderated,
    Broadcast,
}

/// Channel member role
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum MemberRole {
    Owner,
    Admin,
    Moderator,
    Member,
    ReadOnly,
}

/// Channel member information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelMember {
    pub agent_pda: Pubkey,
    pub role: MemberRole,
    pub joined_at: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
    pub message_count: u64,
    pub is_muted: bool,
    pub permissions: ChannelPermissions,
}

/// Channel permissions bitmask
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelPermissions {
    pub can_send_messages: bool,
    pub can_invite_members: bool,
    pub can_kick_members: bool,
    pub can_moderate: bool,
    pub can_change_settings: bool,
}

impl ChannelPermissions {
    pub fn default_for_role(role: &MemberRole) -> Self {
        match role {
            MemberRole::Owner => Self {
                can_send_messages: true,
                can_invite_members: true,
                can_kick_members: true,
                can_moderate: true,
                can_change_settings: true,
            },
            MemberRole::Admin => Self {
                can_send_messages: true,
                can_invite_members: true,
                can_kick_members: true,
                can_moderate: true,
                can_change_settings: false,
            },
            MemberRole::Moderator => Self {
                can_send_messages: true,
                can_invite_members: false,
                can_kick_members: true,
                can_moderate: true,
                can_change_settings: false,
            },
            MemberRole::Member => Self {
                can_send_messages: true,
                can_invite_members: false,
                can_kick_members: false,
                can_moderate: false,
                can_change_settings: false,
            },
            MemberRole::ReadOnly => Self {
                can_send_messages: false,
                can_invite_members: false,
                can_kick_members: false,
                can_moderate: false,
                can_change_settings: false,
            },
        }
    }
}

/// Channel settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelSettings {
    pub is_public: bool,
    pub require_approval: bool,
    pub allow_external_invites: bool,
    pub message_retention_days: Option<u32>,
    pub max_members: Option<u32>,
    pub rate_limit_per_minute: Option<u32>,
}

impl Default for ChannelSettings {
    fn default() -> Self {
        Self {
            is_public: true,
            require_approval: false,
            allow_external_invites: true,
            message_retention_days: Some(30),
            max_members: Some(1000),
            rate_limit_per_minute: Some(60),
        }
    }
}

/// Channel information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub channel_type: ChannelType,
    pub owner: Pubkey,
    pub pda: Pubkey,
    pub settings: ChannelSettings,
    pub member_count: u64,
    pub message_count: u64,
    pub created_at: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
    pub metadata: HashMap<String, String>,
}

/// Channel creation data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelCreationData {
    pub name: String,
    pub description: String,
    pub channel_type: ChannelType,
    pub settings: ChannelSettings,
    pub initial_members: Vec<Pubkey>,
    pub metadata: HashMap<String, String>,
}

impl ChannelCreationData {
    pub fn new(name: String, description: String, channel_type: ChannelType) -> Self {
        Self {
            name,
            description,
            channel_type,
            settings: ChannelSettings::default(),
            initial_members: Vec::new(),
            metadata: HashMap::new(),
        }
    }

    pub fn with_settings(mut self, settings: ChannelSettings) -> Self {
        self.settings = settings;
        self
    }

    pub fn with_initial_members(mut self, members: Vec<Pubkey>) -> Self {
        self.initial_members = members;
        self
    }

    pub fn with_metadata(mut self, metadata: HashMap<String, String>) -> Self {
        self.metadata = metadata;
        self
    }
}

/// Channel message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelMessage {
    pub id: String,
    pub channel_id: String,
    pub sender: Pubkey,
    pub content: Vec<u8>,
    pub message_type: MessageType,
    pub timestamp: DateTime<Utc>,
    pub reply_to: Option<String>,
    pub edited_at: Option<DateTime<Utc>>,
    pub is_pinned: bool,
}

/// Channel service for group communication
pub struct ChannelService {
    context: Option<ServiceContext>,
}

impl ChannelService {
    pub fn new() -> Self {
        Self { context: None }
    }

    /// Create a new channel
    pub async fn create_channel(
        &self,
        creation_data: ChannelCreationData,
    ) -> Result<(TransactionResult, String), PodError> {
        let context = self.get_context()?;
        
        if !context.has_wallet() {
            return Err(PodError::InvalidConfig("Wallet required for channel creation".to_string()));
        }

        let owner = context.wallet_pubkey().unwrap();
        
        // Generate channel ID
        let channel_id = self.generate_channel_id(&creation_data.name, &owner);
        
        // Derive channel PDA
        let (channel_pda, bump) = account_utils::derive_channel_pda(
            &context.config.program_id,
            &channel_id,
        )?;

        // Create channel instruction
        let instruction = self.create_channel_instruction(
            &owner,
            &channel_pda,
            bump,
            &channel_id,
            &creation_data,
        )?;

        // Send transaction
        let result = self.send_transaction(&context, vec![instruction]).await?;
        
        tracing::info!("Channel '{}' created with ID: {}", creation_data.name, channel_id);

        Ok((result, channel_id))
    }

    /// Join a channel
    pub async fn join_channel(&self, channel_id: &str) -> Result<TransactionResult, PodError> {
        let context = self.get_context()?;
        
        if !context.has_wallet() {
            return Err(PodError::InvalidConfig("Wallet required to join channel".to_string()));
        }

        let member = context.wallet_pubkey().unwrap();
        
        // Get channel info to check if it exists and is joinable
        let channel_info = self.get_channel(channel_id).await?;
        
        // Check if approval is required
        if channel_info.settings.require_approval {
            return self.request_channel_access(channel_id).await;
        }

        // Create join instruction
        let instruction = self.create_join_instruction(&member, channel_id)?;

        // Send transaction
        let result = self.send_transaction(&context, vec![instruction]).await?;
        
        tracing::info!("Joined channel: {}", channel_id);

        Ok(result)
    }

    /// Leave a channel
    pub async fn leave_channel(&self, channel_id: &str) -> Result<TransactionResult, PodError> {
        let context = self.get_context()?;
        
        if !context.has_wallet() {
            return Err(PodError::InvalidConfig("Wallet required to leave channel".to_string()));
        }

        let member = context.wallet_pubkey().unwrap();
        
        // Create leave instruction
        let instruction = self.create_leave_instruction(&member, channel_id)?;

        // Send transaction
        let result = self.send_transaction(&context, vec![instruction]).await?;
        
        tracing::info!("Left channel: {}", channel_id);

        Ok(result)
    }

    /// Send a message to a channel
    pub async fn send_channel_message(
        &self,
        channel_id: &str,
        content: Vec<u8>,
        message_type: MessageType,
        reply_to: Option<String>,
    ) -> Result<TransactionResult, PodError> {
        let context = self.get_context()?;
        
        if !context.has_wallet() {
            return Err(PodError::InvalidConfig("Wallet required to send channel message".to_string()));
        }

        let sender = context.wallet_pubkey().unwrap();
        
        // Check if user is a member and has permission to send messages
        let member_info = self.get_channel_member(channel_id, &sender).await?;
        if !member_info.permissions.can_send_messages {
            return Err(PodError::InvalidConfig("No permission to send messages in this channel".to_string()));
        }

        // Generate message ID
        let message_id = self.generate_message_id(channel_id, &sender, &content);

        // Create send message instruction
        let instruction = self.create_send_message_instruction(
            &sender,
            channel_id,
            &message_id,
            &content,
            &message_type,
            reply_to.as_deref(),
        )?;

        // Send transaction
        let result = self.send_transaction(&context, vec![instruction]).await?;
        
        tracing::info!("Message sent to channel {}: {}", channel_id, message_id);

        Ok(result)
    }

    /// Get channel information
    pub async fn get_channel(&self, channel_id: &str) -> Result<ChannelInfo, PodError> {
        let context = self.get_context()?;
        
        let (channel_pda, _) = account_utils::derive_channel_pda(
            &context.config.program_id,
            channel_id,
        )?;

        // Fetch account data from Solana
        let account_data = context.rpc_client
            .get_account(&channel_pda)
            .map_err(|e| PodError::Solana(format!("Failed to fetch channel account: {}", e)))?;

        // Deserialize channel data
        self.deserialize_channel_data(&account_data.data, channel_id, &channel_pda)
    }

    /// Get channel members
    pub async fn get_channel_members(
        &self,
        channel_id: &str,
        limit: Option<usize>,
        offset: Option<usize>,
    ) -> Result<Vec<ChannelMember>, PodError> {
        let context = self.get_context()?;
        
        // This would use getProgramAccounts to fetch all members for this channel
        tracing::info!(
            "Getting members for channel {} with limit: {:?}, offset: {:?}",
            channel_id,
            limit,
            offset
        );
        
        Ok(vec![])
    }

    /// Get specific channel member info
    pub async fn get_channel_member(
        &self,
        channel_id: &str,
        member: &Pubkey,
    ) -> Result<ChannelMember, PodError> {
        // This would fetch the specific member account
        Ok(ChannelMember {
            agent_pda: *member,
            role: MemberRole::Member,
            joined_at: Utc::now(),
            last_activity: Utc::now(),
            message_count: 0,
            is_muted: false,
            permissions: ChannelPermissions::default_for_role(&MemberRole::Member),
        })
    }

    /// Get channel messages
    pub async fn get_channel_messages(
        &self,
        channel_id: &str,
        limit: Option<usize>,
        offset: Option<usize>,
        before_timestamp: Option<DateTime<Utc>>,
    ) -> Result<Vec<ChannelMessage>, PodError> {
        let context = self.get_context()?;
        
        tracing::info!(
            "Getting messages for channel {} with limit: {:?}, offset: {:?}",
            channel_id,
            limit,
            offset
        );
        
        Ok(vec![])
    }

    /// List channels (public channels or channels the user is a member of)
    pub async fn list_channels(
        &self,
        channel_type: Option<ChannelType>,
        limit: Option<usize>,
        offset: Option<usize>,
    ) -> Result<Vec<ChannelInfo>, PodError> {
        let context = self.get_context()?;
        
        tracing::info!(
            "Listing channels of type: {:?} with limit: {:?}, offset: {:?}",
            channel_type,
            limit,
            offset
        );
        
        Ok(vec![])
    }

    /// Update channel settings (admin/owner only)
    pub async fn update_channel_settings(
        &self,
        channel_id: &str,
        settings: ChannelSettings,
    ) -> Result<TransactionResult, PodError> {
        let context = self.get_context()?;
        
        if !context.has_wallet() {
            return Err(PodError::InvalidConfig("Wallet required to update channel settings".to_string()));
        }

        let updater = context.wallet_pubkey().unwrap();
        
        // Check if user has permission to change settings
        let member_info = self.get_channel_member(channel_id, &updater).await?;
        if !member_info.permissions.can_change_settings {
            return Err(PodError::InvalidConfig("No permission to change channel settings".to_string()));
        }

        // Create update settings instruction
        let instruction = self.create_update_settings_instruction(&updater, channel_id, &settings)?;

        // Send transaction
        self.send_transaction(&context, vec![instruction]).await
    }

    /// Invite a member to the channel
    pub async fn invite_member(
        &self,
        channel_id: &str,
        member_to_invite: &Pubkey,
        role: MemberRole,
    ) -> Result<TransactionResult, PodError> {
        let context = self.get_context()?;
        
        if !context.has_wallet() {
            return Err(PodError::InvalidConfig("Wallet required to invite member".to_string()));
        }

        let inviter = context.wallet_pubkey().unwrap();
        
        // Check if user has permission to invite members
        let inviter_info = self.get_channel_member(channel_id, &inviter).await?;
        if !inviter_info.permissions.can_invite_members {
            return Err(PodError::InvalidConfig("No permission to invite members".to_string()));
        }

        // Create invite instruction
        let instruction = self.create_invite_instruction(&inviter, channel_id, member_to_invite, &role)?;

        // Send transaction
        self.send_transaction(&context, vec![instruction]).await
    }

    /// Remove/kick a member from the channel
    pub async fn kick_member(
        &self,
        channel_id: &str,
        member_to_kick: &Pubkey,
    ) -> Result<TransactionResult, PodError> {
        let context = self.get_context()?;
        
        if !context.has_wallet() {
            return Err(PodError::InvalidConfig("Wallet required to kick member".to_string()));
        }

        let kicker = context.wallet_pubkey().unwrap();
        
        // Check if user has permission to kick members
        let kicker_info = self.get_channel_member(channel_id, &kicker).await?;
        if !kicker_info.permissions.can_kick_members {
            return Err(PodError::InvalidConfig("No permission to kick members".to_string()));
        }

        // Create kick instruction
        let instruction = self.create_kick_instruction(&kicker, channel_id, member_to_kick)?;

        // Send transaction
        self.send_transaction(&context, vec![instruction]).await
    }

    // Private helper methods

    fn get_context(&self) -> Result<&ServiceContext, PodError> {
        self.context.as_ref()
            .ok_or_else(|| PodError::InvalidConfig("Service not initialized".to_string()))
    }

    fn generate_channel_id(&self, name: &str, owner: &Pubkey) -> String {
        use blake3::Hasher;
        
        let mut hasher = Hasher::new();
        hasher.update(name.as_bytes());
        hasher.update(owner.as_ref());
        hasher.update(&chrono::Utc::now().timestamp().to_le_bytes());
        
        format!("ch_{}", hex::encode(&hasher.finalize().as_bytes()[..16]))
    }

    fn generate_message_id(&self, channel_id: &str, sender: &Pubkey, content: &[u8]) -> String {
        use blake3::Hasher;
        
        let mut hasher = Hasher::new();
        hasher.update(channel_id.as_bytes());
        hasher.update(sender.as_ref());
        hasher.update(content);
        hasher.update(&chrono::Utc::now().timestamp().to_le_bytes());
        hasher.update(&rand::random::<u64>().to_le_bytes());
        
        format!("chmsg_{}", hex::encode(&hasher.finalize().as_bytes()[..16]))
    }

    async fn request_channel_access(&self, channel_id: &str) -> Result<TransactionResult, PodError> {
        // This would create a request for channel access that admins can approve
        let context = self.get_context()?;
        let member = context.wallet_pubkey().unwrap();
        
        tracing::info!("Requesting access to channel: {}", channel_id);
        
        // Placeholder implementation
        Ok(TransactionResult::new(Signature::default()))
    }

    fn create_channel_instruction(
        &self,
        owner: &Pubkey,
        channel_pda: &Pubkey,
        bump: u8,
        channel_id: &str,
        creation_data: &ChannelCreationData,
    ) -> Result<Instruction, PodError> {
        let context = self.get_context()?;
        
        // Placeholder instruction for channel creation
        Ok(system_instruction::create_account(
            owner,
            channel_pda,
            1000000, // Minimum rent-exempt amount
            512,     // Account data size
            &context.config.program_id,
        ))
    }

    fn create_join_instruction(&self, member: &Pubkey, channel_id: &str) -> Result<Instruction, PodError> {
        // Placeholder instruction for joining channel
        Ok(system_instruction::transfer(member, member, 0))
    }

    fn create_leave_instruction(&self, member: &Pubkey, channel_id: &str) -> Result<Instruction, PodError> {
        // Placeholder instruction for leaving channel
        Ok(system_instruction::transfer(member, member, 0))
    }

    fn create_send_message_instruction(
        &self,
        sender: &Pubkey,
        channel_id: &str,
        message_id: &str,
        content: &[u8],
        message_type: &MessageType,
        reply_to: Option<&str>,
    ) -> Result<Instruction, PodError> {
        // Placeholder instruction for sending channel message
        Ok(system_instruction::transfer(sender, sender, 0))
    }

    fn create_update_settings_instruction(
        &self,
        updater: &Pubkey,
        channel_id: &str,
        settings: &ChannelSettings,
    ) -> Result<Instruction, PodError> {
        // Placeholder instruction for updating channel settings
        Ok(system_instruction::transfer(updater, updater, 0))
    }

    fn create_invite_instruction(
        &self,
        inviter: &Pubkey,
        channel_id: &str,
        member_to_invite: &Pubkey,
        role: &MemberRole,
    ) -> Result<Instruction, PodError> {
        // Placeholder instruction for inviting member
        Ok(system_instruction::transfer(inviter, inviter, 0))
    }

    fn create_kick_instruction(
        &self,
        kicker: &Pubkey,
        channel_id: &str,
        member_to_kick: &Pubkey,
    ) -> Result<Instruction, PodError> {
        // Placeholder instruction for kicking member
        Ok(system_instruction::transfer(kicker, kicker, 0))
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

    fn deserialize_channel_data(
        &self,
        data: &[u8],
        channel_id: &str,
        channel_pda: &Pubkey,
    ) -> Result<ChannelInfo, PodError> {
        // This would deserialize the actual on-chain channel data
        // For now, return a placeholder
        Ok(ChannelInfo {
            id: channel_id.to_string(),
            name: "Channel".to_string(),
            description: "A channel".to_string(),
            channel_type: ChannelType::Public,
            owner: Pubkey::new_unique(),
            pda: *channel_pda,
            settings: ChannelSettings::default(),
            member_count: 0,
            message_count: 0,
            created_at: Utc::now(),
            last_activity: Utc::now(),
            metadata: HashMap::new(),
        })
    }
}

#[async_trait]
impl BaseService for ChannelService {
    async fn initialize(&mut self, config: &Config, rpc_client: Arc<RpcClient>) -> Result<(), PodError> {
        self.context = Some(ServiceContext::new(config.clone(), rpc_client));
        tracing::info!("ChannelService initialized");
        Ok(())
    }

    fn service_name(&self) -> &'static str {
        "ChannelService"
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

impl Default for ChannelService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_channel_permissions() {
        let owner_perms = ChannelPermissions::default_for_role(&MemberRole::Owner);
        assert!(owner_perms.can_send_messages);
        assert!(owner_perms.can_change_settings);

        let member_perms = ChannelPermissions::default_for_role(&MemberRole::Member);
        assert!(member_perms.can_send_messages);
        assert!(!member_perms.can_change_settings);

        let readonly_perms = ChannelPermissions::default_for_role(&MemberRole::ReadOnly);
        assert!(!readonly_perms.can_send_messages);
    }

    #[test]
    fn test_channel_creation_data() {
        let mut metadata = HashMap::new();
        metadata.insert("category".to_string(), "general".to_string());

        let data = ChannelCreationData::new(
            "Test Channel".to_string(),
            "A test channel".to_string(),
            ChannelType::Public,
        ).with_metadata(metadata.clone());

        assert_eq!(data.name, "Test Channel");
        assert_eq!(data.channel_type, ChannelType::Public);
        assert_eq!(data.metadata.get("category"), Some(&"general".to_string()));
    }

    #[tokio::test]
    async fn test_channel_service_creation() {
        let service = ChannelService::new();
        assert_eq!(service.service_name(), "ChannelService");
    }
}