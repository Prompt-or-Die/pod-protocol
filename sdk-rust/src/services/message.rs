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
use blake3::Hasher;

use crate::{Config, PodError, Message, MessageType};
use super::{BaseService, ServiceContext, TransactionResult, account_utils};

/// Message encryption type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum MessageEncryption {
    None,
    ChaCha20Poly1305,
    AES256GCM,
}

/// Message priority levels
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum MessagePriority {
    Low,
    Normal,
    High,
    Urgent,
}

/// Message delivery status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum MessageStatus {
    Pending,
    Sent,
    Delivered,
    Read,
    Failed,
    Expired,
}

/// Extended message information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageInfo {
    pub message: Message,
    pub pda: Pubkey,
    pub status: MessageStatus,
    pub priority: MessagePriority,
    pub encryption: MessageEncryption,
    pub hash: String,
    pub size_bytes: u64,
    pub expiry_time: Option<DateTime<Utc>>,
    pub delivery_attempts: u32,
    pub created_slot: u64,
    pub delivered_slot: Option<u64>,
}

/// Message sending options
#[derive(Debug, Clone)]
pub struct MessageOptions {
    pub priority: MessagePriority,
    pub encryption: MessageEncryption,
    pub expiry_hours: Option<u32>,
    pub require_confirmation: bool,
    pub retry_attempts: u32,
}

impl Default for MessageOptions {
    fn default() -> Self {
        Self {
            priority: MessagePriority::Normal,
            encryption: MessageEncryption::ChaCha20Poly1305,
            expiry_hours: Some(168), // 7 days
            require_confirmation: false,
            retry_attempts: 3,
        }
    }
}

/// Message filter for querying
#[derive(Debug, Clone)]
pub struct MessageFilter {
    pub from: Option<Pubkey>,
    pub to: Option<Pubkey>,
    pub message_type: Option<MessageType>,
    pub status: Option<MessageStatus>,
    pub priority: Option<MessagePriority>,
    pub after_time: Option<DateTime<Utc>>,
    pub before_time: Option<DateTime<Utc>>,
}

impl MessageFilter {
    pub fn new() -> Self {
        Self {
            from: None,
            to: None,
            message_type: None,
            status: None,
            priority: None,
            after_time: None,
            before_time: None,
        }
    }

    pub fn from(mut self, from: Pubkey) -> Self {
        self.from = Some(from);
        self
    }

    pub fn to(mut self, to: Pubkey) -> Self {
        self.to = Some(to);
        self
    }

    pub fn message_type(mut self, msg_type: MessageType) -> Self {
        self.message_type = Some(msg_type);
        self
    }

    pub fn status(mut self, status: MessageStatus) -> Self {
        self.status = Some(status);
        self
    }
}

/// Message service for P2P communication between agents
pub struct MessageService {
    context: Option<ServiceContext>,
}

impl MessageService {
    pub fn new() -> Self {
        Self { context: None }
    }

    /// Send a message to another agent
    pub async fn send_message(
        &self,
        to: &Pubkey,
        content: Vec<u8>,
        message_type: MessageType,
        options: Option<MessageOptions>,
    ) -> Result<TransactionResult, PodError> {
        let context = self.get_context()?;
        
        if !context.has_wallet() {
            return Err(PodError::InvalidConfig("Wallet required for sending messages".to_string()));
        }

        let from = context.wallet_pubkey().unwrap();
        let options = options.unwrap_or_default();
        
        // Generate message ID
        let message_id = self.generate_message_id(&from, to, &content);
        
        // Derive message PDA
        let (message_pda, bump) = account_utils::derive_message_pda(
            &context.config.program_id,
            &from,
            to,
            &message_id,
        )?;

        // Encrypt content if required
        let encrypted_content = self.encrypt_content(&content, &options.encryption)?;

        // Create send instruction
        let instruction = self.create_send_instruction(
            &from,
            to,
            &message_pda,
            bump,
            &message_id,
            &encrypted_content,
            &message_type,
            &options,
        )?;

        // Send transaction
        let result = self.send_transaction(&context, vec![instruction]).await?;
        
        tracing::info!(
            "Message sent from {} to {} with ID: {}",
            from,
            to,
            message_id
        );

        Ok(result)
    }

    /// Send a broadcast message to multiple recipients
    pub async fn broadcast_message(
        &self,
        recipients: &[Pubkey],
        content: Vec<u8>,
        message_type: MessageType,
        options: Option<MessageOptions>,
    ) -> Result<Vec<TransactionResult>, PodError> {
        let mut results = Vec::new();

        for recipient in recipients {
            match self.send_message(recipient, content.clone(), message_type.clone(), options.clone()).await {
                Ok(result) => results.push(result),
                Err(e) => {
                    tracing::error!("Failed to send message to {}: {}", recipient, e);
                    // Continue with other recipients
                }
            }
        }

        if results.is_empty() {
            return Err(PodError::Network(
                "Failed to send message to any recipient".to_string()
            ));
        }

        Ok(results)
    }

    /// Reply to a message
    pub async fn reply_to_message(
        &self,
        original_message_id: &str,
        content: Vec<u8>,
        options: Option<MessageOptions>,
    ) -> Result<TransactionResult, PodError> {
        // Get original message to determine recipient
        let original_message = self.get_message(original_message_id).await?;
        
        // Reply to the sender of the original message
        self.send_message(
            &Pubkey::try_from(original_message.message.from.as_str())
                .map_err(|e| PodError::InvalidConfig(format!("Invalid sender pubkey: {}", e)))?,
            content,
            MessageType::Direct,
            options,
        ).await
    }

    /// Get a specific message by ID
    pub async fn get_message(&self, message_id: &str) -> Result<MessageInfo, PodError> {
        let context = self.get_context()?;
        
        // This would typically derive the PDA and fetch from Solana
        // For now, return a placeholder
        tracing::info!("Getting message: {}", message_id);
        
        Err(PodError::AgentNotFound(format!("Message not found: {}", message_id)))
    }

    /// Get messages for the current wallet (inbox)
    pub async fn get_inbox(
        &self,
        filter: Option<MessageFilter>,
        limit: Option<usize>,
        offset: Option<usize>,
    ) -> Result<Vec<MessageInfo>, PodError> {
        let context = self.get_context()?;
        
        if !context.has_wallet() {
            return Err(PodError::InvalidConfig("Wallet required to get inbox".to_string()));
        }

        let wallet_pubkey = context.wallet_pubkey().unwrap();
        
        // This would use getProgramAccounts to fetch all messages for this wallet
        tracing::info!(
            "Getting inbox for {} with limit: {:?}, offset: {:?}",
            wallet_pubkey,
            limit,
            offset
        );
        
        Ok(vec![])
    }

    /// Get sent messages for the current wallet (outbox)
    pub async fn get_outbox(
        &self,
        filter: Option<MessageFilter>,
        limit: Option<usize>,
        offset: Option<usize>,
    ) -> Result<Vec<MessageInfo>, PodError> {
        let context = self.get_context()?;
        
        if !context.has_wallet() {
            return Err(PodError::InvalidConfig("Wallet required to get outbox".to_string()));
        }

        let wallet_pubkey = context.wallet_pubkey().unwrap();
        
        tracing::info!(
            "Getting outbox for {} with limit: {:?}, offset: {:?}",
            wallet_pubkey,
            limit,
            offset
        );
        
        Ok(vec![])
    }

    /// Mark a message as read
    pub async fn mark_as_read(&self, message_id: &str) -> Result<TransactionResult, PodError> {
        let context = self.get_context()?;
        
        if !context.has_wallet() {
            return Err(PodError::InvalidConfig("Wallet required to mark message as read".to_string()));
        }

        // Create mark-as-read instruction
        let instruction = self.create_mark_read_instruction(message_id)?;
        
        // Send transaction
        self.send_transaction(&context, vec![instruction]).await
    }

    /// Delete a message
    pub async fn delete_message(&self, message_id: &str) -> Result<TransactionResult, PodError> {
        let context = self.get_context()?;
        
        if !context.has_wallet() {
            return Err(PodError::InvalidConfig("Wallet required to delete message".to_string()));
        }

        // Create delete instruction
        let instruction = self.create_delete_instruction(message_id)?;
        
        // Send transaction
        self.send_transaction(&context, vec![instruction]).await
    }

    /// Get message statistics for the current wallet
    pub async fn get_message_stats(&self) -> Result<MessageStats, PodError> {
        let context = self.get_context()?;
        
        if !context.has_wallet() {
            return Err(PodError::InvalidConfig("Wallet required to get message stats".to_string()));
        }

        // This would aggregate statistics from all messages
        Ok(MessageStats {
            total_sent: 0,
            total_received: 0,
            unread_count: 0,
            failed_count: 0,
            storage_used_bytes: 0,
        })
    }

    // Private helper methods

    fn get_context(&self) -> Result<&ServiceContext, PodError> {
        self.context.as_ref()
            .ok_or_else(|| PodError::InvalidConfig("Service not initialized".to_string()))
    }

    fn generate_message_id(&self, from: &Pubkey, to: &Pubkey, content: &[u8]) -> String {
        let mut hasher = Hasher::new();
        hasher.update(from.as_ref());
        hasher.update(to.as_ref());
        hasher.update(content);
        hasher.update(&chrono::Utc::now().timestamp().to_le_bytes());
        hasher.update(&rand::random::<u64>().to_le_bytes());
        
        format!("msg_{}", hex::encode(&hasher.finalize().as_bytes()[..16]))
    }

    fn encrypt_content(&self, content: &[u8], encryption: &MessageEncryption) -> Result<Vec<u8>, PodError> {
        match encryption {
            MessageEncryption::None => Ok(content.to_vec()),
            MessageEncryption::ChaCha20Poly1305 => {
                // TODO: Implement ChaCha20Poly1305 encryption
                tracing::warn!("ChaCha20Poly1305 encryption not yet implemented, returning plaintext");
                Ok(content.to_vec())
            }
            MessageEncryption::AES256GCM => {
                // TODO: Implement AES256GCM encryption
                tracing::warn!("AES256GCM encryption not yet implemented, returning plaintext");
                Ok(content.to_vec())
            }
        }
    }

    fn create_send_instruction(
        &self,
        from: &Pubkey,
        to: &Pubkey,
        message_pda: &Pubkey,
        bump: u8,
        message_id: &str,
        content: &[u8],
        message_type: &MessageType,
        options: &MessageOptions,
    ) -> Result<Instruction, PodError> {
        let context = self.get_context()?;
        
        // This would create the actual instruction for the PoD Protocol program
        // For now, return a placeholder system instruction
        Ok(system_instruction::create_account(
            from,
            message_pda,
            1000000, // Minimum rent-exempt amount
            1024 + content.len(), // Account data size
            &context.config.program_id,
        ))
    }

    fn create_mark_read_instruction(&self, message_id: &str) -> Result<Instruction, PodError> {
        let context = self.get_context()?;
        let wallet_pubkey = context.wallet_pubkey().unwrap();
        
        // Placeholder instruction for marking message as read
        Ok(system_instruction::transfer(&wallet_pubkey, &wallet_pubkey, 0))
    }

    fn create_delete_instruction(&self, message_id: &str) -> Result<Instruction, PodError> {
        let context = self.get_context()?;
        let wallet_pubkey = context.wallet_pubkey().unwrap();
        
        // Placeholder instruction for deleting message
        Ok(system_instruction::transfer(&wallet_pubkey, &wallet_pubkey, 0))
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
}

/// Message statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageStats {
    pub total_sent: u64,
    pub total_received: u64,
    pub unread_count: u64,
    pub failed_count: u64,
    pub storage_used_bytes: u64,
}

#[async_trait]
impl BaseService for MessageService {
    async fn initialize(&mut self, config: &Config, rpc_client: Arc<RpcClient>) -> Result<(), PodError> {
        self.context = Some(ServiceContext::new(config.clone(), rpc_client));
        tracing::info!("MessageService initialized");
        Ok(())
    }

    fn service_name(&self) -> &'static str {
        "MessageService"
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

impl Default for MessageService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_message_options_default() {
        let options = MessageOptions::default();
        assert_eq!(options.priority, MessagePriority::Normal);
        assert_eq!(options.encryption, MessageEncryption::ChaCha20Poly1305);
        assert_eq!(options.expiry_hours, Some(168));
        assert!(!options.require_confirmation);
        assert_eq!(options.retry_attempts, 3);
    }

    #[test]
    fn test_message_filter_builder() {
        let from_key = Pubkey::new_unique();
        let to_key = Pubkey::new_unique();
        
        let filter = MessageFilter::new()
            .from(from_key)
            .to(to_key)
            .message_type(MessageType::Direct)
            .status(MessageStatus::Delivered);
        
        assert_eq!(filter.from, Some(from_key));
        assert_eq!(filter.to, Some(to_key));
        assert_eq!(filter.message_type, Some(MessageType::Direct));
        assert_eq!(filter.status, Some(MessageStatus::Delivered));
    }

    #[tokio::test]
    async fn test_message_service_creation() {
        let service = MessageService::new();
        assert_eq!(service.service_name(), "MessageService");
    }

    #[test]
    fn test_message_id_generation() {
        let service = MessageService::new();
        let from = Pubkey::new_unique();
        let to = Pubkey::new_unique();
        let content = b"test message";
        
        let id1 = service.generate_message_id(&from, &to, content);
        let id2 = service.generate_message_id(&from, &to, content);
        
        assert_ne!(id1, id2); // Should be different due to timestamp and random component
        assert!(id1.starts_with("msg_"));
        assert!(id2.starts_with("msg_"));
    }
}